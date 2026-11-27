'use strict';
/** Guarded one-off restoration from printed source vocabulary. Dry-run by default. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),apply=process.argv.includes('--apply');
const output=process.env.VOC_ENGLISH_OUTPUT||'/tmp/vocprog-complement-restoration';
fs.mkdirSync(output,{recursive:true});
const rules=require(root+'/vocprog-answer-rules.js');
require(root+'/vocprog-english-verbs.js');require(root+'/vocprog-verb-database.js');
const english=globalThis.VOCEnglishVerbs;
const app=fs.readFileSync(root+'/vocprog-enhancements.js','utf8');
const base=app.match(/const DB_URL = "([^"]+)"/)[1],key=app.match(/const PUB_KEY = "([^"]+)"/)[1];
const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
async function request(query,options={}){
 const result=await fetch(base+'/rest/v1/vocprog_public_records?'+query,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000)});
 if(!result.ok)throw Error('Server HTTP '+result.status);return result.json();
}
async function snapshot(){
 const rows=[];let after='';
 for(let page=0;page<100;page++){
  const q=new URLSearchParams({select:'record_id,record_type,payload,updated_at',order:'record_id.asc',limit:'500'});if(after)q.set('record_id','gt.'+after);
  const next=await request(q);rows.push(...next);if(next.length<500)return rows;after=next.at(-1).record_id;
 }throw Error('Inventory limit');
}
(async()=>{
 const before=await snapshot();fs.writeFileSync(path.join(output,'before.json'),JSON.stringify(before));
 const books=before.filter(r=>r.record_type==='book'&&!r.payload.deleted).map(r=>r.payload);
 const raw=before.filter(r=>r.record_type==='vocab'&&!r.payload.deleted).map(r=>r.payload);
 const entries=raw.map(entry=>{const book=books.find(b=>b.id===entry.bookId);return book?english.restoreEntry(entry,book,raw):entry;});
 const planned=[],stamp=new Date().toISOString(),inventory=[];
 for(let i=0;i<entries.length;i++){
  const current=raw[i],next=entries[i];
  if(next.lang!=='en-US')continue;
  const prepared=rules.prepare(next),fields=next.kind==='verb-infinitive'?next:current;
  const updated={...fields,...(next.kind==='verb-infinitive'||(prepared.features?.requiredComplements||prepared.features?.usageLabels)?{answerRules:prepared}:{})};
  if(JSON.stringify(updated)===JSON.stringify(current))continue;
  updated.updatedAt=stamp;
  const old=before.find(r=>r.record_id==='vocab:'+current.id);assert.ok(old);
  planned.push({...old,payload:updated,updated_at:stamp});entries[i]=updated;
  inventory.push({id:current.id,old:current.foreign,new:updated.foreign,sourceId:updated.sourceVocabId||null});
 }
 const {motor,lookup}=await require(root+'/tests/helpers/english-fixture.cjs')();
 const original=Object.fromEntries(before.filter(r=>r.payload.kind==='prepared-verb'&&!r.payload.deleted).map(r=>[r.payload.record.key,r.payload.record]));
 let records={...original},writes=0;
 const storage={getItem:()=>JSON.stringify(records),setItem:(_,text)=>{records=JSON.parse(text);writes++;}};
 const db=VOCVerbDatabase.create(storage,(w,l)=>motor.conjugate(w,l),null,v=>english.enrich(v,(w,l)=>motor.conjugate(w,l),lookup));
 const verbBooks=books.filter(b=>b.lang==='en-US'&&b.kind==='verbs');
 const tenses=Object.keys(english.titles);
 let verbs=0,forms=0;
 for(const book of verbBooks){
  const own=entries.filter(v=>v.bookId===book.id),data=await db.prepare(book,own,[],tenses);
  for(const verb of Object.values(data.verbs)){
   assert.deepEqual(verb.missing,[]);assert.ok(english.translationComplete(verb),'Incomplete '+verb.infinitive);
   const tail=english.split(verb.infinitive).tail;
   for(const cards of Object.values(verb.cards))for(const card of cards){assert.ok(!tail||card.foreign.endsWith(tail),'Lost complement '+verb.infinitive);forms++;}
   verbs++;
  }
 }
 const firstWrites=writes;
 for(const book of verbBooks)await db.prepare(book,entries.filter(v=>v.bookId===book.id),[],tenses);
 assert.equal(writes,firstWrites,'Second pass generated writes');
 for(const record of Object.values(records).filter(r=>r.language==='en-US'&&JSON.stringify(r)!==JSON.stringify(original[r.key]))){
  const id=VOCVerbDatabase.recordId(record.key),record_id='special:'+id;
  const old=before.find(r=>r.record_id===record_id);if(old)assert.equal(old.payload.record.key,record.key);
  planned.push({record_id,record_type:'special',payload:{id,kind:'prepared-verb',bookId:record.bookId,record,updatedAt:record.checkedAt},updated_at:record.checkedAt});
 }
 fs.writeFileSync(path.join(output,'plan.json'),JSON.stringify(planned));
 const report={apply,totalRows:before.length,englishEntries:entries.filter(v=>v.lang==='en-US').length,verbs,forms,vocabularyChanges:inventory,derivedChanges:planned.filter(r=>r.record_type==='special').length,written:0,secondPassWrites:writes-firstWrites};
 if(apply){
  // Check every existing planned row before the first write.
  for(const row of planned){const old=before.find(r=>r.record_id===row.record_id);if(!old)continue;const current=await request(new URLSearchParams({select:'record_id,updated_at',record_id:'eq.'+row.record_id}));assert.equal(current[0]?.updated_at,old.updated_at,'Concurrent change; stop');}
  for(const row of planned){
   const old=before.find(r=>r.record_id===row.record_id),q=new URLSearchParams({record_id:'eq.'+row.record_id});if(old)q.set('updated_at','eq.'+old.updated_at);
   const result=await request(old?q:'on_conflict=record_id',{method:old?'PATCH':'POST',headers:{Prefer:'return=representation'+(old?'':',resolution=ignore-duplicates')},body:JSON.stringify(old?{payload:row.payload,updated_at:row.updated_at}:row)});
   assert.equal(result.length,1,'Write conflict');assert.deepEqual(result[0].payload,row.payload);report.written++;
  }
  const after=await snapshot();fs.writeFileSync(path.join(output,'after.json'),JSON.stringify(after));
  for(const row of planned)assert.deepEqual(after.find(r=>r.record_id===row.record_id)?.payload,row.payload);
  const changedIds=new Set(planned.map(r=>r.record_id));for(const old of before.filter(r=>!changedIds.has(r.record_id)))assert.deepEqual(after.find(r=>r.record_id===old.record_id),old,'Unrelated row changed');
  report.readbackVerified=true;
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
