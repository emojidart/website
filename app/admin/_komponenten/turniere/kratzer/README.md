# Kratzer – zentrales Admin-Design

Die Kratzer-Seite verwendet jetzt dasselbe Designsystem wie die restlichen Adminseiten.
Kein eigenes Seiten-Farbschema mehr.

Gemeinsame Klassen:
emd-admin-page, emd-admin-content, emd-admin-hero, emd-admin-surface,
emd-admin-card, emd-admin-inset, emd-admin-input,
emd-admin-button-primary, emd-admin-button-secondary, emd-admin-button-danger.

Die linke Admin-Navigation bleibt sichtbar. Funktionen und Turnierlogik wurden nicht verändert.

## V4.5.2
- richtige aktuelle `RegistrationTab` wiederhergestellt
- Teilnahmeart + Eligibility-Prüfung wieder vorhanden
- `handleMarkAllPlayersPaid` wieder verbunden
- verschachteltes `<button>` / Checkbox-Hydrationproblem behoben
- Spielerzeilen verwenden `div role="button"` statt Button um Checkbox
- Hover-Effekte an das zentrale Admin-Design angepasst
- Aktuelle-Runde-Leerzustand und Rangliste dunkel vereinheitlicht
