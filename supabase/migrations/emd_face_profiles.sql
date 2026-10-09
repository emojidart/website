-- Biometric templates: private by default. Never grant anonymous browser clients access.
create table if not exists public.emd_face_profiles (
 identity_kind text not null check (identity_kind in ('member','guest')),
 identity_id text not null,
 name text not null,
 player_id text,
 spieldatenbank_id text,
 photo_url text,
 vector jsonb not null check (jsonb_typeof(vector) = 'array' and jsonb_array_length(vector)=128),
 consented_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 primary key (identity_kind,identity_id)
);
alter table public.emd_face_profiles enable row level security;
revoke all on public.emd_face_profiles from public, anon, authenticated;
grant all on public.emd_face_profiles to service_role;
