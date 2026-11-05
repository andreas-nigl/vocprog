# vocprog – Entwicklungsstand 2026-11-05

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
