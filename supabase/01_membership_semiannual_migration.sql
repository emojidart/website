-- DartPilot / EMD Mitgliedschaft
-- Halbjährliche Abrechnung + klare Zahlungsregeln
-- Zuerst in Supabase SQL Editor ausführen, danach die neuen Dateien deployen.

begin;

-- 1) Eigene Halbjahrespreise je Modul.
alter table public.membership_modules
  add column if not exists semiannual_price numeric(10,2);

update public.membership_modules
set semiannual_price = round((annual_price / 2.0)::numeric, 2)
where semiannual_price is null;

alter table public.membership_modules
  alter column semiannual_price set not null;

-- 2) Snapshots für bestehende/beantragte Mitgliedschaften.
alter table public.member_membership_modules
  add column if not exists semiannual_price_snapshot numeric(10,2);

update public.member_membership_modules
set semiannual_price_snapshot = round((annual_price_snapshot / 2.0)::numeric, 2)
where semiannual_price_snapshot is null;

alter table public.member_membership_modules
  alter column semiannual_price_snapshot set not null;

alter table public.membership_change_request_modules
  add column if not exists semiannual_price_snapshot numeric(10,2);

update public.membership_change_request_modules
set semiannual_price_snapshot = round((annual_price_snapshot / 2.0)::numeric, 2)
where semiannual_price_snapshot is null;

alter table public.membership_change_request_modules
  alter column semiannual_price_snapshot set not null;

-- 3) Halbjahres-Gesamtsumme bei Anfragen.
alter table public.membership_change_requests
  add column if not exists semiannual_total numeric(10,2);

update public.membership_change_requests
set semiannual_total = round((annual_total / 2.0)::numeric, 2)
where semiannual_total is null;

alter table public.membership_change_requests
  alter column semiannual_total set not null;

-- 4) billing_cycle um semiannual erweitern.
alter table public.member_memberships
  drop constraint if exists member_memberships_billing_cycle_check;

alter table public.member_memberships
  add constraint member_memberships_billing_cycle_check
  check (billing_cycle in ('monthly', 'semiannual', 'annual'));

alter table public.membership_change_requests
  drop constraint if exists membership_change_requests_billing_cycle_check;

alter table public.membership_change_requests
  add constraint membership_change_requests_billing_cycle_check
  check (billing_cycle in ('monthly', 'semiannual', 'annual'));

-- 5) Harte Sicherheitsregel in der DB:
-- monatlich = nur Stripe
-- halbjährlich = nur Überweisung/Bar
-- jährlich = Stripe/Überweisung/Bar
alter table public.member_memberships
  drop constraint if exists member_memberships_billing_payment_compatibility_check;

alter table public.member_memberships
  add constraint member_memberships_billing_payment_compatibility_check
  check (
    (billing_cycle = 'monthly' and payment_method = 'stripe')
    or (billing_cycle = 'semiannual' and payment_method in ('transfer', 'cash'))
    or (billing_cycle = 'annual' and payment_method in ('stripe', 'transfer', 'cash'))
  );

alter table public.membership_change_requests
  drop constraint if exists membership_change_requests_billing_payment_compatibility_check;

alter table public.membership_change_requests
  add constraint membership_change_requests_billing_payment_compatibility_check
  check (
    (billing_cycle = 'monthly' and payment_method = 'stripe')
    or (billing_cycle = 'semiannual' and payment_method in ('transfer', 'cash'))
    or (billing_cycle = 'annual' and payment_method in ('stripe', 'transfer', 'cash'))
  );

commit;
