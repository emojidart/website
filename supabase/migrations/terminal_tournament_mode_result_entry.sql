-- EMD Terminal tournament mode
-- Already applied to Supabase project puozttepmqkelrzaojys.
-- This file is included for version control / reproducibility.

create or replace function public.terminal_get_my_active_match(p_pin text)
returns table(
  member_name text,
  tournament_id uuid,
  tournament_type text,
  tournament_name text,
  match_id integer,
  player1 text,
  player2 text,
  score1 integer,
  score2 integer,
  machine_number integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_lookup_hash text;
  v_player_id uuid;
  v_pin_hash text;
  v_failed integer;
  v_locked_until timestamptz;
  v_spieler_id uuid;
  v_member_name text;
begin
  if p_pin !~ '^[0-9]{4}$' then return; end if;

  v_lookup_hash := encode(extensions.digest('emd-terminal-pin-v1:' || p_pin, 'sha256'), 'hex');

  select tc.player_id, tc.pin_hash, tc.failed_attempts, tc.locked_until
    into v_player_id, v_pin_hash, v_failed, v_locked_until
  from private.terminal_credentials tc
  where tc.pin_lookup_hash = v_lookup_hash
  for update;

  if not found or v_pin_hash is null then return; end if;
  if v_locked_until is not null and v_locked_until > now() then raise exception 'rate limited'; end if;

  if extensions.crypt(p_pin, v_pin_hash) <> v_pin_hash then
    update private.terminal_credentials
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '10 minutes' else null end,
           updated_at = now()
     where terminal_credentials.player_id = v_player_id;
    return;
  end if;

  update private.terminal_credentials
     set failed_attempts = 0, locked_until = null, updated_at = now()
   where terminal_credentials.player_id = v_player_id;

  select cp.spieldatenbank_id, cp.name
    into v_spieler_id, v_member_name
  from public.club_players cp
  where cp.id = v_player_id and cp.is_active is true and cp.club_left_at is null
  limit 1;

  if v_spieler_id is null then return; end if;

  return query
  select
    v_member_name,
    dms.tournament_id,
    dms.tournament_type,
    ts.tournament_name,
    dms.match_id,
    dms.player1,
    dms.player2,
    coalesce(dms.score1, 0),
    coalesce(dms.score2, 0),
    dms.machine_number
  from public.dko_match_states dms
  join public.tournaments_status ts
    on ts.tournament_id = dms.tournament_id::text
   and ts.tournament_type = dms.tournament_type
   and ts.status = 'active'
  where dms.winner is null
    and dms.player1 is not null
    and dms.player2 is not null
    and (dms.player1_id = v_spieler_id or dms.player2_id = v_spieler_id)
  order by
    case when dms.machine_number is not null then 0 else 1 end,
    dms.updated_at desc nulls last,
    dms.match_id asc
  limit 1;
end;
$$;

create or replace function public.terminal_save_my_match_result(
  p_pin text,
  p_tournament_id uuid,
  p_tournament_type text,
  p_match_id integer,
  p_score1 integer,
  p_score2 integer
)
returns table(winner text, loser text, saved_score1 integer, saved_score2 integer)
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_lookup_hash text;
  v_player_id uuid;
  v_pin_hash text;
  v_failed integer;
  v_locked_until timestamptz;
  v_spieler_id uuid;
  v_p1 text;
  v_p2 text;
  v_p1_id uuid;
  v_p2_id uuid;
  v_existing_winner text;
  v_winner text;
  v_loser text;
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'invalid pin'; end if;
  if p_score1 is null or p_score2 is null or p_score1 < 0 or p_score2 < 0 then raise exception 'invalid score'; end if;
  if p_score1 = p_score2 then raise exception 'draw not allowed'; end if;
  if p_score1 > 50 or p_score2 > 50 then raise exception 'score too high'; end if;

  v_lookup_hash := encode(extensions.digest('emd-terminal-pin-v1:' || p_pin, 'sha256'), 'hex');

  select tc.player_id, tc.pin_hash, tc.failed_attempts, tc.locked_until
    into v_player_id, v_pin_hash, v_failed, v_locked_until
  from private.terminal_credentials tc
  where tc.pin_lookup_hash = v_lookup_hash
  for update;

  if not found or v_pin_hash is null then raise exception 'invalid pin'; end if;
  if v_locked_until is not null and v_locked_until > now() then raise exception 'rate limited'; end if;

  if extensions.crypt(p_pin, v_pin_hash) <> v_pin_hash then
    update private.terminal_credentials
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '10 minutes' else null end,
           updated_at = now()
     where terminal_credentials.player_id = v_player_id;
    raise exception 'invalid pin';
  end if;

  update private.terminal_credentials
     set failed_attempts = 0, locked_until = null, updated_at = now()
   where terminal_credentials.player_id = v_player_id;

  select cp.spieldatenbank_id
    into v_spieler_id
  from public.club_players cp
  where cp.id = v_player_id and cp.is_active is true and cp.club_left_at is null
  limit 1;

  if v_spieler_id is null then raise exception 'player mapping missing'; end if;

  if not exists (
    select 1 from public.tournaments_status ts
    where ts.tournament_id = p_tournament_id::text
      and ts.tournament_type = p_tournament_type
      and ts.status = 'active'
  ) then
    raise exception 'tournament not active';
  end if;

  select dms.player1, dms.player2, dms.player1_id, dms.player2_id, dms.winner
    into v_p1, v_p2, v_p1_id, v_p2_id, v_existing_winner
  from public.dko_match_states dms
  where dms.tournament_id = p_tournament_id
    and dms.tournament_type = p_tournament_type
    and dms.match_id = p_match_id
  for update;

  if not found then raise exception 'match not found'; end if;
  if v_existing_winner is not null then raise exception 'match already completed'; end if;
  if v_spieler_id <> v_p1_id and v_spieler_id <> v_p2_id then raise exception 'not a participant'; end if;

  if p_score1 > p_score2 then
    v_winner := v_p1; v_loser := v_p2;
  else
    v_winner := v_p2; v_loser := v_p1;
  end if;

  update public.dko_match_states
     set score1 = p_score1,
         score2 = p_score2,
         winner = v_winner,
         loser = v_loser,
         machine_number = null,
         updated_at = now()
   where dko_match_states.tournament_id = p_tournament_id
     and dko_match_states.tournament_type = p_tournament_type
     and dko_match_states.match_id = p_match_id
     and dko_match_states.winner is null;

  if not found then raise exception 'match already completed'; end if;

  return query select v_winner, v_loser, p_score1, p_score2;
end;
$$;

revoke all on function public.terminal_get_my_active_match(text) from public;
grant execute on function public.terminal_get_my_active_match(text) to anon, authenticated, service_role;

revoke all on function public.terminal_save_my_match_result(text, uuid, text, integer, integer, integer) from public;
grant execute on function public.terminal_save_my_match_result(text, uuid, text, integer, integer, integer) to anon, authenticated, service_role;
