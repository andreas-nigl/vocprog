'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../vocprog-enhancements.js'),'utf8');
const fragment=(start,end)=>code.slice(code.indexOf(start),code.indexOf(end,code.indexOf(start)));
function setup(){
 const state={books:[],saved:0};
 const add=new Function('state',`
 const books=state.books,id=()=>String(books.length+1),persistMetadata=()=>state.saved++,refreshBookChoices=()=>{};
 ${fragment('  function addBook(','  window.openBookPicker=')}
 ${fragment('  function verbBookForSource(','  window.ingestVerbInfinitives=')}
 const bookKind=b=>b.kind;
 return {addBook,verbBookForSource};`)(state);
 return {...add,state};
}
test('Multiple verb books of the same language have separate IDs and source-specific scan routing',()=>{
 const h=setup(),a=h.addBook('fr-FR','Schuljahr 8','verbs'),b=h.addBook('fr-FR','Schuljahr 9','verbs');
 assert.notEqual(a.id,b.id);assert.equal(h.state.books.length,2);
 assert.equal(h.verbBookForSource(b,'fr-FR'),b);
 assert.throws(()=>h.verbBookForSource(b,'en-US'),/Verbsprache/);
 const source1={id:'textbook1',name:'Aplus 2',kind:'vocab'},source2={id:'textbook2',name:'Aplus 3',kind:'vocab'};
 const linked1=h.verbBookForSource(source1,'fr-FR'),linked2=h.verbBookForSource(source2,'fr-FR');
 assert.notEqual(linked1.id,linked2.id);assert.equal(linked1.sourceBookId,'textbook1');
 assert.equal(h.verbBookForSource(source1,'fr-FR').id,linked1.id);assert.equal(h.state.books.length,4);
});
test('A new scan book remains distinct after language detection and can be renamed',()=>{
 const h=setup();h.addBook('fr-FR','Alt','verbs');
 const result=new Function('h',`
 const books=h.state.books,addBook=h.addBook;let pendingScanBook={kind:'verbs',name:'Neu'},chosenBook='1';
 const window={},LANGS={'fr-FR':'Französisch'},STORE='test',localStorage={removeItem(){},setItem(){}},get=()=>({});
 const chooseBook=id=>chosenBook=id,bookKind=b=>b.kind,persistMetadata=()=>{},loadFromLocalStorage=()=>{},refreshBookChoices=()=>{};
 ${fragment('  window.acceptScannedLanguage=','  window.isSelectedVerbBook=')}
 window.acceptScannedLanguage('fr-FR');
 const prompt=()=> 'Umbenannt',alert=()=>{};
 ${fragment('  window.renameSelectedBook=','  function markDeleted(')}
 window.renameSelectedBook();
 return {books,chosenBook};`)(h);
 assert.equal(result.books.length,2);assert.equal(result.chosenBook,'2');assert.equal(result.books[1].name,'Umbenannt');assert.equal(result.books[0].name,'Alt');
});
test('Manual verb-book merge preserves forms, events and paradigms; incompatible books are rejected',()=>{
 const h=new Function('code',`
 let books=[{id:'a',name:'A',kind:'verbs',lang:'fr-FR'},{id:'b',name:'B',kind:'verbs',lang:'fr-FR'}];
 let vocabulary=[{id:'v1',bookId:'a',page:'154',kind:'verb-infinitive',foreign:'avoir',german:'haben'},{id:'v2',bookId:'b',page:'155',kind:'verb-infinitive',foreign:'être',german:'sein'}];
 let history=[{id:'e',bookId:'b',sourceId:'v2',at:'2026-11-10T10:00:00Z'}],specials=[{id:'s',bookId:'b',kind:'verb-paradigm',lemma:'être'}],chosenBook='a',seq=0;
 const window={},deleted=[],bookKind=b=>b.kind,allVocab=()=>vocabulary,bookTitle=b=>b.name;
 const get=id=>id==='mergeName'?{value:'Fusion'}:{close(){}},confirm=()=>true,alert=()=>{},exportPreMergeBackup=()=>{},resetRecord=()=>null;
 const mergePairs=()=>books,read=()=>vocabulary,save=(key,next)=>vocabulary=next,id=()=> 'new'+(++seq),persistMetadata=()=>{},chooseBook=()=>{};
 const markDeleted=(type,item)=>deleted.push(type+':'+item.id);
 eval(code);
 const invalid=validMerge(books[0],{id:'x',lang:'en-US',kind:'verbs'});
 window.confirmMergeBooks();return {books,vocabulary,history,specials,deleted,invalid};
 `)(fragment('  function validMerge(','  function mergePairs(')+fragment('  window.confirmMergeBooks=','  const oldGrade='));
 assert.equal(h.books.length,1);assert.equal(h.books[0].name,'Fusion');assert.equal(h.vocabulary.length,2);assert.ok(h.vocabulary.every(v=>v.bookId==='a'));
 assert.equal(h.history[0].bookId,'a');assert.equal(h.history[0].sourceId,'v2');assert.equal(h.specials[0].bookId,'a');assert.ok(h.deleted.includes('book:b'));assert.match(h.invalid,/Sprachen/);
});
test('Merge unions incomplete overlapping pages, deduplicates annotation-only differences and remaps sentence dependencies without downloading',()=>{
 const run=new Function('code',`
 let books=[{id:'a',name:'Access',lang:'en-US'},{id:'b',name:'Muster',lang:'en-US'}];
 let vocabulary=[{id:'v1',bookId:'a',page:'296',foreign:'borough',german:'der Stadtbezirk'},
 {id:'v2',bookId:'b',page:'296',foreign:"borough ['bʌrə], (AE ['bɜ:roʊ])",german:'der Stadtbezirk'},
 {id:'v3',bookId:'b',page:'296',foreign:'extra',german:'zusätzlich'},
 {id:'v4',bookId:'b',page:'297',foreign:'new page',german:'neue Seite'}];
 let history=[{id:'e',bookId:'b',sourceId:'v2',kind:'words',at:'2026-11-26T10:00:00Z'}],specials=[{id:'sentence',bookId:'b',kind:'ai-sentence',german:'Satz',foreign:'Sentence',vocabIds:['v2','v3']}],chosenBook='a',seq=0;
 const window={},deleted=[],bookKind=b=>b.kind||'vocab',allVocab=()=>vocabulary,bookTitle=b=>b.name;
 const get=id=>id==='mergeName'?{value:'Access'}:{close(){}},confirm=()=>true,alert=()=>{},resetRecord=()=>null;
 const mergePairs=()=>books,read=()=>vocabulary,save=(key,next)=>vocabulary=next,id=()=> 'new'+(++seq),persistMetadata=()=>{},chooseBook=()=>{};
 const markDeleted=(type,item)=>deleted.push(type+':'+item.id);
 const document={createElement(){throw Error('No automatic download permitted');}};
 eval(code);const error=validMerge(books[0],books[1]);window.confirmMergeBooks();return {error,books,vocabulary,history,specials,deleted};
 `);
 const h=run(fragment('  function validMerge(','  function mergePairs(')+fragment('  window.confirmMergeBooks=','  const oldGrade='));
 assert.equal(h.error,'');assert.equal(h.vocabulary.length,3);assert.equal(h.books.length,1);assert.ok(h.vocabulary.every(v=>v.bookId==='a'));
 assert.equal(h.vocabulary.find(v=>v.id==='v3').page,'296');assert.equal(h.vocabulary.find(v=>v.id==='v4').page,'297');
 assert.match(h.vocabulary.find(v=>v.id==='v1').foreign,/bʌrə/);assert.equal(h.vocabulary.find(v=>v.id==='v1').mergedSources.length,2);
 assert.equal(h.history[0].sourceId,'v1');assert.deepEqual(h.specials[0].vocabIds,['v1','v3']);
 assert.ok(!code.includes('exportPreMergeBackup'));
});
