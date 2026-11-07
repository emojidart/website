# EMD specialty layout audit — 2026-11-07

## Scope and preservation

The audit reads every page source listed below and records component imports, table markup and direct realtime subscriptions. It does not verify authenticated runtime workflows. No data calls, auth checks, timer intervals, route destinations or tournament calculations were modified.

## Implemented presentation changes

- Admin: existing admin.css classes retain their layout and responsive rules; decorative gradients and backdrop filters are replaced with matte panels, typography weights are reduced, muted text is made legible, keyboard outlines and 44px icon actions are added.
- Terminal: explicit isolated shell, matte panels, 48px actions, visible focus, 16px inputs, quieter decorative layers, orange start action. Existing camera/photo layers, fullscreen interaction, idle guard and automatic tournament mode remain in place.
- Chat: fixed viewport and existing keyboard behavior retained; input sizing, palette and keyboard focus are unified.
- TV and beamer: existing vw/vh/clamp geometry is preserved; broadcast overlays receive matte color and improved muted text. No bracket sizes, connectors, scores, rotation timings, queues or realtime subscriptions are changed.
- Reduced-motion preference suppresses decorative transitions in specialty shells.

## Important runtime checks

- Test authenticated administrator, guest and denied-access states using real accounts.
- Check the terminal PIN/muster and camera workflows on the actual touch display.
- Check long player/team names, zero matches and full DKO brackets on the real projector.
- Verify chat keyboard behavior, scroll position and unread badges on iOS and Android.
- CSS changes do not prove database, realtime or push delivery; those require the connected test environment.

## Source inventory

