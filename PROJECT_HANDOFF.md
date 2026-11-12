## Entwicklungszwischenstand nach Gesamtfreigabe – 2026-11-12
**Freigabe:** Gesamter VOC-Entwicklungsblock durch Nutzer ausdrücklich freigegeben.
**Release:** UNVOLLSTÄNDIG; bis zur Fertigstellung/Abnahmetests KEINE
Veröffentlichung dieses Zwischenstands auf `vocprog-test/main` oder
`vocprog/main`. Die öffentliche Testversion bleibt weiterhin v0.4.

### Gesicherter Entwicklungsstand
- Repository `andreas-nigl/vocprog`, Branch
  `develop/offline-supabase-20261105`.
- Änderungen im Entwicklungsbranch (Commitreihenfolge):
  - `aaf6dab`: HTML für Merge-Dialog, Verben-Zeitform, Trainer-Tabelle,
    Auswahlbuch in der Lernanalyse und Überschrift `LERNANALYSE`.
  - `ef2ca74`: Unterscheidung `vocab`/`verbs`, UI-Namensschema
    `– Vokabeln/Verben (Sprache)`, je Sprache nach Möglichkeit
    Wiederverwendung eines Verbenbuchs.
  - `6fceb76`: sprachspezifische Kernzeitkataloge und
    Verb-Lern-/Tabellenansicht; abgedruckte Konjugationen filterbar.
  - `fafbdc5`: Lernanalyse pro Buch; Abfragen, korrekte Antworten (%),
    Vorlesen; nach Buchtyp gruppiert; dreifaches Antippen der
    Kategorieüberschrift erzeugt synchronisierbaren Reset-Epoch.
  - `9c45602`: Merge von genau 2 Büchern mit Sprach-, Typ-, Seiten- und
    Inhaltsprüfung und Backup-Download; Tombstones, Event-Übertragung.
  - `74feabc`: CSS für dezentes Merge-Symbol, Lernanalyse/Tabellenbereich.
  - `6512b27`: getrennte bisherige Vokabel-Bewertung erhalten,
    zweisprachige Zeitform-Tabellenüberschriften ergänzt.
  - `e7bd992` + `1e22c4b`: Scan erkennt Verb-Infinitive auch bei
    einzelnen Vokabeln, legt diese einmal pro Sprache in Verbenbuch ab.
    **Nur Buchbelege und gedruckte Konjugationen, noch keine
    freigegebene automatische Vollkonjugation aller Schulzeitformen.**
  - `640de49`: alte Datenimporte strikt in Vokabelbücher.
  - `86ae2f4`: neues Verbenbuch wird erst nach tatsächlicher
    Spracherkennung angelegt/wiederverwendet; Scan-Vormerkung
    bleibt lokal über Neustart erhalten.
  - `95cb9a6` + `cfe0f44`: Buch-Merge verweist bei inhaltsgleichen
    Duplikaten auf bestehende Vokabel-IDs und berücksichtigt zuvor
    zurückgesetzte Analysedaten.
- **Nicht geändert:** Die produktive Anwendung `main` hat die
  experimentellen Formulare nicht. Die öffentliche Test-App
  `vocprog-test/main` behält unverändert ihre v0.4-Dateien.
  Letzter geprüfter Test-JS-Blob `b9ced8b6bde895f72b245136facfbc4037c25bef`.
- **Offline:** SW-Datei im Entwicklungsbranch noch Version v6,
  bewusst nicht aktualisiert, weil kein freigabefähiger Build
  veröffentlicht wurde. Standalone nicht gebaut.

### Durchgeführte Prüfungen
- HTML-Inline-JS und Erweiterungs-JS parsebar, SW-JS parsebar.
- HTML: 14/14 neue erforderliche DOM-Elemente vorhanden.
- CSS: 6/6 zentrale neue Selektoren vorhanden.
- Sprachkataloge vorhanden für FR (7), EN (9), ES (8), PT (7),
  NL (5), LA (6) Zeitform-Optionen.
- Buchname: alte `Konjugationen`-Bezeichnung -> Anzeige als
  `Verben`; vorhandene Vokabelnamen korrekt suffixiert,
  keine doppelten Namenssuffixe (4 isolierte Checks).
- Merge isoliert: unterschiedliche Sprachen und Typen gesperrt,
  gleicher Inhalt auf gleicher Seite zulässig, widersprüchlicher
  Inhalt auf gleicher Seite gesperrt, nichtüberlappende Seiten zulässig.
- Statik: nach Änderung bisherige Vokabelantwortprüfung weiter
  referenziert; Backuppfad vor Merge-Datenänderung; persistente
  Analyse-Resets als special records vorhanden.
- **Noch NICHT geprüft:** Browser-Rendering/Interaktion, Kamera,
  Gemini-API, Offline-Wiederanlauf, echte Supabase-Schreiboperationen,
  konfliktfreier Mehrgeräte-Merge, Statistik-Reset über zwei
  Geräte, Export/Import-Roundtrip und vollständige grammatische
  Genauigkeit. Keine Nutzerabnahme der neuen Funktionen.

### Sperrende offene Implementierungs- und Sicherheitslücken
1. Zu JEDEM erkannten Verb vollständige Schulstoff-Formen für alle
   6 Sprachen erzeugen und **unabhängig** grammatisch validieren.
   Aktuell nur gedruckte Verbformen und erkannte Infinitive;
   keine generierten, unkontrollierten Formen als korrekt speichern.
   Möglicher lokal einbindbarer Referenzmotor:
   `https://github.com/ablaut-dev/ablaut` (MIT/Apache-2.0,
   Rust/WASM, FR/EN/ES/PT/NL, nicht LA), zunächst Quellstand,
   API, Qualität, Build, Lizenz und Offline-Nutzung prüfen;
   lateinische Flexion benötigt weiteren Beleg/Ressource.
   Fremde Online-Konjugations-APIs nur nach gesonderter Risiko-/
   Datenschutz-/CORS-/Lizenzprüfung; keine ungeprüfte
   Abhängigkeit einbauen.
2. Vollständiges lernbares Datenmodell der Pflichtgrundformen:
   für FR Infinitif/Participe passé/Impératif inklusive Accord;
   EN/NL getrennte Dreiergruppe und Infinitiv/Partizip;
   EN `-ing` als separate Karte; ES/PT Einzelkarten;
   LA Vierergruppe plus Infinitiv. Tabellen müssen dies
   vollständig in 2 Spalten mit korrekter Wortteil-Hervorhebung
   zeigen. Die bisherige Tabelle rendert **nur vorhandene**
   Datensätze; spezielle Basisformen werden noch nicht erzeugt.
3. Server-Migration der alten Buchnamen/Arten noch nicht
   ausgeführt. Im UI wird die Namenskonvention lediglich
   abgeleitet. Vor Datenmigration Backup und echte
   Inventur der Cloud-Datensätze erforderlich.
4. Übernahme produktiver Browser-LocalStorage-Bücher in
   öffentliche Supabase-Tabelle noch nicht möglich ohne
   Live-App-Export (je Sprache EN/FR) und Vergleich
   gegen bestehende Test-Cloud-Datensätze.
5. Merge bisher clientseitig mit mehrere Cloud-Einzelrecords;
   NICHT atomar, Konflikte/offline Stale-Write noch nicht
   sicher geprüft. Vor Freigabe transaktionale oder
   robuste Wiederanlauf-/Idempotenzstrategie und
   reale Geräteabnahme erforderlich.
6. Datensicherungs-/Anzeigepfade, KI-Scan,
   Abfragebewertung und Reset vollständig im Browser prüfen.
   Für aktuell nicht reproduzierte Szenarien nichts als
   bestanden deklarieren.
7. Einmaliger Reset der Lernanalyse erst unmittelbar
   VOR produktiver Migration nach gesonderter
   Nutzerfreigabe, nicht während der Entwicklung ausführen.

### Nächste Schritte
- Zuerst Referenzmotor für vollständige Offline-Konjugation
  unter Berücksichtigung aller 6 Sprachen festlegen und integrieren,
  mit Tests für `manger`, `aller`, `go/went/gone` und lateinische
  vier Stammformen. Pro Formenart Validierung und Provenienz.
