-- Allow the restricted verification account to log a protected-account attempt
-- without granting any real admin privilege.
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
  if v_actor is null or (
    v_actor <> '354976cd-1790-4923-8b79-d763cc1a25a7'::uuid
    and not public.is_club_admin()
  ) then
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

-- Server-side enforcement: regular users or administrators cannot alter an is_admin flag.
create or replace function public.prevent_unprivileged_admin_flag_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and not public.is_super_admin()
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user <> 'postgres'
  then
    raise exception 'Only a superadministrator may change admin status'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_unprivileged_admin_flag_updates on public.user_profiles;
create trigger prevent_unprivileged_admin_flag_updates
before update of is_admin on public.user_profiles
for each row
execute function public.prevent_unprivileged_admin_flag_updates();
