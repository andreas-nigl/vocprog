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