- Danach Merge-Transaktionssicherheit und reale E2E-/Cloud-
  Regressionen. Erst bei bestandenem Stand v0.5 auf
  `vocprog-test/main` veröffentlichen und Nutzerabnahme einholen.
- Produktives `main` und eine eventuelle Standalone bleiben bis
  zur separaten Release-Freigabe unverändert.

## Lernanalyse – Änderungsanforderung zur Freigabe (2026-11-12)
**Status: spezifiziert, Implementierung noch nicht freigegeben; keine Produktivänderung.**
- Titel `LERNANALYSE` in Versalien, gleiche Schriftgröße. Direkt darunter
  ein Buch-Dropdown, exakt ein Buch je Ansicht. Nur Statistiken dieses Buchs anzeigen.
- Vokabelbücher: Kategorien `Vokabeln`, `Einfache Sätze`,
  `KI-Spezialsätze`; unverändert seitenbasiert, aber je Kategorie
  und Seite drei Kennzahlen: (1) Anzahl abgefragter Karten,
  (2) Anteil korrekter unter **bewerteten** Antworten in Prozent,
  (3) Anzahl der Vorleseklicks. Getippt und Sprache-zu-Text gleich gewertet.
  Bei 0 bewerteten Antworten `–` (nicht 0 %).
- Verbenbücher: nur `Verben`, KEINE normalen Beispielsätze oder
  KI-Spezialsätze erstellen, trainieren oder auswerten. Kennzahlen
  aggregiert über gesamtes Buch, NICHT je Seite/Verb: Anzahl
  Abfragen, Trefferquote bewerteter Antworten, Vorleseklicks.
- Pro ausgewähltem Buch darunter `Nicht richtig beantwortet`:
  fremdsprachiger Eintrag und Anzahl falscher Bewertungen, absteigend
  nach Häufigkeit, keine Tabelle und keine buchübergreifende Liste.
  Bei identischen Oberflächenformen eindeutige Kartenidentität beachten.
- **Triple-Tap/-Click** (dreimal aufeinanderfolgend) auf jeweilige
  Kategorieüberschrift setzt ausschließlich die zugehörige
  Lernanalyse zurück; Vokabelkategorien getrennt, Verben als
  gesamter Bereich. Kein Löschen von Büchern, Vokabeln,
  Verbformen oder KI-generierten Lerninhalten. Bedienung inkl.
  Bestätigungs-/Rückmeldungsmechanismus und Ereignisabgrenzung
  vor Implementation testen.
- Zurücksetzen synchron und dauerhaft auf allen Geräten:
  bisherige `history`-Events dürfen bei Merge nicht zurückkehren
  und keine alten Zähler reaktivieren. Geeignete Lösung:
  versionierter, zentral synchronisierter Analysestand/Epoch
  pro Buch+Kategorie, mit explizitem Stichtag oder stabilem
  Reset-Ereignis (Kollisions-/Offline-Fälle testen), statt lokaler
  Zählerlöschung.
- **Einmaliger Reset aller Analysen vor finalem Produktiv-Merge**
  nach Nutzerabnahme und zusätzlich bestätigter Deployment-Freigabe,
  Lerninhalte bleiben bestehen. Zeitpunkt und Migration/Backup
  ausdrücklich dokumentieren; nicht jetzt ausführen.
- Abnahmetests: Buchwahl, Seitenstatistik und Gesamt-Verbenstatistik,
  3 Balken in korrekter Reihenfolge, Prozentsatz bei
  nur gewerteten Antworten, Vorlese-Ereignisse, Fehlerliste,
  scoped Triple-Tap-Reset, Cross-Device- und Offline-Sync,
  keine Wiederherstellung alter Lernereignisse, keine verlorenen
  Vokabeldaten, Nullstand vor Live-Übernahme.

## Beschlossene Verfeinerungen 2026-11-12 – getrennte Stammform-Abfragen, Accord und Datenübernahme

### Tabelle/Trainer je Sprache (bindende neue Regeln, noch nicht implementiert)
- In französischer Tabelle Bezeichner genau `Infinitif :`,
  `Participe passé :` und `Impératif :` vor der jeweiligen französischen
  Grundform/-gruppe; deutsche Spalte enthält nur die Übersetzung.
  Ein einziges `[rég.]`/`[irrég.]` neben dem Tabellen-Lemma oben, nicht
  in der Infinitivzeile wiederholen.
- Tabellen-Zeitüberschrift spaltenweise: z. B. `Présent` über Französisch
  und `Gegenwart` über Deutsch. Als Kleine-Abweichung nur die tatsächlich
  geänderten Buchstaben fett markieren: `nous mang**e**ons`, nicht
  die gesamte Verbform. Das gilt auch in der Imperativzeile.
- Englisch: **Infinitiv einzeln** (`to go`) und **Dreiergruppe als eine
  zusätzliche separate Lernkarte** (`go / went / gone`); daneben
  **Past participle allein** (`gone`) und **-ing-Form allein**
  (`going`). Nie `go / went / gone / going` als eine Karte.
  Vollständige Tabellenstruktur: individuelle Infinitivzeile,
  `Principal parts : go / went / gone`, `Past participle : gone`,
  `-ing form : going`, ggf. Imperativ und darunter gewählte Zeitform.
  Dopplung von Formen ist hier bewusst gewollt; beim Training
  unterschiedliche Karten-IDs / `kind`-Kennung erhalten.
  Korrektur: `do / did / done`, nicht `do / did / did`.
- Niederländisch: Infinitiv einzeln (`lopen`), *zusätzlich* eine
  Dreiergruppen-Lernkarte `lopen / liep / gelopen`, und voltooid
  deelwoord `gelopen` als separate Karte. Weitere Basisformen je
  Sprachkatalog, gewöhnlicher Imperativ nach Sprachgebrauch.
- Latein: Infinitiv allein (`amāre`) sowie **separate**
  Vier-Stammformen-Lernkarte `amō / amāre / amāvī / amātum`;
  Partizip nur dann zusätzlich, wenn grammatisch korrekt ableitbar
  und gesondert sinnvoll; keine pauschale Gleichsetzung von
  vierter Stammform und Partizip. Unregelmäßige/deponente Verben
  anhand Referenz nachprüfen.
- Spanisch und Portugiesisch: je eine separate Karte für
  Infinitiv, Gerundio/Gerúndio, Participio/Particípio, Imperativo
  (soweit vorhanden); KEINE gruppierte Dreier-/Vierer-Lernkarte.
- In allen Verbenbüchern: Dropdown „Zeitform“ exakt mit bisheriger
  Select-Gestaltung zwischen „Abfragerichtung“ und „Lernmodus“.
  Die ausgewählte Zeitfilterkarte PLUS die jeweiligen
  sprachspezifischen Pflichtgrundkarten abfragen.
- Bei gruppierten Karten Leerzeichen vor/nach Slash ignorieren,
  Reihenfolge grammatisch unterschiedlicher Stammformen bleibt
  relevant. Kein identischer Eintrag doppelt unter derselben
  Kartenfunktion; bewusst unterschiedliche Kartenrollen dürfen
  dieselbe Wortform enthalten.

### Partizipangleichung nach Sprache (Grammatik-Datenvertrag)
- Französisch: `être` mit Subjektaccord, z. B. `allé(e)(s)`;
  `avoir` bei vorangestelltem direkten Objekt ggf. Accord;
  reflexive Verben mit Sonderbedingungen. Basisform und
  Übereinstimmungsregel separat speichern.
- Spanisch: mit `haber` ist das part. perfecto unveränderlich
  (`he hablado`), als Adjektiv oder mit `ser/estar` dagegen
  Genus-/Numerusangleichung (`puertas abiertas`).
- Portugiesisch: mit `ter` in zusammengesetzten Zeiten i. d. R.
  unveränderlich (`tem escrito`); passivisch mit `ser` oder
  adjektivisch mit `estar` anpassungsfähig
  (`cartas escritas`); einige Verben haben *zwei verschiedene*
  Partizipstämme, z. B. `aceitado/aceite` (Varietät beachten).
- Englisch: Past participle selbst kein männlich/weiblich/plural-
  Accord (`has gone/have gone`); Hilfsverb ggf. angepasst.
