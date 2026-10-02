# Admin-Ordnung

## Grundregel
Alles, was ausschließlich zum Admin gehört, liegt unter:

`app/admin/_komponenten/`

Zentrale Admin-Konfiguration:

`app/admin/_konfiguration/admin-seiten.ts`

Echte URL-Seiten bleiben eigene Routen unter `app/admin/.../page.tsx`.

## Bereiche
- `bonus/`
- `mitgliedschaften/`
- `turniere/`
- `vereinsverwaltung/`
- einzelne Hauptkomponenten wie Dashboard, Navigation, Rechteverwaltung, Veranstaltungen, Freigaben, Push, Vereinsheim und Vereinssitzung

## Absichtlich nicht verschoben
`hooks/vereinsverwaltung/` bleibt gemeinsam nutzbar.
`components/vereinsverwaltung/types.ts` bleibt vorerst ebenfalls bestehen, weil diese Hooks die Typen verwenden.

Damit wird nur reine Admin-UI verschoben und keine gemeinsame Logik unnötig angefasst.
