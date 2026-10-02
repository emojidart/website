-- Sichere SportDarts-Zuordnung für spieldatenbank.
-- Bestehende Datensätze, interne Namen, Cups und Historien bleiben unverändert.

alter table public.spieldatenbank
  add column if not exists sportdarts_player_number text null,
  add column if not exists sportdarts_name text null;

create index if not exists spieldatenbank_sportdarts_player_number_idx
  on public.spieldatenbank (sportdarts_player_number)
  where sportdarts_player_number is not null;

create index if not exists spieldatenbank_sportdarts_name_idx
  on public.spieldatenbank (lower(sportdarts_name))
  where sportdarts_name is not null;

-- Absichtlich kein UNIQUE und kein NOT NULL.
