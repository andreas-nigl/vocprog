/* Derived, local-only conjugation database. Original vocabulary is never changed. */
(function (root) {
  "use strict";
  const VERSION = "ablaut-0.11.0-bilingual-v2";
  const KEY = "vocprog_v2_verb_records_v2";
  const normal = value => String(value || "").trim().normalize("NFC").toLocaleLowerCase();
  const lemmaOf = entry => normal(entry.infinitive || entry.lemma || entry.verbId ||
    (entry.kind === "verb-infinitive" ? entry.foreign : "")).replace(/^(?:\(to\)|to)\s+/, "");
  const six = row => Array.isArray(row) && row.length === 6 &&
    row.every(value => typeof value === "string" && value.trim());

  function recordId(key){
    const full="prepared-verb:"+encodeURIComponent(key);
    if(("special:"+full).length<=160)return full;
    // Four independent 32-bit lanes keep deterministic derived IDs within the server limit.
    const lanes=[2166136261,2246822519,3266489917,668265263];
    for(const char of String(key))for(let i=0;i<lanes.length;i++)lanes[i]=Math.imul(lanes[i]^char.codePointAt(0),16777619+i*2)>>>0;
    return "prepared-verb:long:"+lanes.map(value=>value.toString(16).padStart(8,"0")).join("");
  }
  function auxiliaryOf(entries){
    const base=entries.find(entry=>entry.kind==="verb-infinitive");
    if(["être","avoir"].includes(base?.auxiliary))return base.auxiliary;
    const choices=new Set(entries.map(entry=>entry.auxiliary).filter(value=>["être","avoir"].includes(value)));
    for(const entry of entries){
      if(!(entry.kind==="conjugation"||(entry.kind==="verb-form"&&entry.scanEvidence))||!["passé composé","plus-que-parfait"].includes(normal(entry.tense)))continue;
      const form=normal(entry.foreign).replace(/^(?:j['’]|je\s+|tu\s+|il\/elle\/on\s+|nous\s+|vous\s+|ils\/elles\s+)/,"");
      if(/^(?:suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient)\s/.test(form))choices.add("être");
      if(/^(?:ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient)\s/.test(form))choices.add("avoir");
    }
    if(choices.size>1)throw Error("Widersprüchliche Hilfsverbvorgaben für "+lemmaOf(base||entries[0]||{}));
    return [...choices][0]||"";
  }

  function signature(book, entries, paradigms, tenses) {
    return JSON.stringify([VERSION, book.id, book.lang, tenses,
      entries.map(entry => [entry.id, entry.kind, lemmaOf(entry), entry.page,
        entry.foreign, entry.german, entry.person, entry.tense, entry.verification]),
      paradigms.map(entry => [entry.lemma, entry.forms, entry.persons,
        entry.pastParticiple, entry.agreement, entry.imperative])]);
  }

  function frenchSurface(tense, person, form) {
    const subjunctive = tense === "subjonctif présent";
    const vowel = /^[aeiouéèêëàâîïôûùüœh]/i.test(form);
    const subject = person === "je" && vowel ? "j'" : person + " ";
    return (subjunctive ? (/^(il|elle|on)(\/|$)/.test(person) ? "qu'" : "que ") : "") +
      subject + form;
  }

  function agreementVariants(form, personIndex, auxiliary, tense) {
    if (auxiliary !== "être" || !["passé composé", "plus-que-parfait"].includes(tense))
      return [form];
    // The infinitive alone does not determine gender or polite/plural vous.
    const words = form.replace(/\(e\)|\(s\)/g, "").split(" ");
    const participle = words.pop().replace(/s$/, "");
    const auxiliaryForm = words.join(" ") + " ";
    const endings = personIndex === 3 || personIndex === 5 ? ["s", "es"] :
      personIndex === 4 ? ["", "e", "s", "es"] : ["", "e"];
    return endings.map(ending => auxiliaryForm + participle + ending);
  }

  function primaryFrench(tense,index,person,form,auxiliary){
    return frenchSurface(tense,person,agreementVariants(form,index,auxiliary,tense)[0]);
  }

  function acceptedFrench(tense, index, form, auxiliary) {
    const persons = [["je"], ["tu"], ["il", "elle", "on"], ["nous"], ["vous"], ["ils", "elles"]][index];
    const variants = agreementVariants(form, index, auxiliary, tense);
    return [...new Set(persons.flatMap(person => {
      const choices = variants.length > 1 && ["il", "ils"].includes(person) ? [variants[0]] :
        variants.length > 1 && ["elle", "elles"].includes(person) ? [variants[1]] : variants;
      return choices.map(variant => frenchSurface(tense, person, variant));
    }))];
  }

  function build(book, entries, paradigms, tenses, morphology, reference) {
    const verbs = Object.create(null);
    const lemmas = [...new Set(entries.map(lemmaOf).filter(Boolean))];
    for (const lemma of lemmas) {
      const source = entries.filter(entry => lemmaOf(entry) === lemma);
      const base = source.find(entry => entry.kind === "verb-infinitive");
      const stored = paradigms.find(entry => normal(entry.lemma) === lemma);
      const motor = book.lang === "en-US" && root.VOCEnglishVerbs ?
        root.VOCEnglishVerbs.morphology(lemma,morphology) : morphology(lemma, book.lang);
      const curated = book.lang === "fr-FR" ? reference?.(lemma) : null;
      const persons = motor?.persons || curated?.persons || stored?.persons || [];
      const auxiliary = auxiliaryOf(source) || curated?.auxiliary || motor?.auxiliary;
      const forms = {}, cards = {};
      for (const tense of tenses) {
        const aller=book.lang==="fr-FR"&&tense==="futur proche"?
          reference?.("aller")?.forms?.["présent"]||morphology("aller",book.lang)?.forms?.["présent"]:null;
        const generated = aller?aller.map(form=>form+" "+lemma):curated?.forms?.[tense] || motor?.forms?.[tense] || stored?.forms?.[tense];
        if (!six(generated) || persons.length !== 6) continue;
        forms[tense] = [...generated];
        cards[tense] = generated.map((form, index) => {
          const foreign = book.lang === "fr-FR" ? primaryFrench(tense,index,persons[index],form,auxiliary) :
            persons[index] + " " + form;
          const acceptedForeign = book.lang === "fr-FR" ?
            [...new Set([foreign, ...acceptedFrench(tense, index, form, auxiliary)])] : [foreign];
          const saved = source.find(entry => ["conjugation", "verb-form"].includes(entry.kind) &&
            normal(entry.tense) === tense && normal(entry.person) === normal(persons[index]) &&
            entry.verification !== "scan-unverified" &&
            acceptedForeign.some(value => normal(value) === normal(entry.foreign)));
          const translation = String(saved?.german || "").trim();
          const germanBase = String(base?.german || "").trim();
          const printed=source.find(entry=>entry.scanEvidence&&(!base?.scanCorrectedAt||Date.parse(entry.scanCorrectedAt||entry.updatedAt||0)>=Date.parse(base.scanCorrectedAt))&&["conjugation","verb-form"].includes(entry.kind)&&normal(entry.tense)===tense&&normal(entry.person)===normal(persons[index]));
          return {foreign, acceptedForeign, printedForeign:printed?.foreign, german: translation, person: persons[index], tense,
            grammaticalPrompt: (germanBase || lemma) + " · " + tense + " · " + persons[index],
            germanBase, sourceId: saved?.id || base?.id || source[0]?.id,
            verification: curated ? "curated-morphology" : "local-morphology-not-language-reviewed"};
        });
      }
      const value = kind => source.find(entry => entry.kind === kind);
      verbs[lemma] = {
        infinitive: lemma, german: String(base?.german || ""), persons, forms, cards, auxiliary,
        participle: value("verb-participle")?.foreign || curated?.agreement ||
          curated?.pastParticiple || motor?.participle || stored?.pastParticiple || "",
        participleGerman: value("verb-participle")?.german || "",
        imperative: value("verb-imperative")?.foreign || curated?.imperative ||
          motor?.imperative || stored?.imperative || "",
        imperativeGerman: value("verb-imperative")?.german || "",
        principalParts: motor?.principalParts || null,
        presentParticiple: motor?.presentParticiple || "",
        regularity: base?.regularity || curated?.regularity || stored?.regularity || "",
        missing: tenses.filter(tense => !cards[tense])
      };
    }
    return {version: VERSION, bookId: book.id, language: book.lang, verbs};
  }

  function create(storage, morphology, reference, enrich) {
    let records = Object.create(null);
    const snapshots = new Map();
    const translationAttempts=new Set();
    let queue = Promise.resolve();
    const normalKey = (language, lemma, german, context="") => [language, lemma, normal(german)].join("|")+(context?"|context="+context:"");
    const consistent=record=>record.language!=="fr-FR"||!["être","avoir"].includes(record.verb?.auxiliary)||
      ["passé composé","plus-que-parfait"].every(tense=>(record.verb.forms?.[tense]||[]).every(form=>
        record.verb.auxiliary==="être"?!/^(?:ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient)\s/.test(form):
          !/^(?:suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient)\s/.test(form)));
    function hydrate() {
      let incoming;
      try { incoming = JSON.parse(storage.getItem(KEY) || "{}"); } catch { return; }
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return;
      for (const [key, value] of Object.entries(incoming)) {
        if (value?.version !== VERSION || typeof value.lemma !== "string" || value.verb?.referenceError ||
            !value.verb || typeof value.verb.cards !== "object" ||
            key !== normalKey(value.language, value.lemma, value.german,value.context)||!consistent(value)) continue;
        if (!records[key] || (!records[key].ready && value.ready)||
            (value.language==="en-US"&&value.ready&&Number(value.verb.englishPreparedVersion||0)>Number(records[key].verb.englishPreparedVersion||0))||
            (value.ready&&Object.keys(value.verb.cards).length>Object.keys(records[key].verb.cards).length&&
              Date.parse(value.checkedAt)>=Date.parse(records[key].checkedAt))) records[key] = value;
      }
    }
    hydrate();
    return Object.freeze({
      prepare(book, entries, paradigms, tenses) {
        const run = async () => {
        hydrate();
        const verbs = Object.create(null), next = {...records};
        let changed = false;
        for (const lemma of [...new Set(entries.map(lemmaOf).filter(Boolean))]) {
          const source = entries.filter(entry => lemmaOf(entry) === lemma);
          const base = source.find(entry => entry.kind === "verb-infinitive");
          const german = String(base?.german || "").trim();
          const auxiliary=auxiliaryOf(source);
          const revision=source.map(entry=>entry.scanCorrectedAt||(entry.scanEvidence&&["conjugation","verb-form"].includes(entry.kind)?entry.updatedAt||"":"")).sort().pop();
          const context=[auxiliary,revision?book.id+":"+revision:""].filter(Boolean).join("|");
          const key = normalKey(book.lang, lemma, german,context);
          let record = records[key];
          const extend=record&&book.lang==="fr-FR"&&tenses.includes("futur proche")&&
            ((!record.verb.cards["futur proche"]&&!record.verb.extensionAttempts?.includes("futur proche"))||
              record.verb.cards["futur proche"]?.some(card=>/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(card.german)));
          const repairEnglish=book.lang==="en-US"&&root.VOCEnglishVerbs&&(!record||record.verb.englishPreparedVersion!==root.VOCEnglishVerbs.VERSION||(!root.VOCEnglishVerbs.translationComplete(record.verb)&&!translationAttempts.has(key)));
          if(repairEnglish)translationAttempts.add(key);
          if (!record||extend||repairEnglish) {
            const translationOnly=repairEnglish&&record?.ready&&record.verb.englishPreparedVersion>=1&&tenses.every(tense=>record.verb.cards[tense]?.length===6);
            const result = translationOnly?null:build(book, source, paradigms, extend?["futur proche"]:tenses, morphology, reference);
            let verb = translationOnly?JSON.parse(JSON.stringify(record.verb)):result.verbs[lemma];
            if (enrich){
              try{verb = await enrich(verb, book.lang, morphology);}
              catch(error){
                if(translationOnly){verbs[lemma]=record.verb;continue;}
                if(!extend)throw error;verb.referenceError=String(error.message||error);
              }
            }
            if(extend){
              const previous=record.verb;
              verb={...previous,forms:{...previous.forms,...verb.forms},cards:{...previous.cards,...verb.cards},
                verificationSources:[...new Map([...(previous.verificationSources||[]),...(verb.verificationSources||[])].map(item=>[item.url,item])).values()],
                extensionAttempts:[...(previous.extensionAttempts||[]),"futur proche"],
                ...(verb.referenceError?{referenceError:verb.referenceError}:{})};
            }
            verb.missing = tenses.filter(tense => (!Array.isArray(verb.cards[tense]) || verb.cards[tense].length !== 6) ||
              (enrich && verb.cards[tense].some(card => card.foreignVerification?.status !== "reference-matched" ||
                (book.lang!=="en-US"&&(!card.german||card.germanVerification?.status !== "reference-matched")))));
            if(translationOnly&&JSON.stringify(verb)===JSON.stringify(record.verb)){verbs[lemma]=record.verb;continue;}
            record = {version: VERSION, key, ...(context?{context}:{}), bookId: book.id, language: book.lang, lemma, german,
              verb, ready: verb.missing.length === 0, checkedAt: new Date().toISOString()};
            // A failed fetch is not a completed check. Reopening can retry it;
            // completed records and genuine reference gaps stay cached.
            if (!verb.referenceError) { next[key] = record; changed = true; }
          }
          verbs[lemma] = record.verb;
        }
        if (changed) {
          // Publish neither a ready snapshot nor new records before durable storage succeeds.
          storage.setItem(KEY, JSON.stringify(next));
          records = next;
        }
        const snapshot = {version: VERSION, bookId: book.id, language: book.lang, verbs};
        snapshots.set(book.id, snapshot);
        return snapshot;
        };
        const pending = queue.then(run, run);
        queue = pending.catch(() => {});
        return pending;
      },
      retryPending(bookId) {
        translationAttempts.clear();
        const next = Object.fromEntries(Object.entries(records).filter(([, value]) =>
          value.bookId !== bookId || value.ready));
        storage.setItem(KEY, JSON.stringify(next));
        records = next;
      },
      get(bookId) { return snapshots.get(bookId) || null; }
    });
  }
  root.VOCVerbDatabase = Object.freeze({create, recordId, lemmaOf, frenchSurface, acceptedFrench,auxiliaryOf,primaryFrench});
})(typeof window === "undefined" ? globalThis : window);
