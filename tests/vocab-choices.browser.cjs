"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,640,1280]){
   const page=await browser.newPage({viewport:{width,height:720}});
   await page.setContent('<style>body{margin:8px}#wrap{width:100%;max-width:600px}</style><div id="wrap"><select id="startVocab"><option>154 · 1 · short</option><option>155 · 2 · '+('long word '.repeat(60))+'</option></select><select id="endVocab"><option>154 · 1 · short</option><option>155 · 2 · last</option></select></div>');
   await page.addStyleTag({content:fs.readFileSync("vocprog-enhancements.css","utf8")});
   await page.addScriptTag({content:fs.readFileSync("vocprog-vocab-choices.js","utf8")});
   await page.evaluate(()=>{window.changes=0;document.querySelector("#startVocab").addEventListener("change",()=>window.changes++);});
   const trigger=page.getByRole("combobox",{name:"Erste Vokabel (Start)"});
   await trigger.click();
   const geometry=await page.locator("#startVocab-choices").evaluate(node=>{const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right,width:window.innerWidth,scroll:node.scrollWidth,client:node.clientWidth};});
   assert.ok(geometry.left>=7,JSON.stringify(geometry));assert.ok(geometry.right<=geometry.width-7,JSON.stringify(geometry));
   assert.ok(geometry.scroll>geometry.client,"long options need horizontal scrollbar");
   await trigger.press("End");await trigger.press("Enter");
   assert.equal(await page.locator("#startVocab").evaluate(node=>node.selectedIndex),1);
   assert.equal(await page.evaluate(()=>window.changes),1);
   await trigger.click();await trigger.press("Escape");
   assert.equal(await trigger.getAttribute("aria-expanded"),"false");
   await page.close();
   console.log("Bounded dropdown keyboard and horizontal overflow passed: "+width+" CSS px");
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
