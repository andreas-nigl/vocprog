"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
require("../vocprog-wasm-adapter.js");
require("../vocprog-fr-reference.js");
require("../vocprog-german-forms.js");
require("../vocprog-verb-database.js");
const root=path.join(__dirname,"..");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"reference/manifest.json")));
const shards=new Map();
async function lookup(language,lemma){
  const spec=manifest.languages[language];if(!spec)return null;
  const filename=path.join(root,"reference",spec.code,lemma.codePointAt(0).toString(16)+".json");
  if(!fs.existsSync(filename))return null;
  if(!shards.has(filename))shards.set(filename,JSON.parse(fs.readFileSync(filename)));
  const entry=shards.get(filename)[lemma];
  return entry?{...entry,sources:entry.sources||[manifest.sources[entry.sourceKey]]}:null;
}
const loaded=(async()=>{
  const source=fs.readFileSync(path.join(root,"vendor/ablaut/ablaut.js"),"utf8");
  const wasm=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
  await wasm.default({module_or_path:fs.readFileSync(path.join(root,"vendor/ablaut/ablaut_bg.wasm"))});
  return VOCWasmAdapter.create(wasm.conjugate);
})();
const book={id:"test",lang:"fr-FR",kind:"verbs"};
const tenses=VOCFrenchReference.tenses;
function entry(infinitive,german){return {id:infinitive,bookId:book.id,kind:"verb-infinitive",infinitive,foreign:infinitive,german,page:"1"};}
function storage(initial=null){let value=initial;return {getItem:()=>value,setItem:(_,next)=>{value=next;}};}
async function database(disk=storage(),counters={motor:0,checks:0}){
  const engine=await loaded;
  const db=VOCVerbDatabase.create(disk,(w,l)=>{counters.motor++;try{return engine.conjugate(w,l);}catch{return null;}},
    w=>VOCFrenchReference.conjugate(w),(verb,language,morphology)=>VOCGermanForms.enrich(verb,language,morphology,
      (language,lemma)=>{counters.checks++;return lookup(language,lemma);}));
  return {db,disk,counters};
}
test("German engine produces separable verbs and independently matched bilingual rows",async()=>{
  const {db}=await database();
  const data=await db.prepare(book,[entry("rendre","zurückgeben"),entry("être","sein"),entry("commencer","beginnen")],[],tenses);
  for(const verb of Object.values(data.verbs)){
    assert.deepEqual(verb.missing,[]);
    for(const card of Object.values(verb.cards).flat()){
      assert.ok(card.german);assert.equal(card.foreignVerification.status,"reference-matched");
      assert.equal(card.germanVerification.status,"reference-matched");
    }
    assert.ok(verb.verificationSources.some(source=>source.url.includes("lefigaro")));
    assert.ok(verb.verificationSources.some(source=>source.url.includes("verbformen")));
  }
  assert.equal(data.verbs.rendre.cards.présent[3].german,"wir geben zurück");
  assert.equal(data.verbs.rendre.cards["passé composé"][3].german,"wir haben zurückgegeben");
  assert.ok(data.verbs.rendre.cards.présent[4].acceptedGerman.includes("Sie geben zurück"));
  assert.match(data.verbs.rendre.participleGerman,/zurückgegeben/);
  assert.match(data.verbs.rendre.imperativeGerman,/gib zurück/);
});
test("Adding a verb checks only the new record; reload and copied page check nothing",async()=>{
  const first=await database(),a=entry("rendre","zurückgeben"),b=entry("être","sein");
  await first.db.prepare(book,[a],[],tenses);
  const diskBefore=JSON.parse(first.disk.getItem());
  const second=await database(first.disk);
  await second.db.prepare(book,[a,{...a,id:"other-page",page:"2"}],[],tenses);
  assert.equal(second.counters.motor,0);assert.equal(second.counters.checks,0);
  await second.db.prepare(book,[a,b],[],tenses);
  const diskAfter=JSON.parse(first.disk.getItem());
  const key=Object.keys(diskBefore)[0];assert.deepEqual(diskAfter[key],diskBefore[key]);
  const expected=await database();await expected.db.prepare(book,[b],[],tenses);
  assert.deepEqual(second.counters,expected.counters);
});
test("Prepared records survive backup transfer to a different storage without regeneration",async()=>{
  const first=await database();await first.db.prepare(book,[entry("rendre","zurückgeben")],[],tenses);
  const next=await database(storage(first.disk.getItem()));
  const result=await next.db.prepare(book,[entry("rendre","zurückgeben")],[],tenses);
  assert.deepEqual(result.verbs.rendre.missing,[]);
  assert.deepEqual(next.counters,{motor:0,checks:0});
});
test("Unknown reference data cannot be labeled independently checked or trained",async()=>{
  const engine=await loaded;
  const db=VOCVerbDatabase.create(storage(),(w,l)=>engine.conjugate(w,l),null,
    (verb,language,morphology)=>VOCGermanForms.enrich(verb,language,morphology,async()=>null));
  const result=await db.prepare(book,[entry("rendre","zurückgeben")],[],tenses);
  assert.equal(result.verbs.rendre.missing.length,7);
  assert.equal(result.verbs.rendre.cards.présent[0].foreignVerification.status,"pending");
});
test("German phrases retain word order and only supported source meanings are used",async()=>{
  const {db}=await database();const result=await db.prepare(book,[entry("rentrer","nach Hause gehen, zurückkehren"),
    entry("réussir","Gelingen haben, Erfolg haben")],[],tenses);
  assert.match(result.verbs.rentrer.cards["passé composé"][0].german,/ich bin nach Hause gegangen/);
  assert.match(result.verbs.réussir.cards.présent[0].german,/ich habe Erfolg/);
  assert.doesNotMatch(result.verbs.réussir.cards.présent[0].german,/Gelingen/);
});
test("A deliberate engine discrepancy is corrected from separate dictionary data",async()=>{
  const engine=await loaded;
  const db=VOCVerbDatabase.create(storage(),(word,language)=>{
    const table=engine.conjugate(word,language);
    if(language==="de-DE"&&word==="kommen")table.forms.präsens[0]="falsche Form";
    return table;
  },null,(verb,language,morphology)=>VOCGermanForms.enrich(verb,language,morphology,lookup));
  const result=await db.prepare(book,[entry("venir","kommen")],[],tenses);
  assert.equal(result.verbs.venir.cards.présent[0].german,"ich komme");
  assert.ok(result.verbs.venir.germanEngineCorrections.some(value=>value.tenses.includes("präsens")));
});

