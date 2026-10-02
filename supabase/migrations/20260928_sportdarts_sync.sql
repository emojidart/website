-- EMD Sportdarts Sync
-- 1) Prüfwarteschlange für spätere Admin-Oberfläche
-- 2) atomare Übernahme von Endstand + offiziellen Legs
-- Eigene EMD-Statistiken (180er, 171er, High Tonne usw.) werden nicht überschrieben.

create table if not exists public.sportdarts_sync_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sportdarts_game_id integer not null,
  team_id uuid references public.teams(id) on delete set null,
  requested_by uuid,
  status text not null default 'review_required'
    check (status in ('review_required', 'approved', 'rejected', 'applied')),
  reason text,
  details jsonb not null default '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sportdarts_sync_reviews_status_idx
  on public.sportdarts_sync_reviews(status, created_at desc);

create index if not exists sportdarts_sync_reviews_match_idx
  on public.sportdarts_sync_reviews(match_id, created_at desc);

alter table public.sportdarts_sync_reviews enable row level security;

-- Die Warteschlange wird in dieser Ausbaustufe ausschließlich über die
-- authentifizierte Server-Route mit Service Role verwaltet.
revoke all on public.sportdarts_sync_reviews from anon, authenticated;

create or replace function public.apply_sportdarts_sync(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_player_stats jsonb,
  p_actor uuid,
  p_sportdarts_game_id integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_player_id uuid;
  v_existing_id uuid;
  v_existing_count integer;
  v_won integer;
  v_lost integer;
  v_updated integer := 0;
  v_inserted integer := 0;
  v_extra jsonb;
  v_existing record;
begin
  if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
    raise exception 'Ungültiger Sportdarts-Endstand.';
  end if;

  if jsonb_typeof(p_player_stats) <> 'array' then
    raise exception 'Ungültige Spielerstatistik.';
  end if;

  -- Vorabprüfung: niemals mehrere Statistikzeilen desselben Spielers stillschweigend verändern.
  for item in select * from jsonb_array_elements(p_player_stats)
  loop
    v_player_id := nullif(item->>'player_id', '')::uuid;

    if v_player_id is null then
      raise exception 'Spieler-ID fehlt.';
    end if;

    select count(*), min(id)
      into v_existing_count, v_existing_id
    from public.leg_statistics
    where match_id = p_match_id
      and player_id = v_player_id;

    if v_existing_count > 1 then
      raise exception 'Mehrere Statistikdatensätze für Spieler % vorhanden. Admin-Prüfung erforderlich.', v_player_id;
    end if;
  end loop;

  -- Offiziellen Match-Endstand übernehmen.
  update public.matches
  set
    home_score = p_home_score,
    away_score = p_away_score,
    status = 'completed'
  where id = p_match_id;

  if not found then
    raise exception 'Match nicht gefunden.';
  end if;

  -- Nur die offiziellen Leg-Felder aktualisieren.
  -- Alle manuellen EMD-Felder bleiben unangetastet.
  for item in select * from jsonb_array_elements(p_player_stats)
  loop
    v_player_id := nullif(item->>'player_id', '')::uuid;
    v_won := greatest(coalesce((item->>'legs_won')::integer, 0), 0);
    v_lost := greatest(coalesce((item->>'legs_lost')::integer, 0), 0);

    select count(*), min(id)
      into v_existing_count, v_existing_id
    from public.leg_statistics
    where match_id = p_match_id
      and player_id = v_player_id;

    if v_existing_count = 1 then
      v_extra := coalesce(item->'extra_stats', '{}'::jsonb);

      select *
        into v_existing
      from public.leg_statistics
      where id = v_existing_id;

      -- Bereits manuell erfasste Zusatzwerte niemals still überschreiben.
      if
        (coalesce((v_extra->>'throws_180')::integer,0) > 0 and coalesce(v_existing.throws_180,0) > 0 and coalesce((v_extra->>'throws_180')::integer,0) <> coalesce(v_existing.throws_180,0)) or
        (coalesce((v_extra->>'throws_171')::integer,0) > 0 and coalesce(v_existing.throws_171,0) > 0 and coalesce((v_extra->>'throws_171')::integer,0) <> coalesce(v_existing.throws_171,0)) or
        (coalesce((v_extra->>'throws_high_tonne')::integer,0) > 0 and coalesce(v_existing.throws_high_tonne,0) > 0 and coalesce((v_extra->>'throws_high_tonne')::integer,0) <> coalesce(v_existing.throws_high_tonne,0)) or
        (coalesce((v_extra->>'throws_tonne')::integer,0) > 0 and coalesce(v_existing.throws_tonne,0) > 0 and coalesce((v_extra->>'throws_tonne')::integer,0) <> coalesce(v_existing.throws_tonne,0)) or
        (coalesce((v_extra->>'throws_shanghai')::integer,0) > 0 and coalesce(v_existing.throws_shanghai,0) > 0 and coalesce((v_extra->>'throws_shanghai')::integer,0) <> coalesce(v_existing.throws_shanghai,0)) or
        (coalesce((v_extra->>'throws_95_plus')::integer,0) > 0 and coalesce(v_existing.throws_95_plus,0) > 0 and coalesce((v_extra->>'throws_95_plus')::integer,0) <> coalesce(v_existing.throws_95_plus,0)) or
        (coalesce((v_extra->>'throws_bull')::integer,0) > 0 and coalesce(v_existing.throws_bull,0) > 0 and coalesce((v_extra->>'throws_bull')::integer,0) <> coalesce(v_existing.throws_bull,0)) or
        (coalesce((v_extra->>'throws_15')::integer,0) > 0 and coalesce(v_existing.throws_15,0) > 0 and coalesce((v_extra->>'throws_15')::integer,0) <> coalesce(v_existing.throws_15,0)) or
        (coalesce((v_extra->>'throws_16')::integer,0) > 0 and coalesce(v_existing.throws_16,0) > 0 and coalesce((v_extra->>'throws_16')::integer,0) <> coalesce(v_existing.throws_16,0)) or
        (coalesce((v_extra->>'throws_17')::integer,0) > 0 and coalesce(v_existing.throws_17,0) > 0 and coalesce((v_extra->>'throws_17')::integer,0) <> coalesce(v_existing.throws_17,0)) or
        (coalesce((v_extra->>'throws_18')::integer,0) > 0 and coalesce(v_existing.throws_18,0) > 0 and coalesce((v_extra->>'throws_18')::integer,0) <> coalesce(v_existing.throws_18,0)) or
        (coalesce((v_extra->>'throws_19')::integer,0) > 0 and coalesce(v_existing.throws_19,0) > 0 and coalesce((v_extra->>'throws_19')::integer,0) <> coalesce(v_existing.throws_19,0)) or
        (coalesce((v_extra->>'throws_20')::integer,0) > 0 and coalesce(v_existing.throws_20,0) > 0 and coalesce((v_extra->>'throws_20')::integer,0) <> coalesce(v_existing.throws_20,0)) or
        (coalesce((v_extra->>'throws_under_26')::integer,0) > 0 and coalesce(v_existing.throws_under_26,0) > 0 and coalesce((v_extra->>'throws_under_26')::integer,0) <> coalesce(v_existing.throws_under_26,0)) or
        (coalesce((v_extra->>'throws_under_30')::integer,0) > 0 and coalesce(v_existing.throws_under_30,0) > 0 and coalesce((v_extra->>'throws_under_30')::integer,0) <> coalesce(v_existing.throws_under_30,0)) or
        (coalesce((v_extra->>'semperit_outs')::integer,0) > 0 and coalesce(v_existing.semperit_outs,0) > 0 and coalesce((v_extra->>'semperit_outs')::integer,0) <> coalesce(v_existing.semperit_outs,0))
      then
        raise exception 'Vorhandene manuelle Zusatzstatistik für Spieler % weicht ab. Admin-Prüfung erforderlich.', v_player_id;
      end if;

      update public.leg_statistics
      set
        player_legs_won = v_won,
        opponent_legs_won = v_lost,
        legs_won_in_match = v_won,
        leg_winner_id = case when v_won > v_lost then v_player_id else null end,
        leg_wins = case when v_won > v_lost then 1 else 0 end,
        throws_180 = case when coalesce(throws_180,0) = 0 then coalesce((v_extra->>'throws_180')::integer,0) else throws_180 end,
        throws_171 = case when coalesce(throws_171,0) = 0 then coalesce((v_extra->>'throws_171')::integer,0) else throws_171 end,
        throws_high_tonne = case when coalesce(throws_high_tonne,0) = 0 then coalesce((v_extra->>'throws_high_tonne')::integer,0) else throws_high_tonne end,
        throws_tonne = case when coalesce(throws_tonne,0) = 0 then coalesce((v_extra->>'throws_tonne')::integer,0) else throws_tonne end,
        throws_shanghai = case when coalesce(throws_shanghai,0) = 0 then coalesce((v_extra->>'throws_shanghai')::integer,0) else throws_shanghai end,
        throws_95_plus = case when coalesce(throws_95_plus,0) = 0 then coalesce((v_extra->>'throws_95_plus')::integer,0) else throws_95_plus end,
        throws_bull = case when coalesce(throws_bull,0) = 0 then coalesce((v_extra->>'throws_bull')::integer,0) else throws_bull end,
        throws_15 = case when coalesce(throws_15,0) = 0 then coalesce((v_extra->>'throws_15')::integer,0) else throws_15 end,
        throws_16 = case when coalesce(throws_16,0) = 0 then coalesce((v_extra->>'throws_16')::integer,0) else throws_16 end,
        throws_17 = case when coalesce(throws_17,0) = 0 then coalesce((v_extra->>'throws_17')::integer,0) else throws_17 end,
        throws_18 = case when coalesce(throws_18,0) = 0 then coalesce((v_extra->>'throws_18')::integer,0) else throws_18 end,
        throws_19 = case when coalesce(throws_19,0) = 0 then coalesce((v_extra->>'throws_19')::integer,0) else throws_19 end,
        throws_20 = case when coalesce(throws_20,0) = 0 then coalesce((v_extra->>'throws_20')::integer,0) else throws_20 end,
        throws_under_26 = case when coalesce(throws_under_26,0) = 0 then coalesce((v_extra->>'throws_under_26')::integer,0) else throws_under_26 end,
        throws_under_30 = case when coalesce(throws_under_30,0) = 0 then coalesce((v_extra->>'throws_under_30')::integer,0) else throws_under_30 end,
        semperit_outs = case when coalesce(semperit_outs,0) = 0 then coalesce((v_extra->>'semperit_outs')::integer,0) else semperit_outs end
      where id = v_existing_id;

      v_updated := v_updated + 1;
    else
      insert into public.leg_statistics (
        match_id,
        leg_number,
        player_id,
        leg_winner_id,
        leg_wins,
        legs_won_in_match,
        player_legs_won,
        opponent_legs_won,
        throws_180,
        throws_171,
        throws_high_tonne,
        throws_tonne,
        throws_shanghai,
        throws_95_plus,
        throws_under_26,
        throws_under_30,
        semperit_outs,
        throws_15,
        throws_16,
        throws_17,
        throws_18,
        throws_19,
        throws_20,
        throws_bull,
        notes,
        dart_type
      )
      select
        p_match_id,
        1,
        v_player_id,
        case when v_won > v_lost then v_player_id else null end,
        case when v_won > v_lost then 1 else 0 end,
        v_won,
        v_won,
        v_lost,
        coalesce((item->'extra_stats'->>'throws_180')::integer,0),
        coalesce((item->'extra_stats'->>'throws_171')::integer,0),
        coalesce((item->'extra_stats'->>'throws_high_tonne')::integer,0),
        coalesce((item->'extra_stats'->>'throws_tonne')::integer,0),
        coalesce((item->'extra_stats'->>'throws_shanghai')::integer,0),
        coalesce((item->'extra_stats'->>'throws_95_plus')::integer,0),
        coalesce((item->'extra_stats'->>'throws_under_26')::integer,0),
        coalesce((item->'extra_stats'->>'throws_under_30')::integer,0),
        coalesce((item->'extra_stats'->>'semperit_outs')::integer,0),
        coalesce((item->'extra_stats'->>'throws_15')::integer,0),
        coalesce((item->'extra_stats'->>'throws_16')::integer,0),
        coalesce((item->'extra_stats'->>'throws_17')::integer,0),
        coalesce((item->'extra_stats'->>'throws_18')::integer,0),
        coalesce((item->'extra_stats'->>'throws_19')::integer,0),
        coalesce((item->'extra_stats'->>'throws_20')::integer,0),
        coalesce((item->'extra_stats'->>'throws_bull')::integer,0),
        '',
        coalesce(m.dart_type, 'steeldart')
      from public.matches m
      where m.id = p_match_id;

      v_inserted := v_inserted + 1;
    end if;
  end loop;

  insert into public.sportdarts_sync_reviews (
    match_id,
    sportdarts_game_id,
    requested_by,
    status,
    reason,
    details,
    reviewed_by,
    reviewed_at
  )
  values (
    p_match_id,
    p_sportdarts_game_id,
    p_actor,
    'applied',
    null,
    jsonb_build_object(
      'home_score', p_home_score,
      'away_score', p_away_score,
      'players', p_player_stats
    ),
    p_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'updated_players', v_updated,
    'inserted_players', v_inserted
  );
end;
$$;

revoke all on function public.apply_sportdarts_sync(uuid, integer, integer, jsonb, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.apply_sportdarts_sync(uuid, integer, integer, jsonb, uuid, integer)
  to service_role;
