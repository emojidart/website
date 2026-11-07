# EMD Premium Sports App 2026

## Ziel
Vollständige visuelle Erneuerung im vorhandenen Next.js-/React-/Tailwind-System. Die Website-Wartungssperre wird entfernt. Bestehende Rollen, Modulberechtigungen, Datenzugriffe, Turnieralgorithmen, Realtime und PWA-Abläufe bleiben bestehen.

## Gestaltung
Matte Navy-Flächen, warmes Orange als EMD-Akzent, helle Texte und sichtbare semantische Statusfarben. Hintergrund #0b1018, Karten #131c29, erhöhte Flächen #1b2738, Linien #2b3a50, Primärfarbe #f59b50. Inter bleibt als vorhandene Schrift. Kein neues Schriftarten-Netzwerk und keine zusätzliche UI-Bibliothek.

Abgestufte Schriftgrößen statt flächigem Heavy-/Uppercase-Stil; tabellarische Ziffern für Ergebnisse. Karten mit 16–20 px Radius und feinen Trennlinien. Mobile Aktionen mindestens 44 px, Formulare mit 16 px Schrift. Dialoge dürfen ihre verfügbare Bildschirmhöhe nicht überschreiten. Safe Areas bleiben in ihren bestehenden Eigentümern; Chat besitzt seine eigene volle Bildschirmhöhe.

## Umsetzung
Die bestehenden Seiten bleiben erhalten und werden auf zentrale Farb- und Oberflächentokens migriert. Gemeinsame UI-Primitives tragen die wiederverwendbare Gestaltung; Header und Bottom-Navigation behalten ihre Rollenfilter. Startseite erhält einen neuen kompakten Hero mit echten vorhandenen Kennzahlen und Aktionen. Admin, Terminal und Broadcast bekommen eigene gescopte Anpassungen. Turnierbaum-Verbindungen, TV-Grids, Scan-/Kamera- und Druckflächen behalten ihre funktionalen Geometrien.

Eine einzelne globale CSS-Überlagerung wurde verworfen: Sie erreicht weder portalisierte Dialoge zuverlässig noch die expliziten Legacy-Farben der zahlreichen Seiten. Stattdessen werden Legacy-Klassen im JSX auf Tokens umgestellt und alte CSS-Override-Schichten bereinigt.

## Prüfung
Route-/Import-/Tabelleninventar, TypeScript, vorhandenes Lint-Skript, Production Build und Browser-Stichproben bei Smartphone-, Tablet- und Desktopbreite. Keine Datenbankmigration oder Datenänderung. Authentifizierte Abläufe benötigen verfügbare Testkonten; nicht ausgeführte Abläufe werden ausdrücklich dokumentiert.