test("Overlapping preparation requests reuse the first result instead of checking twice",async()=>{
  const run=await database(),words=[entry("rendre","zurückgeben")];
  const [a,b]=await Promise.all([run.db.prepare(book,words,[],tenses),run.db.prepare(book,words,[],tenses)]);
  const single=await database();await single.db.prepare(book,words,[],tenses);
  assert.deepEqual(run.counters,single.counters);
  assert.equal(a.verbs.rendre,b.verbs.rendre);
});

test("Transient lookup failures are retried on reopen without rechecking completed records",async()=>{
  const engine=await loaded,disk=storage();let failed=true,calls=0;
  const db=VOCVerbDatabase.create(disk,(w,l)=>engine.conjugate(w,l),null,async verb=>{
    calls++;
    if(failed)verb.referenceError="Temporärer Ladefehler";
    return verb;
  });
  const words=[entry("rendre","zurückgeben")];
  await db.prepare(book,words,[],tenses);assert.equal(disk.getItem(),null);
  failed=false;
  await db.prepare(book,words,[],tenses);assert.equal(calls,2);assert.ok(disk.getItem());
  await db.prepare(book,words,[],tenses);assert.equal(calls,2);
  const legacy=JSON.parse(disk.getItem()),key=Object.keys(legacy)[0];
  legacy[key].verb.referenceError="Alter Ladefehler";legacy[key].ready=false;
  const imported=VOCVerbDatabase.create(storage(JSON.stringify(legacy)),(w,l)=>engine.conjugate(w,l),null,
    async verb=>{calls++;return verb;});
  await imported.prepare(book,words,[],tenses);assert.equal(calls,3);
});

