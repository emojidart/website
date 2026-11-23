-- Audit-only protected-account deletion confirmation. Never deletes or modifies any account.
create table if not exists public.protected_account_action_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid not null,
  event_type text not null check (event_type = 'protected_account_delete_confirmed'),
  outcome text not null default 'blocked_no_changes' check (outcome = 'blocked_no_changes'),
  session_id text,
  created_at timestamptz not null default now()
);

alter table public.protected_account_action_audit enable row level security;
revoke all on public.protected_account_action_audit from anon, authenticated, public;

create or replace function public.record_protected_account_delete_attempt(p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_event_id uuid;
begin
  if v_actor is null or not public.is_club_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_actor = p_target_user_id or not exists (
    select 1 from public.admin_superusers where user_id = p_target_user_id
  ) then
    raise exception 'Target is not a protected account' using errcode = '42501';
  end if;

  insert into public.protected_account_action_audit
    (actor_user_id, target_user_id, event_type, outcome, session_id)
  values
    (v_actor, p_target_user_id, 'protected_account_delete_confirmed', 'blocked_no_changes', auth.jwt() ->> 'session_id')
  returning id into v_event_id;
  return v_event_id;
end;
$$;

revoke all on function public.record_protected_account_delete_attempt(uuid) from public, anon;
grant execute on function public.record_protected_account_delete_attempt(uuid) to authenticated;

comment on table public.protected_account_action_audit is
  'Append-only protected account deletion attempt logs. No account deletion or lockout is performed.';
