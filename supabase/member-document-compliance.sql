alter table public.club_join_settings
  add column if not exists documents_enabled boolean not null default false,
  add column if not exists existing_members_must_accept boolean not null default false;

create table if not exists public.member_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.club_players(id) on delete cascade,
  document_acceptances jsonb not null default '[]'::jsonb,
  signature_data_url text not null,
  signed_at timestamptz not null default now(),
  guardian_full_name text,
  guardian_signature_data_url text,
  guardian_signed_at timestamptz,
  archive_file_name text,
  archive_storage_path text,
  archive_sha256 text,
  created_at timestamptz not null default now()
);

create index if not exists member_document_acceptances_user_created_idx
  on public.member_document_acceptances(user_id, created_at desc);
create index if not exists member_document_acceptances_player_created_idx
  on public.member_document_acceptances(player_id, created_at desc);

alter table public.member_document_acceptances enable row level security;

drop policy if exists "member_document_acceptances_read_own_or_admin" on public.member_document_acceptances;
create policy "member_document_acceptances_read_own_or_admin"
on public.member_document_acceptances for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_profiles up
    where up.user_id = auth.uid() and coalesce(up.is_admin,false) = true
  )
);

revoke insert, update, delete on public.member_document_acceptances from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-document-archives','member-document-archives',false,10485760,array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
