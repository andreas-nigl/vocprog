/*
 * VOC morphology-only adapter for locally compiled ablaut 0.11.0 WASM.
 * Development module: intentionally NOT loaded by index.html until the
 * verified WASM artifact and the remaining language adapters are available.
 *
 * This module NEVER supplies a German translation, never invokes the
 * network, and never treats missing tenses as verified.
 */
(function (root) {
  "use strict";

  const CODE = Object.freeze({
    "fr-FR": "fra", "en-US": "eng", "es-ES": "spa",
    "pt-PT": "por", "nl-NL": "nld"
  });

  const PERSONS = Object.freeze({
    "fr-FR": ["je", "tu", "il/elle/on", "nous", "vous", "ils/elles"],
    "en-US": ["I", "you", "he/she/it", "we", "you", "they"],
    "es-ES": ["yo", "tú", "él/ella/usted", "nosotros", "vosotros", "ellos/ellas/ustedes"],
    "pt-PT": ["eu", "tu", "ele/ela", "nós", "vós", "eles/elas"],
    "nl-NL": ["ik", "jij", "hij/zij/het", "wij", "jullie", "zij"]
  });

  const SIX_MAP = Object.freeze({
    "fr-FR": {
      "présent": "present", "imparfait": "imperfect",
      "passé composé": "passe_compose",
      "plus-que-parfait": "plus_que_parfait",
      "futur simple": "future",
      "conditionnel présent": "conditional",
      "subjonctif présent": "subjunctive_present"
    },
    "es-ES": {
      "presente": "present",
      "pretérito perfecto compuesto": "perfecto_compuesto",
      "pretérito indefinido": "preterite",
      "pretérito imperfecto": "imperfect",
      "pluscuamperfecto": "pluscuamperfecto",
      "futuro simple": "future",
      "condicional simple": "conditional",
      "presente de subjuntivo": "subjunctive_present"
    },
    "pt-PT": {
      "presente": "present",
      "pretérito perfeito": "preterite",
      "pretérito imperfeito": "imperfect",
      "mais-que-perfeito composto": "mais_que_perfeito_composto",
      "futuro do presente": "future",
      "condicional": "conditional",
      "presente do conjuntivo": "subjunctive_present"
    }
  });

  const ENGLISH_KEYS = Object.freeze({
    "simple present": "present_row",
    "simple past": "past_row",
    "present perfect": "present_perfect_row",
    "past perfect": "past_perfect_row",
    "will future": "future_row"
  });

  const EN_BE_NOW = ["am", "are", "is", "are", "are", "are"];
  const EN_BE_PAST = ["was", "were", "was", "were", "were", "were"];

  const norm = value => String(value || "").trim().normalize("NFC");
  const hasSix = value => Array.isArray(value) && value.length === 6 &&
    value.every(part => typeof part === "string" && part.trim().length > 0);

  function englishTenses(table) {
    const map = {};
    for (const [name, key] of Object.entries(ENGLISH_KEYS)) {
      if (hasSix(table[key])) map[name] = table[key].map(norm);
    }
    const participle = norm(table.present_participle);
    const infinitive = norm(table.infinitive);
    if (participle) {
      map["present progressive"] = EN_BE_NOW.map(aux => aux + " " + participle);
      map["past progressive"] = EN_BE_PAST.map(aux => aux + " " + participle);
    }
    if (infinitive) {
      map["going to future"] = EN_BE_NOW.map(aux => aux + " going to " + infinitive);
      map["conditional"] = Array(6).fill("would " + infinitive);
    }
    return map;
  }

  const DUTCH_AUXILIARIES = Object.freeze({
    hebben: Object.freeze({
      present: ["heb", "hebt", "heeft", "hebben", "hebben", "hebben"],
      past: ["had", "had", "had", "hadden", "hadden", "hadden"]
    }),
    zijn: Object.freeze({
      present: ["ben", "bent", "is", "zijn", "zijn", "zijn"],
      past: ["was", "was", "was", "waren", "waren", "waren"]
    })
  });
  const DUTCH_FUTURE = ["zal", "zult", "zal", "zullen", "zullen", "zullen"];

  // An auxiliary is NOT inferable from the ablaut table alone.
  // The caller must provide independently reviewed auxiliary evidence,
  // including the sense/context when either auxiliary can apply.
  function reviewedDutchAuxiliary(options) {
    const evidence = options?.dutchAuxiliaryEvidence;
    if (!evidence || evidence.reviewed !== true ||
        typeof evidence.source !== "string" || !evidence.source.trim() ||
        typeof evidence.context !== "string" || !evidence.context.trim() ||
        !Object.prototype.hasOwnProperty.call(DUTCH_AUXILIARIES,evidence.auxiliary))
      return null;
    return evidence;
  }

  function dutchTenses(table,options) {
    const result = {};
    if (hasSix(table.present)) result["onvoltooid tegenwoordige tijd"] = [...table.present];
    if (Array.isArray(table.past) && table.past.length === 2 &&
      table.past.every(part => typeof part === "string" && part.trim())) {
      const [singular, plural] = table.past;
      result["onvoltooid verleden tijd"] = [
        singular, singular, singular, plural, plural, plural
      ];
    }
    const participle=norm(table.past_participle);
    const reviewed=reviewedDutchAuxiliary(options);
    if(reviewed&&participle) {
      const auxiliary=DUTCH_AUXILIARIES[reviewed.auxiliary];
      result["voltooid tegenwoordige tijd"]=
        auxiliary.present.map(form=>form+" "+participle);
      result["voltooid verleden tijd"]=
        auxiliary.past.map(form=>form+" "+participle);
    }
    const infinitive=norm(table.infinitive);
    if(infinitive)result["onvoltooid toekomende tijd"]=
      DUTCH_FUTURE.map(form=>form+" "+infinitive);
    return result;
  }

  function adapt(table, language, options = {}) {
    if (!CODE[language]) throw Error("Unsupported conjugation language: " + language);
    if (!table || typeof table !== "object" || Array.isArray(table))
      throw Error("Missing conjugation table");
    const infinitive = norm(table.infinitive);
    if (!infinitive) throw Error("Missing infinitive");
    let forms = {};
    if (SIX_MAP[language]) {
      for (const [name, key] of Object.entries(SIX_MAP[language])) {
        if (hasSix(table[key])) forms[name] = table[key].map(norm);
      }
    } else if (language === "en-US") forms = englishTenses(table);
    else if (language === "nl-NL") forms = dutchTenses(table,options);
    const required = language === "nl-NL" ? [
      "onvoltooid tegenwoordige tijd", "onvoltooid verleden tijd",
      "voltooid tegenwoordige tijd", "voltooid verleden tijd",
      "onvoltooid toekomende tijd"
    ] : language === "en-US" ? [
      "simple present", "present progressive", "simple past",
      "past progressive", "present perfect", "past perfect",
      "will future", "going to future", "conditional"
    ] : Object.keys(SIX_MAP[language]);
    const present = Object.keys(forms);
    return {
      language,infinitive,forms,
      persons: [...PERSONS[language]],
      missing: required.filter(key => !forms[key]),
      available: present,
      participle: norm(table.past_participle),
      presentParticiple: norm(table.present_participle || table.gerund),
      imperative: table.imperative ?? null,
      principalParts: language === "en-US" ?
        [infinitive, norm(table.past), norm(table.past_participle)] :
        language === "nl-NL" ?
          [infinitive, Array.isArray(table.past) ? norm(table.past[0]) : "",
            norm(table.past_participle)] : null,
      auxiliary: language === "nl-NL"
        ? reviewedDutchAuxiliary(options)?.auxiliary||null
        : typeof table.auxiliary === "string" ? table.auxiliary : null,
      auxiliaryEvidence: language === "nl-NL"
        ? reviewedDutchAuxiliary(options)||null : null,
      verification: "morphology-wasm-adapted-not-language-reviewed",
      translationsVerified: false
    };
  }

  function create(conjugateFunction) {
    if (typeof conjugateFunction !== "function") throw Error("WASM conjugator required");
    return Object.freeze({
      conjugate(infinitive, language, options = {}) {
        const code = CODE[language];
        if (!code) throw Error("Unsupported language: " + language);
        return adapt(conjugateFunction(norm(infinitive), code), language, options);
      }
    });
  }

  root.VOCWasmAdapter = Object.freeze({create, adapt, supported: Object.keys(CODE)});
})(typeof window === "undefined" ? globalThis : window);
