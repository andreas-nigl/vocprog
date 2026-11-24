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

test("Actual normal grading handler uses stored direct translations and preserves sentence commas",()=>{
 const source=fs.readFileSync(require.resolve("../vocprog-enhancements.js"),"utf8");
 const start=source.indexOf("  window.gradeCurrentAnswer=function(){"),end=source.indexOf("  window.advanceOrGrade=",start);
 const run=new Function("api","item","value",[
 "let analyzedThisCard=false,currentIndex=0;const trainingItems=[item],nodes={answerInput:{value},answerFeedback:{},targetText:{classList:{remove(){}}}};",
 "let result;const window={VOCAnswerRules:api},get=id=>nodes[id],simplified=api.normalizeWord,logEvent=(action,item,data)=>result=data.correct;",
 source.slice(start,end),"window.gradeCurrentAnswer();return result;"
 ].join("\n"));
 const record={foreign:"(to) refuse",german:"ablehnen; sich weigern",lang:"en-US"};
 assert.equal(run(api,{kind:"words",record,target:record.foreign,tLang:"en-US"},"refuse"),true);
 assert.equal(run(api,{kind:"words",record,target:record.german,tLang:"de-DE"},"ablehnen"),true);
 assert.equal(run(api,{kind:"words",record,target:record.german,tLang:"de-DE"},"ablehnen, falsches"),false);
 assert.equal(run(api,{kind:"sentences",target:"Hello, world!",tLang:"en-US"},"Hello ,world!"),true);
 assert.equal(run(api,{kind:"sentences",target:"Hello, world!",tLang:"en-US"},"Hello world!"),false);
});
test("Metadata content key survives database object-key ordering",()=>{
 const a={foreign:"refuse",german:"ablehnen",lang:"en-US",answerParts:{foreign:[{core:"refuse",optionalSuffixes:[]}],german:[{core:"ablehnen",optionalSuffixes:[]}]}};
 const b={...a,answerParts:{german:[{optionalSuffixes:[],core:"ablehnen"}],foreign:[{optionalSuffixes:[],core:"refuse"}]}};
 assert.equal(api.contentKey(a),api.contentKey(b));
});

test("Trailing pronunciation and marked plural remain optional without inventing ellipsis answers",()=>{
 const ref={forms:{"simple past":[["sprang"]]},participle:["sprung"]};
 const r=compile("(to) spring up, sprang, sprung [,sprɪŋ 'ʌp]","aus dem Boden schießen","en-US",lemma=>lemma==="spring"?ref:null).foreign;
 assert.equal(r.mode,"variants");
 for(const v of ["spring up","to spring up sprang sprung"])assert.equal(api.matchSide(v,r,"en-US"),true);
 assert.equal(api.matchSide("inch",side("inch, pl inches"),"en-US"),true);
 assert.equal(api.matchSide("inch inches",side("inch, pl inches"),"en-US"),true);
 assert.equal(compile("(to) run a school/company/restaurant/..., ran, run").foreign.mode,"legacy");
});

test("Grouped imperative and principal parts retain every required form while brackets stay optional",()=>{
 const expected="(tu) mets / (nous) mettons / (vous) mettez";
 assert.equal(api.matchGrouped("mets / mettons / mettez",expected,"fr-FR"),true);
 assert.equal(api.matchGrouped("tu mets / nous mettons / vous mettez",expected,"fr-FR"),true);
 assert.equal(api.matchGrouped("mets",expected,"fr-FR"),false);
 assert.equal(api.matchGrouped("mets / mettons / metez",expected,"fr-FR"),false);
 assert.equal(api.matchGrouped("go / went / gone","(to) go / went / gone","en-US"),true);
});
test("Actual explicit verb grading preserves optional labels and German synonym behavior with the new module",()=>{
 const source=fs.readFileSync(require.resolve("../vocprog-enhancements.js"),"utf8");
 const start=source.indexOf("  window.gradeCurrentAnswer=function(){",source.indexOf("  const oldGrade=window.gradeCurrentAnswer;"));
 const end=source.indexOf("\n\n\n  function resetRecord",start);
 const presentation=require("../vocprog-verb-presentation.js");
 const run=new Function("api","presentation","item","value",[
 "let analyzedThisCard=false,currentIndex=0;const trainingItems=[item],nodes={answerInput:{value},answerFeedback:{},targetText:{classList:{remove(){}}}};",
 "let result;const window={VOCAnswerRules:api,VOCVerbPresentation:presentation},get=id=>nodes[id],simplified=x=>x.toLowerCase().replace(/[.!?,;:]/g,' ').replace(/\\s+/g,' ').trim(),logEvent=(action,item,data)=>result=data.correct;",
 source.slice(start,end),"window.gradeCurrentAnswer();return result;"
 ].join("\n"));
 const item={kind:"verbs",record:{kind:"verb-imperative"},target:"(tu) mets / (nous) mettons / (vous) mettez",tLang:"fr-FR"};
 assert.equal(run(api,presentation,item,"mets / mettons / mettez"),true);
 assert.equal(run(api,presentation,item,"mets"),false);
 assert.equal(run(api,presentation,{kind:"verbs",record:{kind:"verb-form"},target:"ich setze/stelle/lege",tLang:"de-DE"},"ich stelle"),true);
});

test("Grouped records never use the relaxed single-core word matcher",()=>{
 assert.equal(api.matchWord({record:{kind:"verb-principal",foreign:"go / went / gone",german:"gehen / gehend / gegangen",lang:"en-US"},tLang:"en-US"},"go"),null);
});
