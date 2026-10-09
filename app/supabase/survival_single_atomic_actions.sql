-- Nur nach survival_einzel.sql in einer Testdatenbank ausführen.
-- Eigene Einzel-Tabellen, keine Änderung an Survival Doppel.
create or replace function public.survival_single_draw_round(
 p_tournament_id uuid, p_expected_round integer, p_expected_stage integer,
 p_expected_stage_round integer, p_pairs jsonb)
returns integer language plpgsql security invoker set search_path = public as $$
declare t public.survival_single_tournaments%rowtype;
 v_count integer; v_pair_count integer; v_covered integer;
begin
 select * into t from public.survival_single_tournaments where id=p_tournament_id for update;
 if not found or t.created_by is distinct from auth.uid() then raise exception 'Kein Zugriff auf das Turnier'; end if;
 if t.status<>'active' or t.round_number<>p_expected_round or t.stage_number<>p_expected_stage or t.stage_round<>p_expected_stage_round then raise exception 'Turnierstand geändert, bitte neu laden'; end if;
 if t.round_number>0 and exists(select 1 from public.survival_single_matches where tournament_id=t.id and round_number=t.round_number and status<>'completed') then raise exception 'Ergebnisse der Runde fehlen'; end if;
 select count(*) into v_count from public.survival_single_players where tournament_id=t.id and active;
 if v_count<2 or mod(v_count,2)<>0 then raise exception 'Gerade Spielerzahl erforderlich'; end if;
 if (v_count=2 and t.stage_round>=1) or (v_count>2 and t.stage_round>=2) then raise exception 'Zuerst Finale abschließen oder Cut durchführen'; end if;
 if jsonb_typeof(p_pairs)<>'array' then raise exception 'Paarungen fehlen'; end if;
 select count(*) into v_pair_count from jsonb_array_elements(p_pairs);
 if v_pair_count<>v_count/2 then raise exception 'Unvollständige Auslosung'; end if;
 with ids as (
 select (p->>'a')::uuid as pid from jsonb_array_elements(p_pairs) p
 union all select (p->>'b')::uuid from jsonb_array_elements(p_pairs) p
 ) select count(*),count(distinct pid) into v_covered,v_pair_count from ids
 join public.survival_single_players sp on sp.id=ids.pid and sp.tournament_id=t.id and sp.active;
 if v_covered<>v_count or v_pair_count<>v_count then raise exception 'Auslosung enthält fehlende, doppelte oder ausgeschiedene Spieler'; end if;
 insert into public.survival_single_matches(tournament_id,round_number,stage_number,board_number,player1_id,player2_id)
 select t.id,t.round_number+1,t.stage_number,ord::int,(p->>'a')::uuid,(p->>'b')::uuid
 from jsonb_array_elements(p_pairs) with ordinality as x(p,ord);
 update public.survival_single_tournaments set round_number=round_number+1,stage_round=stage_round+1,updated_at=now() where id=t.id;
 return t.round_number+1;
end; $$;

create or replace function public.survival_single_save_score(p_match_id uuid,p_score1 integer,p_score2 integer)
returns void language plpgsql security invoker set search_path=public as $$
declare m public.survival_single_matches%rowtype; t public.survival_single_tournaments%rowtype;
begin
 select * into m from public.survival_single_matches where id=p_match_id for update;
 if not found then raise exception 'Match nicht gefunden'; end if;
 select * into t from public.survival_single_tournaments where id=m.tournament_id for update;
 if not found or t.created_by is distinct from auth.uid() or t.status<>'active' then raise exception 'Turnier nicht aktiv oder kein Zugriff'; end if;
 if m.round_number<>t.round_number then raise exception 'Nur aktuelle Runde korrigierbar'; end if;
 if not ((p_score1=t.legs_to_win and p_score2 between 0 and t.legs_to_win-1) or (p_score2=t.legs_to_win and p_score1 between 0 and t.legs_to_win-1)) then raise exception 'Ungültiges Leg-Ergebnis'; end if;
 update public.survival_single_matches set score1=p_score1,score2=p_score2,status='completed',updated_at=now() where id=m.id;
