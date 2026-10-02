-- EMD: Sportdarts-Division pro eigenem Team und interner Saison
-- Rein additiv: bestehende Tabellen/Spiele/Saisons werden nicht verändert.

create table if not exists public.team_sportdarts_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  sportdarts_season_id integer not null,
  sportdarts_division_id integer not null,
  sportdarts_division_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_sportdarts_assignments_team_season_unique unique (team_id, season_id)
);

create index if not exists team_sportdarts_assignments_team_idx
  on public.team_sportdarts_assignments(team_id);

create index if not exists team_sportdarts_assignments_season_idx
  on public.team_sportdarts_assignments(season_id);

-- Die bestehende Admin-Seite arbeitet mit dem Browser-Supabase-Client.
-- Deshalb Zugriff für eingeloggte Nutzer. Wenn ihr bereits strengere Admin-RLS
-- verwendet, können diese Policies später auf eure Admin-Rolle eingeschränkt werden.
alter table public.team_sportdarts_assignments enable row level security;

drop policy if exists "team_sportdarts_assignments_select_authenticated"
  on public.team_sportdarts_assignments;
create policy "team_sportdarts_assignments_select_authenticated"
  on public.team_sportdarts_assignments
  for select
  to authenticated
  using (true);

drop policy if exists "team_sportdarts_assignments_insert_authenticated"
  on public.team_sportdarts_assignments;
create policy "team_sportdarts_assignments_insert_authenticated"
  on public.team_sportdarts_assignments
  for insert
  to authenticated
  with check (true);

drop policy if exists "team_sportdarts_assignments_update_authenticated"
  on public.team_sportdarts_assignments;
create policy "team_sportdarts_assignments_update_authenticated"
  on public.team_sportdarts_assignments
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "team_sportdarts_assignments_delete_authenticated"
  on public.team_sportdarts_assignments;
create policy "team_sportdarts_assignments_delete_authenticated"
  on public.team_sportdarts_assignments
  for delete
  to authenticated
  using (true);
