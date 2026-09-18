-- OPTIONAL: erst ausführen, wenn Tolga/Andrea wieder selbst buchen sollen.
-- Bereinigt NUR aktive "Stripe"-Mitgliedschaften, die vom Admin angelegt wurden,
-- aber nie eine echte Stripe Customer/Subscription/Checkout-ID erhalten haben.

begin;

create temporary table _broken_admin_stripe_players as
select distinct player_id
from public.member_memberships
where status = 'active'
  and payment_method = 'stripe'
  and stripe_customer_id is null
  and stripe_subscription_id is null
  and stripe_checkout_session_id is null
  and coalesce(note, '') ilike '%Admin-Mitgliedschaftsverwaltung%';

update public.member_memberships
set
  status = 'cancelled',
  ends_on = current_date,
  updated_at = now(),
  note = concat_ws(' | ', note, 'Bereinigt: Admin-Stripe ohne echte Stripe-Zahlung')
where player_id in (select player_id from _broken_admin_stripe_players)
  and status = 'active'
  and payment_method = 'stripe'
  and stripe_customer_id is null
  and stripe_subscription_id is null
  and stripe_checkout_session_id is null;

-- Damit ein zuvor beendeter Test nicht weiter die Selbstbuchung blockiert.
-- Nur Spieler aus der obigen eindeutig fehlerhaften Gruppe werden betroffen.
update public.membership_trials
set status = 'cancelled', updated_at = now()
where player_id in (select player_id from _broken_admin_stripe_players)
  and status = 'active';

commit;
