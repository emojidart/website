# Einzelturnier

## Struktur

- `einzelturnier-setup.tsx`
  - zentraler State / Ablauf
  - Registrierung und Zahlung koordinieren
  - Realtime-Abonnement
  - Komponenten verbinden

- `einzelturnier-einstellungen.tsx`
  - Name, Startgeld, Teilnahme, Modus, Gruppen, Doppelnennung

- `einzelturnier-spieler.tsx`
  - Spieler auswählen, Doppelteam, registrierte Spieler

- `einzelturnier-zahlung-dialoge.tsx`
  - Guthaben- und Rückerstattungsdialoge

- `einzelturnier-start.tsx`
  - aktives Turnier, zurückkehren/abbrechen, Startübersicht

- `einzelturnier-engine.ts`
  - Round Robin erzeugen
  - DKO-/Fortsetzen-Routen
  - Turnier-ID

- `einzelturnier-berechtigungen.ts`
  - Öffentlich / Vereinsintern / Vereins-Auswärts
  - Paketprüfung `internal_tournaments` / `external_tournaments`
  - aktive Mitgliedschaft
  - Testphase
  - Berechtigungs-Map

- `einzelturnier-daten.ts`
  - Spieldatenbank laden
  - Registrierungen laden
  - häufig gespielte Spieler laden
  - Turnierserie für Prefill laden

QR-/USB-Scanner bleibt entfernt.
Die bestehende Logik wurde in klar benannte Dateien verteilt, ohne neue Regeln zu erfinden.

- `einzelturnier-realtime.ts`
  - Realtime-Subscription auf `dko_tournament_registration`
  - 200-ms-Entprellung
  - sauberes Cleanup von Channel und Timer
  - ruft weiterhin Registrierungen + häufige Spieler neu ab


- `einzelturnier-helfer.ts`
  - Doppelteam-Namen
  - Doppelnennungs-Suffix `[2]`, `[3]`, ...
  - Basis-Spieler-ID
  - Erzeugung zusätzlicher Doppelnennungs-Einträge


- `einzelturnier-registrierung.ts`
  - Spieler-Guthaben laden
  - Turnierregistrierung speichern
  - Startgeld vom Guthaben abbuchen
  - Registrierung löschen
  - Guthaben zurückerstatten
  - Bezahlstatus ändern
  - alle offenen Bezahlstatus setzen

Die UI-/Ablaufsteuerung bleibt in `einzelturnier-setup.tsx`; direkte Datenbankzugriffe
für Registrierung und Guthaben sind jetzt gebündelt.

- `use-einzelturnier-registrierung.ts`
  - kompletter Registrierungs-Ablauf
  - Spieler auswählen
  - direkte Registrierung
  - Registrierung mit/ohne Guthabenabzug
  - Doppelteam registrieren
  - Abmeldung / Rückerstattung
  - Bezahlstatus und „alle bezahlt“
  - Busy-/Fortschritts-State

`einzelturnier-setup.tsx` verbindet diese Funktionen jetzt nur noch mit den UI-Komponenten.

- `einzelturnier-central-event.ts`
  - zentrales Turnier laden
  - Voranmeldungen validieren
  - Voranmeldungen in die Laufzeit-Registrierung synchronisieren
  - zentralen Turnierstatus auf „started“ setzen

- `einzelturnier-aktives-turnier.ts`
  - aktives Turnier laden
  - aktives Turnier abbrechen
  - dazugehörige Registrierungen des richtigen Events löschen

Damit bleibt `einzelturnier-setup.tsx` weiter auf Ablauf und UI-Verkabelung konzentriert.

- `use-einzelturnier-setup-daten.ts`
  - initiales Laden von Spielern, Registrierungen und häufigen Spielern
  - Prüfung auf aktives Turnier beim Öffnen
  - Serien-Prefill
  - Formularstatus „vollständig“
  - Berechtigungs-Map bei Wechsel der Turnierart
  - gemeinsame Refresh-Funktionen für Registrierung und Realtime

- `use-einzelturnier-central-event-setup.ts`
  - Central-Event-Prefill
  - Übernahme der Voranmeldungen
  - Fehler-/Loading-Steuerung des Central-Event-Setups

- `use-einzelturnier-start-controller.ts`
  - Startvalidierung
  - Central-Event-Status beim Start
  - Round-Robin-Erzeugung und Weiterleitung
  - DKO-ID und DKO-Start-Route
  - Start-Ladezustand

V4.4:
- Doppelte Funktion „Spontanes Turnier“ aus der Zentralen Turnieranmeldung entfernt.
- Kein Name/Datum/Startzeit/Ort/Anmeldeart/Anmeldeschluss/Teilnehmerlimit/Startgeld-Formular mehr.
- Kein „Spontanes Turnier“-Tab mehr in `zentrale-anmeldungen.tsx`.
- Spontane Turniere werden ausschließlich über den Tab „Spontanes Turnier“ der Turnier-Zentrale direkt per Modus gestartet.
- Leerer Zustand verweist auf „Veranstaltungen“ für geplante Turniere.

## V4.5.5 – DKO / Round Robin Design
- Konfiguration, Spielerregistrierung und Turnierstart an dasselbe zentrale Admin-Design angeglichen.
- DKO/Round-Robin-Umschalter explizit dunkel/orange.
- Checkbox-/Doppelmodus-Karten mit identischem Hover-/Aktivzustand.
- Add-Player-, Fehler-, Warn-, Start- und Zahlungsdialoge dunkel vereinheitlicht.
- Keine DKO-, Round-Robin-, Registrierungs-, Zahlungs- oder Berechtigungslogik verändert.

## V4.5.6
- DKO/Round Robin verwendet dieselbe `Checkbox`-Komponente wie Kratzer.
- Kratzer zeigt beim Registrieren eine 0/…-Fortschrittsanimation sowie ein dunkles Erfolgsmodal.

## V4.5.7 – Kratzer exakt wie DKO bei Registrierung
- Kratzer nutzt jetzt unten am Registrieren-Button dieselbe DKO-Ladeanimation.
- Anzeige: `Registriere… 0/X`, `1/X`, `2/X` usw.
- Das zusätzliche große Lade-Modal wurde entfernt, weil DKO das ebenfalls nicht hat.
- Das Erfolgsmodal wurde optisch 1:1 an das DKO-Erfolgsmodal angeglichen.

## V4.5.8 – DKO Registrierung wie Kratzer
- DKO/Round Robin Spielerregistrierung optisch auf denselben Aufbau wie Kratzer umgestellt.
- Links: Suche → Alle/Berechtigt/Gesperrt → Berechtigte auswählen → scrollbare Spielerzeilen → Registrieren-Button.
- Rechts: Registrierte-Spieler-Suche → Tabellenansicht → Bezahlt-Checkbox → Entfernen.
- Checkbox-Komponente, Hover, Abstände, Flächen und Buttonzustände entsprechen Kratzer.
- Doppelturnier-Logik, Eligibility, Bezahlstatus, Guthaben, Voranmeldung und Registrierungslogik bleiben erhalten.
