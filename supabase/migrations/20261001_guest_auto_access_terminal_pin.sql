-- EMD Gastzugang V4
-- 1) Gastzugang ist ohne Admin-Freigabe aktiv.
-- 2) Beitrittsanfragen bleiben davon unberührt.
-- 3) Gast-Terminal-PIN getrennt und sicher gehasht speichern.

update public.guest_requests
set status = 'approved',
    approved_at = coalesce(approved_at, now())
where status = 'pending';

update public.user_profiles up
set is_blocked = false,
    blocked_reason = null,
    blocked_at = null
from public.guest_requests gr
where gr.auth_user_id = up.user_id
  and gr.status = 'approved'
  and up.is_guest is true;

create table if not exists public.guest_terminal_pin_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  pin_lookup_hash text not null unique,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.guest_terminal_pin_secrets enable row level security;
revoke all on table public.guest_terminal_pin_secrets from anon, authenticated;

create or replace function public.guest_terminal_set_my_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog','public','extensions'
as $$
declare
  v_user_id uuid;
  v_lookup_hash text;
  v_other_guest uuid;
  v_other_member uuid;
  v_guest_ok boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must contain exactly 4 digits';
  end if;

  select exists (
    select 1
    from public.user_profiles up
    join public.guest_requests gr on gr.auth_user_id = up.user_id
    where up.user_id = v_user_id
      and up.is_guest is true
      and coalesce(up.is_blocked,false) is false
      and gr.status = 'approved'
  ) into v_guest_ok;

  if not v_guest_ok then
    raise exception 'active guest profile not found';
  end if;

  v_lookup_hash := encode(
    extensions.digest('emd-terminal-pin-v1:' || p_pin, 'sha256'),
    'hex'
  );

  select g.user_id
    into v_other_guest
  from public.guest_terminal_pin_secrets g
  where g.pin_lookup_hash = v_lookup_hash
    and g.user_id <> v_user_id
  limit 1;

  if v_other_guest is not null then
    raise exception 'PIN already in use';
  end if;

  select tc.player_id
    into v_other_member
  from private.terminal_credentials tc
  where tc.pin_lookup_hash = v_lookup_hash
  limit 1;

  if v_other_member is not null then
    raise exception 'PIN already in use';
  end if;

  insert into public.guest_terminal_pin_secrets(
    user_id,pin_hash,pin_lookup_hash,failed_attempts,locked_until,updated_at
  )
  values(
    v_user_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf',10)),
    v_lookup_hash,
    0,
    null,
    now()
  )
  on conflict (user_id) do update set
    pin_hash=excluded.pin_hash,
    pin_lookup_hash=excluded.pin_lookup_hash,
    failed_attempts=0,
    locked_until=null,
    updated_at=now();

  return true;
end;
$$;

create or replace function public.guest_terminal_has_pin()
returns boolean
language sql
security definer
set search_path to 'pg_catalog','public'
as $$
  select exists (
    select 1
    from public.guest_terminal_pin_secrets g
    where g.user_id = auth.uid()
  );
$$;

grant execute on function public.guest_terminal_set_my_pin(text) to authenticated;
grant execute on function public.guest_terminal_has_pin() to authenticated;
