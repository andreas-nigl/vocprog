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
 assert.equal(compile("le/la jeune","der/die Jugendliche","fr-FR").foreign.mode,"required-groups");
 assert.equal(compile("le voisin/la voisine","der/die Nachbar/in","fr-FR").german.mode,"required-groups");
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

test('Paired noun genders require both forms; optional brackets and compact slash spelling remain valid',()=>{
 const record={foreign:'le voisin/la voisine',german:'der/die (Sitz-)Nachbar/in',lang:'fr-FR'};
 const rules=api.prepare(record);
 for(const input of ['le voisin/la voisine','le voisin, la voisine','la voisine le voisin'])assert.equal(api.matchSide(input,rules.foreign,'fr-FR'),true,input);
 for(const input of ['le voisin','la voisine','le voisin la voisne','levoisin la voisine'])assert.equal(api.matchSide(input,rules.foreign,'fr-FR'),false,input);
 for(const input of ['der/die Nachbar/in','der/die Sitznachbar/in','der Nachbar / die Nachbarin','die Nachbarin der Sitznachbar'])assert.equal(api.matchSide(input,rules.german,'de-DE'),true,input);
 for(const input of ['der Nachbar','die Nachbarin','der Nachbar die Nachbarinn','der/die Nachber/in'])assert.equal(api.matchSide(input,rules.german,'de-DE'),false,input);
 assert.match(api.answerHint({kind:'words',record,tLang:'fr-FR'}),/Männliche und weibliche/);
 assert.equal(api.answerHint({kind:'sentences',record,tLang:'fr-FR'}),'');
 const ordinary=compile('le/la même','der-/die-/dasselbe, der/die/das Gleiche','fr-FR');
 assert.equal(ordinary.foreign.mode,'variants');
});
test('Targeted repairs preserve all unrelated prepared metadata and do not repeatedly invoke the lookup',()=>{
 const record={foreign:'le voisin/la voisine',german:'der/die (Sitz-)Nachbar/in',lang:'fr-FR'};
 record.answerRules={version:1,contentKey:api.contentKey(record),foreign:{mode:'variants',groups:[{cores:['le voisin','la voisine'],suffixes:[]}]},german:{mode:'legacy'}};
 const repaired=api.prepare(record);assert.equal(repaired.features.pairedGender,1);
 record.answerRules=repaired;assert.strictEqual(api.prepare(record),repaired);
 const other={foreign:'(to) refuse',german:'ablehnen',lang:'en-US'};other.answerRules=api.prepare(other);
 assert.strictEqual(api.prepare(other),other.answerRules);
});
test('Open example rows accept complete printed examples, not fragments or incorrect extra principal parts',()=>{
 const reference={forms:{'simple past':[['ran']]},participle:['run']};
 const record={foreign:'(to) run a school/company/restaurant/..., ran, run',german:'eine Schule / eine Firma / ein Restaurant / ... leiten, führen',lang:'en-US'};
 const r=api.prepare(record,{lookup:lemma=>lemma==='run'?reference:null});
 for(const input of ['run a school','to run a company','run a restaurant ran run'])assert.equal(api.matchSide(input,r.foreign,'en-US'),true,input);
 for(const input of ['run','run a','ran','run a hospital','run a school ranned run'])assert.equal(api.matchSide(input,r.foreign,'en-US'),false,input);
 for(const input of ['eine Schule leiten','eine Firma führen','ein Restaurant leiten'])assert.equal(api.matchSide(input,r.german,'de-DE'),true,input);
 for(const input of ['eine Schule','leiten','eine Firma führren'])assert.equal(api.matchSide(input,r.german,'de-DE'),false,input);
 const scanned=api.prepare({...record,answerParts:{foreign:[{core:'(to) run a school/company/restaurant',optionalSuffixes:['ran','run']}],german:[]}});
 assert.equal(api.matchSide('run a school',scanned.foreign,'en-US'),true);
});
test('Lower real printed spelling, missing legacy kind, stored metadata and English verb infinitive all accept bare or to form',()=>{
 for(const text of ["(to) lower ['ləʊə]",'(to) lower']){
  const record={foreign:text,german:'senken, verschlechtern',lang:'en-US'};
  record.answerRules=JSON.parse(JSON.stringify(api.prepare(record)));
  for(const input of ['lower','to lower'])assert.equal(api.matchWord({kind:'words',record,tLang:'en-US'},input),true,input);
  for(const input of ['senken','verschlechtern'])assert.equal(api.matchWord({record,tLang:'de-DE'},input),true);
  for(const input of ['tolower','to lowwer'])assert.equal(api.matchWord({record,tLang:'en-US'},input),false);
 }
 const record={foreign:'lower',german:'senken, verschlechtern',lang:'en-US',kind:'verb-infinitive'};
 const r=api.prepare(record);assert.equal(r.features.englishInfinitiveTo,1);
 record.answerRules=r;
 for(const input of ['lower','to lower'])assert.equal(api.matchWord({record,tLang:'en-US'},input),true);
 assert.equal(api.matchExplicit('to lower',['lowered'],'en-US'),false,'tense cards are not infinitive cards');
});

