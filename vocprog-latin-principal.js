/*
 * VOC Latin principal-parts adapter – development only.
 * Input: parsed results from the MIT-licensed whitakers-words browser engine,
 * plus its exported dictionaryForm() function. Never loads remote data.
 * No cards can be trained until an independent reviewer verifies source
 * fourth-form conventions and macron/diacritic treatment.
 */
(function(root){
  "use strict";

  const withoutMacrons=value=>String(value||"").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").normalize("NFC").trim().toLocaleLowerCase("la");

  function principalPartsFromAnalysis(analysis,dictionaryForm){
    if(!analysis||!Array.isArray(analysis.results)||
       typeof dictionaryForm!=="function")throw Error("Latin reference API required");
    // A parsed Latin input must match the candidate's actual infinitive,
    // not a different dictionary entry matching the same surface word.
    const sought=withoutMacrons(analysis.word);
    const candidates=new Map();
    for(const parsed of analysis.results){
      const entry=parsed?.de;
      if(entry?.part?.pofs!=="V"||!Array.isArray(entry.stems))continue;
      const text=String(dictionaryForm(entry)||"");
      if(!/\s{2,}V(?:\s|$)/.test(text))continue;
      const heading=text.split(/\s{2,}V\b/)[0].trim();
      const parts=heading.split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean);
      if(parts.length<2||parts.length>4)continue;
      if(sought&&withoutMacrons(parts[1])!==sought)continue;
      const kind=String(entry.part.v?.kind||"X").toUpperCase();
      const stableKey=parts.join("|")+"|"+kind;
      if(!candidates.has(stableKey)){
        candidates.set(stableKey,{
          language:"la-LA",
          lemma:parts[0],
          sourcePrincipalParts:[...parts],
          sourceFourthForm:parts[3]||null,
          verbKind:kind,
          source:"whitakers-words.dictionaryForm",
          verification:"source-extracted-independent-review-pending",
          trainable:false
        });
      }
    }
    const entries=[...candidates.values()];
    if(entries.length===0)return {status:"not-found",entries:[]};
    if(entries.length>1)return {status:"ambiguous",entries};
    return {status:"source-extracted-pending-review",entries};
  }

  function makeFourPartReview(candidate,reviewed){
    if(candidate?.verification!=="source-extracted-independent-review-pending"||
       !Array.isArray(candidate.sourcePrincipalParts))
      throw Error("Unverified Latin dictionary candidate");
    if(!reviewed||reviewed.reviewed!==true||
       typeof reviewed.source!=="string"||!reviewed.source.trim()||
       !Array.isArray(reviewed.forms)||reviewed.forms.length!==4||
       reviewed.forms.some(x=>typeof x!=="string"||!x.trim()))
      throw Error("Four independently reviewed Latin principal parts required");
    if(candidate.verbKind==="DEP"||candidate.verbKind==="SEMIDEP"||
       candidate.verbKind==="PERFDEF")
      throw Error("Non-standard Latin principal parts require a separate paradigm");
    if(candidate.sourcePrincipalParts.length!==4||
       candidate.sourcePrincipalParts.some(x=>x==="-"||!x))
      throw Error("Incomplete Latin source paradigm");
    const forms=reviewed.forms.map(x=>x.trim().normalize("NFC"));
    // The 4th dictionary citation may use -us (participle) versus -um
    // (supine), so compare only the first three without macrons.
    for(let index=0;index<3;index++){
      if(withoutMacrons(forms[index])!==withoutMacrons(candidate.sourcePrincipalParts[index]))
        throw Error("Principal-parts source mismatch at "+(index+1));
    }
    return Object.freeze({
      language:"la-LA",
      infinitive:forms[1],
      principalParts:Object.freeze([...forms]),
      // Infinitive alone and the full group will become independent cards.
      cards:Object.freeze([
        Object.freeze({kind:"verb-infinitive",foreign:forms[1]}),
        Object.freeze({kind:"verb-principal",foreign:forms.join(" / ")})
      ]),
      verification:"independently-reviewed-principal-parts",
      source:reviewed.source,
      trainable:true
    });
  }

  root.VOCLatinPrincipalParts=Object.freeze({
    principalPartsFromAnalysis,makeFourPartReview
  });
})(typeof window==="undefined"?globalThis:window);
