"use strict";
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
require(root+'/vocprog-answer-rules.js');require(root+'/vocprog-wasm-adapter.js');require(root+'/vocprog-english-verbs.js');require(root+'/vocprog-verb-database.js');
module.exports=async function(){
 const src=fs.readFileSync(root+'/vendor/ablaut/ablaut.js','utf8');
 const m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 await m.default({module_or_path:fs.readFileSync(root+'/vendor/ablaut/ablaut_bg.wasm')});
 const motor=VOCWasmAdapter.create(m.conjugate),cache=new Map();
 const manifest=JSON.parse(fs.readFileSync(root+'/reference/manifest.json')),supplement=JSON.parse(fs.readFileSync(root+'/reference/english-supplement.json'));
const lookup=async(lang,word)=>{const code=lang==='en-US'?'eng':'deu',file=root+'/reference/'+code+'/'+word.codePointAt(0).toString(16)+'.json';if(!cache.has(file))cache.set(file,fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{});const entry=cache.get(file)[word];const extra=lang==='en-US'?supplement[word]:null;if(!entry&&!extra)return null;return {...entry,...extra,forms:{...entry?.forms,...extra?.forms},sources:[manifest.sources[entry?.sourceKey],...(extra?.sources||[])].filter(Boolean)};};

 const book={id:'english-fixture',name:'English regression',kind:'verbs',lang:'en-US'};
 const entries=[['take','nehmen'],['take off','abheben'],['see','sehen'],['work','arbeiten'],['(to) exist','existieren']].map(([foreign,german],index)=>({id:'verb-'+index,kind:'verb-infinitive',foreign,german,verbId:foreign,bookId:book.id,page:'1',refVocab:'S1 V'+(index+1)}));
 let persisted={};
 const storage={getItem:()=>JSON.stringify(persisted),setItem:(_,text)=>{persisted=JSON.parse(text);}};
 const db=VOCVerbDatabase.create(storage,(w,l)=>motor.conjugate(w,l),null,verb=>VOCEnglishVerbs.enrich(verb,(w,l)=>motor.conjugate(w,l),lookup));
 const snapshot=await db.prepare(book,entries,[],Object.keys(VOCEnglishVerbs.titles));
 return {book,entries,persisted,snapshot,storage,motor,lookup};
};
