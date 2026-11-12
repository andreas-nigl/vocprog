"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
require("../vocprog-latin-principal.js");
const adapter=globalThis.VOCLatinPrincipalParts;

const sample={results:[{entryIndex:1,de:{
  part:{pofs:"V",v:{kind:"X"}},stems:["am","am","amav","amat"]
}}]};

test("Latin source entry is not trainable without independent review",()=>{
  const result=adapter.principalPartsFromAnalysis(sample,
    ()=> "amo, amare, amavi, amatus  V (1st)  [XXXAO]");
  assert.equal(result.status,"source-extracted-pending-review");
  assert.equal(result.entries[0].trainable,false);
  assert.equal(result.entries[0].sourceFourthForm,"amatus");
});

test("Latin principal groups and infinitive remain separate learning cards",()=>{
  const source=adapter.principalPartsFromAnalysis(sample,
    ()=> "amo, amare, amavi, amatus  V (1st)");
  const accepted=adapter.makeFourPartReview(source.entries[0],{
    reviewed:true,source:"independent Latin lexicon",forms:["amō","amāre","amāvī","amātum"]
  });
  assert.equal(accepted.trainable,true);
  assert.equal(accepted.cards[0].foreign,"amāre");
  assert.equal(accepted.cards[1].foreign,"amō / amāre / amāvī / amātum");
  assert.notEqual(accepted.cards[0].kind,accepted.cards[1].kind);
});

test("Unreviewed or inconsistent principal-parts data never pass",()=>{
  const source=adapter.principalPartsFromAnalysis(sample,
    ()=> "amo, amare, amavi, amatus  V (1st)");
  for(const bad of [
    {reviewed:false,source:"reference",forms:["amo","amare","amavi","amatum"]},
    {reviewed:true,source:"",forms:["amo","amare","amavi","amatum"]},
    {reviewed:true,source:"reference",forms:["amo","amare","amavi"]},
    {reviewed:true,source:"reference",forms:["video","videre","vidi","visum"]}
  ]){
    assert.throws(()=>adapter.makeFourPartReview(source.entries[0],bad));
  }
});

test("Deponents are never forced into an ordinary four-part active paradigm",()=>{
  const entry={results:[{de:{part:{pofs:"V",v:{kind:"DEP"}},stems:["hort","hort","","hortat"]}}]};
  const result=adapter.principalPartsFromAnalysis(entry,
    ()=> "hortor, hortari, hortatus sum  V (1st) DEP");
  assert.throws(()=>adapter.makeFourPartReview(result.entries[0],{
    reviewed:true,source:"lexicon",forms:["hortor","hortari","-","hortatus sum"]
  }));
});

test("Ambiguous Latin dictionary entries cannot be selected silently",()=>{
  const distinct={results:[sample.results[0],{de:{part:{pofs:"V",v:{kind:"X"}},stems:["al","al","alu","alit"]}}]};
  const result=adapter.principalPartsFromAnalysis(distinct,de=>
    de.stems[0]==="am"?"amo, amare, amavi, amatus  V (1st)":
      "alo, alere, alui, alitus  V (3rd)");
  assert.equal(result.status,"ambiguous");
});