- Niederländisch: im Verbalkomplex das Voltooid deelwoord normalerweise
  unverändert (`heeft gewerkt`); adjektivisch können
  Adjektivendungen vorkommen (`de geplande reis`).
- Latein: Partizipien werden wie Adjektive nach Kasus, Numerus,
  Genus flektiert (`amātus/amāta/amātum` etc.) und können
  schulrelevant sein; nicht als französisches `(e)(s)` darstellen.
- Quellen: spanische Partizipangleichung (Universitätstext)
  https://human.libretexts.org/Bookshelves/Languages/Spanish/Spanish_Grammar_and_Linguistics_Bookshelf/Spanish_Grammar_Manual_%28Yepes%29/16/62_Tiempos_compuestos;
  portugiesisch https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/ser-e-estar--participio-passado/2584;
  niederländisch https://inburgeringsexamen.nl/en/grammar/participles-as-adjectives;
  lateinisch https://www.nationalarchives.gov.uk/latin/stage-2-latin/lessons/lesson-19-participles-present-past-and-future/.
- Für die Basis-Lernkarte die sprachtypische meist unmarkierte Form
  verwenden; grammatisch bedingte Varianten als Regel speichern
  und in Kontext-Sätzen korrekt einsetzen. Keine getrennten
  Genus-/Numerus-Abfragen, außer sprachspezifischer Lernstoff
  verlangt es ausdrücklich.

### Bestandsmigration – ausdrücklicher Nutzerwunsch, bisher blockiert
- Vorhandene Cloud-Bücher mit altem Namenssuffix `Konjugationen`
  in `– Verben (<Sprache>)` überführen, Vokabelbücher in
  `– Vokabeln (<Sprache>)`, unter Erhalt von Buch-UUIDs,
  sämtlichen Vokabel-IDs, Trainingsevents, KI-Sätzen und Tombstones.
  Auf nicht doppelte Suffixe und Mehrdeutigkeiten prüfen.
- Aus der **produktiven älteren Standalone/GitHub-Pages-App**
  (Repo `vocprog/main`) existierende EN/FR-Vokabeln mit Seiten
  ins neue gemeinsame Public-Supabase-Vokabellernsystem migrieren,
  ohne bestehende Test-Cloud-Daten zu überschreiben, fehlende
  Sprachbestände aber nicht erfinden. Import-Dedupe per
  normalisierter Sprache/Seite/Vokabel/Übersetzung und Buchquelle.
- **Architekturprüfung durchgeführt:** alter produktiver Stand
  speichert Vokabellisten pro Sprache im Browser-LocalStorage
  `vocab_trainer_data_<lang>` und besitzt keine Supabase-
  Schnittstelle. Cloud-Public-Tabelle verwendet `book:<id>`,
  `vocab:<id>`, `event:<id>`, `special:<id>` mit timestamp.
  GitHub-Repository enthält KEINE Nutzerdaten. Deshalb kann der
  tatsächliche Live-Datenbestand nicht allein aus GitHub gelesen
  werden und ist derzeit nicht unabhängig verifiziert.
- **Kein Supabase-Schreibconnector verfügbar**; daher NOCH KEINE
  öffentliche Datenbankmigration/Umbenennung durchgeführt und
  keine Migration als erfolgreich behauptet. Notwendig:
  Backup/Export der Live-App aus den betreffenden Browsern
  (Französisch und Englisch getrennt) sowie unabhängiger Snapshot
  der öffentlichen Cloud-Tabelle. Danach ein validierter
  importer/migrationslauf mit Vorschau, Sicherung und Rollback;
  nicht blind Remote-Records manipulieren.
- Alle Datenübernahmen in separater Testversion und nur
  nach nachvollziehbarem Vergleich; produktive App erst
  nach Geräteabnahme und expliziter Freigabe aktualisieren.
- Festgelegte Restabnahmen: französisches `manger` inkl.
  `nous mang**e**ons` und 2-spaltigem Präsens; Englisch
  getrennt `to go`, `go/went/gone`, `gone`, `going`;
  Niederländisch getrennt `lopen` und `lopen/liep/gelopen`;
  span./port. Einzelkarten, lateinische Stammformen;
  idempotente Server-Migration und geräteübergreifender
  Daten-/Lernverlauf ohne verlorene Quelle oder Duplikate.


## Ergänzung 2026-11-12 – Imperativ-Beschriftung
- In der französischen Verbtabelle lautet die Zeile in der Fremdsprachenspalte ausdrücklich **`Impératif : (tu) mange / (nous) mangeons / (vous) mangez`**. Das französische Label `Impératif :` steht einmal vor den drei Formen. Die Deutschspalte zeigt nur die Übersetzungen, ohne wiederholten Bezeichner. Vorhandene Hervorhebung von Schreibabweichungen bleibt erhalten, z. B. `mang**e**ons`.
- Gleiches Schema bei allen französischen Verben mit Imperativ; bei Verben ohne gebräuchlichen Imperativ die Zeile weglassen. Diese Korrektur betrifft das Konzept, noch nicht implementierten App-Code.

## Verbindliche Präzisierung 2026-11-12 – sprachspezifische Stammformen und Tabellenüberschriften
- Dieser Abschnitt ergänzt die oben dokumentierten Konjugationsanforderungen;
  **keine Implementierung / kein produktiver Release in diesem Schritt**.
- Tabellenkopf zeigt das Lemma samt einmaligem Regelmäßigkeitsstatus,
  z. B. `manger [rég.]` oder `go [irrég.]`. In der Infinitivzeile
  KEIN wiederholtes `[rég.]`/`[irrég.]`.
- Zeile Französisch: **`Infinitif : manger`** (Französischspalte)
  und `essen` (Deutschspalte); nächste Zeile
  **`Participe passé : mangé`** und `gegessen`.
  Deutsche Spalte nur Übersetzung, nicht nochmal das Formenlabel.
- Für jede ausgewählte Zeit `Présent`, `Imparfait` usw. steht der
  französische Titel **über der Fremdsprachenspalte** und die deutsche
  Zeitbezeichnung, z. B. **`Gegenwart`**, über der Deutschspalte.
  Finite Einträge darunter ohne vorgesetztes Label.
- Imperativ: vorhandene Personformen mit geklammerten Pronomen,
  in 2 Spalten mit deutscher Bedeutung, andernfalls weglassen.
- Alle Sprachdaten haben einen *konfigurierten Satz von Basisformen*
  unabhängig vom Tempus-Dropdown, statt eines universell angenommenen
  „Infinitiv + Participe passé + Imperativ“. Jedes Verb enthält weiterhin
  die vollständigen freigegebenen Schulstoff-Zeitformen.
- Französisch: Infinitif présent, Participe passé, Impératif présent
  (sofern vorhanden), zusätzlich die ausgewählte finite Zeitform.
- **Englisch:** Separater Pflichteintrag „Principal parts / Stammformen“
  **base form / past simple / past participle**, z. B.
  `go / went / gone`, `do / did / done` (NICHT `do / did / did`);
  regelmäßig z. B. `work / worked / worked`.
  `to go` kann in der Infinitivzeile angezeigt werden, erste
  Stammform bleibt technisch `go`. Schulrelevante Form `-ing`
  (present participle/gerund) `going` zusätzlich als Basisform,
  da für Continuous/Progressive nötig. Englischer Imperativ nach
  Wunsch nur als Form `go!` (keine französische Dreierlogik).
  Speichern als unabhängige Formen, Zusammenfassung per Schrägstrich
  ist Anzeige/Lernkarte, nicht einziges freies Textfeld.
- **Niederländisch:** Analog drei Stammformen Infinitief /
  Onvoltooid verleden tijd (Singular als Lernform, ggf. Plural) /
  Voltooid deelwoord, z. B. `lopen / liep / gelopen`; Imperatief
  sprachtypisch.
- **Spanisch und Portugiesisch:** Infinitivo, Gerundio (`-ando`,
  `-iendo` / `-endo`), Participio und gängige Imperativo-
  Personenformen; Finite Schulzeiten über Zeitfilter. Sie benötigen
  NICHT die englischen 3 *principal parts* als Grundschema.
