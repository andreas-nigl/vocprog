'use strict';
/** One-off English derived-record preparation; no AI. Dry-run unless --apply. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),apply=process.argv.includes('--apply');
const output=process.env.VOC_ENGLISH_OUTPUT||'/tmp/vocprog-english-migration';fs.mkdirSync(output,{recursive:true});
require(root+'/vocprog-wasm-adapter.js');require(root+'/vocprog-english-verbs.js');require(root+'/vocprog-verb-database.js');
const source=fs.readFileSync(root+'/vocprog-enhancements.js','utf8'),base=source.match(/const DB_URL = "([^"]+)"/)[1],publicKey=source.match(/const PUB_KEY = "([^"]+)"/)[1];
const headers={apikey:publicKey,Authorization:'Bearer '+publicKey,'Content-Type':'application/json'};
async function request(query,options={}){const r=await fetch(base+'/rest/v1/vocprog_public_records?'+query,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Server HTTP '+r.status);return r.status===204?[]:r.json();}
async function snapshot(){const rows=[];let after='';for(let page=0;page<100;page++){const q=new URLSearchParams({select:'record_id,record_type,payload,updated_at',order:'record_id.asc',limit:'500'});if(after)q.set('record_id','gt.'+after);const next=await request(q);rows.push(...next);if(next.length<500)return rows;after=next.at(-1).record_id;}throw Error('Inventory limit; no writes');}
(async()=>{
 const before=await snapshot();fs.writeFileSync(path.join(output,'before.json'),JSON.stringify(before));
 const src=fs.readFileSync(root+'/vendor/ablaut/ablaut.js','utf8'),m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));await m.default({module_or_path:fs.readFileSync(root+'/vendor/ablaut/ablaut_bg.wasm')});const motor=VOCWasmAdapter.create(m.conjugate),manifest=JSON.parse(fs.readFileSync(root+'/reference/manifest.json')),extra=JSON.parse(fs.readFileSync(root+'/reference/english-supplement.json')),shards=new Map();
 const lookup=async(lang,word)=>{const code=lang==='en-US'?'eng':'deu',file=root+'/reference/'+code+'/'+word.codePointAt(0).toString(16)+'.json';if(!shards.has(file))shards.set(file,fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{});const entry=shards.get(file)[word],patch=lang==='en-US'?extra[word]:null;if(!entry&&!patch)return null;return {...entry,...patch,forms:{...entry?.forms,...patch?.forms},sources:[manifest.sources[entry?.sourceKey],...(patch?.sources||[])].filter(Boolean)};};
 const original=Object.fromEntries(before.filter(x=>x.payload.kind==='prepared-verb'&&!x.payload.deleted).map(x=>[x.payload.record.key,x.payload.record]));let records={...original},storageWrites=0;
 const storage={getItem:()=>JSON.stringify(records),setItem:(_,text)=>{records=JSON.parse(text);storageWrites++;}};
 const db=VOCVerbDatabase.create(storage,(w,l)=>motor.conjugate(w,l),null,verb=>VOCEnglishVerbs.enrich(verb,(w,l)=>motor.conjugate(w,l),lookup));
 const books=before.filter(x=>x.record_type==='book'&&x.payload.lang==='en-US'&&['verbs','conjugations'].includes(x.payload.kind)&&!x.payload.deleted).map(x=>x.payload),tenses=Object.keys(VOCEnglishVerbs.titles),entries=book=>before.filter(x=>x.record_type==='vocab'&&x.payload.bookId===book.id&&!x.payload.deleted).map(x=>x.payload);
 for(const book of books){const data=await db.prepare(book,entries(book),[],tenses);for(const verb of Object.values(data.verbs)){assert.deepEqual(verb.missing,[],'Incomplete '+verb.infinitive);assert.ok(verb.baseGerman,'Missing base meaning '+verb.infinitive);assert.equal(verb.principalParts.length,3);assert.ok(VOCEnglishVerbs.translationComplete(verb),'Incomplete German tables: '+verb.infinitive+' '+JSON.stringify(verb.englishTranslationMissing));}}
 const changes=Object.values(records).filter(record=>record.language==='en-US'&&JSON.stringify(record)!==JSON.stringify(original[record.key]));fs.writeFileSync(path.join(output,'plan.json'),JSON.stringify(changes));
 const count=storageWrites;for(const book of books)await db.prepare(book,entries(book),[],tenses);assert.equal(storageWrites,count,'Second pass must reuse every record');
 let written=0;
 if(apply)for(const record of changes){const id=VOCVerbDatabase.recordId(record.key),record_id='special:'+id,existing=before.find(x=>x.record_id===record_id),payload={id,kind:'prepared-verb',bookId:record.bookId,record,updatedAt:record.checkedAt};
  if(existing)assert.equal(existing.payload.record?.key,record.key,'Derived ID collision; no overwrite');
  const row={record_id,record_type:'special',payload,updated_at:record.checkedAt};
  const q=new URLSearchParams({record_id:'eq.'+record_id});if(existing)q.set('updated_at','eq.'+existing.updated_at);
  const result=await request(existing?q:'on_conflict=record_id',{method:existing?'PATCH':'POST',headers:{Prefer:'return=representation'+(existing?'':',resolution=ignore-duplicates')},body:JSON.stringify(existing?{payload,updated_at:record.checkedAt}:row)});
  assert.equal(result.length,1,'Concurrent update; stop without retry');assert.deepEqual(result[0].payload,payload);written++;
 }
 if(apply){const after=await snapshot();fs.writeFileSync(path.join(output,'after.json'),JSON.stringify(after));for(const row of before.filter(x=>x.record_type==='vocab'||x.record_type==='book'))assert.deepEqual(after.find(x=>x.record_id===row.record_id),row,'Original source changed during migration');for(const record of changes){const stored=after.find(x=>x.record_id==='special:'+VOCVerbDatabase.recordId(record.key));assert.deepEqual(stored.payload.record,record);}}
 const report={apply,totalRows:before.length,books:books.map(b=>({id:b.id,name:b.name,verbs:entries(b).filter(x=>x.kind==='verb-infinitive').length})),changed:changes.length,written,secondPassWrites:storageWrites-count};fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
