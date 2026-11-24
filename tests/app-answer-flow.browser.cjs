"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const filename=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname.replace(/\/$/,"/index.html"));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(filename,(error,data)=>{
  if(error){res.writeHead(404).end();return;}
  const ext=path.extname(filename);res.setHeader("Content-Type",ext===".html"?"text/html":ext===".js"?"application/javascript":ext===".css"?"text/css":"application/json");res.end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:640,height:900},serviceWorkers:"block"});
  let generated=0,holdUploads=false;
  await context.route("https://**/*",route=>{
   if(route.request().url().includes(".supabase.co/")&&holdUploads)return new Promise(()=>{});
   if(route.request().url().includes(".supabase.co/"))return route.fulfill({status:503,contentType:"application/json",body:'{}'});
   if(route.request().url().includes("generativelanguage.googleapis.com")){
    generated++;holdUploads=true;return route.fulfill({contentType:"application/json",body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify([{foreign:"I refuse.",german:"Ich lehne ab.",vocabIds:["a"]}])}]}}]})});
   }
   return route.abort();
  });
  await context.addInitScript(()=>{
   localStorage.setItem("vocprog_v2_books",JSON.stringify([{id:"book",name:"Fixture",kind:"vocab",lang:"en-US",updatedAt:"2026-11-01T00:00:00Z"}]));
   localStorage.setItem("vocprog_v2_book","book");
   localStorage.setItem("vocab_trainer_data_en-US",JSON.stringify([{id:"a",bookId:"book",lang:"en-US",kind:"words",foreign:"(to) refuse",german:"ablehnen; sich weigern",page:"154",pageIndex:1,refVocab:"S154 V1",sentence_foreign:"No, I refuse.",sentence_german:"Nein, ich lehne ab.",updatedAt:"2026-11-01T00:00:00Z"}]));
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("dialog",dialog=>dialog.dismiss());
  await page.goto("http://127.0.0.1:"+server.address().port+"/");
  await page.locator("#startTrainingBtn").waitFor({state:"visible"});
  await page.locator("#studyMode").selectOption("words");
  await page.locator("#startTrainingBtn").click();
  await page.locator("#answerInput").fill("refuse");
  await page.locator("#answerInput").press("Enter");
  await page.locator("#practiceResultDialog[open]").waitFor();
  assert.match(await page.locator("#practiceResultPercent").textContent(),/100/);
  await page.evaluate(()=>document.querySelector("#practiceResultDialog").close());
  await page.locator("#direction").selectOption("foreign_to_de");
  await page.locator("#startTrainingBtn").click();
  await page.locator("#answerInput").fill("ablehnen");
  await page.locator("#answerInput").press("Enter");
  await page.locator("#practiceResultDialog[open]").waitFor();
  assert.match(await page.locator("#practiceResultPercent").textContent(),/100/);
  await page.evaluate(()=>document.querySelector("#practiceResultDialog").close());
  await page.locator("#studyMode").selectOption("book_sentences");
  await page.locator("#direction").selectOption("de_to_foreign");
  await page.locator("#startTrainingBtn").click();
  await page.locator("#answerInput").fill("No I refuse.");
  await page.locator("#answerInput").press("Enter");
  assert.match(await page.locator("#answerFeedback").textContent(),/Nicht richtig/);
  await page.evaluate(()=>exitTrainer());
  await page.locator("#apiKey").fill("fixture-not-a-real-key");
  await page.locator("#studyMode").selectOption("ai_combined");
  await page.locator("#startTrainingBtn").click();
  await page.locator("#answerInput").waitFor({state:"visible"});
  assert.equal(generated,1,"server failure should permit one requested generation");
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("vocprog_v2_special")||"[]"));
  assert.equal(saved.filter(item=>item.kind==="ai-sentence").length,1);
  await page.evaluate(()=>exitTrainer());
  await page.locator("#startTrainingBtn").click();
  assert.equal(generated,1,"locally saved eligible sentence must prevent another generation");
  assert.deepEqual(errors,[]);
  console.log("Full app: both vocabulary directions, mandatory sentence comma, server-failure generation and local reuse passed");
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
