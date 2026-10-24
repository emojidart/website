-- Steinlechner: getrennte Online-Anmeldung Herren/Damen + reservierte Kontingente
-- Event: f28708b3-9d05-4fa4-aeb0-915b4d7a6a3c

alter table public.dach_events
  add column if not exists registration_split_by_gender boolean not null default false,
  add column if not exists men_max_participants integer,
  add column if not exists women_max_participants integer,
  add column if not exists men_reserved_slots integer not null default 0,
  add column if not exists women_reserved_slots integer not null default 0;

alter table public.central_tournament_registrations
  add column if not exists division text;

alter table public.public_event_registrations
  add column if not exists division text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'central_tournament_registrations_division_check'
  ) then
    alter table public.central_tournament_registrations
      add constraint central_tournament_registrations_division_check
      check (division is null or division in ('men','women'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'public_event_registrations_division_check'
  ) then
    alter table public.public_event_registrations
      add constraint public_event_registrations_division_check
      check (division is null or division in ('men','women'));
  end if;
end $$;

update public.dach_events
set
  registration_split_by_gender = true,
  men_max_participants = 64,
  women_max_participants = 16,
  men_reserved_slots = 15,
  women_reserved_slots = 5,
  max_participants = 80,
  updated_at = now()
where id = 'f28708b3-9d05-4fa4-aeb0-915b4d7a6a3c';