- **Latein:** Vier *Stammformen* (principal parts), z. B.
  `amō / amāre / amāvī / amātum`; letzte Stammform ist nicht
  bei allen Verben mechanisch als direktes Participium perfectum
  zu verstehen. Für intransitive bzw. deponente Verben
  lexikonspezifische Abweichungen respektieren. Nicht das
  französische Standard-Dreierschema übertragen.
- Beim Antwortvergleich für erlaubte zusammengesetzte Stammformlisten
  Leerzeichen um `/` ignorieren; Reihenfolge der grammatisch
  verschiedenen Formen (base/past/participle) bleibt signifikant.
- Quellenvermerk: British Council irregular verbs
  https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/irregular-verbs;
  Cambridge https://dictionary.cambridge.org/grammar/british-grammar/irregular-verbs;
  Onze Taal https://onzetaal.nl/taalloket/sterk-zwak-onregelmatig-werkwoord;
  UCM https://www.ucm.es/plataformaele/formas-no-personales;
  Dickinson Latin grammar https://dcc.dickinson.edu/grammar/latin/four-conjugations.
- Abnahme: Sprachwechsel passt Basiskarten und Zeitformliste an;
  Englisch `go/went/gone` und `do/did/done`; NL `lopen/liep/gelopen`;
  Latein `amō/amāre/amāvī/amātum`; Französisch `Infinitif`/
  `Participe passé` und zweisprachig ausgerichtete Zeitüberschrift.
  Falsche Klassifikation / verlorene Wortformen nicht akzeptieren.


## Verbindliche Konzeption Konjugationslernen – 2026-11-12 (noch nicht implementiert)

### Status, Freigabegrenze und Quellen
- Dieser Abschnitt dokumentiert die im Dialog am 11./12.11.2026 bestätigten
  fachlichen Anforderungen als projektinterne Wissensbasis und nächste
  Umsetzungsvorlage. **Kein Code/Schema der App in diesem Arbeitsschritt geändert.**
- Maßgebliche externe Grammatikreferenzen:
  https://www.academie-francaise.fr/questions-de-langue
  (Accord du participe passé, einschließlich être/avoir/reflexive Verben);
  https://www.larousse.fr/de/konjugation/franzosisch/manger/5950
  (manger: Zeiten, nous mangeons, Imperativ, Partizip);
  https://www.francaisavecpierre.com/present-de-lindicatif-1er-groupe/
  (orthographische Anpassungen -ger/-cer).
- Produktiv-`main` nicht ohne vollständige gesonderte Nutzerabnahme auf die
  umfassende Test-Funktionsversion migrieren. Repository-Handoff fortführen.

### Scannen, Bücher, Datenmodell
- Zwei Plus-Optionen im Buchauswahldialog:
  `+ Neues Vokabelbuch anlegen`, `+ Neues Verbenbuch anlegen`.
- Anzeige der Buchnamen: `<Name> – Vokabeln (<Sprache>)` oder
  `<Name> – Verben (<Sprache>)`; kein altes `Konjugationen`.
  Sprachdetektion aus Scan nach erster analysierter Seite.
- Pro Sprache **genau ein gemeinsames Verbenbuch**; „Neues Verbenbuch“
  für bereits vorhandene Sprache soll dieses verwenden, nicht duplizieren.
  Vokabelbücher dürfen dieselben Namen/inhaltsgleiche Seiten haben und
  später manuell gemergt werden.
- **Jedes erkannte Verb**, auch wenn nur als normale Vokabel gedruckt,
  soll vollständig für die sprachspezifischen *Schulstoff*-Zeitformen
  generiert werden; Verb-Grundvokabel + Übersetzung, Partizip/Imperativ
  und finite Formen in EINEM Verbenbuch. Keine eigene zweite
  Verbenbuch-Kopie pro fotografiertem Quellbuch.
- Andere Wortarten bleiben ausschließlich im normalen Vokabelbuch.
  Normale Quellbuch-Vokabeln ggf. beibehalten (dieses Verhalten vor
  Implementierung auf unbeabsichtigte Doppelzählung prüfen).
- Pro Sprache und Lemma ein eindeutiger Verb-Datensatz mit stabiler ID;
  getrennte Formen pro Tempus/Modus/Person, Übersetzung, Quelle/Seite,
  Provenienz, Validierungsstatus und Herkunft (Scan/KI/Referenz);
  Doppeleinträge vermeiden; alte Lernstatistiken erhalten.

### Französisch: relevante Schulstoff-Zeiten (ausschließlich diese)
- Indicatif: Présent (Gegenwart), Imparfait (unvollendete Vergangenheit),
  Passé composé (zusammengesetzte Vergangenheit), Plus-que-parfait
  (Vorvergangenheit), Futur simple (Zukunft).
- Conditionnel présent (würde-Form).
- Subjonctif présent (Subjonctif Gegenwart).
- KEINE erweiterte/literarische Zeiten wie Passé simple, Passé antérieur,
  Futur antérieur, Conditionnel passé, Subjonctif imparfait etc.
- **Unabhängig von Zeit-Dropdown immer zusätzlich** Infinitif présent
  (Grundvokabel mit Übersetzung und Kennzeichnung), Participe passé
  und Impératif présent, soweit das jeweilige Verb diese Formen
  tatsächlich besitzt. Fehlende Imperative nicht erfinden.
- Zeitform-Dropdown **nur bei Verbenbüchern**, exakt gleiche Gestaltung
  wie bestehende „Abfragerichtung“ und „Lernmodus“, unmittelbar dazwischen.
  Optionen: Originalsprachbezeichnung + deutsche Bedeutung in Klammern.
  Es wird exakt EIN Schulzeitmodus gefiltert, nicht alles auf einmal.
- Entsprechende **sprachspezifische Schulstoff-Kataloge** für en-US,
  es-ES, pt-PT, nl-NL, la-LA, fr-FR hinterlegen; Fremdsprachenbez.
  + deutsche Bedeutung; Eigenheiten anderer Sprachen beachten,
  z. B. Latein ohne verpflichtende Personalpronomen.

### Participe passé und Übereinstimmung
- Bei nichtreflexiven être-Verben Übereinstimmung mit Subjekt in Genus
  und Numerus; *vier* Formen möglich: allé, allée, allés, allées.
  **Kompakte Darstellung: `allé(e)(s)`**, ein gemeinsamer Karteieintrag,
  KEINE vier getrennten Abfragen. Basispartizip + Accord-Regel im
  Datensatz separat speichern, Darstellung daraus generieren.
- Das gilt nicht pauschal für jedes Partizip. Bei avoir ergibt sich die
  Angleichung unter bestimmten Bedingungen (vorangestelltes COD);
  bei reflexiven Verben eigene syntaktische Regeln. Für Satztrainer
  kontextgerechte Form anwenden.
- Im Trainer Leerzeichen um `/` bei Imperativ-/Variantenantworten
  optional; `va / allons / allez` und `va/allons/allez` gleichwertig.
  Auch geklammerte bzw. expandierte Accord-Varianten sinnvoll
  normalisieren; keine eigene Abfrage pro Genus/Numerus.
- Imperativ nur 3 französische Personengruppen (tu/nous/vous),
  dargestellt mit *geklammerten* Pronomen vor den Formen, z. B.
  `(tu) va / (nous) allons / (vous) allez`, auch deutsche
  Übersetzungen im separaten Tabellenspaltenfeld.
- Abweichende Sonderformen und vollständige Tempuskonjugation
  müssen anhand belastbarer Grammatik/Verbkonjugationsquelle
  validiert werden. Zweite KI-Abfrage allein ist keine unabhängige
  Verifikation. Nicht verifizierte KI-Formen als Prüfstatus markieren.

### Klassifizierung und visuelle Abweichungen
- Infinitiv-Lernkarte: `manger [rég.]`, `aller [irrég.]`, deutsch
  `essen` / `gehen`. Regelmäßigkeitskennzeichen **nur Infinitiv**.
- Interne Unterscheidung:
  1. strikte Regelmäßigkeit,
  2. Grundmuster mit kleiner orthografischer Anpassung,
  3. wirklich unregelmäßige Flexion.
