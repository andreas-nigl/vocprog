/* English construction rules; lexical evidence comes from the independent reference. */
(function(root){
 'use strict';
 const VERSION=1;
 const normalize=text=>String(text||'').replace(/^\s*(?:\(to\)|to)\s+/i,'').trim().toLowerCase();
 function split(text){const clean=normalize(text),match=clean.match(/^([a-z]+)(.*)$/);return match?{base:match[1],tail:match[2]}:{base:'',tail:''};}
 const TITLES={'simple present':'Simple Present','present progressive':'Present Progressive','simple past':'Simple Past','past progressive':'Past Progressive','present perfect':'Present Perfect','present perfect progressive':'Present Perfect Progressive','past perfect':'Past Perfect','will future':'Will-Future','going to future':'Going-to-Future','conditional':'Conditional'};
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
 async function enrich(verb,motor,lookup){
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
   const task=personPrompt(verb,tense,i,()=>0);card.german=task.prompt;card.acceptedGerman=[task.prompt];card.germanVerification={status:'grammar-prompt',mapping:'explicit-tense-and-person'};
  }
  if(past?.length&&part?.length){verb.principalParts=[base,past[0],part[0]];verb.principalVariants=[...new Set(past.flatMap(p=>part.map(pp=>[base,p,pp].join(', '))))];}
  verb.baseGerman=ref?.baseGerman||(!tail?verb.german:'');
  verb.englishPreparedVersion=VERSION;verb.verificationSources=sources;
  // Continuous morphology exists even for stative verbs; unsuitable isolated tasks are omitted.
  verb.excludedTenses=ref?.stative?['present progressive','past progressive','present perfect progressive']:[];
  return verb;
 }
 function principalMatches(given,verb){const clean=text=>String(text).toLowerCase().replace(/[,/–—-]+/g,' ').replace(/\s+/g,' ').trim();return (verb.principalVariants||[verb.principalParts?.join(', ')]).filter(Boolean).some(value=>clean(value)===clean(given));}
 root.VOCEnglishVerbs=Object.freeze({VERSION,split,normalize,morphology,enrich,personPrompt,principalMatches,titles:TITLES});
})(typeof window==='undefined'?globalThis:window);
