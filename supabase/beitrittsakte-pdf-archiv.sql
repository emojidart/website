create table if not exists public.club_join_archives (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.club_join_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null,
  file_name text not null,
  storage_path text not null unique,
  sha256 text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null,
  constraint club_join_archives_stage_check check (stage in ('submitted','approved')),
  constraint club_join_archives_request_stage_key unique (request_id, stage)
);

create index if not exists club_join_archives_user_idx
  on public.club_join_archives(user_id, generated_at desc);

alter table public.club_join_archives enable row level security;

drop policy if exists "club_join_archives_select_own_or_admin" on public.club_join_archives;
create policy "club_join_archives_select_own_or_admin"
on public.club_join_archives
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and coalesce(up.is_admin, false) = true
  )
);

revoke insert, update, delete on public.club_join_archives from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-join-archives',
  'club-join-archives',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
