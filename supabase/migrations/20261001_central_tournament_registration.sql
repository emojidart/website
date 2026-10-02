-- ============================================================
-- EMD ZENTRALE TURNIERANMELDUNG
-- Neue Schicht ÜBER den bestehenden Turniermodulen.
-- Bestehende DKO-, Kratzer-, Cup-, Serien- und Historiedaten
-- werden NICHT gelöscht.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.central_tournament_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time null,
  location text null,
  registration_deadline timestamptz null,
  max_participants integer null check (max_participants is null or max_participants > 0),
  entry_fee numeric(10,2) not null default 0 check (entry_fee >= 0),
  access_type text not null default 'club_internal'
    check (access_type in ('public','club_internal','club_external')),
  status text not null default 'open'
    check (status in ('draft','open','closed','ready','started','completed','cancelled')),
  selected_mode text null
    check (selected_mode is null or selected_mode in ('dko','round_robin','kratzer')),
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.central_tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null
    references public.central_tournament_events(id)
    on delete cascade,
  player_id uuid not null
    references public.spieldatenbank(id)
    on delete restrict,
  player_name_snapshot text not null,
  status text not null default 'registered'
    check (status in ('registered','waitlist','withdrawn')),
  paid boolean not null default false,
  source text not null default 'admin'
    check (source in ('admin','member','public')),
  note text null,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create index if not exists central_tournament_events_date_idx
  on public.central_tournament_events (event_date, start_time);

create index if not exists central_tournament_registrations_event_idx
  on public.central_tournament_registrations (event_id, status, registered_at);

create index if not exists central_tournament_registrations_player_idx
  on public.central_tournament_registrations (player_id);

-- ------------------------------------------------------------
-- DKO / Round Robin:
-- Die Tabelle hatte bisher UNIQUE(player_id) global.
-- Dadurch konnte derselbe Spieler nicht für Freitag UND Samstag
-- gleichzeitig vorgemerkt sein.
--
-- Legacy bleibt geschützt:
--   event_id IS NULL -> weiterhin nur 1 aktiver Legacy-Eintrag je Spieler.
-- Zentrale Events:
--   event_id IS NOT NULL -> derselbe Spieler darf pro Event genau 1x vorkommen.
-- ------------------------------------------------------------

alter table public.dko_tournament_registration
  drop constraint if exists unique_player_registration;

drop index if exists public.dko_tournament_registration_legacy_player_uq;
drop index if exists public.dko_tournament_registration_event_player_uq;

create unique index dko_tournament_registration_legacy_player_uq
  on public.dko_tournament_registration (player_id)
  where event_id is null;

create unique index dko_tournament_registration_event_player_uq
  on public.dko_tournament_registration (event_id, player_id)
  where event_id is not null;

create index if not exists dko_tournament_registration_event_idx
  on public.dko_tournament_registration (event_id, registered_at);

-- ------------------------------------------------------------
-- RLS: Zentrale Admin-Oberfläche.
-- Bestehende Tabellen-Policies werden nicht verändert.
-- ------------------------------------------------------------

alter table public.central_tournament_events enable row level security;
alter table public.central_tournament_registrations enable row level security;

drop policy if exists "central_events_admin_all" on public.central_tournament_events;
create policy "central_events_admin_all"
on public.central_tournament_events
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and coalesce(up.is_admin, false) = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and coalesce(up.is_admin, false) = true
  )
);

drop policy if exists "central_registrations_admin_all" on public.central_tournament_registrations;
create policy "central_registrations_admin_all"
on public.central_tournament_registrations
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and coalesce(up.is_admin, false) = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and coalesce(up.is_admin, false) = true
  )
);

-- ============================================================
-- ABSICHTLICH NICHT ANGEFASST:
-- - kratzer_tournament_registrations Schema/Constraints
-- - Lion Cup
-- - Members Cup
-- - tournament series/history
-- - internal_tournament_events
-- - bestehende DKO-Registrierungen mit event_id IS NULL
-- ============================================================


-- ============================================================
-- V2: Bestehende public.events sind Master für geplante Turniere.
-- Die zentrale Tabelle ist für diese Events nur die Anmelde-Hülle.
-- Spontane Turniere existieren ausschließlich zentral.
-- ============================================================

alter table public.central_tournament_events
  add column if not exists source_event_id uuid null,
  add column if not exists is_spontaneous boolean not null default true;

-- FK absichtlich separat und defensiv anlegen.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'central_tournament_events_source_event_id_fkey'
  ) then
    alter table public.central_tournament_events
      add constraint central_tournament_events_source_event_id_fkey
      foreign key (source_event_id)
      references public.events(id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists central_tournament_events_source_event_uq
  on public.central_tournament_events (source_event_id)
  where source_event_id is not null;

-- Bereits vorhandene zentrale Einträge aus V1 bleiben spontane Turniere,
-- sofern sie nicht mit einer bestehenden Veranstaltung verknüpft sind.
update public.central_tournament_events
set is_spontaneous = true
where source_event_id is null;
