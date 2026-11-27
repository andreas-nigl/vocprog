'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../vocprog-english-verbs.js');
const english=globalThis.VOCEnglishVerbs;
test('English principal parts require all three ordered base forms, with optional commas',()=>{const verb={principalParts:['take','took','taken'],principalVariants:['take, took, taken']};for(const text of ['take took taken','take, took, taken','take / took / taken'])assert.equal(english.principalMatches(text,verb),true);for(const text of ['take','take taken took','take off took off taken off','take took takken'])assert.equal(english.principalMatches(text,verb),false);});
test('English lemma normalization strips only optional infinitive marker and separates retained particle',()=>{assert.deepEqual(english.split('(to) take off'),{base:'take',tail:' off'});assert.deepEqual(english.split('to dig sth. up'),{base:'dig',tail:' sth. up'});});
test('Explicit English prompts keep person, tense and accepted contraction consistent',()=>{const verb={german:'gehen',forms:{'present perfect progressive':Array(6).fill('have been going')}};const task=english.personPrompt(verb,'present perfect progressive',5);assert.equal(task.prompt,'Present Perfect Progressive: gehen (sie, Pl.)');assert.deepEqual(task.acceptedTargets,['they have been going',"they've been going"]);const she=english.personPrompt({...verb,forms:{'present perfect progressive':Array(6).fill('has been going')}},'present perfect progressive',2,()=>.4);assert.match(she.prompt,/sie, Sg\./);assert.equal(she.target,'she has been going');});
test('Every selected verb is asked in every selected tense, with one independent person draw',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../vocprog-enhancements.js'),'utf8');
 const fragment=source.slice(source.indexOf('  function makeSelectedVerbTasks'),source.indexOf('  const oldStartTraining='));
 const verb={german:'nehmen',principalParts:['take','took','taken'],principalVariants:['take, took, taken'],baseGerman:'nehmen',forms:{'simple past':Array(6).fill('took'),'present perfect':Array(6).fill('have taken')},cards:{'simple past':Array(6).fill({}),'present perfect':Array(6).fill({})}};
 const make=new Function('window','verbDatabase','chosenBook','activeBook','TENSES',fragment+';return makeSelectedVerbTasks;')({VOCEnglishVerbs:english},{get:()=>({verbs:{take:verb,'take off':verb}})},'b',()=>({lang:'en-US'}),{});
 const bases=[{id:'one',bookId:'b',foreign:'take',verbId:'take'},{id:'two',bookId:'b',foreign:'take off',verbId:'take off'}];
 const tasks=make(bases,['simple past','present perfect']);assert.equal(tasks.length,4);for(const id of ['one','two'])assert.deepEqual(tasks.filter(x=>x.sourceId===id).map(x=>x.verbTense),['simple past','present perfect']);assert.equal(make(bases,['simple past']).length,12);assert.equal(make(bases,['principal parts']).length,1);
});
test('Real English WASM and independent lexicon prepare all ten tenses; reload needs no generation',async()=>{
 const {book,entries,persisted,snapshot,storage}=await require('./helpers/english-fixture.cjs')();
 for(const verb of Object.values(snapshot.verbs)){assert.deepEqual(verb.missing,[]);assert.equal(Object.keys(verb.cards).length,10);for(const cards of Object.values(verb.cards))assert.equal(cards.length,6);}
 assert.equal(snapshot.verbs.exist.cards['simple present'][2].foreign,'he exists');
 assert.equal(snapshot.verbs['take off'].cards['present perfect progressive'][5].foreign,'they have been taking off');
 assert.deepEqual(snapshot.verbs['take off'].principalParts,['take','took','taken']);
 const source=JSON.stringify(persisted);
 const reload=VOCVerbDatabase.create(storage,()=>{throw Error('must reuse prepared data');},null,()=>{throw Error('must not reverify');});
 await reload.prepare(book,entries,[],Object.keys(english.titles));assert.equal(JSON.stringify(JSON.parse(storage.getItem())),source);
});
test('Derived record IDs respect the 160-character database limit and retain existing short IDs',()=>{
 const key='en-US|contact|mit jemandem Kontakt aufnehmen, sich bei jemandem melden';
 const id=VOCVerbDatabase.recordId(key);assert.ok(('special:'+id).length<=160);assert.equal(VOCVerbDatabase.recordId(key),id);assert.notEqual(VOCVerbDatabase.recordId(key+'!'),id);assert.equal(VOCVerbDatabase.recordId('en-US|go|gehen'),'prepared-verb:en-US%7Cgo%7Cgehen');
 const ids=new Set(Array.from({length:2000},(_,i)=>VOCVerbDatabase.recordId(key.repeat(3)+i)));assert.equal(ids.size,2000);
});

