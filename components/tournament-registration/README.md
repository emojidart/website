# Gemeinsame Turnier-Registrierung

`TournamentRegistrationPanel` ist jetzt die gemeinsame Registrierungsoberfläche für:

- DKO
- Round Robin
- Kratzer
- Survival Roulette

Die Turniermodi behalten ihre eigene Business-Logik und Datenhaltung. Gemeinsame UI-Funktionen liegen nur noch hier:

- Spielersuche
- Alle / Berechtigt / Gesperrt
- Berechtigte auswählen
- Spielerzeilen
- gemeinsame Checkboxen
- Registrieren-Button und Fortschrittsanzeige
- Registrierte-Spieler-Suche
- Bezahlt-Checkboxen
- Alle als bezahlt markieren
- Spieler entfernen
- Registrierungen leeren
- Farben, Hover, Abstände und Tabellenlayout

Modusspezifisch bleiben u. a.:
- DKO/Round Robin: Doppelnennung, Doppelturnier, Startgeld/Guthaben, Voranmeldungen
- Kratzer: Teilnahmeart und Kratzer-spezifische Eligibility
- Survival: 4er-Teilnehmerregel, Draft/Offline-Sicherung, keine Bezahlverwaltung

So kann das Design künftig an einer Stelle geändert werden, ohne drei Registrierungsseiten separat anzupassen.