- 1 und 2 nach Nutzerwunsch `[rég.]` anzeigen. 2 zusätzlich
  Positions-/Zeichen-Hervorhebung nur der abweichenden Buchstaben,
  beispielsweise `nous mang**e**ons` und `nous commen**ç**ons`.
  3 zeigt `[irrég.]` und erhält keine überladene
  teilzeichenweise Hervorhebung.
- Orthografische Ausnahme hat keinen verlässlichen allgemeinen
  Bedeutungsumfang allein aus der Flexionsgruppe. Klassifikation
  lexikon- bzw. mustergebunden, nicht rein am Suffix.
- Fettschrift ist **Darstellung**, niemals Teil des Texts, des
  Antwortvergleichs oder des gespeicherten Lemmas.

### Neuer Tabellenbutton im Trainer
- Ein kleiner, dezent umrandeter Button `Tabelle` in der oberen
  Trainerzeile zwischen Karten-Zähler und X, nur für Verben.
  Neutrale Gestaltung passend zu unteren Buttons, keine kräftige Farbe.
- Klick blendet UNTER dem bisherigen Abfragebereich einen gleichartig
  gestalteten Kasten ein/aus; kein Navigationswechsel.
- Inhalt je aktuelles Verb: **2 Spalten** Fremdsprache und Deutsch,
  mit Infinitiv + Kennzeichen, Participe passé (inkl. Accord),
  Imperativ (3 Formen mit geklammerten tu/nous/vous und /),
  dann sechs finite Personalformen ausschließlich für die gerade
  gewählte Zeitform (bei Sprachen mit anderem Paradigma angepasst).
  Deutsche Übersetzungen in eigener Spalte. Orthografische
  Abweichungen per gezielter Teilzeichen-Fettschrift.
- Die Tabelle dient zur Einsicht; Entscheidung ob Einsicht als
  Lernerfolg/Fehler gewertet wird ist vor späterer Implementierung
  gesondert zu testen. Fokus/Responsive Layout dürfen nicht leiden.

### Beispiel für Tabellenvorschau: manger (Présent)
| Fremdsprache | Deutsch |
| --- | --- |
| manger [rég.] | essen |
| Participe passé: mangé | gegessen |
| (tu) mange / (nous) mang**e**ons / (vous) mangez | iss / essen wir / esst bzw. essen Sie |
| je mange | ich esse |
| tu manges | du isst |
| il/elle/on mange | er/sie/man isst |
| nous mang**e**ons | wir essen |
| vous mangez | ihr esst / Sie essen |
| ils/elles mangent | sie essen |

Präzisierung: *manger* bildet das Passé composé mit **avoir**,
darum steht im Beispiel Participe passé nur `mangé`; die Schreibweise
`allé(e)(s)` ist das Beispiel für *aller* mit **être**.
Auffälligkeit `mangeons`: eingeschobenes e erhält weiches g.

### Bücher zusammenführen
- Bestätigtes dezentes, eigens entworfenes Dünnlinien-Symbol: zwei
  Linien laufen in einen einzelnen Pfeil; zwischen Stift und rotem X.
- Genau **zwei** Bücher, erster Buchname als Vorschlag, editierbar.
  Buchsprache muss übereinstimmen; normales Vokabelbuch darf nur mit
  normalem Vokabelbuch, Verbenbuch nur mit Verbenbuch.
- Überlappende Seiten auf identischen Inhalt prüfen: doppelte Vokabeln
  deduplizieren, abweichende Bücher nicht mergen, mit Begründung warnen.
  Nichtüberlappende Seiten zusammenfassen.
- Alle Referenzen inkl. Lernfortschritt/KI-Sätzen auf Zielbuch
  umstellen; nach gesicherter erfolgreicher Übernahme alte
  Buch-Referenzen als Tombstones synchronisieren. Vorher Backup.
  Cloud-Konflikte, Offline-Geräte und Atomicity gesondert testen.

### Abnahmeprüfungen (noch ausstehend)
1. Gemischte Vokabelseite mit französischem Verb + Verbformen, genau
   ein französisches Verbenbuch (Quell-Vokabelbuch nur bei expliziter
   Wahl), jeweils korrekte Infinitiv-/Partizip-/Imperativdaten.
2. Nur Infinitiv auf Foto löst vollständige Kernstoff-Konjugation aus.
3. Regelmäßig/orthografisch angepasst/unregelmäßig korrekt
   klassifiziert; hervorzuhebende Buchstaben geprüft.
4. Aller: Accord `allé(e)(s)` und richtige zusammengesetzte Zeiten;
   manger: `mang**e**ons`, keine unangebrachte Accord-Klammer.
5. Temporale Auswahl, Abfrage nur ausgewählte Personalformen plus
   Infinitiv, Participe passé und Imperativ.
6. Tabellenbutton zeigt zwei korrekte Spalten und bleibt im
   Trainerfenster klappbar, auch auf Smartphone.
7. Leerzeichen um Schrägstriche in Eingaben ignorieren; sonst
   fachlich falsche Antworten zurückweisen.
8. Merging mit Überschneidung, unterschiedlichen Sprachen,
   Buchtypen, Deduplizierung und gesamtem Lernverlauf; echte
   Zwei-Geräte-Synchronisation/Offline-Konflikte.
9. JSON-Export/Import mit neuen Datensätzen, Abwärtskompatibilität,
   Regression bestehender Vokabeltrainer.
10. Separater Nutzer-Abnahmetest auf der Testseite; **erst danach**
    Übernahme der vollständig getesteten Version auf `main`.


## Teil-Update auf produktivem main – 2026-11-11
- Nutzerfreigabe: Neues VOC-Logo und unabhängig übertragbare
  allgemeine UI-Verbesserungen schon in der Nicht-Testversion.
- Produktiver Branch `main` geändert:
  - `favicon.svg`: neues royalblaues VOC-Sprechblasenlogo auf Weiß;
    Commit `e945da9369ddb525872df9b674d8d278f7c2f3ab`.
  - `index.html`: Favicon-Link und Überschriften
    **1. API & Sprache**, **2. Datenverwaltung**, **3. Lernbereich**.
    Die Sprachauswahl bleibt in der Legacy-Produktion bewusst sichtbar,
    da sie dort für den Scan erforderlich ist.
    Commit `64c2867e9f46cee823a780cf5da1fafb1ff73887`.
  - `manifest.json`: neues PWA-Icon und Kurzname VOC;
    Commit `e36a7c2c1aa41d2da2c42faaff955d987bd7029e`.
- Bewusst **nicht** auf `main` übernommen: Cloud-Sync, Buchverwaltung,
  Konjugationsscanner, Lernverlauf und öffentliche Datenbankanbindung.
  Diese erfordern einen vollständigen kompatiblen Test-Release,
  andernfalls wäre eine produktive Sync-Zeile funktionslos.
- Prüfumfang: Inline-JS nach Änderung syntaktisch validiert;
  Logo/Manifest über GitHub gespeichert. Echter Browser/PWA-Installations-
  test noch offen. Produktiv-GitHub-Pages-URL derzeit nicht unabhängig verifiziert.
- Im Unterschied zu älteren Übergabevermerken ist `main` seit diesem
  Teil-Update absichtlich **nicht mehr identisch** zum Sicherungsbranch.
  Backup `backup-20261105-pre-supabase` bleibt unverändert.
- Die Testseite `vocprog-test` und ihr bislang abgenommener Sync-Stand
  bleiben unangetastet. Nächster großer Schritt: vollständige Testergebnisse,
  dann separate Freigabe für die produktive Migration.

## Teilabnahme und Korrektur 2026-11-11 (VOC v0.4 Test)
- **Nutzerseitig bestätigt:** SQL-Migration ausgeführt; Testapp meldet erfolgreichen
  `Online · Sync`-Zeitstempel; Bücher geräteübergreifend sichtbar;
  Löschung funktioniert geräteübergreifend; Lernfortschritt auf beiden
  Geräten sichtbar. Diese drei Sync-Pfade sind als **Teilabnahme**
  dokumentiert, keine vollständige Produktivfreigabe.
- Korrektur des Statusformats: `Sync DD.MM.YY HH:mm` **ohne Komma**
  durch explizite `formatToParts`-Zusammensetzung.