end; $$;

create or replace function public.survival_single_apply_cut(p_tournament_id uuid,p_expected_stage integer,p_qualified uuid[])
returns void language plpgsql security invoker set search_path=public as $$
declare
 t public.survival_single_tournaments%rowtype;
 v_total integer; v_count integer; v_matches integer;
 v_boundary_points integer; v_boundary_diff integer; v_boundary_legs integer;
 v_better integer; v_tied uuid[]; v_expected uuid[]; v_tie_winner uuid;
begin
 select * into t from public.survival_single_tournaments where id=p_tournament_id for update;
 if not found or t.created_by is distinct from auth.uid() or t.status<>'active' or t.stage_number<>p_expected_stage
 then raise exception 'Turnierstand geändert oder kein Zugriff'; end if;
 if t.stage_round<2 then raise exception 'Mindestens zwei Runden vor Cut'; end if;
 select count(*) into v_total from public.survival_single_players where tournament_id=t.id and active;
 v_count=cardinality(p_qualified);
 if v_count is null or v_count<2 or v_count>=v_total or mod(v_count,2)<>0
 then raise exception 'Ungültige Cut-Größe'; end if;
 if (select count(distinct x) from unnest(p_qualified) x)<>v_count
 then raise exception 'Doppelte oder fehlende Qualifizierte'; end if;
 if (select count(*) from public.survival_single_players where tournament_id=t.id and active and id=any(p_qualified))<>v_count
 then raise exception 'Ungültige Qualifizierte'; end if;
 if exists(select 1 from public.survival_single_matches where tournament_id=t.id and stage_number=t.stage_number and status<>'completed')
 then raise exception 'Nicht alle Ergebnisse eingetragen'; end if;
 select count(*) into v_matches from public.survival_single_matches where tournament_id=t.id and stage_number=t.stage_number;
 if v_matches<>v_total*t.stage_round/2 then raise exception 'Unvollständige Stage'; end if;
 -- Die Berechnung kommt ausschließlich aus gespeicherten Matches, nicht aus der Benutzeroberfläche.
 with scoring as (
 select sp.id,coalesce(sum(case when x.won then t.win_points when x.lf=t.legs_to_win-1 and x.la=t.legs_to_win then t.close_loss_points else 0 end),0)::int pts,
 coalesce(sum(x.lf-x.la),0)::int dif,coalesce(sum(x.lf),0)::int lf
 from public.survival_single_players sp left join lateral (
 select m.score1 lf,m.score2 la,m.score1>m.score2 won from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player1_id=sp.id
 union all select m.score2,m.score1,m.score2>m.score1 from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player2_id=sp.id
 ) x on true where sp.tournament_id=t.id and sp.active group by sp.id
 ), ordered as (select *,row_number() over(order by pts desc,dif desc,lf desc,id) pos from scoring), boundary as (select pts,dif,lf from ordered where pos=v_count)
 select pts,dif,lf into v_boundary_points,v_boundary_diff,v_boundary_legs from boundary;
 if not found then raise exception 'Cut-Grenze nicht gefunden'; end if;
 -- Die lexikografische Rangfolge muss beim Vergleich Punkte > Differenz > Legs bleiben.
 with scoring as (
 select sp.id,coalesce(sum(case when x.won then t.win_points when x.lf=t.legs_to_win-1 and x.la=t.legs_to_win then t.close_loss_points else 0 end),0)::int pts,
 coalesce(sum(x.lf-x.la),0)::int dif,coalesce(sum(x.lf),0)::int lf
 from public.survival_single_players sp left join lateral (
 select m.score1 lf,m.score2 la,m.score1>m.score2 won from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player1_id=sp.id
 union all select m.score2,m.score1,m.score2>m.score1 from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player2_id=sp.id
 ) x on true where sp.tournament_id=t.id and sp.active group by sp.id
 )
 select count(*) filter (where pts>v_boundary_points or (pts=v_boundary_points and dif>v_boundary_diff) or (pts=v_boundary_points and dif=v_boundary_diff and lf>v_boundary_legs)),
       array_agg(id order by id) filter (where pts=v_boundary_points and dif=v_boundary_diff and lf=v_boundary_legs)
 into v_better, v_tied from scoring;
 if v_tied is null or cardinality(v_tied)=0 then raise exception 'Cut-Grenze ohne Spieler'; end if;
 if v_better+cardinality(v_tied)>v_count then
   if cardinality(v_tied)<>2 or v_better<>v_count-1
   then raise exception 'Mehrspieler-Stechen oder mehrere offene Cut-Plätze: Cut gesperrt'; end if;
   select tb.winner_id into v_tie_winner from public.survival_single_tiebreaks tb
   where tb.tournament_id=t.id and tb.stage_number=t.stage_number and tb.status='completed'
    and tb.player1_id=any(v_tied) and tb.player2_id=any(v_tied) and tb.winner_id=any(v_tied);
   if v_tie_winner is null then raise exception 'Gleichstand am Cut: Stechspiel zuerst abschließen'; end if;
 end if;
 with scoring as (
 select sp.id,coalesce(sum(case when x.won then t.win_points when x.lf=t.legs_to_win-1 and x.la=t.legs_to_win then t.close_loss_points else 0 end),0)::int pts,
 coalesce(sum(x.lf-x.la),0)::int dif,coalesce(sum(x.lf),0)::int lf
 from public.survival_single_players sp left join lateral (
 select m.score1 lf,m.score2 la,m.score1>m.score2 won from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player1_id=sp.id
 union all select m.score2,m.score1,m.score2>m.score1 from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player2_id=sp.id
 ) x on true where sp.tournament_id=t.id and sp.active group by sp.id
 ), ranked as (
 select id,row_number() over(order by pts desc,dif desc,lf desc,
 case when id=v_tie_winner then 0 else 1 end,id) position from scoring
 ) select array_agg(id order by position) into v_expected from ranked where position<=v_count;
 if (select array_agg(x order by x) from unnest(v_expected) x) is distinct from (select array_agg(x order by x) from unnest(p_qualified) x)
 then raise exception 'Cut-Auswahl entspricht nicht der gespeicherten Rangliste'; end if;
 insert into public.survival_single_cuts(tournament_id,stage_number,qualified_ids) values (t.id,t.stage_number,p_qualified);
 update public.survival_single_players set active=false where tournament_id=t.id and active and not(id=any(p_qualified));
 update public.survival_single_tournaments set stage_number=stage_number+1,stage_round=0,updated_at=now() where id=t.id;
