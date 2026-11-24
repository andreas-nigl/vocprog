"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const api=require("../vocprog-answer-rules.js");
const compile=(foreign,german="die Bedeutung",lang="en-US",lookup)=>api.prepare({foreign,german,lang},{lookup});
const side=(foreign)=>compile(foreign).foreign;
test("Optional brackets retain complete lexical units and reject wrong extras",()=>{
 for(const [text,good,bad] of [
 ["(to) refuse",["refuse","to refuse"],["to refuze","torefuse","to"]],
 ["over and over (again)",["over and over","over and over again"],["over and over aggain","overandover"]],
 ["reaction(to)",["reaction","reaction to"],["reactionto"]],
 ["(self-)confidence",["confidence","self-confidence"],["selfconfidence"]]
 ]){
  for(const input of good)assert.equal(api.matchSide(input,side(text),"en-US"),true,input);
  for(const input of bad)assert.equal(api.matchSide(input,side(text),"en-US"),false,input);
 }
});
test("One complete synonym suffices, but entered further meanings must be known and correct",()=>{
 const rules=compile("refuse","sich weigern (, etwas zu tun); ablehnen").german;
 for(const input of ["ablehnen","sich weigern","sich weigern etwas zu tun","ablehnen, sich weigern"])assert.equal(api.matchSide(input,rules,"de-DE"),true,input);
 for(const input of ["weigern","ablehen","ablehnen falsches","sichweigern"])assert.equal(api.matchSide(input,rules,"de-DE"),false,input);
});
test("Verified principal parts are optional suffixes, never standalone translations",()=>{
 const reference={forms:{"simple past":[["dug"]]},participle:["dug"]};
 const r=compile("(to) dig sth. up, dug, dug","etwas ausgraben","en-US",lemma=>lemma==="dig"?reference:null).foreign;
 for(const input of ["dig something up","to dig sth up","dig something up, dug, dug","dig something up dug"])assert.equal(api.matchSide(input,r,"en-US"),true,input);
 for(const input of ["dug","dug dug","dig something up dug digged","digsomething up"])assert.equal(api.matchSide(input,r,"en-US"),false,input);
 assert.equal(compile("(to) dig sth. up, dug, dug").foreign.mode,"legacy");
});
test("Suffix brackets, synonyms and literal pronunciations never permit arbitrary misspellings",()=>{
 const r=compile("dur/dure","reine(r, s)","fr-FR");
 for(const v of ["reine","reiner","reines"])assert.equal(api.matchSide(v,r.german,"de-DE"),true);
 assert.equal(api.matchSide("reiner s",r.german,"de-DE"),false);
 assert.equal(api.matchSide("dur",r.foreign,"fr-FR"),true);
 assert.equal(api.matchSide("dure",r.foreign,"fr-FR"),true);
 assert.equal(compile("le/la jeune","der/die Jugendliche","fr-FR").foreign.mode,"variants");
 assert.equal(compile("le voisin/la voisine","der/die Nachbar/in","fr-FR").german.mode,"legacy");
 const p=side("pure [pjʊə]");
 assert.equal(api.matchSide("pure",p,"en-US"),true);
 assert.equal(api.matchSide("pure pyure",p,"en-US"),false);
});
test("Sentence punctuation is mandatory; punctuation spacing is optional; lexical spaces stay mandatory",()=>{
 for(const [a,b] of [["Hello, world!","Hello ,world!"],["Hallo (Welt), hier!","Hallo (Welt),hier!"],["Hallo (Welt) danach.","Hallo (Welt)danach."]])assert.equal(api.layout(a),api.layout(b));
 for(const [a,b] of [["Hello, world!","Hello world!"],["over and over","overand over"]])assert.notEqual(api.layout(a),api.layout(b));
 const r=side("over and over");
 assert.equal(api.matchSide("over,and over",r,"en-US"),true);
 assert.equal(api.matchSide("overand over",r,"en-US"),false);
});
test("Version and exact source content prevent repeated processing, without an unclear marker",()=>{
 const record={foreign:"(to) dig, dug, dug",german:"graben",lang:"en-US"};
 record.answerRules=api.prepare(record);
 assert.equal(record.answerRules.foreign.mode,"legacy");
 assert.strictEqual(api.prepare(record,{lookup:()=>{throw Error("must not inspect again");}}),record.answerRules);
 assert.equal(JSON.stringify(record.answerRules).includes('"unclear"'),false);
 assert.notEqual(api.prepare({...record,foreign:"(to) refuse"}).contentKey,record.answerRules.contentKey);
});
test("Structured scan data accepts full cores and verified optional suffixes but rejects truncated cores",()=>{
 const record={foreign:"(to) dig sth. up, dug, dug",german:"etwas ausgraben",lang:"en-US",
 answerParts:{foreign:[{core:"(to) dig sth. up",optionalSuffixes:["dug","dug"]}],german:[{core:"etwas ausgraben",optionalSuffixes:[]}]}};
 const r=api.prepare(record);assert.equal(r.source,"scan");
 assert.equal(api.matchSide("dig something up",r.foreign,"en-US"),true);
 const bad=api.prepare({...record,answerParts:{...record.answerParts,foreign:[{core:"to",optionalSuffixes:[]}]}});
 assert.equal(bad.foreign.mode,"legacy");
});
test("Explicit conjugation still requires person and requested tense",()=>{
 assert.equal(api.matchExplicit("tu es venu",["tu es venu(e)"],"fr-FR"),true);
 assert.equal(api.matchExplicit("tu es venue",["tu es venu(e)"],"fr-FR"),true);
 assert.equal(api.matchExplicit("venir",["tu es venu(e)"],"fr-FR"),false);
 assert.equal(api.matchExplicit("je suis venu",["tu es venu(e)"],"fr-FR"),false);
});
test("Browser module has no fetch, timers or AI call during matching or legacy fallback",()=>{
 const context={fetch:()=>{throw Error("unexpected request");},setTimeout:()=>{throw Error("unexpected timer");}};
 vm.runInNewContext(fs.readFileSync(require.resolve("../vocprog-answer-rules.js"),"utf8"),context);
 const record={foreign:"(to) dig, dug, dug",german:"graben",lang:"en-US"};
 record.answerRules=context.VOCAnswerRules.prepare(record);
 for(let i=0;i<3;i++)assert.equal(context.VOCAnswerRules.matchWord({record,tLang:"en-US"},"dig"),null);
});
