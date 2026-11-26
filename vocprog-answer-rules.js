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
 // Spaces around a slash separate full phrases. Compact slashes share a slot.
 const phrases=text.split(/\s+\/\s+/);
 if(phrases.length>1&&phrases.every(part=>part.trim().split(/\s+/).length>1))return phrases.flatMap(part=>slashVariants(part,language));
 const pieces=text.split(/\s*\/\s*/);
 const article=/^(?:le|la|les|un|une|der|die|das|den|dem|des|ein|eine)\s+/i;
 const first=pieces[0].trim().split(/\s+/)[0].toLowerCase();
 if(pieces.every(piece=>piece.trim().split(/\s+/).length>1)&&
    (pieces.every(piece=>article.test(piece.trim()))||pieces.every(piece=>piece.trim().split(/\s+/)[0].toLowerCase()===first)))return pieces;
 const compact=text.replace(/\s*\/\s*/g,"/");
 let result=[""];
 for(const word of compact.split(/\s+/)){
  let choices=word.split("/").filter(Boolean);
  if(choices.length>1&&language==="de-DE"){
   const articles=["der","die","das","den","dem","des"];
   if(choices.slice(0,-1).every(value=>articles.includes(value.replace(/-$/,""))&&value.endsWith("-"))){
    const ending=choices.at(-1),article=articles.find(value=>ending.startsWith(value));
    if(!article)throw Error("Gemeinsame Wortendung nicht belegt");
    choices=choices.map(value=>value.endsWith("-")?value.slice(0,-1)+ending.slice(article.length):value);
   }else if(choices[0].length>3){
    choices=choices.map((value,index)=>index&&/^(?:in|r|s)$/.test(value)?choices[0]+value:value);
   }
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
 const open=String(text).split(/\s*\/\s*/);
 if(open.length>1&&/(?:\.{3}|…)/.test(open.at(-1))){
  const last=open.at(-1).match(/^(?:\.{3}|…)\s*(.*)$/);
  if(!last||open.slice(0,-1).some(part=>/(?:\.{3}|…)/.test(part)))throw Error("Unvollständige Beispielreihe");
  if(last[1])return [...new Set(open.slice(0,-1).flatMap(part=>variants(part+" "+last[1],language)))];
  text=open.slice(0,-1).join("/");
 }
 return [...new Set(parens(clean(text),language).flatMap(part=>slashVariants(part,language)).flatMap(part=>placeholders(part,language)).map(part=>normalizeWord(part,language)).filter(Boolean))];
}
function annotations(text){
 const source=String(text||""),notes=[],alternatives=[];let lexical="";
 const tag=/^(?:AE|BE|AmE|BrE|UK|US|infml|formal|ugs\.?|fig\.?|pl\.?|sing\.?)$/i;
 for(let i=0;i<source.length;){
  const open=source[i];
  if(open!=="("&&open!=="["){lexical+=source[i++];continue;}
  const close=open==="("?")":"]";let depth=1,end=i+1;
  for(;end<source.length;end++){if(source[end]===open)depth++;if(source[end]===close&&!--depth)break;}
  if(depth)throw Error("Unvollständige Klammerung");
  const inside=source.slice(i+1,end),regional=inside.match(/^(AE|BE|AmE|BrE|UK|US)\s*:\s*(.+)$/i);
  const labels=inside.replace(/\[[^\]]*\]/g,"").split(/[;,]/).map(clean).filter(Boolean);
  const metadata=labels.length&&tag.test(labels[0])&&labels.every(label=>tag.test(label)||/^(?:mit|ohne|auch|nur|bes\.?|vor allem)\s/i.test(label));
  if(open==="["||regional||metadata){
   if(metadata&&labels.length>1&&!inside.includes("["))notes.push(...labels);else notes.push(inside);
   if(regional)alternatives.push(regional[2]);lexical+=" ";
  }else lexical+=source.slice(i,end+1);
  i=end+1;
 }
 return {lexical,notes,alternatives};
}
function annotationSuffixes(notes,language){
 return notes.map(note=>{const regional=note.match(/^(AE|BE|AmE|BrE|UK|US)\s*:/i);
  const options=[...new Set([...(regional?[normalizeWord(regional[1],language)]:[]),...variants(note,language)])];return options.length===1?options[0]:options;});
}
function compileSide(text,language,lookup,prior){
 try{
  const marked=annotations(text);
  let input=marked.lexical;
  const plural=language.startsWith("en")?input.match(/,\s*pl\.?\s+([^,;]+)$/i):null;
  if(plural)input=input.slice(0,plural.index);
  const grammar=input.match(/\s+((?:(?:m|f|pl|sing|sg)\.\s*)+)$/i);
  if(grammar)input=input.slice(0,grammar.index);
  const parts=delimit(input);if(!parts.length)throw Error("Leeres Feld");
  let suffixes=[...(grammar?[normalizeWord(grammar[1],language)]:[]),...(plural?["pl",normalizeWord(plural[1],language)]:[]),...annotationSuffixes(marked.notes,language)],cores=parts;
  if(language==="de-DE"&&/\/(?:\s*)(?:\.{3}|…)\s+\S/.test(parts[0])){
   const predicate=parts[0].match(/\/(?:\s*)(?:\.{3}|…)\s+(.+)$/)[1];
   if(parts.slice(1).some(part=>!/^\p{L}+$/u.test(part)))throw Error("Unvollständige gemeinsame Ergänzung");
   const examples=variants(parts[0],language);
   cores=examples.flatMap(example=>[example,...parts.slice(1).map(verb=>example.slice(0,-normalizeWord(predicate,language).length)+verb)]);
  }
  if(language.startsWith("en")&&parts.length>1){
   const first=variants(parts[0],language).find(value=>!value.startsWith("to "))||"";
   const lemma=first.split(/\s+/)[0],ref=lookup?.(lemma);
   const tails=parts.slice(1).map(value=>normalizeWord(value,language));
   const past=ref?.forms?.["simple past"]?.flat()||[],participle=ref?.participle||[];
   if(tails.length===2&&((past.includes(tails[0])&&participle.includes(tails[1]))||
    (prior?.mode==="variants"&&prior.groups?.length===1&&tails.every((tail,index)=>prior.groups[0].suffixes?.[index]===tail)))){cores=[parts[0]];suffixes=[...tails,...suffixes];}
   else if((/^\s*\(to\)/i.test(parts[0])||ref)&&!tails.every(value=>lookup?.(value)?.forms)){
    throw Error("Verbzusätze nicht sicher getrennt");
   }
  }
  const groups=[...cores,...marked.alternatives].map(core=>({cores:variants(core,language),suffixes}));
  if(groups.some(group=>!group.cores.length))throw Error("Keine sichere Grundantwort");
  return {mode:"variants",groups};
 }catch(error){return {mode:"legacy",reason:String(error.message||error)};}
}
function validateScanSide(parts,text,language){
 if(!Array.isArray(parts)||!parts.length||parts.length>16)return null;
 try{
  const marked=annotations(text),meaningful=[marked.lexical,...marked.alternatives];
  const visible=meaningful.flatMap(value=>[...variants(value,language),...delimit(value).flatMap(part=>variants(part,language))]);
  const groups=[];
  for(const part of parts){
   if(!part||typeof part.core!=="string")return null;
   const core=variants(part.core,language),suffixes=Array.isArray(part.optionalSuffixes)?part.optionalSuffixes:[];
   if(!core.length||suffixes.length>8||suffixes.some(value=>typeof value!=="string"||!clean(value)))return null;
   const normalized=suffixes.map(value=>normalizeWord(value,language));
   if(!core.every(value=>visible.includes(value)||visible.includes(clean(value+" "+normalized.join(" ")))))return null;
   const printed=delimit(text);
   const listedSuffixes=normalized.length&&printed.length===normalized.length+1&&
     printed.slice(1).every((value,index)=>normalizeWord(value,language)===normalized[index])&&
     core.every(value=>variants(printed[0],language).includes(value));
   if(normalized.length&&!listedSuffixes&&!visible.some(full=>core.some(value=>full===clean(value+" "+normalized.join(" ")))))return null;
   groups.push({cores:core,suffixes:[...normalized,...annotationSuffixes(marked.notes,language)]});
  }
  return {mode:"variants",groups};
 }catch{return null;}
}
function genderPair(text,language){
 const input=clean(text);let male,female,match;
 if(language==="fr-FR"){
  match=input.match(/^(le|un)\s+([^/]+)\s*\/\s*(la|une)\s+([^/]+)$/i);
  if(match){male=match[1]+" "+match[2];female=match[3]+" "+match[4];}
  else if((match=input.match(/^(le|un)\s*\/\s*(la|une)\s+([^/]+)$/i))){male=match[1]+" "+match[3];female=match[2]+" "+match[3];}
 }else if(language==="de-DE"){
  match=input.match(/^der\s*\/\s*die\s+(.+?)(?:\s*\/\s*(in))?$/i);
  if(match&&!match[1].includes("/")){male="der "+match[1];female="die "+match[1]+(match[2]||"");}
  else if((match=input.match(/^(der\s+[^/]+)\s*\/\s*(die\s+[^/]+)$/i))){male=match[1];female=match[2];}
 }
 if(!male||!female)return null;
 return {mode:"required-groups",groups:[male,female].map(value=>({cores:variants(value,language),suffixes:[]})),
  compact:parens(input,language).map(value=>normalizeWord(value,language).replace(/\s*\/\s*/g,"/"))};
}
function prepare(record,{lookup}={}){
 const key=contentKey(record);
 const pairedGerman=record.lang==="fr-FR"?genderPair(record.german,"de-DE"):null;
 const pair=pairedGerman?genderPair(record.foreign,record.lang):null;
 const openExamples=/\/(?:\s*)(?:\.{3}|…)/.test(record.foreign||"")||/\/(?:\s*)(?:\.{3}|…)/.test(record.german||"");
 const englishInfinitive=record.kind==="verb-infinitive"&&/^en-/.test(record.lang||"");
 const notation=/\//.test(record.foreign||"")||/\//.test(record.german||"");
 const marked=/\((?:AE|BE|AmE|BrE|UK|US|infml|formal|ugs\.?|fig\.?|pl\.?|sing\.?)(?:[\s;:]|\))/.test((record.foreign||"")+" "+(record.german||""));
 const features={...(notation?{notation:2}:{}),...(marked?{annotations:2}:{}),...(pair?{pairedGender:1}:{}),...(openExamples?{openExamples:1}:{}),...(englishInfinitive?{englishInfinitiveTo:1}:{})};
 const current=record.answerRules;
 if(current?.version===VERSION&&current.contentKey===key&&Object.entries(features).every(([name,version])=>current.features?.[name]===version))return current;
 const scanned=record.answerParts;
 const foreign=validateScanSide(scanned?.foreign,record.foreign,record.lang||"");
 const german=validateScanSide(scanned?.german,record.german,"de-DE");
 const infinitiveText=englishInfinitive&&!/^\s*\(?to\)?\s/i.test(record.foreign)?"(to) "+record.foreign:record.foreign;
 return {version:VERSION,contentKey:key,source:foreign&&german?"scan":"local",...(Object.keys(features).length?{features}:{}),
   foreign:pair||foreign||compileSide(infinitiveText,record.lang||"",lookup,current?.contentKey===key?current.foreign:null),
   german:(pair&&pairedGerman)||german||compileSide(record.german,"de-DE",undefined,current?.contentKey===key?current.german:null)};
}
function patterns(group){
 let suffixes=[[]];
 for(const suffix of group.suffixes||[]){
  const choices=Array.isArray(suffix)?suffix:[suffix];
  suffixes=suffixes.flatMap(prior=>[prior,...choices.map(choice=>[...prior,...choice.split(" ")])]);
  if(suffixes.length>4096)throw Error("Zu viele optionale Zusätze");
 }
 return group.cores.flatMap(core=>suffixes.map(suffix=>[...core.split(" "),...suffix]));
}
function matchSide(input,side,language){
 if(!["variants","required-groups"].includes(side?.mode))return null;
 let normalized;try{normalized=normalizeWord(input,language);}catch{return false;}
 if(side.mode==="required-groups"){
  if(side.compact?.includes(normalized.replace(/\s*\/\s*/g,"/")))return true;
  const tokens=normalized.replace(/\s*\/\s*/g," ").split(/\s+/),required=(1<<side.groups.length)-1;
  if(!normalized||tokens.length>256||side.groups.length>8)return false;
  const reachable=Array.from({length:tokens.length+1},()=>new Set());reachable[0].add(0);
  for(let offset=0;offset<tokens.length;offset++)for(const mask of reachable[offset]){
   side.groups.forEach((group,index)=>{for(const sequence of patterns(group)){
    if(sequence.length&&sequence.every((word,at)=>tokens[offset+at]===word))reachable[offset+sequence.length].add(mask|(1<<index));
   }});
  }
  return reachable[tokens.length].has(required);
 }
 // Split independent clauses before expanding shared slash slots. Every branch
 // must be a complete accepted answer; metadata can never be a standalone core.
 if(/\/|\.{3}|…/.test(String(input))){
  try{
   const literal=parens(clean(stripTags(input)),language,false)[0];
   const clauses=delimit(literal);if(!clauses.length)return false;
   if(language==="de-DE"&&/\/\s*(?:\.{3}|…)\s+\S/.test(clauses[0])){
    const predicate=clauses[0].match(/\/\s*(?:\.{3}|…)\s+(.+)$/)[1];
    if(clauses.slice(1).some(clause=>!/^\p{L}+$/u.test(clause)))return false;
    const heads=variants(clauses[0],language);
    const complete=heads.flatMap(head=>[head,...clauses.slice(1).map(verb=>head.slice(0,-normalizeWord(predicate,language).length)+verb)]);
    return complete.length>0&&complete.every(value=>matchSide(value,side,language)===true);
   }
   let complete=[""];
   for(const clause of clauses){
    const choices=variants(clause,language);if(!choices.length)return false;
    complete=complete.flatMap(prefix=>choices.map(choice=>clean(prefix+" "+choice)));
    if(complete.length>MAX_VARIANTS)return false;
   }
   return complete.length>0&&complete.every(value=>matchSide(value,side,language)===true);
  }catch{return false;}
 }
 const tokens=normalized.split(" ");if(!normalized||tokens.length>256)return false;
 const sequences=side.groups.flatMap(patterns),reachable=new Set([0]);
 const placeholderWords=new Set(["sb","sth","somebody","someone","something","jn","jdn","jm","jdm","jemanden","jemandem","etwas"]);
 const slots=[];
 for(const group of side.groups){
  const prefixes=new Map();
  for(const core of group.cores){
   const words=core.split(" "),last=words.at(-1);
   if(words.length<2||!placeholderWords.has(last))continue;
   const prefix=words.slice(0,-1).join(" ");
   if(!prefixes.has(prefix))prefixes.set(prefix,new Set());prefixes.get(prefix).add(last);
  }
  for(const [prefix,choices]of prefixes)if(choices.size>1)slots.push({prefix:prefix.split(" "),choices});
 }
 for(let offset=0;offset<tokens.length;offset++){
  if(!reachable.has(offset))continue;
  for(const sequence of sequences)if(sequence.length&&sequence.every((word,index)=>tokens[offset+index]===word))reachable.add(offset+sequence.length);
  // In vocabulary notation, `remove sb., sth.` shares its verb across objects.
  for(const {prefix,choices}of slots)if(prefix.every((word,index)=>tokens[offset+index]===word)){
   for(let end=offset+prefix.length;end<tokens.length&&choices.has(tokens[end]);end++)reachable.add(end+1);
  }
 }
 return reachable.has(tokens.length);
}
function matchWord(item,input){
 if(!item.record||["verb-principal","verb-imperative"].includes(item.record.kind))return null;
 const rules=prepare(item.record),language=item.tLang||item.record.lang||"";
 return matchSide(input,language==="de-DE"?rules.german:rules.foreign,language);
}
function answerHint(item){
 if(item?.kind!=="words"||!item.record)return "";
 const rules=prepare(item.record),side=item.tLang==="de-DE"?rules.german:rules.foreign;
 return side.mode==="required-groups"?"Männliche und weibliche Form eingeben":"";
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
const api={VERSION,contentKey,layout,normalizeWord,variants,prepare,matchSide,matchWord,answerHint,matchExplicit,matchGrouped};
root.VOCAnswerRules=api;if(typeof module!=="undefined")module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
