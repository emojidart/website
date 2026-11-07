# EMD Redesign – Umsetzungs- und Prüfstand

Die Wartungssperre ist aus dem Root-Layout entfernt. Die reguläre App wird mit den vorhandenen Session- und Routenguards gerendert. Änderungen liegen im lokalen Arbeitsverzeichnis.

## Umsetzung
- Matte Navy-/Orange-Designtokens für App und portalisierte Komponenten; alte globale Bild-, Glas- und Kontrast-Override-Schichten entfernt.
- Navigation, Startseiten-Hero, Auth-Seiten, Mitglieder-Dashboard/-Profil und Veranstaltungsübersicht überarbeitet.
- Gemeinsame Karten, Buttons, Eingaben, Tabellen, Tabs, Dialoge, Menüs, Lade- und Fehlerzustände erneuert. Touch-Ziele, Safe Areas, reduzierte Bewegung und Textskalierung berücksichtigt.
- Bestehende Seiten und Komponenten auf gemeinsame Oberflächen, lesbare Beschriftungen und Inhaltsbreiten migriert. Spezialoberflächen für Admin, Terminal, Chat und Broadcast gesondert behandelt.
- PWA-Farben angepasst; Manifest, Einstiegspfade, Icons und Service-Worker-Verhalten erhalten.
- Vollständiges Quellinventar: 256 Seitendateien und 282 Seiten-/Layout-/Lade-/Fehlerdateien. Siehe `SEITENUEBERSICHT.md` und `routes.json`.

## Erfolgreiche Prüfungen
- Abschließender Production Build: Exit 0, 277 statische Seiten generiert. Siehe `build.log`. Die vorhandene Next-Konfiguration überspringt Typprüfung beim Build; sie wurde deshalb separat verglichen.
- TypeScript-Vergleich mit Git HEAD: jeweils 965 bestehende Diagnosen, **0 neue**. Siehe `typecheck-baseline.json`.
- Syntaxprüfung: 360 geänderte/neue TS-/TSX-Dateien, 0 Syntaxfehler; vier Stylesheets erfolgreich geparst.
- Zentrale Text-/Hintergrundpaare: Kontrastverhältnisse von 6,29:1 bis 16,94:1. Dies ersetzt keine Prüfung aller konkreten Kombinationen in den einzelnen Seiten.
- Vergleich von 5.776 vorhandenen Datenbank-/Fetch-/Router-Aufrufen: unverändert. 2.531 JSX-Ereignishandler verglichen; beabsichtigte Navigationsanpassungen sind im Bericht aufgelistet. Keine Änderungen in `lib`, `hooks`, `supabase`, API-Routen oder Server-Actions.
- Unabhängige Code-Review: fehlende orange/amberfarbene 900er-Kontrastanpassung gefunden und behoben; keine weiteren konkreten neuen Funktionsregressionen festgestellt.
- `git diff --check`: sauber.

## Verbleibende Grenzen der Abnahme
- Das vorhandene Lint-Skript scheitert, weil ESLint nicht installiert ist. Es wurden keine zusätzlichen Abhängigkeiten installiert.
- Visuelle Smartphone-/Tablet-/Desktopprüfung und reale Benutzerabläufe wurden **nicht abgeschlossen**: Der eingebettete Browser konnte localhost nicht erreichen; die Windows-Browsersteuerung wurde wegen nicht sicher feststellbarer URL durch die Werkzeugrichtlinie beendet.
- Angemeldete Mitglieder-/Admin-Abläufe, reale Realtime-Synchronisierung, Push, Hardware-Terminal, Kamera, native PWA und vollständig gefüllte Turnierbäume benötigen eine funktionierende Browser-/Testumgebung und entsprechende Testkonten. Der Quellcodevergleich belegt die unveränderten Operationen, ersetzt diese Laufzeitprüfung aber nicht.

## Reproduzierbare Prüfungen
```powershell
node scripts/audit-design.mjs
node scripts/verify-redesign.mjs
node docs/redesign/behavior-operations.mjs
node --expose-gc --max-old-space-size=8192 docs/redesign/typecheck-baseline.mjs
npm run build
```

Für den bestehenden `next/font`-Import muss der Build Google Fonts erreichen können.