- Buchauswahl in Datenverwaltung und Scan-Buchdialog auf beiden Geräten
  **deterministisch alphabetisch** sortiert (deutsche Sortierung, natürliche
  Zahlenreihenfolge; ID als Tie-Breaker). Bestehende Bücher und deren IDs,
  Speicherreihenfolge sowie Datenbankinhalt bleiben unverändert. Sortierung
  kann beim Umbenennen wechseln.
- Test-Build in `andreas-nigl/vocprog-test/main` aktualisiert;
  letzter geprüfter JS-Commit `c78b0afde0286b9c5a41d9b773cd3d214585c254`,
  SW `da69b8308160438a77db9d9ae8b98f52ad5f1d19`.
  SW-Cache auf v6 aktualisiert. Test-URL:
  https://andreas-nigl.github.io/vocprog-test/
- Tests: JS- und SW-Syntax, 6/6 App-Dateien identisch zwischen
  Entwicklungsbranch und Testrepository, verschiedene Eingabereihenfolgen
  liefern identische Buchreihenfolge; Zeitformatprobe
  `11.11.26 00:14` ohne Komma; Produktions-`main` unverändert.
- **Noch offen für vollständige Abnahme:** KI-Gemini-Scan mit realen
  Französischseiten inklusive Konjugationen und Gruppierung; KI-Sätze
  geräteübergreifend; Offline-Neustart/Wiederverbindung und Upload zuvor
  geänderter Daten; JSON-Export/Import-Roundtrip mit Konjugationen/Statistik;
  gleichzeitig geänderte Datensätze/Konfliktsicherheit, öffentliche
  Manipulierbarkeit und Quoten; Browser-/Mobil-Layout inklusive Diktat und
  Kamera/Galerie; anschließende explizite Freigabe vor Produktiv-Merge.
- Standalone-Offline-HTML für v0.4 nicht aktualisiert; Online/PWA-Code
  aktualisiert, tatsächliche Offline-Verfügbarkeit nicht getestet.

# vocprog – Entwicklungsstand 2026-11-05

## UI-Entscheidung – korrigiert 2026-11-06
- Der Analysebutton befindet sich **außerhalb aller App-Bereiche 1–3** und außerhalb des Trainerfensters.
- Desktop: quadratischer 44x44-Button mit Balkendiagramm-Symbol, fest unten rechts am Browserfenster.
- Mobil: eigener Bereich nach dem gesamten App-Inhalt, rechtsbündig oberhalb der Statuszeile; nicht schwebend.
- Klick: `showLearningAnalysis()`. Export/Import unverändert.
- Neues Browser-Favicon: `favicon.svg`, Karteikasten mit VOC; im App-Inhalt nirgendwo sichtbar. Standalone hat eingebettetes Favicon.
- Teststand nicht veröffentlicht und nicht auf realen Desktop-/Mobilgeräten bestätigt.
- Ausführliche Einrichtung: [docs/SUPABASE_GITHUB_EINRICHTUNG.md](docs/SUPABASE_GITHUB_EINRICHTUNG.md).
- Wiederverwendbare Migrationsvorlage: [docs/TEMPLATE_GITHUB_SUPABASE_MIGRATION.md](docs/TEMPLATE_GITHUB_SUPABASE_MIGRATION.md).
- UI-Abnahmekriterien: [docs/VOC_UI_UEBERGABE.md](docs/VOC_UI_UEBERGABE.md).

## Prüfprotokoll 2026-11-06 – UI-Nachbesserung
- 22 statische Prüfungen bestanden (inklusive Syntax aller Inline-Skripte,
  Steuerung der Kamera- und Galerie-Buchauswahl, drei Abschnittsnamen,
  Niklas-Standard, 15-Minuten-Sync, Sessionlogin und CSS-Regeln).
- Sechs App-Dateien in `vocprog-test/main` anhand ihrer Git-Blob-SHAs
  mit dem Entwicklungsbranch abgeglichen: **6/6 identisch**.
- Produktives `vocprog/main/index.html` weiterhin unverändert
  gegenüber `backup-20261105-pre-supabase`.
- Statische Tests sind kein Ersatz für echte Browser-/Mobil- und Supabase-
  Anmeldungstests; diese bleiben bis zur Abnahme offen.
- Bei Pages mit älterem Service Worker: Seite neu laden. SW-Version v3
  nutzt Network-first für denselben Origin und Cache-Fallback für Offline.

## Änderungsblock 2026-11-06 – Test-UI (freigegeben)
- Abschnitt 1 heißt **1. API**. Fremdsprache wird nicht mehr global angezeigt;
  sie bleibt intern je Buch erhalten und wird beim Anlegen eines neuen Buchs im Scan-Dialog gewählt.
- Abschnitt 2 heißt **2. Datenverwaltung**. Die Nutzerwahl steht als vollbreites Dropdown
  direkt über der Bücherliste (Niklas als Standard, bisher gespeicherte Nutzerwahl wird bewahrt).
  Die Buchzeile ist weiterhin anklickbar zum Umbenennen; kein Stift/Piktogramm.
- Abschnitt 3 heißt **3. Lernbereich**.
- Der bisherige JavaScript-Fehler der Kamera-/Galerie-Buttons beruhte auf
  falsch escaped Anführungszeichen in den `onclick`-Attributen. Korrigiert.
- Während einer Abfrage erscheint die Nutzerwahl nicht, weil sie nur in Abschnitt 2 liegt.
- Trainer: Mikrofon etwas angehoben, Feedback-Zwischenraum verkleinert,
  Lösungsfeld bis zur rechten Button-Spalte verbreitert.
- Cloud: Nach einmaliger Anmeldung je Gerät gespeicherte Auth-Sitzung mit Refresh
  und Sync beim Start, nach Datenänderungen und alle 15 Minuten online.
  Dauerhafte Sync/Login/Logout-Buttons entfallen. Solange keine Sitzung besteht,
  zeigt die Statuszeile eine Verbindungsoption. Kein Passwort im Quelltext.
- Noch keine verifizierten interaktiven Browser-/Mobil-/Supabase-Livetests.
- Weiterhin nur Entwicklungsbranch + separate Testseite; Produktion `main` unverändert.

## Aktueller Entwicklungsstand: Staging 0.2 (2026-11-05)
- Quelle: `develop/offline-supabase-20261105`; `main` weiterhin identisch mit Backup-Branch.
- Realisiert im Staging-Code: Buch-Migration, Buchauswahl vor Scan, Buch-Dropdown
  beim Lernen, Profilwahl Andreas/Niklas, Enter-Antwortkontrolle, Tracking,
  Histogramme, vollständiger JSON-Export/Import, temporäre IndexedDB-Bilder,
  Service Worker, Cloud-Login und Cloud-Synchronisationsgrundlage.
- Standalone: `261105_2307_vocprog.html` (eine Datei, lokales Lernen;
  Online-Funktionen benötigen Verbindungszugang).
- Weder Supabase-Migrations-SQL ausgeführt noch echte Zwei-Geräte-/Browser-/
  RLS-/Offline-Tests durchgeführt. **Kein Produktionsrelease.**
- Offene Punkte: Auth-Testkonto in Supabase, Testrepository mit GitHub Pages,
  echte UI-/Offline-/Sync-Tests, konkurrierende Änderungen und Lösch-Tombstones,
  serverseitige Gemini-Proxy-Lösung vor öffentlicher kommerzieller Nutzung,
  robustere Übersetzungsbewertung, Abgleich der AE/BE-Buchnotation.
- Datenschutz: Auf `main` keine Änderung. Scanbilder werden nur temporär
  in IndexedDB gespeichert, nicht an Supabase übertragen; beim Gemini-Aufruf
  findet wie bisher eine Übertragung an Google statt.
- Nutzerkonten: **ein** Supabase-Login mit zwei internen Lernprofilen;
  Profiltrennung ist nicht dieselbe wie getrennte Authentifizierung.

## Architekturentscheidung 2026-11-09 – Identität und Synchronisation
- Primärquellen: Supabase Anonymous Sign-Ins, User Sessions, RLS und
  GitHub Contents API (öffentlich recherchiert am 09.11.2026).