test('Screenshot regression: original slash placeholders and their expanded alternatives are accepted symmetrically',()=>{
 const record={foreign:'(to) remove sb./sth.',german:'jn./etwas entfernen',lang:'en-US'};
 record.answerRules=JSON.parse(JSON.stringify(api.prepare(record)));
 const before=JSON.stringify(record.answerRules);
 for(const input of ['to remove sb./sth.','remove sb./sth.','to remove sb/sth','remove sb. / sth.','remove sb sth','to remove sb., sth.','remove somebody','to remove something','remove someone/something'])assert.equal(api.matchWord({record,tLang:'en-US'},input),true,input);
 for(const input of ['remove','to','to remove sb./sthh.','to remove sb/garbage','removesb./sth.','remove sb somethingg','remove somebody/somthing'])assert.equal(api.matchWord({record,tLang:'en-US'},input),false,input);
 for(const input of ['jn./etwas entfernen','jemanden entfernen','etwas entfernen'])assert.equal(api.matchWord({record,tLang:'de-DE'},input),true,input);
 assert.equal(JSON.stringify(record.answerRules),before,'matching never rewrites stored metadata');
});
test('Slash expansion does not weaken required gender pairs, sentences or grouped verb forms',()=>{
 const record={foreign:'le voisin/la voisine',german:'der/die (Sitz-)Nachbar/in',lang:'fr-FR'};
 assert.equal(api.matchWord({record,tLang:'fr-FR'},'le voisin'),false);
 assert.equal(api.matchWord({record,tLang:'de-DE'},'der/die Nachbar/in'),true);
 assert.equal(api.matchWord({record,tLang:'de-DE'},'der/die Nachbar/inn'),false);
 assert.equal(api.matchExplicit('tu viens/venez',['tu viens'],'fr-FR'),false);
 assert.notEqual(api.layout('Hello, world!'),api.layout('Hello world!'));
});

const notationCases=require('./fixtures/answer-notation.json');
const printedRun=lemma=>lemma==='run'?{forms:{'simple past':[['ran']]},participle:['run']}:null;
for(const fixture of notationCases)test('Complete notation and invalid fragments: '+fixture.foreign,()=>{
 const record={...fixture};
 record.answerRules={version:1,contentKey:api.contentKey(record),foreign:{mode:'variants',groups:[{cores:['ae','infml','become fast'],suffixes:fixture.foreign.includes('run a school')?['ran','run']:[]}]},german:{mode:'variants',groups:[{cores:['vor jemandem','der-'],suffixes:[]}]}};
 const prepared=api.prepare(record,{lookup:printedRun});record.answerRules=JSON.parse(JSON.stringify(prepared));
 for(const [side,expected]of Object.entries(fixture.expected))for(const [verdict,inputs]of Object.entries(expected))for(const input of inputs){
  assert.equal(api.matchWord({record,tLang:side==='german'?'de-DE':record.lang},input),verdict==='accept',side+': '+input);
 }
 assert.strictEqual(api.prepare(record,{lookup:()=>{throw Error('second preparation');}}),record.answerRules);
});
test('Annotation-only scan cores and truncated slash fragments cannot become direct translations',()=>{
 const record={foreign:"borough ['bʌrə], (AE ['bɜ:roʊ])",german:'der Stadtbezirk',lang:'en-US',answerParts:{foreign:[{core:'AE',optionalSuffixes:[]}],german:[{core:'der Stadtbezirk',optionalSuffixes:[]}]}};
 const r=api.prepare(record);assert.equal(api.matchSide('AE',r.foreign,'en-US'),false);assert.equal(api.matchSide('borough',r.foreign,'en-US'),true);
 const phrase={foreign:'be in awe',german:'vor jm./etwas voller Ehrfurcht sein',lang:'en-US',answerParts:{german:[{core:'vor jm.',optionalSuffixes:[]}]}};
 const p=api.prepare(phrase);assert.equal(api.matchSide('vor jm',p.german,'de-DE'),false);assert.equal(api.matchSide('vor jemandem voller Ehrfurcht sein',p.german,'de-DE'),true);
});
test('Existing verified principal parts survive a notation repair without a new dictionary call',()=>{
 const record={foreign:'(to) run a school/company/restaurant/..., ran, run',german:'eine Schule / eine Firma / ein Restaurant / ... leiten, führen',lang:'en-US'};
 record.answerRules={version:1,contentKey:api.contentKey(record),features:{openExamples:1},foreign:{mode:'variants',groups:[{cores:['run a school'],suffixes:['ran','run']}]},german:{mode:'legacy'}};
 const r=api.prepare(record);assert.equal(api.matchSide('to run a company ran run',r.foreign,'en-US'),true);assert.equal(api.matchSide('ranned',r.foreign,'en-US'),false);
});
test('Corrected persisted metadata retains the string suffix contract for older open clients',()=>{
 for(const record of notationCases){const prepared=api.prepare(record,{lookup:printedRun});for(const side of ['foreign','german'])for(const group of prepared[side].groups||[]){
  assert.ok(group.suffixes.every(suffix=>typeof suffix==='string'),record.foreign);
  const legacyPatterns=group.suffixes.reduce((lists,suffix)=>lists.flatMap(prior=>[prior,[...prior,...suffix.split(' ')]]),[[]]);
  assert.ok(legacyPatterns.length>0);
 }}
});
