-- Nach survival_einzel.sql und vor survival_single_atomic_actions.sql installieren.
-- Erweiterung ausschließlich für Survival Einzel; kein Eingriff in Doppel.
create table if not exists public.survival_single_tiebreaks (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.survival_single_tournaments(id) on delete cascade,
 stage_number integer not null,
 player1_id uuid not null references public.survival_single_players(id),
 player2_id uuid not null references public.survival_single_players(id),
 score1 integer, score2 integer,
 winner_id uuid references public.survival_single_players(id),
 status text not null default 'ready' check(status in ('ready','completed')),
 created_at timestamptz not null default now(),
 unique(tournament_id,stage_number),
 check(player1_id<>player2_id),
 check((status='ready' and score1 is null and score2 is null and winner_id is null)
 or (status='completed' and score1 is not null and score2 is not null and winner_id in (player1_id,player2_id)))
);
alter table public.survival_single_tiebreaks enable row level security;
-- Nur Lesen im Client; alle Schreibzugriffe durch atomare RPCs.
create policy single_tiebreak_owner_read on public.survival_single_tiebreaks
 for select to authenticated using(exists(select 1 from public.survival_single_tournaments t
 where t.id=tournament_id and t.created_by=(select auth.uid())));
revoke insert,update,delete on public.survival_single_tiebreaks from anon,authenticated;
grant select on public.survival_single_tiebreaks to authenticated;

create or replace function public.survival_single_prepare_tiebreak(p_tournament_id uuid,p_stage_number integer,p_player1 uuid,p_player2 uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare t public.survival_single_tournaments%rowtype; v_id uuid; v_count integer;
begin
 select * into t from public.survival_single_tournaments where id=p_tournament_id for update;
 if not found or t.created_by is distinct from auth.uid() or t.status<>'active' or t.stage_number<>p_stage_number or t.stage_round<2
 then raise exception 'Turnierstand ungültig oder kein Zugriff'; end if;
 if exists(select 1 from public.survival_single_matches where tournament_id=t.id and stage_number=t.stage_number and status<>'completed')
 then raise exception 'Rundenergebnisse fehlen'; end if;
 if p_player1=p_player2 or (select count(*) from public.survival_single_players where tournament_id=t.id and active and id in (p_player1,p_player2))<>2
 then raise exception 'Ungültige Spieler'; end if;
 -- Ausschließlich exakt gleichplatzierte Spieler dürfen gegeneinander stechen.
 with sc as (
 select sp.id,coalesce(sum(case when r.won then t.win_points when r.lf=t.legs_to_win-1 and r.la=t.legs_to_win then t.close_loss_points else 0 end),0)::int pts,
 coalesce(sum(r.lf-r.la),0)::int diff,coalesce(sum(r.lf),0)::int lf
 from public.survival_single_players sp left join lateral (
 select m.score1 lf,m.score2 la,m.score1>m.score2 won from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player1_id=sp.id
 union all select m.score2,m.score1,m.score2>m.score1 from public.survival_single_matches m where m.tournament_id=t.id and m.stage_number=t.stage_number and m.status='completed' and m.player2_id=sp.id
 ) r on true where sp.tournament_id=t.id and sp.active group by sp.id
 )
 select count(*) into v_count from sc a join sc b on a.id=p_player1 and b.id=p_player2 and a.pts=b.pts and a.diff=b.diff and a.lf=b.lf;
 if v_count<>1 then raise exception 'Stechen nur bei gleicher Wertung'; end if;
 insert into public.survival_single_tiebreaks(tournament_id,stage_number,player1_id,player2_id)
 values(t.id,t.stage_number,p_player1,p_player2)
 on conflict(tournament_id,stage_number) do nothing returning id into v_id;
 if v_id is null then raise exception 'Für diese Stage ist bereits ein Stechen angelegt'; end if;
 return v_id;
end; $$;

create or replace function public.survival_single_finish_tiebreak(p_id uuid,p_score1 integer,p_score2 integer)
returns void language plpgsql security invoker set search_path=public as $$
declare b public.survival_single_tiebreaks%rowtype; t public.survival_single_tournaments%rowtype;
begin
 select * into b from public.survival_single_tiebreaks where id=p_id for update;
 if not found then raise exception 'Stechen nicht gefunden'; end if;
 select * into t from public.survival_single_tournaments where id=b.tournament_id for update;
 if t.created_by is distinct from auth.uid() or t.status<>'active' or t.stage_number<>b.stage_number then raise exception 'Kein Zugriff oder Stage bereits beendet'; end if;
 if b.status='completed' then raise exception 'Stechen bereits abgeschlossen'; end if;
 if not ((p_score1=t.legs_to_win and p_score2 between 0 and t.legs_to_win-1) or (p_score2=t.legs_to_win and p_score1 between 0 and t.legs_to_win-1))
 then raise exception 'Ungültiges Stechergebnis'; end if;
 update public.survival_single_tiebreaks set score1=p_score1,score2=p_score2,
 winner_id=case when p_score1>p_score2 then b.player1_id else b.player2_id end,status='completed' where id=b.id;
end; $$;
revoke all on function public.survival_single_prepare_tiebreak(uuid,integer,uuid,uuid) from public,anon;
revoke all on function public.survival_single_finish_tiebreak(uuid,integer,integer) from public,anon;
grant execute on function public.survival_single_prepare_tiebreak(uuid,integer,uuid,uuid) to authenticated;
grant execute on function public.survival_single_finish_tiebreak(uuid,integer,integer) to authenticated;