- **Anonyme Auth für Familien-Synchronisation abgelehnt:** anonyme
  Konten verlieren nach Löschung der Browserdaten oder auf anderem Gerät
  ohne verknüpfte Identität ihren Zugriff. Daher keine verlässliche
  Wiederherstellung / gemeinsamer Datensatz.
- **GitHub-JSON als laufende Datenbank abgelehnt:** Browser benötigt
  Repository-Contents-Schreibberechtigung; ein in HTML hinterlegtes Token
  wäre öffentlich. Ebenso entstehen Konflikte zwischen Geräten.
- Verbleibende Architektur: GitHub Pages/PWA + lokaler Speicher +
  Supabase-RLS über **ein gemeinsames Familienkonto**, einmaliger Login
  je Gerät und anschließend automatische Session-Erneuerung; kein
  fest im JS hinterlegtes Passwort. Niklas/Andreas bleiben interne
  Lernprofile. Publizierter Supabase Publishable Key ist kein Geheimnis.
- GitHub↔Supabase-Integrationsoption "Deploy to Production" bleibt aus.
  Keine Datenbankmigration im Zuge dieses Codeblocks durchgeführt.

## Test-UI 0.3: 2026-11-09
- Sprache beim erfolgreichen KI-Scan automatisch erkennen und am Buch
  speichern; bestehende Buchsprache gegen neuen Scan prüfen.
- Neues Buch mit vorbelegtem Namen **Muster**, ohne Sprach-Dropdown.
- Buch-Dropdown in 2. Datenverwaltung unter Nutzer; daneben Stift und rotes X,
  Löschen mit Bestätigung und Hinweis auf Folgen.
- Die alte sprachbasierte Löschschaltfläche ist aus dem UI entfernt.
- Buchauswahl aus 3. Lernbereich entfernt; Übungsauswahl folgt dem
  im Bereich 2 gewählten Buch.
- Lösch-Tombstones in lokalem Speicher und Cloud-Records pro Buch,
  Vokabel, Spezial-Satz und Ereignis; Synchronisationskonflikte und
  Offline-Wiederherstellung weiterhin im Echttest prüfen.
- Enter/Weiter: leer überspringt, erste gefüllte Eingabe prüft,
  weitere Aktion blättert. Mobil kein Fokus beim Kartenstart,
  nach Diktat Fokus; Desktop Autofokus.
- Status: kompaktes "Sync DD.MM.YY HH:mm", zentriert mit Version;
  Trainer blendet Status, Version, Login und Analyse aus.
  Mobile Analyse unter der Versionsnummer rechts.
- Favicon: weißer Hintergrund, royalblaue Sprechblase und VOC-Buchstaben;
  nur im Browser-Tab, nicht als App-Inhalt.
- Änderungen ausschließlich in Entwicklungsbranch und Testrepository;
  **produktives `main` nicht anfassen**.
- Abnahme ausstehend: Browser-UI, Kamera-Scan, Datenbank-RLS, Multi-Geräte-
  Synchronisation einschließlich Löschereignis, Offline-Neustart,
  Backup-Import. Diese Tests sind noch nicht live durchgeführt.

## Build- und Prüfstand 2026-11-09
- Testseite: https://andreas-nigl.github.io/vocprog-test/
  (GitHub-Dateien aktualisiert; HTTP/GUI dieser Adresse nicht unabhängig verifiziert).
- Testrepo `andreas-nigl/vocprog-test`, Branch `main`: 6/6 App-Dateien
  byte-identisch zum Entwicklungsbranch; letzter beobachteter GitHub-Commit
  für `index.html`: `7165a67265c14c871eb94e4175880aaeb3ad6bfd`.
- Produktives `vocprog/main/index.html` weiterhin exakt gleicher Blob-SHA
  wie `backup-20261105-pre-supabase`.
- JavaScript-Syntaxprüfungen bestanden; 6/6 isolierte Logiktests für
  Enter/Weiter bestanden, 10/10 statische neue UI-Kriterien erfüllt.
- Keine echte browsergesteuerte E2E-Prüfung und keine RLS-/Supabase-
  Synchronisationsprüfung mit zwei Geräten möglich; keine Nutzerabnahme.
- GitHub↔Supabase Production Deployment weiterhin aus; keine SQL-Migration.
- Offline-Standalone aus vorherigem Entwicklungsstand **nicht neu gebaut**;
  der Online-Teststand ist die aktuelle Version. Standalone nur auf Wunsch.
- Offene Punkte für Abnahme: Buchanlage `Muster` und Sprachdetektion
  (Mehrsprachigkeit/Gemini-Fehler), Löschvermerke mit mehreren Geräten,
  App-Neustart offline, Cache-Update, Login-Session auf zwei Geräten,
  Import nach Löschung, Mobil-Tastaturverhalten und exakte UI-Ausgestaltung.

## Architekturwechsel 2026-11-10 – freigegeben, Testversion 0.4
- Nutzerfreigabe: gemeinsamer **öffentlicher** Datensatz ohne Konto/Login,
  keine Profilwahl oder gespeicherte Benutzernamen. Bücher, Vokabeln,
  generierte KI-Sätze und gesamter Lernverlauf über alle Geräte synchron.
- Supabase Free verursacht keine nutzungsabhängigen Rechnungen, solange
  Organisation im Free-Tarif verbleibt. Quotenüberschreitung kann
  Beschränkungen auslösen; nur bewusster Wechsel in Paid löst Kosten aus
  (Supabase Billing FAQ, Stand 2026-11-10).
- Neue eigenständige Tabelle `public.vocprog_public_records` mit
  Lese-/Schreibrechten für DB-Rolle `anon`. SQL unter
  `supabase/migrations/20261110_000002_vocprog_public_records.sql`.
  **Noch nicht produktiv in Supabase ausgeführt**; die bisherige private
  `vocprog_records` wird nicht geöffnet, verändert oder gelöscht.
- Sicherheitseinschränkung (bewusst akzeptiert): Jeder mit dem öffentlichen
  Projekt-Publishable-Key kann Datensätze lesen, schreiben und
  manipulieren; kein Schutz gegen fremde Löschvermerke, Spam, Speichervoll-
  lauf oder böswillige Zeitstempel. Kein Benutzerkonto, damit keine
  Identitätsprüfung möglich. Keine Secrets in HTML.
- Cloud-Sync: beim Start, nach Änderungen und alle 15 Minuten;
  Offline-Daten werden lokal gehalten. Testbetrieb erst nach SQL.
- Bestand: Profile aus lokalen Ereignissen vor Veröffentlichung entfernt.
  Vorherige lokale Token-/Profil-Metadaten werden entfernt; Altbestand in
  privater Supabase-Tabelle bleibt unverändert.
- Neu: KI erkennt auf gescannten französischen Verbseiten zusätzlich
  gedruckte Konjugationen, nur tatsächlich sichtbare Zeitformen.
  Pro Ursprungsbuch ein Buch `<Name> – Konjugationen`, mit
  Infinitiv, Tempus, Seite, Personengruppe, Französisch und Deutsch.
  Gruppierung: je, tu, il/elle/on, nous, vous, ils/elles;
  deutsche Übersetzung nach Bedeutung, z. B. er/sie/man.
  Vorhandene Vokabeln bleiben im Quellbuch.
- Abnahme: SQL manuell ausführen, erster Start auf zwei Geräten,
  RLS öffentliche Endpunkte, Sync ohne Login, Konjugationsscan mit
  realen Französischseiten, Dubletten, Profilbereinigung, Löschung,
  Offline und Backup prüfen. Keine Nutzerabnahme der Version 0.4.
- Test-URL `https://andreas-nigl.github.io/vocprog-test/`;
  Produktivbranch `vocprog/main` bleibt unverändert. Weitere
  GitHub-/Supabase-Integrationsmigrationen nicht automatisch deployen.

## Abschluss Entwicklungsblock 2026-11-10 – v0.4 Test, Cloud-Migration noch offen
- **Verfügbarer Online-Testbuild:** `andreas-nigl/vocprog-test` auf `main`,
  Quellstand `vocprog/develop/offline-supabase-20261105`.
  Letzter geprüfter `index.html`-Commit im Testrepo:
  `03e173e2f3d839ab56a7b631be7e08e3c19dd22c`.
