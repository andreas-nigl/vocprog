/* English construction rules; lexical evidence comes from the independent reference. */
(function(root){
 'use strict';
 const VERSION=4;
 const normalize=text=>String(text||'').replace(/^\s*(?:\(to\)|to)\s+/i,'').trim().toLowerCase();
 function split(text){const clean=normalize(text),match=clean.match(/^([a-z]+)(.*)$/);return match?{base:match[1],tail:match[2]}:{base:'',tail:''};}
 // Preserve the printed phrase independently of the engine's base lemma.
 const displayInfinitive=text=>'(to) '+normalize(text);
 // Principal parts are bare forms, unlike a standalone infinitive.
 const displayPrincipalParts=(parts,separator=', ')=>Array.isArray(parts)&&parts.length===3?parts.map((form,index)=>index===0?normalize(form):form).join(separator):'';
 function sourcePhrase(text){
  const rules=root.VOCAnswerRules;
  const marked=rules?rules.annotations(String(text).replace(/\[[^\]]*\]/g,'')):{lexical:String(text).replace(/\[[^\]]*\]/g,''),notes:[]};
  const first=rules?rules.delimit(marked.lexical)[0]:marked.lexical;
  return {phrase:normalize(first),notes:marked.notes};
 }
 function restoreEntry(entry,book,all){
  if(book.lang!=='en-US'||entry.kind!=='verb-infinitive')return entry;
  const current=sourcePhrase(entry.infinitive||entry.foreign).phrase;
  const candidates=all.filter(v=>v.bookId===book.sourceBookId&&String(v.page)===String(entry.page)&&
   (!v.kind||v.kind==='words')&&/^\s*(?:\(to\)|to)\s+/i.test(v.foreign||''))
   .filter(v=>{const full=sourcePhrase(v.foreign).phrase;return full===current||full.startsWith(current+' ')||full.startsWith(current+' (');});
  // Ambiguous same-page homonyms must never be silently combined.
  const unique=[...new Map(candidates.map(v=>[JSON.stringify([sourcePhrase(v.foreign).phrase,v.german]),v])).values()];
  const source=unique.length===1?unique[0]:null;
  const parsed=sourcePhrase(source?.foreign||entry.foreign);
  return {...entry,foreign:displayInfinitive(parsed.phrase),infinitive:displayInfinitive(parsed.phrase),
   verbId:parsed.phrase,german:source?.german||entry.german,
   ...(source?{sourceVocabId:source.id}:{}),sourceNotes:parsed.notes.length?parsed.notes:entry.sourceNotes||[]};
 }
 const TITLES={'simple present':'Simple Present','present progressive':'Present Progressive','simple past':'Simple Past','past progressive':'Past Progressive','present perfect':'Present Perfect Simple','present perfect progressive':'Present Perfect Progressive','past perfect':'Past Perfect','will future':'Will-Future','going to future':'Going-to-Future','conditional':'Conditional'};
 const PEOPLE=[['I','ich'],['you','du'],['he','er'],['we','wir'],['you','ihr'],['they','sie, Pl.']];
 const grammar={name:'Cambridge: English verb forms and constructions',url:'https://dictionary.cambridge.org/grammar/british-grammar/verb-forms'};
 const perfect={name:'Cambridge: Present perfect continuous',url:'https://dictionary.cambridge.org/grammar/british-grammar/present-perfect-i-have-been'};
 function morphology(lemma,engine){
  const {base,tail}=split(lemma),motor=engine(base,'en-US');if(!motor)return null;
  return {...motor,infinitive:normalize(lemma),forms:Object.fromEntries(Object.entries(motor.forms).map(([tense,row])=>[tense,row.map(form=>form+tail)])),principalParts:motor.principalParts,participle:motor.participle+tail,presentParticiple:motor.presentParticiple+tail};
 }
 function contractions(text){const values=[text];for(const [full,short] of [['I am',"I'm"],['I have',"I've"],['you have',"you've"],['we have',"we've"],['they have',"they've"],['he has',"he's"],['she has',"she's"],['it has',"it's"],['you are',"you're"],['we are',"we're"],['they are',"they're"],['he is',"he's"],['she is',"she's"],['it is',"it's"]])if(text.startsWith(full+' '))values.push(short+text.slice(full.length));return values;}
 function personPrompt(verb,tense,index,random=Math.random){
  let [foreign,german]=PEOPLE[index];if(index===2){[foreign,german]=[['he','er'],['she','sie, Sg.'],['it','es']][Math.min(2,Math.floor(random()*3))];}
  const form=verb.forms[tense][index],answer=foreign+' '+form;
  return {prompt:(TITLES[tense]||tense)+': '+verb.german+' ('+german+')',target:answer,acceptedTargets:contractions(answer)};
 }
 // Separate German school equivalents from the English task prompt. Reference rows
 // take priority; the local morphology motor is an explicitly labelled fallback.
 const GERMAN_PEOPLE=['ich','du','er/sie/es','wir','ihr','sie'];
 const REFLEXIVE=['mich','dich','sich','uns','euch','sich'];
 const GERMAN_TENSES={'simple present':['präsens',''],'present progressive':['präsens','gerade'],'simple past':['präteritum',''],'past progressive':['präteritum','gerade'],'present perfect':['perfekt',''],'present perfect progressive':['präsens','seit einiger Zeit'],'past perfect':['plusquamperfekt',''],'will future':['futur i',''],'going to future':['futur i',''],'conditional':['würde-form','']};
 const refKeys={'präsens':'present','präteritum':'preterite','perfekt':'perfect','plusquamperfekt':'pluperfect'};
 const validForm=s=>typeof s==='string'&&!!s.trim()&&!/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(s);
 // Dictionary notation is interpreted without changing original vocabulary.
 const PREPOSITION=/^(?:auf|an|bei|mit|von|zu|über|für|gegen|nach|vor|aus|in|um|unter|durch|ohne)$/i;
 function expandMeaning(value){
  let variants=[value.trim()];
  for(let pass=0;pass<5;pass++){
   let expanded=false;
   variants=variants.flatMap(s=>{
    const m=s.match(/\(([^()]*)\)/);if(!m)return [s];
    const before=s.slice(0,m.index),after=s.slice(m.index+m[0].length),inner=m[1].trim();
    if(!inner||/[()]/.test(inner))return [s];
    const attached=/\p{L}$/u.test(before)||/^\p{L}/u.test(after);
    if(attached&&!/^\p{L}+$/u.test(inner))return [s];
    if(!attached&&PREPOSITION.test(inner))return [s];
    if(!attached&&before.trim()&&!after.trim())return [s];
    expanded=true;return [(before+after).replace(/\s+/g,' ').trim(),(before+inner+after).replace(/\s+/g,' ').trim()];
   });
   if(variants.length>32)return [value.trim()];
   if(!expanded)break;
  }
  return variants;
 }
 const splitMeanings=value=>[...new Set((root.VOCAnswerRules?root.VOCAnswerRules.delimit(value):String(value||'').split(/[,;]/)).flatMap(s=>s.split(/\s+\/\s+|\s+oder\s+/)).flatMap(expandMeaning).filter(Boolean))];
 const grammarSource={name:'Duden: Perfektbildung mit haben oder sein',url:'https://www.duden.de/sprachwissen/sprachratgeber/Perfektbildung-mit-haben-oder-sein'};
 const reciprocitySource={name:'IDS grammis: Reziprok-Pronomen',url:'https://grammis.ids-mannheim.de/terminologie/502'};
 const auxiliaryEvidence=Object.fromEntries('verhaften begrüßen aufnehmen melden ausgraben graben untersuchen existieren inspirieren halten senken verschlechtern reagieren weigern ablehnen entfernen offenlegen zeigen benötigen'.split(' ').map(lemma=>[lemma,{aux:'haben',source:grammarSource}]));
 Object.assign(auxiliaryEvidence,{
  verblassen:{aux:'sein',source:{name:'Duden: verblassen',url:'https://www.duden.de/rechtschreibung/verblassen'}},
  springen:{aux:'sein',source:grammarSource},
  dauern:{aux:'haben',source:{name:'Duden: dauern',url:'https://www.duden.de/rechtschreibung/dauern_leidtun'}},
  andauern:{aux:'haben',source:{name:'Duden: andauern',url:'https://www.duden.de/konjugation/andauern'}}
 });
 const senseEvidence={'aus dem Boden schießen':{aux:'sein',source:{name:'Duden: schießen (Bewegung)',url:'https://www.duden.de/rechtschreibung/schieszen'}}};
 const supplement={
  begrüßen:{forms:{present:['begrüße','begrüßt','begrüßt','begrüßen','begrüßt','begrüßen'].map(s=>[s]),preterite:['begrüßte','begrüßtest','begrüßte','begrüßten','begrüßtet','begrüßten'].map(s=>[s])},participle:['begrüßt'],auxiliaries:['haben'],sources:[{name:'Duden: begrüßen',url:'https://www.duden.de/konjugation/begrueszen'}]}
 };
 function phrase(value){
  const trailing=value.match(/\s+(\([^()]*\))$/);
  const suffix=trailing?trailing[1]:'';
  if(trailing)value=value.slice(0,trailing.index);
  const words=value.replace(/\b(?:jn|jdn)\./gi,'jemanden').replace(/\bjm\./gi,'jemandem').replace(/\betw\./gi,'etwas').trim().split(/\s+/);
  const lemma=words.pop();
  if(!lemma||! /^[a-zäöüß]+(?:en|n)$/i.test(lemma)||words.some(word=>/[()<>]/.test(word)))return null;
  const reflexive=words[0]==='sich';if(reflexive)words.shift();
  return {lemma:lemma.toLowerCase(),complement:words.join(' '),reflexive,suffix,original:value};
 }
 async function germanParadigm(value,morphology,lookup){
  const parsed=phrase(value);if(!parsed)return null;
  const {lemma,complement,reflexive}=parsed;
  const reciprocal=reflexive&&lemma==='begrüßen'&&complement==='per Faustgruß';
  let motor=null;try{motor=morphology(lemma,'de-DE');}catch{}
  const ref=(await lookup('de-DE',lemma))||supplement[lemma];
  const evidence=senseEvidence[parsed.original]||auxiliaryEvidence[lemma];
  if(!ref&&!motor)return null;
  const forms={},fallback=[];
  const getRow=(entry,key)=>{const row=entry?.forms?.[key];return Array.isArray(row)&&row.length===6&&row.every(slot=>Array.isArray(slot)&&slot.some(validForm))?row.map((slot,index)=>{const values=slot.filter(validForm);return key==='present'&&index===0?(values.find(s=>/e(?:\s|$)/.test(s))||values[0]):values[0];}):null;};
  const motorRow=key=>{const row=motor?.forms?.[key];return Array.isArray(row)&&row.length===6&&row.every(validForm)?row:null;};
  for(const key of ['präsens','präteritum']){
   const row=getRow(ref,refKeys[key])||motorRow(key);if(row)forms[key]=row;
   if(!getRow(ref,refKeys[key])&&row)fallback.push(key);
  }
  const part=ref?.participle?.find(validForm)||(validForm(motor?.participle)?motor.participle:'');
  if(part&&!ref?.participle?.includes(part))fallback.push('participle');
  const inferred=motor?.auxiliary||motorRow('perfekt')?.[0]?.match(/^(habe|bin)\b/)?.[1];
  const motorAux=inferred==='habe'?'haben':inferred==='bin'?'sein':inferred;
  const allowed=(ref?.auxiliaries||[ref?.auxiliary]).filter(Boolean);
  const auxiliary=reflexive?'haben':senseEvidence[parsed.original]?.aux||(allowed.includes(motorAux)?motorAux:allowed[0])||evidence?.aux||(['haben','sein'].includes(motorAux)?motorAux:null);
  const aux=auxiliary?await lookup('de-DE',auxiliary):null;
  for(const [key,auxKey] of [['perfekt','present'],['plusquamperfekt','preterite']]){
   let row=reflexive||senseEvidence[parsed.original]?null:getRow(ref,refKeys[key]);
   if(!row&&part){const auxRow=getRow(aux,auxKey);if(auxRow)row=auxRow.map(s=>s+' '+part);}
   if(!row){row=motorRow(key);if(row)fallback.push(key);}
   if(!allowed.length&&!evidence&&!reflexive&&row&&!fallback.includes(key))fallback.push(key);
   if(row)forms[key]=row;
  }
  const werden=await lookup('de-DE','werden');
  for(const [key,auxKey] of [['futur i','present'],['würde-form','konjunktiv2']]){
   const row=getRow(werden,auxKey);
   if(row)forms[key]=row.map(s=>s+' '+lemma);
   else if(motorRow(key)){forms[key]=motorRow(key);fallback.push(key);}
  }
  const nonfinite=word=>[reciprocal?'einander':reflexive?'sich':'',complement,word,parsed.suffix].filter(Boolean).join(' ');
  return {...parsed,reciprocal,forms,part,ing:lemma==='sein'?'seiend':lemma==='tun'?'tuend':lemma+'d',nonfinite,fallback,reference:!!ref,sources:[...(ref?.sources||[]),...(aux?.sources||[]),...(werden?.sources||[]),...(evidence?[evidence.source]:[]),...(reciprocal?[reciprocitySource]:[])]};
 }
 function germanSentence(m,tense,index,adverb='',includePerson=true){
  const raw=m.forms[tense]?.[index];if(!raw)return '';
  const [finite,...rest]=raw.split(/\s+/);
  const object=m.reciprocal?(includePerson&&index<3?'jemanden':'einander'):m.reflexive?(includePerson?REFLEXIVE[index]:'sich'):'';
  return [includePerson?GERMAN_PEOPLE[index]:'',finite,object,adverb,m.complement,...rest,m.suffix].filter(Boolean).join(' ');
 }
 async function translateTable(verb,morphology,lookup){
  const cache=new Map();let unavailable=false;
  const safeLookup=async(lang,word)=>{try{return await lookup(lang,word);}catch{unavailable=true;return null;}};
  const prepare=async value=>{
   const entries=[];for(const meaning of splitMeanings(value)){
    if(!cache.has(meaning))cache.set(meaning,germanParadigm(meaning,morphology,safeLookup));
    const entry=await cache.get(meaning);if(entry)entries.push(entry);
   }return entries;
  };
  const baseMeaning=split(verb.infinitive).tail?(verb.baseGerman||''):verb.german;
  const full=await prepare(verb.german),base=await prepare(baseMeaning);
  const expected=splitMeanings(verb.german).length,expectedBase=splitMeanings(baseMeaning).length;
  const unique=values=>[...new Set(values.filter(Boolean))].join(' / ');
  const principal=base.map(m=>m.forms['präteritum']?.[0]&&m.part?[m.original,germanSentence(m,'präteritum',0,'',false),m.nonfinite(m.part)].join(', '):'').filter(Boolean);
  const participle=full.map(m=>m.part?m.nonfinite(m.part):'').filter(Boolean);
  const ing=full.map(m=>m.nonfinite(m.ing)).filter(Boolean);
  verb.principalGerman=unique(principal);
  verb.participleGerman=unique(participle);
  verb.presentParticipleGerman=unique(ing);
  const missing=[];
  for(const tense of Object.keys(TITLES)){
   const cards=verb.cards[tense]||[];
   const [key,adverb]=GERMAN_TENSES[tense];
   if(cards.length!==6)missing.push(tense+':row');
   for(let index=0;index<cards.length;index++){
    const answers=full.map(m=>germanSentence(m,key,index,adverb)).filter(Boolean);
    const card=cards[index];card.german=unique(answers);card.acceptedGerman=[...new Set(answers)];
    card.germanVerification=answers.length?{status:full.every(m=>m.reference&&!m.fallback.includes(key))?'reference-matched':'local-morphology',mapping:'school-equivalent',tense:key,coveredMeanings:answers.length}:{status:'pending',reason:'Keine deutsche Lernentsprechung verfügbar',coveredMeanings:0};
    if(answers.length!==expected||!expected)missing.push(tense+':'+index);
   }
  }
  verb.englishTranslationCoverage={expected,expectedBase,principal:principal.length,participle:participle.length,ing:ing.length};
  verb.englishTranslationMissing=[...missing,...(!expectedBase||principal.length!==expectedBase?['principal']:[]),...(!expected||participle.length!==expected?['participle']:[]),...(!expected||ing.length!==expected?['ing']:[]),...(full.length!==expected?['meaning']:[]),...(base.length!==expectedBase?['baseMeaning']:[])];
  if(unavailable&&verb.englishTranslationMissing.length)throw Error('Deutsche Referenzdaten vorübergehend nicht vollständig verfügbar');
  verb.verificationSources=[...new Map([...(verb.verificationSources||[]),...full.flatMap(m=>m.sources),...base.flatMap(m=>m.sources)].filter(s=>s?.url).map(s=>[s.url,s])).values()];
  verb.translationPolicy='Deutsche schulische Lernentsprechungen; Verlaufsformen mit gerade bzw. seit einiger Zeit; Kontext kann andere Übersetzungen erfordern.';
  verb.englishPreparedVersion=VERSION;
  verb.englishTranslationComplete=translationComplete(verb);
  return verb;
 }
 function translationComplete(verb){
  if(!verb||verb.englishPreparedVersion!==VERSION||!Array.isArray(verb.englishTranslationMissing)||verb.englishTranslationMissing.length)return false;
  const c=verb.englishTranslationCoverage,expected=splitMeanings(verb.german).length,expectedBase=splitMeanings(split(verb.infinitive).tail?(verb.baseGerman||''):verb.german).length;
  if(!expected||!expectedBase||!c||c.expected!==expected||c.expectedBase!==expectedBase||c.principal!==expectedBase||c.participle!==expected||c.ing!==expected||![verb.german,verb.principalGerman,verb.participleGerman,verb.presentParticipleGerman].every(validForm))return false;
  return Object.keys(TITLES).every(tense=>Array.isArray(verb.cards?.[tense])&&verb.cards[tense].length===6&&verb.cards[tense].every(card=>validForm(card.german)&&['reference-matched','local-morphology'].includes(card.germanVerification?.status)&&card.germanVerification.coveredMeanings===expected&&Array.isArray(card.acceptedGerman)&&card.acceptedGerman.length>0&&card.acceptedGerman.every(validForm)&&card.german===card.acceptedGerman.join(' / ')));
 }
 async function enrich(verb,motor,lookup){
  if(verb.englishPreparedVersion>=1)return translateTable(verb,motor,lookup);
  const {base,tail}=split(verb.infinitive),ref=await lookup('en-US',base),be=await lookup('en-US','be'),have=await lookup('en-US','have');
  const sources=[...(ref?.sources||[]),grammar,perfect];
  const past=ref?.forms?.['simple past']?.[0],part=ref?.participle,ing=ref?.presentParticiple;
  const slot=(row,index)=>row?.[index]?.filter(Boolean)||[];
  const combine=(aux,rest)=>aux.flatMap(a=>rest.map(b=>a+' '+b));
  for(const [tense,cards] of Object.entries(verb.cards))for(let i=0;i<cards.length;i++){
   let choices=[];
   if(tense==='simple present'||tense==='simple past')choices=slot(ref?.forms?.[tense],i);
   else if(tense==='present progressive'||tense==='past progressive')choices=combine(slot(be?.forms?.[tense==='present progressive'?'simple present':'simple past'],i),ing||[]);
   else if(tense==='present perfect'||tense==='past perfect')choices=combine(slot(have?.forms?.[tense==='present perfect'?'simple present':'simple past'],i),part||[]);
   else if(tense==='present perfect progressive')choices=combine(slot(have?.forms?.['simple present'],i),(ing||[]).map(word=>'been '+word));
   else if(ref&&['will future','going to future','conditional'].includes(tense))choices=tense==='going to future'?slot(be?.forms?.['simple present'],i).map(a=>a+' going to '+base):[(tense==='will future'?'will ':'would ')+base];
   const card=cards[i];
   if(choices.length){
    const raw=verb.forms[tense][i].slice(0,tail? -tail.length:undefined);
    const chosen=choices.includes(raw)?raw:choices[0];verb.forms[tense][i]=chosen+tail;
    const people=i===2?['he','she','it']:[PEOPLE[i][0]];
    card.foreign=people[0]+' '+chosen+tail;card.acceptedForeign=people.flatMap(person=>contractions(person+' '+chosen+tail));
    card.foreignVerification={status:'reference-matched'};
   }else card.foreignVerification={status:'pending',reason:'Englische Referenzform fehlt'};
   // German table values are prepared separately below; personPrompt remains the task contract.
  }
  if(past?.length&&part?.length){verb.principalParts=[base,past[0],part[0]];verb.principalVariants=[...new Set(past.flatMap(p=>part.map(pp=>[base,p,pp].join(', '))))];}
  verb.baseGerman=ref?.baseGerman||verb.german;
  verb.englishPreparedVersion=VERSION;verb.verificationSources=sources;
  // Continuous morphology exists even for stative verbs; unsuitable isolated tasks are omitted.
  verb.excludedTenses=ref?.stative?['present progressive','past progressive','present perfect progressive']:[];
  return translateTable(verb,motor,lookup);
 }
 function principalMatches(given,verb){const clean=text=>normalize(text).replace(/[,/–—-]+/g,' ').replace(/\s+/g,' ').trim();return (verb.principalVariants||[verb.principalParts?.join(', ')]).filter(Boolean).some(value=>clean(value)===clean(given));}
 root.VOCEnglishVerbs=Object.freeze({VERSION,split,normalize,displayInfinitive,displayPrincipalParts,sourcePhrase,restoreEntry,morphology,enrich,translateTable,translationComplete,splitMeanings,personPrompt,principalMatches,titles:TITLES});
})(typeof window==='undefined'?globalThis:window);
