-- EMD Club Terminal authentication foundation
-- New objects only. Does not alter existing member tables.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.terminal_credentials (
  player_id uuid primary key references public.club_players(id) on delete cascade,
  pin_hash text,
  nfc_hash text,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists private.terminal_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.club_players(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists terminal_qr_tokens_player_id_idx
  on private.terminal_qr_tokens(player_id);

create index if not exists terminal_qr_tokens_expires_at_idx
  on private.terminal_qr_tokens(expires_at);

revoke all on private.terminal_credentials from public, anon, authenticated;
revoke all on private.terminal_qr_tokens from public, anon, authenticated;

create or replace function public.terminal_search_members(p_query text)
returns table(player_id uuid, name text, photo_url text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select cp.id, cp.name, cp.photo_url
  from public.club_players cp
  where cp.is_active is true
    and cp.club_left_at is null
    and length(trim(coalesce(p_query, ''))) >= 2
    and cp.name ilike '%' || trim(p_query) || '%'
  order by cp.name
  limit 8;
$$;

create or replace function public.terminal_set_my_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must contain exactly 4 digits';
  end if;

  select up.player_id
  into v_player_id
  from public.user_profiles up
  where up.user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    raise exception 'member profile not found';
  end if;

  insert into private.terminal_credentials(player_id, pin_hash, failed_attempts, locked_until, updated_at)
  values (
    v_player_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
    0,
    null,
    now()
  )
  on conflict (player_id)
  do update set
    pin_hash = excluded.pin_hash,
    failed_attempts = 0,
    locked_until = null,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.terminal_verify_pin(p_player_id uuid, p_pin text)
returns table(player_id uuid, name text, photo_url text)
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_cred private.terminal_credentials%rowtype;
  v_ok boolean := false;
begin
  if p_pin !~ '^[0-9]{4}$' then
    return;
  end if;

  select *
  into v_cred
  from private.terminal_credentials
  where terminal_credentials.player_id = p_player_id
  for update;

  if not found or v_cred.pin_hash is null then
    return;
  end if;

  if v_cred.locked_until is not null and v_cred.locked_until > now() then
    raise exception 'rate limited';
  end if;

  v_ok := extensions.crypt(p_pin, v_cred.pin_hash) = v_cred.pin_hash;

  if not v_ok then
    update private.terminal_credentials
    set
      failed_attempts = failed_attempts + 1,
      locked_until = case
        when failed_attempts + 1 >= 5 then now() + interval '10 minutes'
        else null
      end,
      updated_at = now()
    where terminal_credentials.player_id = p_player_id;
    return;
  end if;

  update private.terminal_credentials
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where terminal_credentials.player_id = p_player_id;

  return query
  select cp.id, cp.name, cp.photo_url
  from public.club_players cp
  where cp.id = p_player_id
    and cp.is_active is true
    and cp.club_left_at is null
  limit 1;
end;
$$;

create or replace function public.terminal_create_my_qr_token()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_player_id uuid;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select up.player_id
  into v_player_id
  from public.user_profiles up
  where up.user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    raise exception 'member profile not found';
  end if;

  delete from private.terminal_qr_tokens
  where player_id = v_player_id
     or expires_at < now() - interval '5 minutes'
     or used_at is not null;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into private.terminal_qr_tokens(player_id, token_hash, expires_at)
  values (
    v_player_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    now() + interval '60 seconds'
  );

  return v_token;
end;
$$;

create or replace function public.terminal_consume_qr(p_token text)
returns table(player_id uuid, name text, photo_url text)
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_row private.terminal_qr_tokens%rowtype;
begin
  if p_token is null or length(p_token) < 20 then
    return;
  end if;

  select *
  into v_row
  from private.terminal_qr_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and used_at is null
    and expires_at >= now()
  for update skip locked;

  if not found then
    return;
  end if;

  update private.terminal_qr_tokens
  set used_at = now()
  where id = v_row.id;

  return query
  select cp.id, cp.name, cp.photo_url
  from public.club_players cp
  where cp.id = v_row.player_id
    and cp.is_active is true
    and cp.club_left_at is null
  limit 1;
end;
$$;

create or replace function public.terminal_bind_my_nfc(p_token text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'invalid NFC token';
  end if;

  select up.player_id
  into v_player_id
  from public.user_profiles up
  where up.user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    raise exception 'member profile not found';
  end if;

  insert into private.terminal_credentials(player_id, nfc_hash, updated_at)
  values (
    v_player_id,
    encode(extensions.digest(trim(p_token), 'sha256'), 'hex'),
    now()
  )
  on conflict (player_id)
  do update set
    nfc_hash = excluded.nfc_hash,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.terminal_consume_nfc(p_token text)
returns table(player_id uuid, name text, photo_url text)
language sql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
  select cp.id, cp.name, cp.photo_url
  from private.terminal_credentials tc
  join public.club_players cp on cp.id = tc.player_id
  where tc.nfc_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
    and cp.is_active is true
    and cp.club_left_at is null
  limit 1;
$$;

revoke all on function public.terminal_search_members(text) from public, anon, authenticated;
revoke all on function public.terminal_set_my_pin(text) from public, anon, authenticated;
revoke all on function public.terminal_verify_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.terminal_create_my_qr_token() from public, anon, authenticated;
revoke all on function public.terminal_consume_qr(text) from public, anon, authenticated;
revoke all on function public.terminal_bind_my_nfc(text) from public, anon, authenticated;
revoke all on function public.terminal_consume_nfc(text) from public, anon, authenticated;

grant execute on function public.terminal_search_members(text) to anon, authenticated;
grant execute on function public.terminal_verify_pin(uuid, text) to anon, authenticated;
grant execute on function public.terminal_consume_qr(text) to anon, authenticated;
grant execute on function public.terminal_consume_nfc(text) to anon, authenticated;

grant execute on function public.terminal_set_my_pin(text) to authenticated;
grant execute on function public.terminal_create_my_qr_token() to authenticated;
grant execute on function public.terminal_bind_my_nfc(text) to authenticated;
