-- REVIEW ONLY: do not apply until RLS/admin policies and runtime integration are tested.
-- No existing registration/payment table is modified or cleared.
CREATE TABLE IF NOT EXISTS public.emd_dko_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_event_id uuid NOT NULL REFERENCES public.central_tournament_events(id) ON DELETE CASCADE,
  division text NOT NULL CHECK (division IN ('open','herren','damen')),
  title text NOT NULL,
  machine_allocation text NOT NULL DEFAULT 'shared' CHECK (machine_allocation IN ('shared','restricted')),
  allowed_machine_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(central_event_id, division)
);
CREATE TABLE IF NOT EXISTS public.emd_dko_division_entries (
  division_id uuid NOT NULL REFERENCES public.emd_dko_divisions(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.central_tournament_registrations(id) ON DELETE CASCADE,
  PRIMARY KEY (division_id, registration_id),
  UNIQUE(registration_id)
);
CREATE TABLE IF NOT EXISTS public.emd_dko_division_runs (
  division_id uuid NOT NULL REFERENCES public.emd_dko_divisions(id) ON DELETE CASCADE,
  tournament_id text NOT NULL,
  PRIMARY KEY(division_id, tournament_id),
  UNIQUE(tournament_id)
);
ALTER TABLE public.emd_dko_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emd_dko_division_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emd_dko_division_runs ENABLE ROW LEVEL SECURITY;
-- Intentionally no permissive grants/policies: must integrate established admin authorization first.
