create table if not exists public.emd_tv_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id text not null,
  tournament_type text not null,
  event_type text not null check (event_type in ('MATCH_STARTED', 'MATCH_FINISHED')),
  match_id integer not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists emd_tv_events_tournament_created_idx
  on public.emd_tv_events (tournament_id, tournament_type, created_at desc);

alter table public.emd_tv_events enable row level security;

drop policy if exists "emd_tv_events_read" on public.emd_tv_events;
create policy "emd_tv_events_read"
  on public.emd_tv_events
  for select
  to anon, authenticated
  using (true);

-- Events entstehen ausschließlich serverseitig über den Trigger auf dko_match_states.
create or replace function public.emit_emd_tv_match_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_machine integer;
  old_winner text;
begin
  old_machine := case when tg_op = 'UPDATE' then old.machine_number else null end;
  old_winner := case when tg_op = 'UPDATE' then old.winner else null end;

  if new.machine_number is not null
     and new.winner is null
     and old_machine is null then
    insert into public.emd_tv_events (
      tournament_id,
      tournament_type,
      event_type,
      match_id,
      payload
    ) values (
      new.tournament_id::text,
      new.tournament_type,
      'MATCH_STARTED',
      new.match_id,
      jsonb_build_object(
        'player1', new.player1,
        'player2', new.player2,
        'score1', coalesce(new.score1, 0),
        'score2', coalesce(new.score2, 0),
        'winner', new.winner,
        'loser', new.loser,
        'machine_number', new.machine_number
      )
    );
  end if;

  if new.winner is not null
     and old_winner is null then
    insert into public.emd_tv_events (
      tournament_id,
      tournament_type,
      event_type,
      match_id,
      payload
    ) values (
      new.tournament_id::text,
      new.tournament_type,
      'MATCH_FINISHED',
      new.match_id,
      jsonb_build_object(
        'player1', new.player1,
        'player2', new.player2,
        'score1', coalesce(new.score1, 0),
        'score2', coalesce(new.score2, 0),
        'winner', new.winner,
        'loser', new.loser,
        'machine_number', coalesce(old_machine, new.machine_number)
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_emit_emd_tv_match_event on public.dko_match_states;
create trigger trg_emit_emd_tv_match_event
after insert or update on public.dko_match_states
for each row execute function public.emit_emd_tv_match_event();

-- Alte TV-Ereignisse klein halten. Die App benötigt nur die letzten Sekunden/Minuten.
create or replace function public.cleanup_old_emd_tv_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.emd_tv_events where created_at < now() - interval '2 days';
$$;