test('Sortir in the going-out sense keeps être when the independent reference defaults to avoir',async()=>{
 const h=await database();const data=await h.db.prepare(book,[entry('sortir','hinausgehen')],[],tenses);
 const verb=data.verbs.sortir;assert.deepEqual(verb.missing,[]);assert.equal(verb.auxiliary,'être');
 assert.equal(verb.cards['passé composé'][0].foreign,'je suis sorti');
 assert.equal(verb.cards['passé composé'][3].foreign,'nous sommes sortis');
 assert.equal(verb.cards['passé composé'][5].foreign,'ils/elles sont sortis');
 assert.equal(verb.cards['plus-que-parfait'][0].foreign,"j'étais sorti");
 assert.ok(verb.cards['passé composé'][2].acceptedForeign.includes('elle est sortie'));
 assert.ok(verb.cards['passé composé'][5].acceptedForeign.includes('elles sont sorties'));
 assert.ok(verb.cards['passé composé'].every(card=>!card.acceptedForeign.some(text=>/\b(?:ai|as|a|ont) sorti/.test(text))));
 const before={...h.counters};await h.db.prepare(book,[entry('sortir','hinausgehen')],[],tenses);assert.deepEqual(h.counters,before);
});
test('An explicit book auxiliary overrides the motor and has an independent cache context',async()=>{
 const h=await database(),base=entry('sortir','hinausgehen');
 const first=await h.db.prepare(book,[base],[],tenses);
 const second=await h.db.prepare({...book,id:'other'},[{...base,auxiliary:'avoir',auxiliaryEvidence:{page:'1',text:'avec avoir'}}],[],tenses);
 assert.equal(first.verbs.sortir.cards['passé composé'][0].foreign,'je suis sorti');
 assert.equal(second.verbs.sortir.cards['passé composé'][0].foreign,"j'ai sorti");
 assert.equal(second.verbs.sortir.auxiliary,'avoir');
 const before={...h.counters};await h.db.prepare(book,[base],[],tenses);assert.deepEqual(h.counters,before);
});
test('Old prepared auxiliary/form contradictions are repaired once rather than reused as ready',async()=>{
 const h=await database(),base=entry('sortir','hinausgehen');await h.db.prepare(book,[base],[],tenses);
 const saved=JSON.parse(h.disk.getItem());const record=Object.values(saved)[0];
 record.verb.forms['passé composé'][0]='ai sorti';record.verb.cards['passé composé'][0].foreign="j'ai sorti";
 const next=await database(storage(JSON.stringify(saved)));const data=await next.db.prepare(book,[base],[],tenses);
 assert.equal(data.verbs.sortir.cards['passé composé'][0].foreign,'je suis sorti');assert.ok(next.counters.motor>0);
});
test('Changed printed forms create a new context only for the corrected verb and keep supported surface variants',async()=>{
 const h=await database(),base=entry('sortir','hinausgehen');await h.db.prepare(book,[base],[],tenses);const before={...h.counters};
 const printed={id:'printed',kind:'conjugation',infinitive:'sortir',tense:'passé composé',person:'je',foreign:'je suis sorti',scanEvidence:{page:'1',source:'scan'},scanCorrectedAt:'2026-11-16T18:00:00Z'};
 const data=await h.db.prepare(book,[base,printed],[],tenses);assert.equal(data.verbs.sortir.cards['passé composé'][0].foreign,'je suis sorti');assert.ok(h.counters.motor>before.motor);
 const after={...h.counters};await h.db.prepare(book,[base,printed],[],tenses);assert.deepEqual(h.counters,after);
 const bad=await h.db.prepare(book,[base,{...printed,foreign:'je suis sortu',scanCorrectedAt:'2026-11-16T18:01:00Z'}],[],tenses);
 assert.ok(bad.verbs.sortir.missing.includes('passé composé'));
});

test('A stored printed compound is auxiliary evidence even before the new scan metadata existed',async()=>{
 const h=await database(),base=entry('sortir','hinausgehen');
 const printed={kind:'conjugation',infinitive:'sortir',tense:'passé composé',person:'je',foreign:'je suis sorti/e',page:'154'};
 const data=await h.db.prepare(book,[base,printed],[],tenses);
 assert.equal(data.verbs.sortir.auxiliary,'être');assert.equal(data.verbs.sortir.cards['passé composé'][0].foreign,'je suis sorti');
 assert.equal(VOCVerbDatabase.auxiliaryOf([{...printed,foreign:"j'ai sorti"}]),'avoir');
 assert.throws(()=>VOCVerbDatabase.auxiliaryOf([printed,{...printed,foreign:"j'ai sorti"}]),/Widersprüchliche/);
});

test('A newly corrected explicit book auxiliary outranks older printed-form evidence',async()=>{
 const h=await database(),base={...entry('sortir','hinausgehen'),auxiliary:'avoir',scanCorrectedAt:'2026-11-16T19:00:00Z'};
 const old={kind:'conjugation',infinitive:'sortir',tense:'passé composé',person:'je',foreign:'je suis sorti',auxiliary:'être',scanEvidence:{page:'1'},updatedAt:'2026-11-16T18:00:00Z'};
 const data=await h.db.prepare(book,[base,old],[],tenses);
 assert.equal(data.verbs.sortir.cards['passé composé'][0].foreign,"j'ai sorti");assert.deepEqual(data.verbs.sortir.missing,[]);
});
