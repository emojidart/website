-- Eigenständiges Survival Einzel Roulette; verändert keine Doppel-Tabellen.
create table if not exists public.survival_single_tournaments (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id),
 central_event_id uuid unique references public.central_tournament_events(id),
 name text not null default 'Survival Einzel Roulette', status text not null default 'active'
 check (status in ('active','completed','cancelled')),
 legs_to_win int not null default 3 check (legs_to_win in (2,3,4)),
 win_points int not null default 3 check (win_points>0),
 close_loss_points int not null default 1 check (close_loss_points>=0),
 round_number int not null default 0 check (round_number>=0),
 stage_number int not null default 1 check (stage_number>=1),
 stage_round int not null default 0 check (stage_round>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.survival_single_players (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.survival_single_tournaments(id) on delete cascade,
 player_id text not null, player_name text not null, active boolean not null default true,
 unique(tournament_id,player_id), unique(tournament_id,id));
create table if not exists public.survival_single_matches (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.survival_single_tournaments(id) on delete cascade,
 round_number int not null check(round_number>0), stage_number int not null check(stage_number>0),
 board_number int not null check(board_number>0),
 player1_id uuid not null, player2_id uuid not null, score1 int, score2 int,
 status text not null default 'ready' check(status in ('ready','completed')),
 updated_at timestamptz not null default now(),
 constraint single_distinct_players check(player1_id<>player2_id),
 constraint single_score_consistency check((status='ready' and score1 is null and score2 is null) or (status='completed' and score1 is not null and score2 is not null and score1<>score2 and least(score1,score2)>=0)),
 foreign key(tournament_id,player1_id) references public.survival_single_players(tournament_id,id),
 foreign key(tournament_id,player2_id) references public.survival_single_players(tournament_id,id),
 unique(tournament_id,round_number,board_number));
create table if not exists public.survival_single_cuts (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.survival_single_tournaments(id) on delete cascade,
 stage_number int not null, qualified_ids uuid[] not null,
 created_at timestamptz not null default now(), unique(tournament_id,stage_number));
create index if not exists single_match_tournament_idx on public.survival_single_matches(tournament_id,round_number);
create index if not exists single_players_tournament_idx on public.survival_single_players(tournament_id);
alter table public.survival_single_tournaments enable row level security;
alter table public.survival_single_players enable row level security;
alter table public.survival_single_matches enable row level security;
alter table public.survival_single_cuts enable row level security;
-- Benutzer müssen Eigentümer des konkreten Turniers sein.
create policy single_owner_t on public.survival_single_tournaments for all to authenticated using(created_by=(select auth.uid())) with check(created_by=(select auth.uid()));
create policy single_owner_p on public.survival_single_players for all to authenticated using(exists(select 1 from public.survival_single_tournaments t where t.id=tournament_id and t.created_by=(select auth.uid()))) with check(exists(select 1 from public.survival_single_tournaments t where t.id=tournament_id and t.created_by=(select auth.uid())));
create policy single_owner_m on public.survival_single_matches for all to authenticated using(exists(select 1 from public.survival_single_tournaments t where t.id=tournament_id and t.created_by=(select auth.uid()))) with check(exists(select 1 from public.survival_single_tournaments t where t.id=tournament_id and t.created_by=(select auth.uid())));
create policy single_owner_c on public.survival_single_cuts for all to authenticated using(exists(select 1 from public.survival_single_tournaments t where t.id=tournament_id and t.created_by=(select auth.uid()))) with check(exists(select 1 from public.survival_single_tournaments t where t.id=tournament_id and t.created_by=(select auth.uid())));
-- Dies ist absichtlich KEINE Live-Migration: erst SQL prüfen und in Testumgebung einspielen.
