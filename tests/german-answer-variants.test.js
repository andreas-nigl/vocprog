'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('../vocprog-verb-presentation.js');
const normalize=value=>String(value).replace(/\((?:du|wir|ihr|Sie)\)\s*/g,'').toLowerCase().replace(/[.!?,;:]/g,'').replace(/\s+/g,' ').trim();
const matches=(answer,target,kind='',acceptedTargets)=>api.matchesGermanAnswer(answer,{target,record:{kind},acceptedTargets},normalize);
test('A single German vocabulary meaning or conjugation is sufficient without changing displayed targets',()=>{
 for(const answer of ['setzen','stellen','legen'])assert.equal(matches(answer,'setzen, stellen, legen'),true);
 const target='ich setze / ich stelle / ich lege';
 for(const answer of ['ich setze','ich stelle','ich lege'])assert.equal(matches(answer,target),true);
 assert.equal(matches('du setzt',target),false);assert.equal(matches('setze',target),false);
 assert.equal(matches('sie setzt','er/sie/man setzt'),true);
 assert.equal(matches('Sie legen','ihr legt / Sie legen'),true);
 assert.equal(matches('ich habe zurückgegeben','ich gab zurück', '', ['ich habe zurückgegeben']),true);
});
test('Grouped imperatives require one valid meaning for all three persons, with no additional polite form',()=>{
 const target='(du) setze / (wir) setzen wir / (ihr) setzt / (Sie) setzen Sie / (du) stelle / (wir) stellen wir / (ihr) stellt / (Sie) stellen Sie / (du) lege / (wir) legen wir / (ihr) legt / (Sie) legen Sie';
 for(const answer of ['setz / setzen wir / setzt','stelle, stellen wir, stellt','lege / legen wir / legt','setz / stellen wir / legt'])assert.equal(matches(answer,target,'verb-imperative'),true,answer);
 assert.equal(matches('setze / setzen wir / setzen Sie',target,'verb-imperative'),true);
 for(const answer of ['setz','setz / setzt / setzen wir','setzt / setzen wir / setzt','setz / setzen wir','setz / wir setzen / setzt'])assert.equal(matches(answer,target,'verb-imperative'),false,answer);
 assert.equal(matches(target,target,'verb-imperative'),true);
});
test('Grouped principal parts retain all required forms but accept one meaning per slot',()=>{
 const grouped='setzen, stellen, legen / setzend, stellend, legend / gesetzt, gestellt, gelegt';
 assert.equal(matches('setzen / setzend / gesetzt',grouped,'verb-principal'),true);
 assert.equal(matches('stellen, stellend, gestellt',grouped,'verb-principal'),true);
 assert.equal(matches('legen / legend / gelegt',grouped,'verb-principal'),true);
 assert.equal(matches('legen / gelegt / legend',grouped,'verb-principal'),false);
 assert.equal(matches('legen',grouped,'verb-principal'),false);
 assert.equal(matches('stellen / stellend / gestellt','setzen / setzend / gesetzt / stellen / stellend / gestellt','verb-principal'),true);
});
const source=fs.readFileSync(path.join(__dirname,'../vocprog-enhancements.js'),'utf8');
function grader(item){
 const elements={answerInput:{value:''},answerFeedback:{},targetText:{classList:{remove(){}}}},events=[];
 const script=source.slice(source.indexOf('  const oldGrade=window.gradeCurrentAnswer;'),source.indexOf('  function resetRecord('));
 const window={VOCVerbPresentation:api,gradeCurrentAnswer:()=>events.push('old')};
 new Function('window','elements','item','events',`
 let analyzedThisCard=false,currentIndex=0;const trainingItems=[item],get=id=>elements[id],simplified=${normalize.toString()},logEvent=(type,item,event)=>events.push(event);
 ${script}`)(window,elements,item,events);
 return answer=>{elements.answerInput.value=answer;window.gradeCurrentAnswer();return events[0];};
}
test('Actual verb grader accepts a single German option and preserves strict grouped French answers',()=>{
 const item={kind:'verbs',tLang:'de-DE',target:'ich setze / ich stelle / ich lege',record:{kind:'verb-form'}};
 assert.equal(grader(item)('ich lege').correct,true);
 const grouped={kind:'verbs',tLang:'fr-FR',target:'mets / mettant / mis',record:{kind:'verb-principal'}};
 assert.equal(grader(grouped)('mets').correct,false);
 assert.equal(grader(grouped)('mets / mettant / mis').correct,true);
});
test('Normal vocabulary grader accepts a comma-separated German meaning; sentences retain their existing rule',()=>{
 const script=source.slice(source.indexOf('  window.gradeCurrentAnswer=function(){'),source.indexOf('  window.advanceOrGrade='));
 const window={VOCVerbPresentation:api},elements={answerInput:{value:'legen'},targetText:{classList:{remove(){}}},answerFeedback:{}},events=[];
 new Function('window','elements','events',`
 let analyzedThisCard=false,currentIndex=0,trainingItems=[{kind:'words',tLang:'de-DE',target:'setzen, stellen, legen'}];
 const simplified=${normalize.toString()},get=id=>elements[id],logEvent=(type,item,event)=>events.push(event);
 ${script}`)(window,elements,events);
 window.gradeCurrentAnswer();assert.equal(events[0].correct,true);
});

test('Compact input hint appears only when German answer choice is relevant and resets for other directions or sentences',()=>{
 const base={kind:'verbs',tLang:'de-DE',target:'ich setze / ich stelle / ich lege',record:{kind:'verb-form'}};
 assert.equal(api.germanAnswerHint(base),'Eine deutsche Übersetzung genügt');
 assert.equal(api.germanAnswerHint({...base,record:{kind:'verb-imperative'}}),'Je Form eine Übersetzung genügt');
 assert.equal(api.germanAnswerHint({...base,record:{kind:'verb-principal'}}),'Je Form eine Übersetzung genügt');
 assert.equal(api.germanAnswerHint({...base,tLang:'fr-FR'}),'');
 assert.equal(api.germanAnswerHint({...base,kind:'sentences'}),'');
 assert.equal(api.germanAnswerHint({...base,target:'ich gebe zurück'}),'');
 assert.equal(api.germanAnswerHint({...base,kind:'words',target:'setzen, stellen, legen'}),'Eine deutsche Übersetzung genügt');
});
