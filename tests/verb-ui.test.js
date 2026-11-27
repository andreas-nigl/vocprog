"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const code=fs.readFileSync(path.join(root,"vocprog-enhancements.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"vocprog-enhancements.css"),"utf8");

function fragment(from,to){
  const a=code.indexOf(from),b=code.indexOf(to,a);
  assert.ok(a>=0&&b>a,"function boundaries: "+from);
  return code.slice(a,b);
}
test("Trainer table is a separate second card below the trainer",()=>{
  assert.match(html,/<\/div>\s*<section id="verbTablePanel"/);
  assert.match(css,/\.verb-table-panel\{[^}]*border-radius:16px/);
  assert.match(css,/\.trainer-top-row\{display:grid/);
  assert.match(css,/#verbTableToggle\.icon-btn\{[^}]*border:0/);
});
test("Verb table renders infinitive, participle, imperative and tense headings",()=>{
  assert.match(code,/row\("Infinitif : "/);
  assert.match(code,/row\("Participe passé : "/);
  assert.match(code,/row\("Impératif : "/);
  assert.match(code,/row\(match\?\.\[1\]\|\|title,match\?\.\[2\]\|\|"Zeitform",true\)/);
});
test("Per-page verb references start at V1 and do not inherit OCR gaps",()=>{
  const source=fragment("  function selectedVerbEntries(){","  const oldStartTraining=");
  const get=id=>id==="tenseSelect"?{value:"présent"}:null;
  const data=[
    {bookId:"fr",page:"156",kind:"verb-infinitive",verbId:"venir",refVocab:"S156 V62"},
    {bookId:"fr",page:"156",kind:"verb-form",verbId:"venir",tense:"présent",verification:"reference-verified",refVocab:"S156 V63"},
    {bookId:"fr",page:"156",kind:"verb-infinitive",verbId:"manger",refVocab:"S156 V104"},
    {bookId:"fr",page:"157",kind:"verb-infinitive",verbId:"aller",refVocab:"S157 V26"}
  ];
  const f=new Function("allVocab","get","activeBook","bookKind","baseVerbKinds","normalizeTense","window",
    source+"return selectedVerbEntries;")(
    ()=>data,get,()=>({id:"fr",kind:"verbs"}),()=> "verbs",
    new Set(["verb-infinitive"]),x=>String(x||"").toLowerCase(),
    {VOCVerbDatabase:{lemmaOf:v=>v.verbId||v.infinitive||v.lemma||v.foreign}}
  );
  assert.deepEqual(f().map(x=>x.refVocab),[
    "S156 V1","S156 V2","S157 V1"
  ]);
  assert.equal(data[0].refVocab,"S156 V62","stored references must remain unchanged");
});
test("Verb books are never automatically consolidated on startup or sync",()=>{
  assert.doesNotMatch(code,/consolidateVerbBooks/);
});


test("Ordinary vocabulary books renumber remaining entries per page without altering stored references",()=>{
  const source=fragment("  filterVocabByPages=function(){","  const oldSave=saveToLocalStorage;");
  const originals=[
    {id:"w1",bookId:"book",page:"156",refVocab:"S156 V62",foreign:"bonjour"},
    {id:"w2",bookId:"book",page:"156",refVocab:"S156 V64",foreign:"merci"},
    {id:"w3",bookId:"book",page:"157",refVocab:"S157 V8",foreign:"salut"}
  ];
  const fields={pageRangeInput:{value:"156-157"}};
  let populated=false;
  const parsePageRanges=()=>[156,157];
  const get=id=>fields[id];
  const run=new Function("vocabList","chosenBook","parsePageRanges","get",
    "populateSelectors",
    "let filteredVocabList=[],filterVocabByPages;"+source+
    "return {run:filterVocabByPages,getList:()=>filteredVocabList};")(
    originals,"book",parsePageRanges,get,()=>{populated=true;}
  );
  run.run();
  assert.equal(populated,true);
  assert.deepEqual(run.getList().map(v=>v.refVocab),[
    "S156 V1","S156 V2","S157 V1"
  ]);
  assert.deepEqual(originals.map(v=>v.refVocab),[
    "S156 V62","S156 V64","S157 V8"
  ]);
});

test("Book action buttons are neutral outlined controls with thin red delete icon",()=>{
  assert.match(css,/\.book-manager #deleteBookBtn \{background:#fff;color:#c62828/);
  assert.match(css,/border:1px solid #111827/);
  assert.match(css,/width:40px;min-width:40px;max-width:40px/);
});
test("Trainer close remains in the right grid column when table is hidden",()=>{
  assert.match(css,/\.trainer-top-row > button:last-child \{grid-column:3;justify-self:end\}/);
  assert.match(css,/#verbTableToggle\.icon-btn \{grid-column:2;grid-row:1\}/);
});
test("Verb table reads only prepared data, with no conjugation on opening",()=>{
  const source=fragment("  window.toggleVerbTable=","  function validMerge");
  assert.match(source,/verbDatabase\.get\(item.bookId\)/);
  assert.doesNotMatch(source,/\.conjugate\(|VOCMorphology/);
  assert.match(source,/prepared\.cards\[tense\]/);
});

test("Repeat scan reports existing unique verbs without zero conflict warnings",()=>{
  const source=fragment("  window.describeVOCScan=function", "  window.ingestVerbInfinitives=");
  const window={VOCGeneratedFrenchForms:0,VOCScanVerificationWarnings:0};
  new Function("window","books","bookKind","allVocab",source)(window,
    [{id:"fr",lang:"fr-FR",kind:"verbs"}],b=>b.kind,
    ()=>Array.from({length:33},(_,i)=>({bookId:"fr",infinitive:"verb"+i})).concat([
      {bookId:"fr",infinitive:"verb0",foreign:"conjugated"}]));
  const summary=window.describeVOCScan({language:"fr-FR"});
  assert.match(summary,/Keine neuen Einträge/);
  assert.match(summary,/33 verschiedene Verben/);
  assert.doesNotMatch(summary,/widersprüchliche/);
  window.VOCScanVerificationWarnings=2;
  assert.match(window.describeVOCScan({language:"fr-FR",infinitives:1}),/2 widersprüchliche/);
});

test("Sync cannot expose learning setup during an active exercise",()=>{
  assert.match(code,/target.length===0\|\|!get\("trainerCard"\).classList.contains\("hidden"\)/);
  assert.match(css,/body:has\(#trainerCard:not\(\.hidden\)\) #rangeCard\{display:none!important\}/);
});

test("Verb instruction and vocabulary use separate lines without altering the task",()=>{
  const start=code.indexOf("  function renderVerbPrompt("),end=code.indexOf("  const oldCard=showCard;",start);
  assert.ok(start>=0&&end>start);
  const catalogs={"en-US":[["principal parts","Stammformen (Gegenwart, Vergangenheit, Partizip)"],["simple present","Simple Present (Gegenwart)"],["present perfect","Present Perfect Simple (vollendete Gegenwart)"]],"fr-FR":[["présent","Présent (Gegenwart)"],["impératif","Impératif (Befehlsform)"]]};
  let language="en-US";
  const node=()=>({className:"",textContent:"",children:[],replaceChildren(...children){this.children=children;}});
  const document={createElement:node,createTextNode:text=>({textContent:text})};
  const render=new Function("TENSES","normalizeTense","activeBook","document",code.slice(start,end)+"return renderVerbPrompt;")(catalogs,x=>x,()=>({lang:language}),document);
  for(const [lang,tense,prompt,heading,body] of [
    ["en-US","simple present","Simple Present: gehen (ich)","Simple Present:","gehen (ich)"],
    ["en-US","present perfect","Present Perfect Simple: gehen (ich)","Present Perfect Simple:","gehen (ich)"],
    ["en-US","infinitiv","(to) take","Infinitiv:","(to) take"],
    ["en-US","infinitiv","nehmen","Infinitiv:","nehmen"],
    ["en-US","principal parts","nehmen","Stammformen (Gegenwart, Vergangenheit, Partizip):","nehmen"],
    ["fr-FR","présent","Présent: gehen (ich)","Présent:","gehen (ich)"],
    ["fr-FR","présent","je vais","Présent:","je vais"],
    ["fr-FR","impératif","geh!","Impératif:","geh!"]
  ]){
    language=lang;const item=Object.freeze({kind:"verbs",verbTense:tense,prompt,target:"original"}),el=node();
    render(item,el);assert.equal(el.children[0].textContent,heading);assert.equal(el.children[2].textContent,body);assert.equal(item.prompt,prompt);
  }
  const regular=node();render({kind:"words",prompt:"ordinary"},regular);assert.deepEqual(regular.children,[]);
  assert.match(code,/Stammformen \(Gegenwart, Vergangenheit, Partizip\)/);
  const labels=code.match(/Stammformen \(Gegenwart, Vergangenheit, Partizip\)/g)||[];assert.equal(labels.length,1,"one authoritative catalog label");
  assert.doesNotMatch(code,/Stammformen \(Grundform, Vergangenheit, Partizip\)/);
  assert.match(css,/\.verb-prompt-heading\{display:block;font-weight:400\}/);
  assert.match(css,/#direction\{display:block;appearance:none/);
  assert.match(css,/\.vocab-choice-trigger::after,\.tense-picker \.tense-choice-toggle::after,\.direction-select-wrap::after\{content:"▾"[^}]*right:10px[^}]*font-size:\.95rem[^}]*font-weight:400[^}]*pointer-events:none/);
  assert.match(html,/<div class="direction-select-wrap"><select id="direction">/);
});
