alter table public.tournaments_status
  add column if not exists series_id uuid null references public.dko_series(id) on delete set null,
  add column if not exists series_event_id uuid null references public.dko_series_events(id) on delete set null;

create unique index if not exists tournaments_status_one_active_per_series_event
  on public.tournaments_status (series_event_id)
  where status = 'active' and series_event_id is not null;

create index if not exists tournaments_status_series_id_idx
  on public.tournaments_status (series_id);

create index if not exists tournaments_status_series_event_id_idx
  on public.tournaments_status (series_event_id);
