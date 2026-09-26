-- Bereits auf deinem Supabase-Projekt ausgeführt.
-- Nur als Dokumentation / für spätere Neuinstallationen.

create table if not exists public.club_join_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  title text not null,
  category text not null default 'other',
  version text not null default '1.0',
  is_required boolean not null default true,
  minors_only boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_join_documents_category_check
    check (category in ('application','statutes','confidentiality','privacy','guardian','other'))
);

create table if not exists public.club_join_settings (
  id text primary key default 'default',
  trial_enabled boolean not null default true,
  trial_duration_days integer not null default 90,
  trial_preset text not null default 'full',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint club_join_settings_duration_check check (trial_duration_days between 1 and 730),
  constraint club_join_settings_preset_check check (trial_preset in ('edart','steeldart','both','full'))
);

insert into public.club_join_settings(id) values ('default') on conflict (id) do nothing;

alter table public.club_join_requests
  add column if not exists trial_requested boolean not null default false,
  add column if not exists signature_data_url text,
  add column if not exists signed_at timestamptz,
  add column if not exists document_acceptances jsonb not null default '[]'::jsonb,
  add column if not exists documents_accepted_at timestamptz,
  add column if not exists guardian_full_name text,
  add column if not exists guardian_signature_data_url text,
  add column if not exists guardian_signed_at timestamptz,
  add column if not exists trial_granted_at timestamptz,
  add column if not exists trial_ends_on date;

alter table public.club_join_documents enable row level security;
alter table public.club_join_settings enable row level security;

-- RLS / Storage-Policies sind im Live-Projekt ebenfalls bereits gesetzt.
