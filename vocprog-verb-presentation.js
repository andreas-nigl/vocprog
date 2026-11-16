(function(root){
  "use strict";
  const clean=value=>String(value||"").trim().replace(/\s+/g," ");
  function germanImperative(value){
    return String(value||"").split(/\s+\/\s+/).map(part=>part.replace(/^\((du|wir|ihr|Sie)\)\s*(.*)$/,(all,person,form)=>{
      const hasPronoun=new RegExp("(?:^|\\s)"+person+"(?:\\s|[!?.]|$)").test(form);
      return hasPronoun?form:all;
    })).join(" / ");
  }
  function imperativeCards(verb){
    if(!verb)return [];
    const persons=["tu","nous","vous"];
    const raw=Array.isArray(verb.imperative)?verb.imperative:String(verb.imperative||"").split(/\s+\/\s+/);
    const german=new Map();
    const parts=String(verb.imperativeGerman||"").split(/\s+\/\s+/);
    for(const [index,part] of parts.entries()){
      const label=part.match(/^\((du|wir|ihr|Sie)\)/)?.[1];
      const spoken=part.match(/(?:^|\s)(wir|Sie)(?:\s|[!?.]|$)/)?.[1];
      const person=label||spoken||(parts.length===3||parts.length===4?["du","wir","ihr","Sie"][index]:null);
      if(person)german.set(person,[...(german.get(person)||[]),germanImperative(label?part:"("+person+") "+part)]);
    }
    return persons.map((person,index)=>{
      const bare=clean(raw[index]).replace(/^\((?:tu|nous|vous)\)\s*/,"");
      const translations=(index===0?german.get("du"):index===1?german.get("wir"):[...(german.get("ihr")||[]),...(german.get("Sie")||[])])||[];
      const translated=translations.join(" / ");
      return {person,tense:"impératif",foreign:"("+person+") "+bare,german:translated,
        acceptedForeign:[bare,"("+person+") "+bare],
        acceptedGerman:translations.map(value=>value.replace(/^\((?:du|wir|ihr|Sie)\)\s*/,"")),valid:!!bare&&!!translated};
    }).filter(card=>card.valid);
  }
  function compareVocabulary(a,b){
    const page=String(a.page||"?"),other=String(b.page||"?");
    const pageOrder=page==="?"?(other==="?"?0:1):other==="?"?-1:page.localeCompare(other,"de",{numeric:true});
    const number=entry=>Number(String(entry.refVocab||"").match(/\bV\s*(\d+)/i)?.[1]||Infinity);
    return pageOrder||number(a)-number(b)||0;
  }
  function germanAlternatives(value){
    const chunks=String(value||"").split(/\s+\/\s+|[,;]|\s+(?:oder|or)\s+/i).map(clean).filter(Boolean);
    return chunks.flatMap(chunk=>{
      let variants=[""];
      for(const token of chunk.split(/\s+/)){
        const choices=token.split("/").filter(Boolean);
        variants=variants.flatMap(prefix=>choices.map(choice=>(prefix+" "+choice).trim())).slice(0,64);
      }
      return variants;
    });
  }
  function matchesGermanAnswer(given,item,normalize){
    const target=String(item.target||""),kind=item.record?.kind||"";
    const equals=(left,right)=>normalize(left)===normalize(right);
    if(equals(given,target))return true;
    const accepts=(answer,choice,shortImperative=false)=>{
      if(equals(answer,choice))return true;
      if(!shortImperative)return false;
      const match=choice.match(/^(\S+)e(?=\s|$)/);
      if(!match||/[dt]$|[^aeiouäöü][mn]$/i.test(match[1]))return false;
      return equals(answer,choice.replace(/^(\S+)e(?=\s|$)/,"$1"));
    };
    const parts=target.split(/\s+\/\s+/).map(clean).filter(Boolean);
    if(kind==="verb-imperative"||kind==="verb-principal"){
      const groups=[[],[],[]];
      if(kind==="verb-imperative"){
        for(const [index,part] of parts.entries()){
          const label=part.match(/^\((du|wir|ihr|Sie)\)/)?.[1];
          const spoken=part.match(/(?:^|\s)(wir|Sie)(?:\s|[!?.]|$)/)?.[1];
          const person=label||spoken||["du","wir","ihr","Sie"][index%4];
          const slot=person==="du"?0:person==="wir"?1:2;
          groups[slot].push(part.replace(/^\((?:du|wir|ihr|Sie)\)\s*/,""));
        }
      }else{
        if(parts.length%3!==0)return false;
        parts.forEach((part,index)=>groups[index%3].push(part));
      }
      const supplied=String(given).split(/\s*[/,;]\s*/).map(clean);
      if(supplied.length!==3)return false;
      return groups.every((choices,index)=>choices.flatMap(germanAlternatives).some(choice=>accepts(supplied[index],choice,kind==="verb-imperative"&&index===0)));
    }
    return [target,...(item.acceptedTargets||[])].flatMap(germanAlternatives)
      .some(choice=>accepts(given,choice,item.record?.person==="tu"&&item.verbTense==="impératif"));
  }
  function germanAnswerHint(item){
    if(item?.tLang!=="de-DE"||!["words","verbs"].includes(item.kind))return "";
    const kind=item.record?.kind;
    if(kind==="verb-imperative"||kind==="verb-principal")return "Je Form eine Übersetzung genügt";
    const choices=[...new Set([item.target,...(item.acceptedTargets||[])].flatMap(germanAlternatives))];
    return choices.length>1?"Eine deutsche Übersetzung genügt":"";
  }
  const api={germanImperative,imperativeCards,compareVocabulary,germanAlternatives,matchesGermanAnswer,germanAnswerHint};root.VOCVerbPresentation=api;
  if(typeof module!=="undefined")module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