test('English table translations are German school equivalents, not exercise prompts',async()=>{
 const {snapshot}=await require('./helpers/english-fixture.cjs')();
 const take=snapshot.verbs.take;
 assert.equal(take.cards.conditional[0].german,'ich würde nehmen');
 assert.equal(take.cards['simple past'][0].german,'ich nahm');
 assert.equal(take.principalGerman,'nehmen, nahm, genommen');
 assert.equal(take.participleGerman,'genommen');
 assert.equal(take.presentParticipleGerman,'nehmend');
 assert.equal(take.cards['present progressive'][0].german,'ich nehme gerade');
 assert.equal(snapshot.verbs['take off'].cards['simple past'][0].german,'ich hob ab');
});

test('Version 1 English records upgrade German display without re-generating verified foreign forms',async()=>{
 const {book,entries,persisted,motor,lookup}=await require('./helpers/english-fixture.cjs')();
 const original=JSON.parse(JSON.stringify(persisted));
 for(const record of Object.values(original)){record.verb.englishPreparedVersion=1;for(const cards of Object.values(record.verb.cards))for(const card of cards){card.german='old task prompt';card.germanVerification={status:'grammar-prompt'};}}
 let data=JSON.stringify(original),writes=0;
 const storage={getItem:()=>data,setItem:(_,text)=>{data=text;writes++;}};
 const onlyGerman=(word,lang)=>{assert.equal(lang,'de-DE');return motor.conjugate(word,lang);};
 const db=VOCVerbDatabase.create(storage,onlyGerman,null,verb=>english.enrich(verb,onlyGerman,(lang,word)=>{assert.equal(lang,'de-DE');return lookup(lang,word);}));
 const result=await db.prepare(book,entries,[],Object.keys(english.titles));
 assert.equal(writes,1);assert.equal(result.verbs.take.cards.conditional[0].german,'ich würde nehmen');
 for(const record of Object.values(JSON.parse(data))){assert.equal(record.verb.englishPreparedVersion,english.VERSION);assert.deepEqual(record.verb.forms,original[record.key].verb.forms);}
 await db.prepare(book,entries,[],Object.keys(english.titles));assert.equal(writes,1);
});

test('Dictionary parentheses, optional prefixes and translation coverage are validated',async()=>{
 const {motor,lookup}=await require('./helpers/english-fixture.cjs')();
 const blank=(infinitive,german,baseGerman)=>({infinitive,german,baseGerman,cards:Object.fromEntries(Object.keys(english.titles).map(t=>[t,Array.from({length:6},()=>({}))]))});
 const prepare=async(...args)=>english.translateTable(blank(...args),(w,l)=>motor.conjugate(w,l),lookup);
 assert.deepEqual(english.splitMeanings('(an)dauern; halten'),['dauern','andauern','halten']);
 assert.deepEqual(english.splitMeanings('reagieren (auf)'),['reagieren (auf)']);
 const react=await prepare('react (to)','reagieren (auf)','reagieren');
 assert.equal(react.participleGerman,'reagiert (auf)');assert.equal(react.presentParticipleGerman,'reagierend (auf)');assert.equal(react.cards.conditional[0].german,'ich würde reagieren (auf)');assert.ok(english.translationComplete(react));
 react.cards.conditional[0].german='';assert.equal(english.translationComplete(react),false);
 const last=await prepare('last','(an)dauern; halten','(an)dauern; halten');assert.ok(english.translationComplete(last));assert.equal(last.cards['present perfect'][0].german,'ich habe gedauert / ich habe angedauert / ich habe gehalten');
 const fade=await prepare('fade','verblassen','verblassen');assert.equal(fade.cards['present perfect'][0].german,'ich bin verblasst');
 const spring=await prepare('spring up','aus dem Boden schießen','springen');assert.equal(spring.cards['past perfect'][0].german,'ich war aus dem Boden geschossen');
 const bump=await prepare('bump fists','sich per Faustgruß begrüßen','stoßen');assert.equal(bump.cards['simple present'][0].german,'ich begrüße jemanden per Faustgruß');assert.equal(bump.cards['simple present'][3].german,'wir begrüßen einander per Faustgruß');assert.ok(english.translationComplete(bump));
 const unknown=await prepare('react','reagieren; (unbekanntes Material)','reagieren');assert.equal(english.translationComplete(unknown),false);
});
