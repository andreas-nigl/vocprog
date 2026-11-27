'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../vocprog-answer-rules.js');
require('../vocprog-english-verbs.js');
const english=globalThis.VOCEnglishVerbs;
test('Printed complements stay mandatory in words, infinitives and conjugations; leading to stays optional',()=>{
 for(const [source,valid,invalid]of [
  ['(to) react (to)',['react to','to react to','(to) react (to)'],['react','to react']],
  ['(to) refuse (to do sth.)',['refuse to do something','to refuse to do sth.'],['refuse','to refuse']],
  ['(to) insist (on sth.)',['insist on something','to insist on sth.'],['insist','insist on']],
  ['(to) be in awe (of sb./sth.)',['be in awe of somebody','be in awe of something'],['be in awe']],
  ['effect (on)',['effect on'],['effect']],['excerpt (from)',['excerpt from'],['excerpt']],
  ['guilty (of sth.)',['guilty of something'],['guilty']],['reaction(to)',['reaction to'],['reaction']]
 ]){
  for(const kind of ['words','verb-infinitive']){
   const record={foreign:source,german:'Bedeutung',lang:'en-US',kind};
   record.answerRules={...rules.prepare(record),features:{},foreign:{mode:'variants',groups:[{cores:['react'],suffixes:[]}]}};
   const side=rules.prepare(record).foreign;
   for(const answer of valid)assert.equal(rules.matchSide(answer,side,'en-US'),true,source+' <- '+answer);
   for(const answer of invalid)assert.equal(rules.matchSide(answer,side,'en-US'),false,source+' <- '+answer);
  }
 }
 for(const answer of ['I have contacted sb.','I have contacted somebody','I have contacted someone'])assert.equal(rules.matchExplicit(answer,['I have contacted sb.'],'en-US'),true);
 assert.equal(rules.matchExplicit('I have contacted',['I have contacted sb.'],'en-US'),false);
 assert.equal(rules.matchExplicit('I have reacted',['I have reacted (to)'],'en-US'),false);
 assert.equal(rules.matchExplicit('I have reacted to',['I have reacted (to)'],'en-US'),true);
});
test('Source restoration keeps IDs and all lexical complements, ignores IPA, and refuses ambiguous matches',()=>{
 const book={id:'verbs',sourceBookId:'words',lang:'en-US'};
 const samples=[['contact','(to) contact sb. [kɒntækt]','mit jm. Kontakt aufnehmen'],['arrest','(to) arrest sb.','jn. verhaften'],['refuse','(to) refuse (to do sth.)','sich weigern (, etwas zu tun); ablehnen'],['dig sth. up','(to) dig sth. up, dug, dug','etwas ausgraben']];
 for(const [lemma,foreign,german]of samples){
  const old={id:'stable',bookId:book.id,kind:'verb-infinitive',foreign:lemma,infinitive:lemma,german:'old',page:'1'};
  const source={id:'source',bookId:'words',page:'1',foreign,german};
  const fixed=english.restoreEntry(old,book,[old,source]);
  assert.equal(fixed.id,old.id);assert.equal(fixed.sourceVocabId,source.id);assert.equal(fixed.german,german);assert.ok(fixed.foreign.startsWith('(to) '));assert.doesNotMatch(fixed.foreign,/\[/);
  assert.deepEqual(english.restoreEntry(fixed,book,[fixed,source]),fixed);
  const ambiguous=english.restoreEntry(old,book,[old,source,{...source,id:'other',german:'other meaning'}]);assert.equal(ambiguous.sourceVocabId,undefined);
 }
 const withNote=english.restoreEntry({kind:'verb-infinitive',foreign:'kick off',page:'1'},book,[{bookId:'words',page:'1',foreign:'(to) kick off [kɪk] (infml)',german:'beginnen'}]);
 assert.deepEqual(withNote.sourceNotes,['infml']);assert.equal(withNote.foreign,'(to) kick off');
 assert.equal(english.principalMatches('(to) take, took, taken',{principalParts:['take','took','taken']}),true);
 assert.equal(english.principalMatches('to take took taken',{principalParts:['take','took','taken']}),true);
});
test('Restored source phrases produce complete English forms and German complements in every tense',async()=>{
 const {motor,lookup}=await require('./helpers/english-fixture.cjs')();
 const book={id:'complete',kind:'verbs',lang:'en-US'};
 const entries=[['contact sb.','mit jm. Kontakt aufnehmen, sich bei jm. melden'],['arrest sb.','jn. verhaften'],['refuse (to do sth.)','sich weigern (, etwas zu tun); ablehnen'],['react (to)','reagieren (auf)']].map(([foreign,german],i)=>({id:String(i),kind:'verb-infinitive',foreign:'(to) '+foreign,german,bookId:book.id}));
 const db=VOCVerbDatabase.create({getItem:()=>null,setItem:()=>{}},(w,l)=>motor.conjugate(w,l),null,v=>english.enrich(v,(w,l)=>motor.conjugate(w,l),lookup));
 const snapshot=await db.prepare(book,entries,[],Object.keys(english.titles));
 for(const verb of Object.values(snapshot.verbs)){assert.equal(english.translationComplete(verb),true,verb.infinitive);for(const cards of Object.values(verb.cards)){assert.equal(cards.length,6);for(const card of cards)assert.match(card.foreign,/sb\.|\(to(?: do sth\.)?\)/);}}
 assert.equal(snapshot.verbs['contact sb.'].cards['present perfect'][0].foreign,'I have contacted sb.');
 assert.equal(snapshot.verbs['arrest sb.'].cards['present perfect'][0].german,'ich habe jemanden verhaftet');
 assert.match(snapshot.verbs['refuse (to do sth.)'].cards['present perfect'][0].german,/etwas zu tun/);
 assert.match(english.personPrompt(snapshot.verbs['contact sb.'],'present perfect',0).prompt,/^Present Perfect Simple:/);
});

test('Dictionary formality notes remain optional, including original note order',()=>{
 const record={foreign:"clothing ['kləʊðɪŋ] (fml; nicht zählbar)",german:'die Kleidung',lang:'en-US'};
 for(const answer of [record.foreign,'clothing','clothing fml','clothing nicht zählbar'])assert.equal(rules.matchWord({record,tLang:'en-US'},answer),true,answer);
 for(const answer of ['fml','nicht zählbar','clothing wrong'])assert.equal(rules.matchWord({record,tLang:'en-US'},answer),false,answer);
});
