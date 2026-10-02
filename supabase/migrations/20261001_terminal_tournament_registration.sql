-- EMD Terminal Turnier-Anmeldung V3.0
-- Supabase-Änderungen wurden im Live-Projekt bereits ausgeführt.
-- Diese Datei dient als nachvollziehbare Migration für Deployment/Backup.

alter table public.central_tournament_registrations
  drop constraint if exists central_tournament_registrations_source_check;

alter table public.central_tournament_registrations
  add constraint central_tournament_registrations_source_check
  check (source = any (array[
    'admin'::text,
    'member'::text,
    'public'::text,
    'terminal'::text
  ]));

create or replace function public.terminal_list_tournament_registration_events()
returns table(
  event_id uuid,
  title text,
  event_date date,
  start_time time,
  location text,
  max_participants integer,
  entry_fee numeric,
  access_type text,
  event_status text,
  registered_count bigint,
  waitlist_count bigint,
  registration_open boolean,
  is_today boolean
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    e.id,
    e.title,
    e.event_date,
    e.start_time,
    e.location,
    e.max_participants,
    e.entry_fee,
    e.access_type,
    e.status,
    (select count(*)
       from public.central_tournament_registrations r
      where r.event_id=e.id and r.status='registered'),
    (select count(*)
       from public.central_tournament_registrations r
      where r.event_id=e.id and r.status='waitlist'),
    (
      e.status='open'
      and (e.registration_deadline is null or now() <= e.registration_deadline)
    ),
    (e.event_date=(now() at time zone 'Europe/Vienna')::date)
  from public.central_tournament_events e
  where e.event_date >= (now() at time zone 'Europe/Vienna')::date
    and e.status not in ('draft','completed','cancelled')
    and (
      e.source_event_id is null
      or exists (
        select 1
        from public.events src
        where src.id=e.source_event_id
          and src.is_emd_organizer is true
      )
    )
  order by
    (e.event_date=(now() at time zone 'Europe/Vienna')::date) desc,
    e.event_date asc,
    e.start_time asc nulls last,
    e.title asc;
$$;

create or replace function public.terminal_register_player_for_event(
  p_event_id uuid,
  p_player_id uuid,
  p_source text
)
returns table(
  registration_status text,
  player_name text,
  result_message text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.central_tournament_events%rowtype;
  v_player_name text;
  v_registered_count bigint;
  v_status text;
  v_existing_id uuid;
  v_existing_status text;
  v_today date := (now() at time zone 'Europe/Vienna')::date;
  v_is_emd_organizer boolean;
begin
  select * into v_event
  from public.central_tournament_events
  where id=p_event_id;

  if not found then
    raise exception 'Turnier nicht gefunden.';
  end if;

  if v_event.source_event_id is not null then
    select e.is_emd_organizer
      into v_is_emd_organizer
    from public.events e
    where e.id=v_event.source_event_id;

    if coalesce(v_is_emd_organizer,false) is false then
      raise exception 'Dieses Turnier wird nicht vom EMD organisiert.';
    end if;
  end if;

  if v_event.status <> 'open' then
    raise exception 'Die Anmeldung für dieses Turnier ist geschlossen.';
  end if;

  if v_event.event_date < v_today then
    raise exception 'Dieses Turnier ist bereits vorbei.';
  end if;

  if v_event.registration_deadline is not null
     and now() > v_event.registration_deadline then
    raise exception 'Die Anmeldefrist ist bereits abgelaufen.';
  end if;

  select s.name
    into v_player_name
  from public.spieldatenbank s
  where s.id=p_player_id;

  if v_player_name is null then
    raise exception 'Spieler wurde nicht gefunden.';
  end if;

  select r.id,r.status
    into v_existing_id,v_existing_status
  from public.central_tournament_registrations r
  where r.event_id=p_event_id
    and r.player_id=p_player_id
  limit 1;

  if v_existing_id is not null
     and v_existing_status in ('registered','waitlist') then
    return query
    select
      v_existing_status,
      v_player_name,
      case
        when v_existing_status='waitlist'
          then 'Du stehst bereits auf der Warteliste.'
        else 'Du bist bereits für dieses Turnier angemeldet.'
      end;
    return;
  end if;

  select count(*)
    into v_registered_count
  from public.central_tournament_registrations r
  where r.event_id=p_event_id
    and r.status='registered';

  v_status := case
    when v_event.max_participants is not null
      and v_registered_count >= v_event.max_participants
      then 'waitlist'
    else 'registered'
  end;

  if v_existing_id is not null then
    update public.central_tournament_registrations
    set
      player_name_snapshot=v_player_name,
      status=v_status,
      paid=false,
      source=p_source,
      note='Anmeldung am Club Terminal',
      registered_at=now(),
      updated_at=now()
    where id=v_existing_id;
  else
    insert into public.central_tournament_registrations(
      event_id,
      player_id,
      player_name_snapshot,
      status,
      paid,
      source,
      note,
      registered_at,
      updated_at
    )
    values(
      p_event_id,
      p_player_id,
      v_player_name,
      v_status,
      false,
      p_source,
      'Anmeldung am Club Terminal',
      now(),
      now()
    );
  end if;

  return query
  select
    v_status,
    v_player_name,
    case
      when v_status='waitlist'
        then 'Anmeldung gespeichert. Du stehst auf der Warteliste.'
      else 'Anmeldung erfolgreich. Dein Platz ist reserviert.'
    end;
end;
$$;

create or replace function public.terminal_register_external_tournament_player(
  p_event_id uuid,
  p_player_id uuid
)
returns table(
  registration_status text,
  player_name text,
  result_message text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_access_type text;
  v_is_member boolean;
begin
  select access_type
    into v_access_type
  from public.central_tournament_events
  where id=p_event_id;

  if v_access_type is null then
    raise exception 'Turnier nicht gefunden.';
  end if;

  if v_access_type='club_internal' then
    raise exception 'Dieses Turnier ist nur für EMD-Mitglieder geöffnet.';
  end if;

  select exists(
    select 1
    from public.club_players cp
    where cp.spieldatenbank_id=p_player_id
      and cp.is_active is true
      and cp.club_left_at is null
  )
  into v_is_member;

  if v_is_member then
    raise exception 'EMD-Mitglieder melden sich am Terminal bitte mit ihrer persönlichen PIN an.';
  end if;

  return query
  select *
  from public.terminal_register_player_for_event(
    p_event_id,
    p_player_id,
    'terminal'
  );
end;
$$;

create or replace function public.terminal_register_member_tournament(
  p_event_id uuid,
  p_pin text
)
returns table(
  registration_status text,
  player_name text,
  result_message text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_club_player_id uuid;
  v_spieldatenbank_id uuid;
begin
  select v.player_id
    into v_club_player_id
  from public.terminal_verify_pin_code(p_pin) v
  limit 1;

  if v_club_player_id is null then
    raise exception 'PIN nicht erkannt.';
  end if;

  select cp.spieldatenbank_id
    into v_spieldatenbank_id
  from public.club_players cp
  where cp.id=v_club_player_id
    and cp.is_active is true
    and cp.club_left_at is null;

  if v_spieldatenbank_id is null then
    raise exception 'Für dieses Mitglied fehlt die Zuordnung zur Spielerdatenbank.';
  end if;

  return query
  select *
  from public.terminal_register_player_for_event(
    p_event_id,
    v_spieldatenbank_id,
    'terminal'
  );
end;
$$;

revoke execute
on function public.terminal_register_player_for_event(uuid,uuid,text)
from public, anon, authenticated;


-- ============================================================
-- V3.1: vorhandene Anmeldung schon BEIM Prüfen erkennen
-- ============================================================

create or replace function public.terminal_verify_member_for_tournament(
  p_event_id uuid,
  p_pin text
)
returns table(
  club_player_id uuid,
  spieldatenbank_id uuid,
  name text,
  photo_url text,
  player_code text,
  existing_status text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_club_player_id uuid;
  v_name text;
  v_photo_url text;
  v_player_code text;
  v_spieldatenbank_id uuid;
  v_existing_status text;
begin
  select v.player_id, v.name, v.photo_url, v.player_code
    into v_club_player_id, v_name, v_photo_url, v_player_code
  from public.terminal_verify_pin_code(p_pin) v
  limit 1;

  if v_club_player_id is null then
    return;
  end if;

  select cp.spieldatenbank_id
    into v_spieldatenbank_id
  from public.club_players cp
  where cp.id = v_club_player_id
    and cp.is_active is true
    and cp.club_left_at is null;

  if v_spieldatenbank_id is null then
    raise exception 'Für dieses Mitglied fehlt die Zuordnung zur Spielerdatenbank.';
  end if;

  select r.status
    into v_existing_status
  from public.central_tournament_registrations r
  where r.event_id = p_event_id
    and r.player_id = v_spieldatenbank_id
    and r.status in ('registered','waitlist')
  limit 1;

  return query
  select
    v_club_player_id,
    v_spieldatenbank_id,
    v_name,
    v_photo_url,
    v_player_code,
    v_existing_status;
end;
$$;

create or replace function public.terminal_get_player_registration_status(
  p_event_id uuid,
  p_player_id uuid
)
returns text
language sql
security definer
set search_path = public, pg_catalog
as $$
  select r.status
  from public.central_tournament_registrations r
  where r.event_id = p_event_id
    and r.player_id = p_player_id
    and r.status in ('registered','waitlist')
  limit 1;
$$;
