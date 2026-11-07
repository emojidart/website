# EMD Premium – Qualitätsaudit (Testbranch)

Stand: 2026-11-07  
Branch: `codex/emd-loading-premium`  
Livebetrieb: `main` **nicht verändert**

## Prüfbasis

GitHub Actions: **EMD TypeScript Safety Check**, Lauf `42391341442`.
Netlify-Produktionsbuild hatte zuvor TypeScript-Fehler ausgeklammert (`next.config.mjs`: `ignoreBuildErrors: true`).
Der unabhängige strenge TypeScript-Lauf zeigt den technischen Rückstand sichtbar und soll nicht durch Abschalten weiterer Regeln „gelöst“ werden.

- **1.054 TypeScript-Diagnosen** in **146 Dateien** zum Zeitpunkt dieses Laufs.
- Nachfolgende Commits können einzelne Diagnosen bereits beseitigt haben; die Zahl ist kein aktueller Zähler.
- **579 Meldungen** entfielen zusammen auf drei ältere Liga-Dateien: `app/liga-statistiken/page.tsx` (197), `app/liga-app/page.tsx` (191) und `app/liga-statistiken-app/page.tsx` (191). Häufigste Ursache sind untypisierte `useState([])`-Arrays und anschließende `never`-Typen.
- Weitere Häufungen: Stripe-Webhooks (46), Vereinsarchiv-API (21), Turnier-Server-Aktionen (17), Teamverwaltung (17).
- `package-lock.json` passt nicht zu `package.json`. Deshalb nutzt die vorläufige Diagnoseprüfung eine Installation ohne Lockfile-Schreibzugriff. Vor reproduzierbaren CI-Builds muss das Lockfile kontrolliert regeneriert und geprüft werden.

## Bereits angegangene Risiken

1. **Capacitor Push:** Listener-Abmeldungen warten korrekt auf asynchrone Listener-Handles; rohe FCM-Tokens und Push-Inhalte werden nicht mehr geloggt.
2. **Next.js 16 Server-Aktionen:** `cookies()` wird in Turnieraktionen vor Nutzung abgewartet; Auth-Cookies werden nicht mehr im Serverlog ausgegeben.
3. **Veranstaltungseinreichung:** Doppelsendungen abgefangen, Startgeld und Teilnehmerzahl geprüft, Dateityp und 8-MB-Grenze für Flyer durchgesetzt, hochgeladene Flyer bei fehlgeschlagener DB-Einreichung bereinigt.
4. **Eigene Veranstaltungen:** Änderungsaktionen auf den angemeldeten Ersteller eingeschränkt, wiederholte Aktionen abgefangen.
5. **Navigation/Ansichten:** Mobile Menüs, Ladezustände, TV-Sonderansichten, Liga- und Turnieransichten vereinheitlicht; Archivkarten sind vollständig per Tastatur und Link bedienbar.
6. **Startseite:** Datumsprüfung für interne Turnieranmeldungen verwendet lokale Zeit; Auslosungsfelder sind korrekt in den TypeScript-Daten definiert.

## Nächste Prüfblöcke

- P0: Betroffene Server-Aktionen, Push-Synchronisierung, Mitgliedschaftsberechtigungen und Zahlungsvorgänge mit echten Testfällen prüfen. Keine echten Zahlungen.
- P1: Typen der drei Liga-Seiten anhand tatsächlicher Supabase-Queryformen korrigieren, ohne Funktionalität durch großflächige `any`-Typen zu verdecken.
- P1: Auf Smartphone (schmale und breite Viewports) Navigation, Menüs, Formular-Validierung, Tabellen, Tastatur und Safe-Areas testen.
- P1: DKO, Round-Robin, Terminal, EMD-TV und Sportdarts-Synchronisierung mit Testdaten in vollständigen Abläufen kontrollieren.
- P2: Weitere TypeScript-Fehler fileweise abbauen; `ignoreBuildErrors` erst nach grüner Prüfung abschalten.
- P2: Lockfile regenerieren, reproducible `npm ci` wiederherstellen und UI-Smoke-Tests automatisieren.

**Freigaberegel:** Kein Merge nach `main`, bis Build, wesentliche Testabläufe und Rückfallplan geprüft sind. Ein grüner Netlify-Build allein genügt nicht.
