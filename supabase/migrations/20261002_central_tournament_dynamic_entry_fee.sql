-- Zentrale Turnieranmeldung: dynamisches Startgeld + Guthabenzahlung
-- Bereits auf der Live-Datenbank angewendet.

alter table public.central_tournament_registrations
  add column if not exists entry_fee numeric not null default 0,
  add column if not exists payment_method text null,
  add column if not exists deducted_from_credit boolean not null default false,
  add column if not exists credit_transaction_id uuid null;

-- Die Funktionen central_tournament_register_member(uuid,text)
-- und central_tournament_unregister_member(uuid) laufen SECURITY DEFINER.
-- Sie lesen das Startgeld immer direkt aus central_tournament_events.entry_fee,
-- buchen Guthaben atomar ab bzw. bei Abmeldung wieder gut und speichern
-- die Zahlungsart direkt an der zentralen Turnieranmeldung.
