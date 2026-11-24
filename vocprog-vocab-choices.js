/* Bounded, keyboard-accessible vocabulary selectors; underlying select contracts stay intact. */
(function(){
"use strict";
function enhance(select,label){
 if(!select||select.dataset.boundedChoice)return;
 select.dataset.boundedChoice="true";
 const trigger=document.createElement("button");
 trigger.type="button";trigger.className="vocab-choice-trigger";
 trigger.setAttribute("role","combobox");trigger.setAttribute("aria-label",label);
 trigger.setAttribute("aria-haspopup","listbox");trigger.setAttribute("aria-expanded","false");
 const panel=document.createElement("div");panel.className="vocab-choice-panel";panel.id=select.id+"-choices";
 panel.setAttribute("role","listbox");panel.setAttribute("aria-label",label);panel.hidden=true;
 trigger.setAttribute("aria-controls",panel.id);
 select.classList.add("vocab-native-select");select.tabIndex=-1;
 select.after(trigger);document.body.append(panel);
 let active=0,search="",lastSearch=0;
 const update=()=>{
  trigger.textContent=select.selectedOptions[0]?.textContent||"Keine Vokabeln vorhanden";
  trigger.title=trigger.textContent;trigger.disabled=select.disabled||!select.options.length;
  if(!panel.hidden)render();
 };
 function place(){
  const view=window.visualViewport,margin=8;
  const x=(view?.offsetLeft||0)+margin,y=(view?.offsetTop||0)+margin;
  const width=Math.max(0,(view?.width||window.innerWidth)-2*margin),height=Math.max(0,(view?.height||window.innerHeight)-2*margin);
  const rect=trigger.getBoundingClientRect(),below=Math.max(0,y+height-rect.bottom-4),above=Math.max(0,rect.top-y-4);
  const maxHeight=Math.min(320,Math.max(below,above));
  const targetWidth=Math.min(width,Math.max(180,rect.width));
  panel.style.width=targetWidth+"px";panel.style.maxWidth=width+"px";panel.style.maxHeight=maxHeight+"px";
  panel.style.left=Math.max(x,Math.min(rect.left,x+width-targetWidth))+"px";
  panel.style.top=(below>=above?Math.min(y+height,rect.bottom+4):Math.max(y,rect.top-maxHeight-4))+"px";
 }
 function highlight(){
  for(const [index,row]of Array.from(panel.children).entries()){
   row.classList.toggle("vocab-choice-active",index===active);
   row.setAttribute("aria-selected",String(index===select.selectedIndex));
  }
  const row=panel.children[active];
  if(row){trigger.setAttribute("aria-activedescendant",row.id);row.scrollIntoView({block:"nearest",inline:"nearest"});}
 }
 function render(){
  panel.replaceChildren(...Array.from(select.options).map((option,index)=>{
   const row=document.createElement("div");row.id=panel.id+"-"+index;row.className="vocab-choice-option";
   row.textContent=option.textContent;row.dataset.index=String(index);row.setAttribute("role","option");
   row.setAttribute("aria-disabled",String(option.disabled));return row;
  }));
  active=Math.max(0,Math.min(active,select.options.length-1));place();highlight();
 }
 function close(){
  panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.removeAttribute("aria-activedescendant");
 }
 function open(){
  if(trigger.disabled)return;
  document.dispatchEvent(new CustomEvent("vocprog-choice-open",{detail:select.id}));
  active=Math.max(0,select.selectedIndex);panel.hidden=false;trigger.setAttribute("aria-expanded","true");render();
 }
 function choose(){
  if(select.options[active]?.disabled)return;
  select.selectedIndex=active;select.dispatchEvent(new Event("change",{bubbles:true}));close();update();trigger.focus();
 }
 trigger.addEventListener("click",()=>panel.hidden?open():close());
 trigger.addEventListener("keydown",event=>{
  if(event.key==="Escape"){close();return;}
  if(event.key==="Tab"){close();return;}
  if(["ArrowDown","ArrowUp","Home","End","Enter"," "].includes(event.key)){
   event.preventDefault();
   if(panel.hidden){open();return;}
   if(event.key==="Enter"||event.key===" "){choose();return;}
   active=event.key==="Home"?0:event.key==="End"?select.options.length-1:
    Math.max(0,Math.min(select.options.length-1,active+(event.key==="ArrowDown"?1:-1)));
   highlight();return;
  }
  if(event.key.length===1&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
   if(panel.hidden)open();
   const now=Date.now();search=now-lastSearch>700?event.key:search+event.key;lastSearch=now;
   const index=Array.from(select.options).findIndex(option=>option.textContent.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
   if(index>=0){active=index;highlight();}
  }
 });
 panel.addEventListener("pointerdown",event=>event.preventDefault());
 panel.addEventListener("click",event=>{
  const row=event.target.closest(".vocab-choice-option");if(!row)return;active=Number(row.dataset.index);choose();
 });
 document.addEventListener("pointerdown",event=>{if(!panel.contains(event.target)&&event.target!==trigger)close();});
 document.addEventListener("vocprog-choice-open",event=>{if(event.detail!==select.id)close();});
 select.addEventListener("change",update);
 new MutationObserver(update).observe(select,{childList:true,subtree:true,attributes:true});
 window.addEventListener("resize",()=>{if(!panel.hidden)place();});
 window.visualViewport?.addEventListener("resize",()=>{if(!panel.hidden)place();});
 window.visualViewport?.addEventListener("scroll",()=>{if(!panel.hidden)place();});
 window.addEventListener("scroll",()=>{if(!panel.hidden)place();},true);
 update();
}
const initialize=()=>{enhance(document.getElementById("startVocab"),"Erste Vokabel (Start)");enhance(document.getElementById("endVocab"),"Letzte Vokabel (Stopp)");};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);else initialize();
})();
