/* Touch and keyboard accessible tense picker. The native select remains the data contract. */
(function(root){
 'use strict';
 function create(select,change){
  select.hidden=true;
  const shell=document.createElement('div');shell.className='tense-picker';
  const toggle=document.createElement('button');toggle.type='button';toggle.id='tenseChoiceToggle';toggle.className='tense-choice-toggle';toggle.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.id='tenseChoicePanel';panel.className='tense-choice-panel';panel.hidden=true;
  shell.append(toggle,panel);select.after(shell);
  let selected=[],draft=[],multiple=false,opened=false;
  const exclusive=value=>['infinitiv','principal parts'].includes(value);
  const label=value=>Array.from(select.options).find(option=>option.value===value)?.textContent||value;
  const short=value=>label(value).replace(/\s*\([^)]*\)\s*$/,'');
  function values(){return selected.length?[...selected]:[select.value];}
  function commit(){if(!draft.length)return;selected=[...draft];select.value=selected[0];select.dataset.tenses=JSON.stringify(selected);close();change(values());}
  function close(){opened=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent=values().map(short).join(', ');}
  function mode(){multiple=true;draft=draft.filter(value=>!exclusive(value));render();}
  function render(){
   panel.replaceChildren();
   const header=document.createElement('button');header.type='button';header.className='tense-multi-header';header.textContent=multiple?'ÜBERNEHMEN':'MEHRFACHAUSWAHL';header.disabled=multiple&&!draft.length;header.onclick=()=>multiple?commit():mode();panel.append(header);
   for(const option of select.options){
    const row=document.createElement('div');row.className='tense-choice-row';
    if(multiple&&!exclusive(option.value)){
     const check=document.createElement('input');check.type='checkbox';check.checked=draft.includes(option.value);check.setAttribute('aria-label',option.textContent);row.append(check);
    }
    const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.setAttribute('aria-pressed',String(draft.includes(option.value)));
    const choose=event=>{
     if(exclusive(option.value)){draft=[option.value];commit();return;}
     if(event.ctrlKey||event.metaKey){multiple=true;draft=draft.filter(value=>!exclusive(value));}
     if(!multiple){draft=[option.value];commit();return;}
     draft=draft.includes(option.value)?draft.filter(value=>value!==option.value):[...draft,option.value];render();
     panel.querySelectorAll('.tense-choice-row button')[Array.from(select.options).indexOf(option)]?.focus();
    };
    button.onclick=choose;row.onclick=event=>{if(event.target!==button)choose(event);};row.append(button);panel.append(row);
   }
  }
  toggle.onclick=()=>{if(opened){close();return;}opened=true;draft=values();multiple=false;panel.hidden=false;toggle.setAttribute('aria-expanded','true');render();};
  document.addEventListener('keydown',event=>{if(!opened)return;if(event.key==='Escape'){event.preventDefault();close();toggle.focus();}else if(event.key==='Enter'&&multiple){event.preventDefault();commit();toggle.focus();}});
  document.addEventListener('pointerdown',event=>{if(opened&&!shell.contains(event.target))close();});
  return {values,refresh(saved){selected=(saved||values()).filter(value=>Array.from(select.options).some(option=>option.value===value));if(!selected.length)selected=[select.value];select.value=selected[0];select.dataset.tenses=JSON.stringify(selected);close();}};
 }
 root.VOCTenseChoices=Object.freeze({create});
})(window);