- **GitHub-Abgleich:** sechs Dateien 6/6 identisch (index.html, Erweiterungs-JS,
  CSS, Favicon, sw.js, manifest.json). Produktiv-`vocprog/main` stimmt
  unverändert mit dem Sicherungsbranch überein.
- **Statische Prüfungen:** Inline-/Erweiterungs-/Service-Worker-JavaScript
  parsbar; keine Login-/Profil-UI; 6/6 isolierte Beispiel-Konjugationen
  erkannt, Wiederholung 0 Dubletten, eigenes Buch richtig benannt,
  Quellbuch wieder ausgewählt. Cloud-Endpunkt `vocprog_public_records`
  wird referenziert; frühere private Tabelle nicht mehr verwendet.
- **WICHTIG:** Keine Live-Migration in Supabase durchgeführt,
  `supabase/migrations/20261110_000002_vocprog_public_records.sql`
  muss nach Nutzersichtung im SQL Editor ausgeführt werden.
  Bis dahin zeigt der Sync einen HTTP-Fehler und verarbeitet nur lokale Daten.
- **Offen:** echtes Scanbild/Modellantwort; Browser/Mobil-Rendering,
  KI-Sätze und Konjugationskarten; echte Synchronisation auf zwei Geräten,
  idempotente Löschvermerke, Datenkollision bei simultaner Änderung,
  Ausfall/Wiederanlauf und RLS-Test in Datenbank. Keine Nutzerabnahme.
- **Offline/Standalone:** Online-GitHub-Pages-Build übertragen; Offline-SW
  aktualisiert und statisch geprüft, kein echter Offline-Neustart getestet.
  Standalone-HTML nicht für diesen Änderungsblock erneuert.
- **Nächster freigegebener Schritt:** SQL-Migration kontrolliert ausführen
  (vom Nutzer im Dashboard), dann Live-Sync/RLS und Scanner testen,
  danach erst Nutzerabnahme und Merge in Produktion.

## Versionierung
- Unverändertes Original: Branch `backup-20261105-pre-supabase`.
- Produktiver `main` bleibt unverändert.
- Entwicklungsbranch: `develop/offline-supabase-20261105`. **Nicht produktiv.**
- Veröffentlichte Test-URL noch nicht eingerichtet. Kein automatischer Deploy auf Produktion.
- Supabase-Referenz: Projekt `yiayotftqqaivoxvuzmz`, nur **Publishable Key**, keine Geheimnisse im Repository.

## Ziel
GitHub-Pages/PWA mit lokalem Offline-Speicher, optional authentifizierter
Supabase-Synchronisation, Buchverwaltung, Lernprofilen, gespeicherten KI-Sätzen
und Statistik. Kein App-Store-Projekt derzeit.

## Datenvertrag
- `books` (lokal): `{id, name, lang, updatedAt}`
- `vocab`: `{id, bookId, page, foreign, german, sentence_foreign, sentence_german, ...}`
- `special`: `{id, bookId, page, sourceRefs, items, updatedAt}`
- `events`: `{id, profile, bookId, page, kind, sourceId, at, action, result?}`
- Cloud: `vocprog_records`, ein Record je ID, durch `owner_id = auth.uid()` geschützt.
  Familienprofile sind **keine** eigenen Sicherheitsidentitäten.
- Alte `vocab_trainer_data_*` werden beim ersten Start um UUID und Buch `Muster`
  ergänzt, keine Löschung des Originaldatensatzes; vor Migration exportieren.
- Backup: `YYMMDD_vokabeln.txt`, JSON mit `schemaVersion`, `books`, `vocabulary`,
  `specialSentences` und `practiceEvents`, ohne Bilddaten/API-Key.

## Online/Offline
- Cache via Service Worker für GitHub Pages, kein SW in file://-Standalone.
- Temporäre Scanbilder in IndexedDB, nie in Supabase. Bei erfolgreicher Analyse löschen.
- Kein automatischer KI-Neuversuch nach Verbindungsverlust; manuelles Wiederholen.
- Cloud-Sync nur nach angemeldeter, gültiger Supabase-Sitzung.
- Statuszeile trennt Netzwerkstatus, Zeitpunkt **erfolgreicher** Cloud-Synchronisation
  und ausstehende Daten.
- Gleichzeitige Änderungen: vergleiche `updatedAt`, Konflikte dokumentieren; für
  produktive Mehrgeräte-Nutzung später serverseitige Revision/CAS ergänzen.

## Sicherheit/Deployment
1. SQL unter `supabase/migrations/20261105_000001_vocprog_records.sql` im
   Supabase SQL Editor **nach Prüfung** manuell ausführen.
2. Auth: für Testkonto E-Mail/Passwort oder geeigneten Provider aktivieren.
3. Zwei Konten auf RLS prüfen (fremde Records nicht sichtbar).
4. GitHub-Integration: Produktionsdeploy ausgeschaltet lassen.
5. Keine `service_role`, `sb_secret` oder privaten Gemini-Schlüssel ins Web.
6. Für kommerzielle Nutzung Auth-/KI-Backend, Datenschutz und Buchrechte prüfen.

## Prüfprotokoll vom 2026-11-05
- 15 statische Prüfungen erfolgreich: Inline-/Erweiterungs-/SW-JavaScript
  parsbar, einteilige Standalone, zentrale UI-Elemente, RLS-Schema,
  nichtdestruktive SQL-Anweisungen, temporäre Bilder nicht Cloud-Records,
  Enter-Bewertung, SW-Cache, Exportfelder, IPA-Filter, Artikel/Präposition,
  AE-Label-Filter und HTML-Escaping.
- GitHub-Verifikation: `main` und `backup-20261105-pre-supabase` besitzen
  weiterhin denselben `index.html`-Blob-SHA
  `299759a49a1430b9e05676f2ac9e9efccf7b9184`.
- **Nicht durchgeführt:** echtes Browser-/Mobilgerät-Rendering, Gemini-
  Scanregression, Offline-Neustart, Auth-RLS gegen echte Supabase-Instanz,
  Zwei-Geräte-Sync, Last-/Konflikttests. Kein Release für Produktion.
- Für App-Test ist eine Supabase-SQL-Migration und ein gültiges Auth-Konto
  erforderlich. Testseiten-Repo `vocprog-test` ist bislang nicht angelegt.
- Bekannte Einschränkungen: Cloud-Löschung bis zu Tombstone-Implementierung
  gesperrt, Timestamp-Konfliktauflösung ist noch keine atomare serverseitige
  Versionsprüfung, Scanbilder bleiben temporär per IndexedDB; Vokabellisten
  werden aus Gründen der Legacy-Kompatibilität derzeit weiterhin in
  localStorage gehalten. Verschiedene Nutzer sind serverseitig per RLS
  isoliert; die beiden Familienprofile einer Anmeldung sind das nicht.

## Testmatrix
- Ursprungsdaten Englisch/Französisch -> Musterbuch, umbenennen.
- Bücher gleicher Sprache mit gleichen Seitenzahlen getrennt; Kamera/Galerie vor Scan.
- Analyse online, offline vor/nach Start, Wiederaufnahme und Bildpersistenz.
- Enter bewertet, Weiter ohne Enter zählt nur als geübt.
- Drei Histogramme pro Buch, Vorlesen getrennt und Fehlerliste.
- Export/Import roundtrip, Duplikate, alte Backups.
- Zwei Geräte: Sync nach Login, Offline-Neustart, RLS fremder User.
- PWA-Start ohne Netz nur nach erfolgtem Cache; Standalone lokale Funktionen.
- Keine Änderungen an `main` ohne gesonderte Freigabe.

## Smartphone-App (zurückgestellt)
Optionen: Capacitor / lokale SQLite, ML Kit oder Apple Vision OCR,
systemseitige Sprachausgabe. Keine Entwicklung derzeit. Offene Punkte:
Buchlizenzen, Gemini-Nutzungskosten, Benutzer- und Kinderdatenschutz,
Offline-Textanalyse, native Berechtigungen, App-Store-Policies.
