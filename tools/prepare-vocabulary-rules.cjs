"use strict";
/** One-off local-rule migration. No AI requests. Dry run unless --apply is explicit. */
const fs=require("node:fs"),path=require("node:path");
const rules=require("../vocprog-answer-rules.js");
const source=fs.readFileSync(path.join(__dirname,"../vocprog-enhancements.js"),"utf8");
const base=source.match(/const DB_URL = "([^"]+)"/)[1];
const publicKey=source.match(/const PUB_KEY = "([^"]+)"/)[1];
const apply=process.argv.includes("--apply"),output=process.env.VOC_RULES_OUTPUT||"/tmp/vocprog-answer-rules";
fs.mkdirSync(output,{recursive:true});
const headers={apikey:publicKey,Authorization:"Bearer "+publicKey,"Content-Type":"application/json"};
async function request(query,options={}){
 const response=await fetch(base+"/rest/v1/vocprog_public_records?"+query,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error("Server request failed: HTTP "+response.status);
 return response.status===204?[]:response.json();
}
async function snapshot(){
 const rows=[],seen=new Set();let after="";
 for(let page=0;page<100;page++){
  const query=new URLSearchParams({select:"record_id,record_type,payload,updated_at",order:"record_id.asc",limit:"500"});
  if(after)query.set("record_id","gt."+after);
  const next=await request(query);
  if(!Array.isArray(next))throw Error("Invalid inventory");
  for(const row of next){if(seen.has(row.record_id))throw Error("Duplicate inventory record");seen.add(row.record_id);rows.push(row);}
  if(next.length<500)return rows;
  after=next.at(-1).record_id;
 }
 throw Error("Inventory page limit exceeded; no writes started");
}
const shards=new Map();
function lookup(lemma){
 const code=lemma.codePointAt(0)?.toString(16);
 if(!code)return null;
 if(!shards.has(code)){
  const file=path.join(__dirname,"../reference/eng",code+".json");
  shards.set(code,fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{});
 }
 return shards.get(code)[lemma]||null;
}
const lexical=new Set(["words","verb-principal","verb-imperative","verb-participle","verb-ing","verb-gerund"]);
function eligible(row,books){
 if(row.record_type!=="vocab"||row.payload.deleted)return false;
 const book=books.get(row.payload.bookId);if(!book)return false;
 if(["verbs","conjugations"].includes(book.kind))return row.payload.kind==="verb-infinitive";
 return !row.payload.kind||lexical.has(row.payload.kind);
}
async function main(){
 const rows=await snapshot();
 fs.writeFileSync(path.join(output,"before.json"),JSON.stringify(rows,null,2));
 const books=new Map(rows.filter(row=>row.record_type==="book"&&!row.payload.deleted).map(row=>[row.payload.id,row.payload]));
 const report={version:rules.VERSION,apply,totalRows:rows.length,eligible:0,fullyPrepared:0,legacyEntries:0,changed:0,written:0,concurrentSkipped:[],books:[],examples:[]};
 const byBook=new Map(),pending=[];
 for(const row of rows){
  if(!eligible(row,books))continue;
  const record={...row.payload,lang:row.payload.lang||books.get(row.payload.bookId).lang};
  const prepared=rules.prepare(record,{lookup});
  const legacy=["foreign","german"].filter(side=>prepared[side].mode==="legacy");
  report.eligible++;if(legacy.length)report.legacyEntries++;else report.fullyPrepared++;
  const key=record.bookId;
  if(!byBook.has(key))byBook.set(key,{id:key,name:books.get(key).name,total:0,legacy:0});
  byBook.get(key).total++;if(legacy.length)byBook.get(key).legacy++;
  if(legacy.length)report.examples.push({id:record.id,book:books.get(key).name,foreign:record.foreign,german:record.german,legacy,reason:legacy.map(side=>prepared[side].reason)});
  if(JSON.stringify(row.payload.answerRules)!==JSON.stringify(prepared)||row.payload.lang!==record.lang){
   report.changed++;pending.push({row,record,prepared});
  }
 }
 report.books=[...byBook.values()];
 fs.writeFileSync(path.join(output,"plan.json"),JSON.stringify(report,null,2));
 if(apply){
  for(const {row,record,prepared} of pending){
   const now=new Date().toISOString(),payload={...record,answerRules:prepared,updatedAt:now};
   const query=new URLSearchParams({record_id:"eq."+row.record_id,updated_at:"eq."+row.updated_at,select:"record_id,payload"});
   const updated=await request(query,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({payload,updated_at:now})});
   if(updated.length!==1){report.concurrentSkipped.push(row.record_id);continue;}
   if(updated[0].record_id!==row.record_id||JSON.stringify(updated[0].payload.answerRules)!==JSON.stringify(prepared))throw Error("Write confirmation mismatch: "+row.record_id);
   report.written++;
  }
  const after=await snapshot(),byId=new Map(after.map(row=>[row.record_id,row]));
  let pendingAgain=0;
  for(const row of after){
   if(!eligible(row,books))continue;
   const record={...row.payload,lang:row.payload.lang||books.get(row.payload.bookId).lang};
   if(JSON.stringify(record.answerRules)!==JSON.stringify(rules.prepare(record,{lookup})))pendingAgain++;
  }
  for(const {row,prepared} of pending){
   if(report.concurrentSkipped.includes(row.record_id))continue;
   const actual=byId.get(row.record_id)?.payload;
   if(JSON.stringify(actual?.answerRules)!==JSON.stringify(prepared))throw Error("Read-back mismatch: "+row.record_id);
   const unchanged={...actual};delete unchanged.answerRules;delete unchanged.updatedAt;
   const expected={...row.payload,lang:row.payload.lang||books.get(row.payload.bookId).lang};delete expected.answerRules;delete expected.updatedAt;
   if(JSON.stringify(unchanged)!==JSON.stringify(expected))throw Error("Unexpected source change: "+row.record_id);
  }
  report.pendingOnSecondPass=pendingAgain;
  fs.writeFileSync(path.join(output,"after.json"),JSON.stringify(after,null,2));
 }
 fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={eligible,lookup};
