-- DartPilot / EMD Vereinsheim-Automatik
-- Heimspiele, interne Events und interne Turnierserien planen das Vereinsheim
-- automatisch von 18:00 bis 23:00 Uhr als geöffnet ein.
-- WICHTIG: Manuelle Einträge haben immer Vorrang.

begin;

alter table public.clubhouse_openings
  add column if not exists is_auto boolean not null default false,
  add column if not exists source_type text;

update public.clubhouse_openings
set is_auto = false,
    source_type = coalesce(source_type, 'manual')
where source_type is null;

create or replace function public.is_emd_clubhouse_location(p_location text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_location, '') ilike '%pfeil%ok%'
    or coalesce(p_location, '') ilike '%linzer bundesstr%16%'
    or coalesce(p_location, '') ilike '%linzer bundesstraße%16%';
$$;

create or replace function public.refresh_clubhouse_auto_opening(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_labels text[];
  v_note text;
begin
  if p_date is null then
    return;
  end if;

  select coalesce(array_agg(distinct x.label order by x.label), array[]::text[])
    into v_labels
  from (
    select 'Heimspiel'::text as label
    from public.matches m
    where m.match_date = p_date
      and m.home_team_type = 'own'
      and coalesce(m.status, '') not in ('cancelled', 'canceled', 'postponed')
      and public.is_emd_clubhouse_location(m.venue)

    union all

    select case
             when lower(coalesce(e.event_type, '')) like '%tournament%' then 'Turnier'
             else 'Interne Veranstaltung'
           end as label
    from public.events e
    where p_date between coalesce(e.start_date, e.event_date)
                     and coalesce(e.end_date, e.start_date, e.event_date)
      and public.is_emd_clubhouse_location(e.location)

    union all

    select 'Internes Turnier'::text as label
    from public.dko_series_events d
    where (d.start_at at time zone 'Europe/Vienna')::date = p_date
      and coalesce(d.is_matchday, false) = true
      and public.is_emd_clubhouse_location(d.location)
  ) x;

  if coalesce(array_length(v_labels, 1), 0) = 0 then
    -- Nur automatisch erzeugte Einträge entfernen.
    -- Eine manuelle Öffnung/Schließung wird niemals angegriffen.
    delete from public.clubhouse_openings
    where open_date = p_date
      and is_auto = true;
    return;
  end if;

  v_note := 'Automatisch geplant · ' || array_to_string(v_labels, ' · ');

  insert into public.clubhouse_openings (
    open_date,
    status,
    opens_at,
    closes_at,
    note,
    is_auto,
    source_type,
    updated_at
  ) values (
    p_date,
    'planned',
    time '18:00',
    time '23:00',
    v_note,
    true,
    'calendar',
    now()
  )
  on conflict (open_date) do update
    set status = 'planned',
        opens_at = time '18:00',
        closes_at = time '23:00',
        note = excluded.note,
        is_auto = true,
        source_type = 'calendar',
        updated_at = now()
  -- Manuelle Einträge sind geschützt und werden nicht überschrieben.
  where public.clubhouse_openings.is_auto = true;
end;
$$;

create or replace function public.trg_refresh_clubhouse_from_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_clubhouse_auto_opening(old.match_date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_clubhouse_auto_opening(new.match_date);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_refresh_clubhouse_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
  old_start date;
  old_end date;
  new_start date;
  new_end date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_start := coalesce(old.start_date, old.event_date);
    old_end := coalesce(old.end_date, old.start_date, old.event_date);
    if old_start is not null and old_end is not null then
      for d in select generate_series(old_start, old_end, interval '1 day')::date loop
        perform public.refresh_clubhouse_auto_opening(d);
      end loop;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    new_start := coalesce(new.start_date, new.event_date);
    new_end := coalesce(new.end_date, new.start_date, new.event_date);
    if new_start is not null and new_end is not null then
      for d in select generate_series(new_start, new_end, interval '1 day')::date loop
        perform public.refresh_clubhouse_auto_opening(d);
      end loop;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.trg_refresh_clubhouse_from_dko_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_date date;
  new_date date;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.start_at is not null then
    old_date := (old.start_at at time zone 'Europe/Vienna')::date;
    perform public.refresh_clubhouse_auto_opening(old_date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.start_at is not null then
    new_date := (new.start_at at time zone 'Europe/Vienna')::date;
    perform public.refresh_clubhouse_auto_opening(new_date);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists clubhouse_auto_from_matches on public.matches;
create trigger clubhouse_auto_from_matches
after insert or update or delete on public.matches
for each row execute function public.trg_refresh_clubhouse_from_match();

drop trigger if exists clubhouse_auto_from_events on public.events;
create trigger clubhouse_auto_from_events
after insert or update or delete on public.events
for each row execute function public.trg_refresh_clubhouse_from_event();

drop trigger if exists clubhouse_auto_from_dko_events on public.dko_series_events;
create trigger clubhouse_auto_from_dko_events
after insert or update or delete on public.dko_series_events
for each row execute function public.trg_refresh_clubhouse_from_dko_event();

-- Bereits vorhandene Termine für die nächsten 365 Tage einmalig einlesen.
do $$
declare
  d date;
begin
  for d in
    select generate_series(current_date, current_date + 365, interval '1 day')::date
  loop
    perform public.refresh_clubhouse_auto_opening(d);
  end loop;
end;
$$;

commit;
