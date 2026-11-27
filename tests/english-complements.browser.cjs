'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(data);});});
const examples=[
 {lemma:'contact',foreign:'(to) contact sb. [kɒntækt]',german:'mit jm. Kontakt aufnehmen, sich bei jm. melden',infinitive:'(to) contact sb.',good:'I have contacted someone',bad:'I have contacted',part:'contacted sb.'},
 {lemma:'(to) arrest',foreign:'(to) arrest sb.',german:'jn. verhaften',infinitive:'(to) arrest sb.',good:'I have arrested sb.',bad:'I have arrested',part:'arrested sb.'},
 {lemma:'(to) refuse',foreign:'(to) refuse (to do sth.)',german:'sich weigern (, etwas zu tun); ablehnen',infinitive:'(to) refuse (to do sth.)',good:'I have refused to do something',bad:'I have refused',part:'refused (to do sth.)'},
 {lemma:'(to) react (to)',foreign:'(to) react (to)',german:'reagieren (auf)',infinitive:'(to) react (to)',good:'I have reacted to',bad:'I have reacted',part:'reacted (to)'}
];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,executablePath:process.env.VOC_CHROMIUM_PATH});
 try{for(const mobile of [false,true])for(const example of examples){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  await context.route('https://**/*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await context.addInitScript(example=>{
   const books=[{id:'sources',name:'Source words',lang:'en-US'},{id:'verbs',kind:'verbs',sourceBookId:'sources',name:'Verbs',lang:'en-US'}];
   localStorage.setItem('vocprog_v2_books',JSON.stringify(books));localStorage.setItem('vocprog_v2_book','verbs');
   localStorage.setItem('vocab_trainer_data_en-US',JSON.stringify([{id:'printed',bookId:'sources',page:'300',lang:'en-US',foreign:example.foreign,german:example.german},{id:'stable',bookId:'verbs',kind:'verb-infinitive',page:'300',lang:'en-US',foreign:example.lemma,infinitive:example.lemma,german:example.german}]));
  },example);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>window.VOCVerbDataReady);
  await page.locator('#randomize').uncheck();
  assert.match(await page.locator('#startVocab').textContent(),/\(to\)/);
  await page.locator('#startTrainingBtn').click();assert.equal(await page.locator('#targetText').textContent(),example.infinitive);
  await page.locator('#verbTableToggle').click();assert.match(await page.locator('#verbTablePanel').textContent(),/Infinitiv : \(to\)/);assert.ok((await page.locator('#verbTablePanel').textContent()).includes(example.part));assert.doesNotMatch(await page.locator('#verbTablePanel').textContent(),/kɒntækt/);
  await page.reload();await page.evaluate(()=>window.VOCVerbDataReady);await page.locator('#randomize').uncheck();
  await page.locator('#tenseChoiceToggle').click();await page.getByRole('button',{name:'Present Perfect Simple (vollendete Gegenwart)',exact:true}).click();await page.locator('#startTrainingBtn').click();
  assert.match(await page.locator('#promptText').textContent(),/^Present Perfect Simple:/);
  await page.locator('#answerInput').fill(example.bad);await page.locator('#answerInput').press('Enter');assert.match(await page.locator('#answerFeedback').textContent(),/Nicht richtig/);
  await page.reload();await page.evaluate(()=>window.VOCVerbDataReady);await page.locator('#randomize').uncheck();await page.locator('#tenseChoiceToggle').click();await page.getByRole('button',{name:'Present Perfect Simple (vollendete Gegenwart)',exact:true}).click();await page.locator('#startTrainingBtn').click();await page.locator('#answerInput').fill(example.good);await page.locator('#answerInput').press('Enter');assert.equal(await page.locator('#answerFeedback').textContent(),'Richtig');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,lemma:example.lemma,passed:true}));await context.close();
 }}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
