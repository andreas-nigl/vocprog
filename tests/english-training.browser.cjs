'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(data);});});
(async()=>{
 const {book,entries,persisted}=await require('./helpers/english-fixture.cjs')();
 const special=Object.values(persisted).map(record=>({id:'prepared-verb:'+encodeURIComponent(record.key),bookId:record.bookId,kind:'prepared-verb',record,updatedAt:record.checkedAt}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,executablePath:process.env.VOC_CHROMIUM_PATH});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  await context.route('https://**/*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await context.addInitScript(({book,entries,special})=>{localStorage.setItem('vocprog_v2_books',JSON.stringify([book]));localStorage.setItem('vocprog_v2_book',book.id);localStorage.setItem('vocab_trainer_data_en-US',JSON.stringify(entries));localStorage.setItem('vocprog_v2_special',JSON.stringify(special));},{book,entries,special});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.log('Page error: '+error.message);});page.on('dialog',d=>d.dismiss());await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>window.VOCVerbDataReady);console.log('Prepared: '+mobile);
  await page.locator('#tenseChoiceToggle').click();assert.equal(await page.locator('#tenseChoicePanel input[type=checkbox]').count(),0);
  await page.getByRole('button',{name:'MEHRFACHAUSWAHL',exact:true}).click();assert.equal(await page.locator('#tenseChoicePanel input[type=checkbox]').count(),10);
  await page.getByRole('button',{name:'Simple Past (Vergangenheit)',exact:true}).click();await page.getByRole('button',{name:'Present Perfect Progressive (vollendete Verlaufsform)',exact:true}).click();
  await page.getByRole('button',{name:'ÜBERNEHMEN',exact:true}).click();assert.match(await page.locator('#tenseChoiceToggle').textContent(),/Simple Past, Present Perfect Progressive/);
  await page.locator('#tenseChoiceToggle').click();assert.equal(await page.locator('#tenseChoicePanel input[type=checkbox]').count(),0);await page.getByRole('button',{name:'MEHRFACHAUSWAHL',exact:true}).click();assert.equal(await page.locator('#tenseChoicePanel input:checked').count(),2);await page.keyboard.press('Escape');
  await page.locator('#startTrainingBtn').click();const tasks=await page.evaluate(()=>trainingItems);assert.equal(tasks.length,entries.length*2);for(const entry of entries)assert.equal(tasks.filter(x=>x.sourceId===entry.id).length,2);assert.match(tasks[0].prompt,/^(Simple Past|Present Perfect Progressive): .+\(.+\)$/);
  await page.locator('#verbTableToggle').click();assert.match(await page.locator('#verbTablePanel').textContent(),/Present Perfect Progressive/);assert.doesNotMatch(await page.locator('#verbTablePanel').textContent(),/Keine vorbereiteten Formen/);
  await page.reload();await page.evaluate(()=>window.VOCVerbDataReady);await page.locator('#tenseChoiceToggle').click();await page.getByRole('button',{name:'Stammformen (Grundform, Vergangenheit, Partizip)',exact:true}).click();await page.locator('#startTrainingBtn').click();const principal=await page.evaluate(()=>trainingItems);assert.equal(principal.length,4);assert.ok(principal.every(x=>x.target.split(', ').length===3));
  const target=principal[0].target.replace(/,/g,'');await page.locator('#answerInput').fill(target);await page.locator('#answerInput').press('Enter');assert.equal(await page.locator('#answerFeedback').textContent(),'Richtig');
  await page.locator('#verbTableToggle').click();assert.match(await page.locator('#verbTablePanel').textContent(),/Simple Present/);
  if(!mobile){await page.reload();await page.evaluate(()=>window.VOCVerbDataReady);await page.locator('#tenseChoiceToggle').click();await page.getByRole('button',{name:'Simple Past (Vergangenheit)',exact:true}).click({modifiers:['Control']});assert.equal(await page.locator('#tenseChoicePanel input:checked').count(),1);await page.getByRole('button',{name:'Present Perfect Progressive (vollendete Verlaufsform)',exact:true}).click();await page.keyboard.press('Enter');assert.equal(await page.locator('#tenseChoicePanel').isHidden(),true);}
  assert.deepEqual(errors,[]);console.log('English workflow passed: '+(mobile?'mobile touch':'desktop keyboard'));await context.close();
 }
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
