"use strict";
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const api=require('../vocprog-answer-rules.js'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(body);});
});
const notationCases=require('./fixtures/answer-notation.json');
const cases=[
 {foreign:"(to) remove sb./sth.",german:"jn./etwas entfernen",lang:"en-US",inputs:["to remove sb./sth.","remove sb/sth","remove sb sth","remove somebody","to remove something"],bad:["to remove sb/sthh","remove sb/garbage","removesb./sth."]},
 {foreign:"(to) lower ['ləʊə]",german:'senken, verschlechtern',lang:'en-US',inputs:['lower','to lower'],bad:['tolower','lowwer']},
 {foreign:'(to) lower',german:'senken, verschlechtern',lang:'en-US',inputs:['lower','to lower'],bad:[]},
 {foreign:'le voisin/la voisine',german:'der/die (Sitz-)Nachbar/in',lang:'fr-FR',inputs:['le voisin / la voisine'],bad:['le voisin'],hint:true},
 {foreign:'le voisin/la voisine',german:'der/die (Sitz-)Nachbar/in',lang:'fr-FR',reverse:true,inputs:['der/die Nachbar/in','der Nachbar die Sitznachbarin'],bad:['der Nachbar'],hint:true},
 {foreign:'(to) run a school/company/restaurant/..., ran, run',german:'eine Schule / eine Firma / ein Restaurant / ... leiten, führen',lang:'en-US',inputs:['run a school','to run a company','run a restaurant ran run'],bad:['run','run a school ranned run']},
 {foreign:'(to) run a school/company/restaurant/..., ran, run',german:'eine Schule / eine Firma / ein Restaurant / ... leiten, führen',lang:'en-US',reverse:true,inputs:['eine Schule leiten','eine Firma führen'],bad:['eine Schule']}
];
for(const fixture of notationCases)for(const [side,expected]of Object.entries(fixture.expected))cases.push({...fixture,reverse:side==='german',inputs:expected.accept,bad:expected.reject,legacyRules:true});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  for(const scenario of cases.filter(item=>!process.env.VOC_CASE_FILTER||item.foreign.includes(process.env.VOC_CASE_FILTER))){
   for(const [answer,correct] of [...scenario.inputs.map(value=>[value,true]),...scenario.bad.map(value=>[value,false])]){
    const record={id:'fixture',bookId:'book',page:'300',refVocab:'S300 V11',...scenario};
    record.answerRules=JSON.parse(JSON.stringify(api.prepare(record,{lookup:lemma=>lemma==='run'?{forms:{'simple past':[['ran']]},participle:['run']}:null})));
    if(scenario.legacyRules)record.answerRules={...record.answerRules,features:{},foreign:{mode:'variants',groups:[{cores:['ae','infml','become fast'],suffixes:scenario.foreign.includes('run a school')?['ran','run']:[]}]},german:{mode:'variants',groups:[{cores:['vor jemandem','der-'],suffixes:[]}]}};
    const context=await browser.newContext({serviceWorkers:'block'});
    await context.route('https://**/*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
    await context.addInitScript(record=>{
     localStorage.setItem('vocprog_v2_books',JSON.stringify([{id:'book',name:'Regression',lang:record.lang,kind:'vocab'}]));
     localStorage.setItem('vocprog_v2_book','book');
     localStorage.setItem('vocab_trainer_data_'+record.lang,JSON.stringify([record]));
    },record);
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    if(scenario.reverse)await page.locator('#direction').selectOption('foreign_to_de');
    await page.locator('#studyMode').selectOption('words');await page.locator('#startTrainingBtn').click();
    if(scenario.hint)assert.match(await page.locator('#answerInput').getAttribute('placeholder'),/Männliche und weibliche/);
    const card=await page.evaluate(()=>({record:trainingItems[0].record?.foreign,lang:trainingItems[0].tLang,module:!!window.VOCAnswerRules}));
    assert.equal(card.record,scenario.foreign);assert.equal(card.module,true);
    await page.locator('#answerInput').fill(answer);await page.locator('#answerInput').press('Enter');
    if(correct){await page.locator('#practiceResultDialog[open]').waitFor();assert.match(await page.locator('#practiceResultPercent').textContent(),/100/);}
    else{assert.match(await page.locator('#answerFeedback').textContent(),/Nicht richtig/);assert.equal(await page.locator('#practiceResultDialog').evaluate(node=>node.open),false);}
    assert.deepEqual(errors,[]);console.log(JSON.stringify({source:scenario.foreign,direction:scenario.reverse?'foreign_to_de':'de_to_foreign',answer,correct}));
    await context.close();
   }
  }
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
