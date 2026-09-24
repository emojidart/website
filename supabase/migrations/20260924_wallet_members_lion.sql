-- EMD Wallet Phase 1: Stripe Guthaben + Members/Lion Cup Zuordnung
-- Noch NICHT automatisch angewendet. Erst prüfen, dann in Supabase als Migration ausführen.

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.club_players(id) on delete cascade,
  credit_amount numeric(10,2) not null check (credit_amount > 0),
  fee_charged numeric(10,2) not null default 0,
  gross_amount numeric(10,2) not null check (gross_amount > 0),
  actual_stripe_fee numeric(10,2),
  actual_stripe_net numeric(10,2),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_event_id text unique,
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.credit_transactions
  add column if not exists series_id uuid,
  add column if not exists event_id uuid,
  add column if not exists series_name text,
  add column if not exists event_name text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists wallet_topup_id uuid,
  add column if not exists payment_source text;

alter table public.dko_tournament_registration
  add column if not exists series_id uuid,
  add column if not exists event_id uuid,
  add column if not exists series_name text,
  add column if not exists event_name text;

create index if not exists idx_credit_transactions_series_event on public.credit_transactions(series_id,event_id);
create index if not exists idx_dko_registration_series_event_player on public.dko_tournament_registration(series_id,event_id,player_id);
create unique index if not exists uq_wallet_topup_checkout on public.wallet_topups(stripe_checkout_session_id) where stripe_checkout_session_id is not null;

create or replace function public.apply_wallet_topup(
  p_topup_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_actual_fee numeric,
  p_actual_net numeric,
  p_stripe_event_id text
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topup public.wallet_topups%rowtype;
  v_balance numeric(10,2);
begin
  select * into v_topup
  from public.wallet_topups
  where id = p_topup_id
  for update;

  if not found then raise exception 'Topup nicht gefunden'; end if;
  if v_topup.status = 'paid' then
    select credit_balance into v_balance from public.player_credits where player_id=v_topup.player_id;
    return coalesce(v_balance,0);
  end if;

  insert into public.player_credits(player_id,credit_balance)
  values(v_topup.player_id,0)
  on conflict (player_id) do nothing;

  select credit_balance into v_balance
  from public.player_credits
  where player_id=v_topup.player_id
  for update;

  v_balance := coalesce(v_balance,0) + v_topup.credit_amount;

  update public.player_credits
  set credit_balance=v_balance, updated_at=now()
  where player_id=v_topup.player_id;

  insert into public.credit_transactions(
    player_id, amount, balance_after, transaction_type, admin_id,
    stripe_checkout_session_id, stripe_payment_intent_id, wallet_topup_id, payment_source
  ) values (
    v_topup.player_id, v_topup.credit_amount, v_balance, 'credit_added', null,
    p_checkout_session_id, p_payment_intent_id, v_topup.id, 'stripe'
  );

  update public.wallet_topups
  set status='paid', paid_at=now(), updated_at=now(),
      stripe_checkout_session_id=p_checkout_session_id,
      stripe_payment_intent_id=p_payment_intent_id,
      stripe_event_id=p_stripe_event_id,
      actual_stripe_fee=p_actual_fee,
      actual_stripe_net=p_actual_net
  where id=v_topup.id;

  return v_balance;
end;
$$;

create or replace function public.register_dko_with_credit(
  p_credit_player_id uuid,
  p_registration_player_id uuid,
  p_player_name text,
  p_series_id uuid,
  p_event_id uuid,
  p_fee numeric
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series public.dko_series%rowtype;
  v_event public.dko_series_events%rowtype;
  v_balance numeric(10,2);
begin
  select * into v_series from public.dko_series where id=p_series_id;
  if not found or v_series.series_type not in ('members_cup','lion_cup') then
    raise exception 'Nur Members Cup und Lion Cup sind für Guthabenzahlung freigeschaltet';
  end if;

  select * into v_event from public.dko_series_events where id=p_event_id and series_id=p_series_id;
  if not found then raise exception 'Turniertermin nicht gefunden'; end if;

  if exists(select 1 from public.dko_tournament_registration where player_id=p_registration_player_id and event_id=p_event_id) then
    raise exception 'Du bist bereits für diesen Spieltag angemeldet';
  end if;

  insert into public.player_credits(player_id,credit_balance)
  values(p_credit_player_id,0)
  on conflict (player_id) do nothing;

  select credit_balance into v_balance
  from public.player_credits where player_id=p_credit_player_id for update;

  if coalesce(v_balance,0) < p_fee or p_fee <= 0 then
    raise exception 'Nicht genügend Guthaben';
  end if;

  v_balance := v_balance - p_fee;

  insert into public.dko_tournament_registration(
    player_id, player_name, paid, entry_fee, deducted_from_credit, payment_method,
    series_id, event_id, series_name, event_name
  ) values (
    p_registration_player_id, p_player_name, true, p_fee, true, 'credit',
    p_series_id, p_event_id, v_series.name, coalesce(v_event.title,v_series.name)
  );

  update public.player_credits set credit_balance=v_balance, updated_at=now() where player_id=p_credit_player_id;

  insert into public.credit_transactions(
    player_id, amount, balance_after, transaction_type, admin_id,
    series_id,event_id,series_name,event_name,payment_source
  ) values (
    p_credit_player_id,-p_fee,v_balance,'tournament_entry_fee',null,
    p_series_id,p_event_id,v_series.name,coalesce(v_event.title,v_series.name),'credit'
  );

  return v_balance;
end;
$$;

create or replace function public.unregister_dko_with_credit(
  p_credit_player_id uuid,
  p_registration_player_id uuid,
  p_event_id uuid
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.dko_tournament_registration%rowtype;
  v_balance numeric(10,2);
begin
  select * into v_reg
  from public.dko_tournament_registration
  where player_id=p_registration_player_id and event_id=p_event_id
  order by created_at desc nulls last
  limit 1
  for update;

  if not found then raise exception 'Anmeldung nicht gefunden'; end if;
  if v_reg.payment_method <> 'credit' then raise exception 'Diese Anmeldung wurde nicht mit Guthaben bezahlt'; end if;

  select credit_balance into v_balance
  from public.player_credits where player_id=p_credit_player_id for update;

  v_balance := coalesce(v_balance,0) + coalesce(v_reg.entry_fee,0);

  delete from public.dko_tournament_registration where id=v_reg.id;
  update public.player_credits set credit_balance=v_balance, updated_at=now() where player_id=p_credit_player_id;

  insert into public.credit_transactions(
    player_id,amount,balance_after,transaction_type,admin_id,
    series_id,event_id,series_name,event_name,payment_source
  ) values (
    p_credit_player_id,coalesce(v_reg.entry_fee,0),v_balance,'tournament_refund',null,
    v_reg.series_id,v_reg.event_id,v_reg.series_name,v_reg.event_name,'credit'
  );

  return v_balance;
end;
$$;