end; $$;

create or replace function public.survival_single_finish(p_tournament_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare t public.survival_single_tournaments%rowtype; v_count int;
begin
 select * into t from public.survival_single_tournaments where id=p_tournament_id for update;
 if not found or t.created_by is distinct from auth.uid() or t.status<>'active' then raise exception 'Turnier nicht aktiv oder kein Zugriff'; end if;
 select count(*) into v_count from public.survival_single_players where tournament_id=t.id and active;
 if v_count<>2 or t.stage_round<>1 then raise exception 'Finale fehlt'; end if;
 if (select count(*) from public.survival_single_matches where tournament_id=t.id and round_number=t.round_number and status='completed')<>1 then raise exception 'Finalergebnis fehlt'; end if;
 update public.survival_single_tournaments set status='completed',updated_at=now() where id=t.id;
end; $$;

revoke all on function public.survival_single_draw_round(uuid,integer,integer,integer,jsonb) from public,anon;
revoke all on function public.survival_single_save_score(uuid,integer,integer) from public,anon;
revoke all on function public.survival_single_apply_cut(uuid,integer,uuid[]) from public,anon;
revoke all on function public.survival_single_finish(uuid) from public,anon;
grant execute on function public.survival_single_draw_round(uuid,integer,integer,integer,jsonb) to authenticated;
grant execute on function public.survival_single_save_score(uuid,integer,integer) to authenticated;
grant execute on function public.survival_single_apply_cut(uuid,integer,uuid[]) to authenticated;
grant execute on function public.survival_single_finish(uuid) to authenticated;
