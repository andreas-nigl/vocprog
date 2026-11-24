/* Local, versioned answer rules. No network or AI calls. */
(function(root){
"use strict";
const VERSION=1,MAX_VARIANTS=128;
const clean=value=>String(value||"").normalize("NFKC").replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();
const contentKey=record=>JSON.stringify([record.lang||"",record.kind||"words",record.foreign||"",record.german||"",record.answerParts||null],(_key,value)=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value);
const stripTags=value=>String(value||"").replace(/<[^>]*>/g,"");
function layout(value){
 return clean(stripTags(value)).toLocaleLowerCase().replace(/\s*([,;:.!?()[\]])\s*/g,"$1");
}
function delimit(value){
 const result=[];let begin=0,depth=0;
 for(let i=0;i<value.length;i++){
  if("([".includes(value[i]))depth++;
  if(")]".includes(value[i])){depth--;if(depth<0)throw Error("Unvollständige Klammerung");}
  const separator=",;".includes(value[i])||(/[–—-]/.test(value[i])&&/\s/.test(value[i-1]||"")&&/\s/.test(value[i+1]||""));
  if(!depth&&separator){result.push(value.slice(begin,i));begin=i+1;}
 }
 if(depth)throw Error("Unvollständige Klammerung");
 result.push(value.slice(begin));return result.map(clean).filter(Boolean);
}
function parens(value,language,optional=true){
 const start=value.search(/[([]/);if(start<0)return [clean(value)];
 const open=value[start],close=open==="("?")":"]";let end=-1,depth=0;
 for(let i=start;i<value.length;i++){if(value[i]===open)depth++;if(value[i]===close&&!--depth){end=i;break;}}
 if(end<0)throw Error("Unvollständige Klammerung");
 const before=value.slice(0,start),inside=value.slice(start+1,end),after=value.slice(end+1);
 const suffix=open==="("&&/\p{L}$/u.test(before)&&inside.split(/\s*[,/]\s*/).every(x=>(language==="fr-FR"?/^(?:e|s|es)$/i:language==="de-DE"?/^(?:r|s|n|en|er|es|in)$/i:/^(?:s|es|ed)$/i).test(x));
 const prefix=open==="("&&/^\p{L}/u.test(after)&&
   (/-$/.test(inside)||(/^(?:an|ab|auf|aus|ein|um|zu|un|be|ver|zer|ent|er|ge)$/i.test(inside)&&language==="de-DE"));
 const middles=suffix?inside.split(/\s*[,/]\s*/):[inside];
 const joined=middles.map(mid=>{
   if(prefix&&language==="de-DE")mid=mid.replace(/-$/,"");
   const left=!suffix&&!prefix&&/\p{L}$/u.test(before)&&/^\p{L}/u.test(mid)?" ":"";
   const right=!suffix&&!prefix&&/\p{L}$/u.test(mid)&&/^\p{L}/u.test(after)?" ":"";
   return before+left+mid+right+after;
 });
 if(optional)joined.unshift(before+after);
 const result=[...new Set(joined.flatMap(part=>parens(part,language,optional)))];
 if(result.length>MAX_VARIANTS)throw Error("Zu viele Varianten");
 return result;
}
function slashVariants(text,language){
 if(!text.includes("/"))return [text];
 if(text.split(/\s+/).filter(word=>word.includes("/")).length>1)throw Error("Gekoppelte Varianten bleiben unverändert");
 const pieces=text.split(/\s*\/\s*/);
 if(pieces.every(piece=>piece.trim().split(/\s+/).length>1))return pieces;
 let result=[""];
 for(const word of text.split(/\s+/)){
  let choices=word.split("/").filter(Boolean);
  if(choices.length>1&&language==="de-DE"&&choices[0].length>3){
   choices=choices.map((value,index)=>index&&/^(?:in|r|s)$/.test(value)?choices[0]+value:value);
  }
  result=result.flatMap(prefix=>choices.map(choice=>(prefix+" "+choice).trim()));
  if(result.length>MAX_VARIANTS)throw Error("Zu viele Varianten");
 }
 return result;
}
function placeholders(text,language){
 const aliases=language.startsWith("en")?[[/\bsth\.?(?=\s|$)/g,"something"],[/\bsb\.?(?=\s|$)/g,"somebody"]]:
  language==="de-DE"?[[/\betw\.?(?=\s|$)/g,"etwas"],[/\bjdm\.?(?=\s|$)/g,"jemandem"],[/\bjdn\.?(?=\s|$)/g,"jemanden"],[/\bjm\.?(?=\s|$)/g,"jemandem"],[/\bjn\.?(?=\s|$)/g,"jemanden"]]:
  language==="fr-FR"?[[/\bqc\b/g,"quelque chose"],[/\bqn\b/g,"quelqu'un"]]:[];
 let expanded=text;
 for(const [pattern,replacement] of aliases)expanded=expanded.replace(pattern,replacement);
 const result=[text,expanded];
 if(language.startsWith("en"))result.push(expanded.replace(/\bsomebody\b/g,"someone"));
 return [...new Set(result)];
}
function normalizeWord(value,language=""){
 const literal=parens(clean(stripTags(value)),language,false)[0];
 return clean(literal).toLocaleLowerCase().replace(/[.,;:!?]/g," ").replace(/\s+/g," ").trim();
}
function variants(text,language){
 return [...new Set(parens(clean(text),language).flatMap(part=>slashVariants(part,language)).flatMap(part=>placeholders(part,language)).map(part=>normalizeWord(part,language)).filter(Boolean))];
}
function compileSide(text,language,lookup){
 try{
  let input=String(text||"");
  if(/\/\s*\.{2,}/.test(input))throw Error("Offene Beispielsammlung bleibt unverändert");
  const pronunciation=input.match(/\s+\[([^\]]+)\]\s*$/);
  if(pronunciation)input=input.slice(0,pronunciation.index);
  const plural=language.startsWith("en")?input.match(/,\s*pl\.?\s+([^,;]+)$/i):null;
  if(plural)input=input.slice(0,plural.index);
  const grammar=input.match(/\s+((?:(?:m|f|pl|sing|sg)\.\s*)+)$/i);
  if(grammar)input=input.slice(0,grammar.index);
  const parts=delimit(input);if(!parts.length)throw Error("Leeres Feld");
  let suffixes=[...(grammar?[normalizeWord(grammar[1],language)]:[]),...(plural?["pl",normalizeWord(plural[1],language)]:[]),...(pronunciation?[normalizeWord(pronunciation[1],language)]:[])],cores=parts;
  if(language.startsWith("en")&&parts.length>1){
   const first=variants(parts[0],language).find(value=>!value.startsWith("to "))||"";
   const lemma=first.split(/\s+/)[0],ref=lookup?.(lemma);
   const tails=parts.slice(1).map(value=>normalizeWord(value,language));
   const past=ref?.forms?.["simple past"]?.flat()||[],participle=ref?.participle||[];
   if(tails.length===2&&past.includes(tails[0])&&participle.includes(tails[1])){cores=[parts[0]];suffixes=[...tails,...suffixes];}
   else if((/^\s*\(to\)/i.test(parts[0])||ref)&&!tails.every(value=>lookup?.(value)?.forms)){
    throw Error("Verbzusätze nicht sicher getrennt");
   }
  }
  const groups=cores.map(core=>({cores:variants(core,language),suffixes}));
  if(groups.some(group=>!group.cores.length))throw Error("Keine sichere Grundantwort");
  return {mode:"variants",groups};
 }catch(error){return {mode:"legacy",reason:String(error.message||error)};}
}
function validateScanSide(parts,text,language){
 if(!Array.isArray(parts)||!parts.length||parts.length>16)return null;
 try{
  const visible=[...variants(text,language),...delimit(text).flatMap(part=>variants(part,language))];
  const groups=[];
  for(const part of parts){
   if(!part||typeof part.core!=="string")return null;
   const core=variants(part.core,language),suffixes=Array.isArray(part.optionalSuffixes)?part.optionalSuffixes:[];
   if(!core.length||suffixes.length>8||suffixes.some(value=>typeof value!=="string"||!clean(value)))return null;
   const normalized=suffixes.map(value=>normalizeWord(value,language));
   if(!core.every(value=>visible.includes(value)||visible.includes(clean(value+" "+normalized.join(" ")))))return null;
   if(normalized.length&&!visible.some(full=>core.some(value=>full===clean(value+" "+normalized.join(" ")))))return null;
   groups.push({cores:core,suffixes:normalized});
  }
  return {mode:"variants",groups};
 }catch{return null;}
}
function prepare(record,{lookup}={}){
 const key=contentKey(record);
 if(record.answerRules?.version===VERSION&&record.answerRules.contentKey===key)return record.answerRules;
 const scanned=record.answerParts;
 const foreign=validateScanSide(scanned?.foreign,record.foreign,record.lang||"");
 const german=validateScanSide(scanned?.german,record.german,"de-DE");
 return {version:VERSION,contentKey:key,source:foreign&&german?"scan":"local",
   foreign:foreign||compileSide(record.foreign,record.lang||"",lookup),
   german:german||compileSide(record.german,"de-DE")};
}
function patterns(group){
 let suffixes=[[]];
 for(const suffix of group.suffixes||[])suffixes=suffixes.flatMap(prior=>[prior,[...prior,...suffix.split(" ")]]);
 return group.cores.flatMap(core=>suffixes.map(suffix=>[...core.split(" "),...suffix]));
}
function matchSide(input,side,language){
 if(side?.mode!=="variants")return null;
 let normalized;try{normalized=normalizeWord(input,language);}catch{return false;}
 const tokens=normalized.split(" ");if(!normalized||tokens.length>256)return false;
 const sequences=side.groups.flatMap(patterns),reachable=new Set([0]);
 for(let offset=0;offset<tokens.length;offset++){
  if(!reachable.has(offset))continue;
  for(const sequence of sequences)if(sequence.length&&sequence.every((word,index)=>tokens[offset+index]===word))reachable.add(offset+sequence.length);
 }
 return reachable.has(tokens.length);
}
function matchWord(item,input){
 if(!item.record||["verb-principal","verb-imperative"].includes(item.record.kind))return null;
 const rules=prepare(item.record),language=item.tLang||item.record.lang||"";
 return matchSide(input,language==="de-DE"?rules.german:rules.foreign,language);
}
function matchExplicit(input,accepted,language){
 let normalized;try{normalized=normalizeWord(input,language);}catch{return false;}
 return accepted.some(value=>variants(value,language).includes(normalized));
}
function matchGrouped(input,expected,language){
 const required=String(expected||"").split(/\s*\/\s*/);
 const given=String(input||"").split(/\s*\/\s*/);
 return given.length===required.length&&required.every((part,index)=>matchExplicit(given[index],[part],language));
}
const api={VERSION,contentKey,layout,normalizeWord,variants,prepare,matchSide,matchWord,matchExplicit,matchGrouped};
root.VOCAnswerRules=api;if(typeof module!=="undefined")module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
