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
