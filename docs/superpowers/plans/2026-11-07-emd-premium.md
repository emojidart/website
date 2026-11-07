# EMD Premium Redesign Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development for the independent navigation, shared UI, and specialty layout work.

**Goal:** Website entsperren und das vorhandene EMD-Produkt konsistent neu gestalten.
**Architecture:** Zentrale Designtokens, Migration bestehender JSX-Oberflächen, wiederverwendbare UI-Primitives und separate Speziallayouts. Bestehende fachliche Logik bleibt bestehen.
**Tech Stack:** Vorhandenes Next.js, React, TypeScript, Tailwind, Radix.
**Spec:** `docs/redesign/DESIGNSYSTEM.md` und eingefügte Nutzervorgaben.

## Global Constraints
- Keine Daten löschen, keine Datenbankmigrationen, keine Rollen-/Auth-Änderungen.
- Keine zusätzlichen Bibliotheken; bestehende Routen und Aktionen erhalten.
- Mobile zuerst; Dialoge, Formulare und Navigation berücksichtigen Safe Areas.

## Review Focus
- Portal-Dialoge außerhalb des App-Wrappers behalten Tokenfarben.
- TV, Beamer und Turnierbäume behalten geometrische Anforderungen.
- Tastaturfokus, reduzierte Bewegung und Textkontrast.
- Mitglieder-/Gast-/Adminfilter der Navigation bleiben bestehen.
- Chat bleibt auf dynamische Viewporthöhe begrenzt und scrollbar.

## Aufgaben
- [x] Wartungsblock aus `app/layout.tsx` entfernen, normale Guard-Kette erhalten.
- [x] Vollständiges Route-/Importinventar mit `node scripts/audit-design.mjs` erstellen.
- [x] `app/globals.css` und `components/AppThemeShell.tsx` auf matte Tokenoberflächen umstellen; Legacy-Klassen ohne fachliche Änderungen migrieren.
- [x] `components/header.tsx`, `mobile-bottom-nav.tsx`, `footer.tsx` neu gestalten.
- [x] `components/ui/*` einschließlich portalisierter Dialoge, Tabellen und Formulare modernisieren.
- [x] `app/admin/layout.tsx`, `app/terminal/layout.tsx` und Spezialansichten konsistent gestalten.
- [x] Homepage-Hero und Seitenhierarchie überarbeiten.
- [x] TypeScript, Lint, Build und responsive Browserdarstellung prüfen; Einschränkungen festhalten.

Prüfstand und verbleibende Laufzeit-/Browsergrenzen: `docs/redesign/ABNAHME.md`. Der letzte Schritt erfasst die ausgeführten Prüfungen und dokumentiert die blockierte visuelle Abnahme; er bedeutet keine visuelle Freigabe aller Seiten.