| Route | Page source | Component dependencies | Table markup | Direct realtime |
|---|---|---|---|---|
| `/128erdko/beamer` | `app/128erdko/beamer/page.tsx` | @/components/emd-tv/use-dko-tv-events | no | yes |
| `/16erdko/beamer` | `app/16erdko/beamer/page.tsx` | @/components/emd-tv/use-dko-tv-events | no | yes |
| `/32erdko/beamer` | `app/32erdko/beamer/page.tsx` | @/components/emd-tv/use-dko-tv-events | no | yes |
| `/64erdko/beamer` | `app/64erdko/beamer/page.tsx` | @/components/emd-tv/use-dko-tv-events | no | yes |
| `/8erdko/beamer` | `app/8erdko/beamer/page.tsx` | @/components/emd-tv/use-dko-tv-events | no | yes |
| `/admin/dach-veranstaltungen` | `app/admin/dach-veranstaltungen/page.tsx` | @/components/header, @/components/mobile-bottom-nav, @/components/ui/card, @/components/ui/button, @/components/ui/textarea, @/components/ui/badge | no | no |
| `/admin/dartboerse` | `app/admin/dartboerse/page.tsx` | @/components/header, @/components/mobile-bottom-nav, @/components/ui/card, @/components/ui/button, @/components/ui/badge, @/components/ui/input, @/components/ui/textarea, @/components/ui/alert-dialog | no | no |
| `/admin/einzelturnier` | `app/admin/einzelturnier/page.tsx` | inline | no | no |
| `/admin/guest-requests` | `app/admin/guest-requests/page.tsx` | inline | no | no |
| `/admin/liga_statistik_full` | `app/admin/liga_statistik_full/page.tsx` | @/components/header, @/components/ui/button, @/components/ui/card, @/components/ui/badge, @/components/ui/tabs | no | no |
| `/admin/member-availability-all` | `app/admin/member-availability-all/page.tsx` | @/components/header, @/components/mobile-bottom-nav, @/components/ui/card, @/components/ui/button, @/components/ui/badge, @/components/ui/tabs, @/components/ui/dialog, @/components/ui/alert-dialog, @/components/ui/input, @/components/ui/scroll-area, @/components/ui/avatar | no | yes |
| `/admin/members-champion-cup/auslosung` | `app/admin/members-champion-cup/auslosung/page.tsx` | @/components/header, @/components/mobile-bottom-nav, @/components/members-cup-draw-show, @/components/ui/button, @/components/ui/badge, @/components/ui/card | no | yes |
| `/admin/members-champion-cup/level` | `app/admin/members-champion-cup/level/page.tsx` | @/components/header, @/components/mobile-bottom-nav, @/components/ui/card, @/components/ui/button | no | no |
| `/admin/members-champion-cup/simulation` | `app/admin/members-champion-cup/simulation/page.tsx` | inline | yes | no |
| `/admin/mixed-cup` | `app/admin/mixed-cup/page.tsx` | @/components/header, @/components/ui/button | no | no |
| `/admin` | `app/admin/page.tsx` | @/components/header, @/components/ui/button, @/components/auth-section, @/components/player-list-modal, @/components/player-registration, @/components/player-management, ./_komponenten/vereinsverwaltung/verwaltung, ./_komponenten/push-nachrichten, @/components/player-recruitment-form, @/components/player-recruitment-list, @/components/player-applications-list, ./_komponenten/veranstaltungen, @/components/ui/badge, @/components/ui/card, @/components/user-management, ./_komponenten/bonus/bonussystem, ./_komponenten/turniere/spieldatenbank/verwaltung, @/components/league-management, ./_komponenten/rechteverwaltung, ./_komponenten/turniere/members-cup-einstufung, ./_komponenten/bonus/bonusvergabe, ./_komponenten/bonus/praemien-ausgabe, ./_komponenten/mitgliedschaften/verwaltung, ./_komponenten/freigaben, ./_komponenten/vereinssitzung, ./_komponenten/vereinsheim, ./_komponenten/turniere/interne-veranstaltungen, ./_komponenten/turniere/turnier-zentrale, ./_komponenten/navigation, ./_komponenten/dashboard, ./_komponenten/profil-aenderungen, ./_komponenten/ligapostfach, ./_konfiguration/admin-seiten | no | yes |
| `/admin/public-tournament-registrations` | `app/admin/public-tournament-registrations/page.tsx` | @/components/header, @/components/ui/button, @/components/ui/card, @/components/ui/input | yes | no |
| `/admin/push-test` | `app/admin/push-test/page.tsx` | inline | no | no |
| `/admin/season_settings` | `app/admin/season_settings/page.tsx` | @/components/ui/button, @/components/ui/card, @/components/ui/switch, @/components/ui/alert, @/components/ui/badge | yes | no |
| `/admin/send-notification` | `app/admin/send-notification/page.tsx` | @/components/header, @/components/ui/button, @/components/ui/card, @/components/ui/input, @/components/ui/label, @/components/ui/textarea, @/components/mobile-bottom-nav | no | no |
| `/admin/statistics-monitor` | `app/admin/statistics-monitor/page.tsx` | @/components/header, @/components/ui/button, @/components/ui/card, @/components/ui/badge, @/components/ui/select, @/components/ui/tabs, @/components/ui/dialog, @/components/ui/textarea | no | no |
| `/admin/support-tickets` | `app/admin/support-tickets/page.tsx` | @/components/header, @/components/ui/button, @/components/ui/card, @/components/ui/badge, @/components/ui/textarea, @/components/ui/select | no | no |
| `/admin/survival-einzel` | `app/admin/survival-einzel/page.tsx` | @/components/header, @/components/survival/survival-single-martin | yes | no |
| `/admin/survival-roulette/[tournamentId]` | `app/admin/survival-roulette/[tournamentId]/page.tsx` | @/components/header, @/components/survival/survival-martin-announcer, @/components/survival/emd-youtube-player | no | yes |
| `/admin/survival-roulette` | `app/admin/survival-roulette/page.tsx` | @/components/header, @/components/ui/button, @/components/tournament-registration/tournament-registration-panel | no | no |
| `/admin/survival-start` | `app/admin/survival-start/page.tsx` | inline | no | no |
| `/admin/tournament-center` | `app/admin/tournament-center/page.tsx` | @/components/header | no | no |
| `/admin/tournament-schedules` | `app/admin/tournament-schedules/page.tsx` | inline | no | no |
| `/admin/tournaments` | `app/admin/tournaments/page.tsx` | @/components/ui/button, @/components/ui/input, @/components/ui/card, @/components/ui/table, @/components/ui/dialog, @/components/ui/label, @/components/ui/tabs, @/components/header | yes | no |
| `/admin/turnier_spieltage_starten` | `app/admin/turnier_spieltage_starten/page.tsx` | @/components/header, @/components/ui/button | no | no |
| `/admin/turnierserie-bearbeiten` | `app/admin/turnierserie-bearbeiten/page.tsx` | @/components/ui/button, @/components/ui/input, @/components/ui/card, @/components/ui/alert-dialog | yes | no |
| `/admin/users` | `app/admin/users/page.tsx` | @/components/header, @/components/ui/card, @/components/ui/button, @/components/ui/input, @/components/ui/badge | no | no |
| `/admin-faq` | `app/admin-faq/page.tsx` | inline | no | no |
| `/beamer` | `app/beamer/page.tsx` | @/components/members-cup-draw-show, @/components/emd-multi-dko-beamer-switcher, @/components/emd-live-announcement-display | no | yes |
| `/chat` | `app/chat/page.tsx` | ./chat-app-client | no | no |
| `/chat-app` | `app/chat-app/page.tsx` | ./chat-app-client | no | no |
| `/emd-tv/[matchId]` | `app/emd-tv/[matchId]/page.tsx` | @/components/header, @/components/mobile-bottom-nav | no | no |
| `/emd-tv` | `app/emd-tv/page.tsx` | @/components/header, @/components/mobile-bottom-nav | no | no |
| `/emd-tv-screen` | `app/emd-tv-screen/page.tsx` | @/components/members-cup-draw-show, @/components/emd-live-announcement-display, @/components/emd-tv/lineup-display, @/components/emd-tv/birthday-tv, @/components/emd-tv/today-tv, @/components/emd-tv/sportdarts-tv | no | yes |
| `/kratzer-tournament/beamer` | `app/kratzer-tournament/beamer/page.tsx` | @/components/kratzer/beamer/kratzer-beamer-view | no | no |
| `/member-league-app/emd-tv/[matchId]` | `app/member-league-app/emd-tv/[matchId]/page.tsx` | @/components/header, @/components/mobile-bottom-nav | no | no |
| `/member-league-app/emd-tv` | `app/member-league-app/emd-tv/page.tsx` | @/components/header, @/components/mobile-bottom-nav | no | no |
| `/roundrobin/beamer` | `app/roundrobin/beamer/page.tsx` | inline | no | no |
| `/survival-einzel/beamer` | `app/survival-einzel/beamer/page.tsx` | @/components/survival/survival-tv-board | no | no |
| `/survival-roulette/beamer` | `app/survival-roulette/beamer/page.tsx` | @/components/survival/survival-tv-board | no | no |
| `/terminal/ergebnisse` | `app/terminal/ergebnisse/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/face-id-labor` | `app/terminal/face-id-labor/page.tsx` | ./FaceLab | no | no |
| `/terminal/gast-registrierung` | `app/terminal/gast-registrierung/page.tsx` | @/components/ui/button, @/components/ui/input | no | no |
| `/terminal/liga` | `app/terminal/liga/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/mein-emd` | `app/terminal/mein-emd/page.tsx` | ../_components/TerminalLink, ../_components/TerminalIdentityAuth, ../_components/TerminalLoader, ../_components/TerminalFaceCandidate, ../_components/TerminalIdentityAuth | no | no |
| `/terminal/menu` | `app/terminal/menu/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal` | `app/terminal/page.tsx` | ./_components/TerminalLink | no | no |
| `/terminal/spielplaene` | `app/terminal/spielplaene/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/statistiken` | `app/terminal/statistiken/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/tabellen` | `app/terminal/tabellen/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/teams` | `app/terminal/teams/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/turnier-anmeldung` | `app/terminal/turnier-anmeldung/page.tsx` | ../_components/TerminalLink, ../_components/TerminalIdentityAuth | no | yes |
| `/terminal/turniere/alle` | `app/terminal/turniere/alle/page.tsx` | ../../_components/TerminalLink | no | no |
| `/terminal/turniere/ergebnisse/[tournamentId]` | `app/terminal/turniere/ergebnisse/[tournamentId]/page.tsx` | ../../../_components/TerminalLink | no | no |
| `/terminal/turniere/ergebnisse` | `app/terminal/turniere/ergebnisse/page.tsx` | ../../_components/TerminalLink | no | no |
| `/terminal/turniere` | `app/terminal/turniere/page.tsx` | ../_components/TerminalLink | no | no |
| `/terminal/turniere/preisgeld` | `app/terminal/turniere/preisgeld/page.tsx` | ../../_components/TerminalLink | no | no |
| `/terminal/turniere/ranglisten` | `app/terminal/turniere/ranglisten/page.tsx` | ../../_components/TerminalLink | no | no |
| `/terminal/turniermodus` | `app/terminal/turniermodus/page.tsx` | ../_components/TerminalLink, ../_components/TerminalLoader | no | yes |
| `/terminal/veranstaltungen/[source]/[id]` | `app/terminal/veranstaltungen/[source]/[id]/page.tsx` | ../../../_components/TerminalLink | no | no |
| `/terminal/veranstaltungen` | `app/terminal/veranstaltungen/page.tsx` | ../_components/TerminalLink | no | no |
