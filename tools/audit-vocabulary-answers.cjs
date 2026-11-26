"use strict";
/** Read-only corpus check against printed source, with no server requests or AI. */
const fs=require('node:fs');
const rules=require('../vocprog-answer-rules.js');
const {eligible}=require('./prepare-vocabulary-rules.cjs');
function audit(rows){
 if(!Array.isArray(rows))throw Error('Expected a complete public-record snapshot array');
 const books=new Map(rows.filter(row=>row.record_type==='book'&&!row.payload.deleted).map(row=>[row.payload.id,row.payload]));
 const records=rows.filter(row=>eligible(row,books)),failures=[];
 let sourceCases=0,invalidExtraCases=0;
 for(const {payload:record}of records)for(const side of ['foreign','german']){
  const item={record,tLang:side==='german'?'de-DE':record.lang};
  // This oracle deliberately starts from raw text, not generated answer cores.
  const minimal=record[side].replace(/\[[^\]]*\]/g,'').replace(/\([^()]*\)/g,'').replace(/\s+/g,' ').trim();
  for(const input of new Set([record[side],minimal])){
   sourceCases++;
   if(rules.matchWord(item,input)!==true)failures.push({id:record.id,side,expected:true,input});
  }
  const invalid=record[side]+' __definitely_wrong__';invalidExtraCases++;
  if(rules.matchWord(item,invalid)!==false)failures.push({id:record.id,side,expected:false,input:invalid});
 }
 return {records:records.length,sourceCases,invalidExtraCases,failures};
}
if(require.main===module){
 try{
  if(!process.argv[2])throw Error('Usage: node tools/audit-vocabulary-answers.cjs snapshot.json');
  const result=audit(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
  console.log(JSON.stringify(result,null,2));if(result.failures.length)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={audit};
