-- Fixes: SET is not allowed in a non-volatile function
-- Replaces is_profile_admin / profile_is_active_member with VOLATILE (required for SET LOCAL row_security).
-- Run in Supabase SQL Editor if you already applied fix_profiles_rls_recursion.sql with STABLE.

create or replace function public.is_profile_admin()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  set local row_security = off;
  return coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
end;
$$;

create or replace function public.profile_is_active_member()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  set local row_security = off;
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'::member_status
  );
end;
$$;

revoke all on function public.is_profile_admin() from public;
revoke all on function public.profile_is_active_member() from public;
grant execute on function public.is_profile_admin() to anon, authenticated;
grant execute on function public.profile_is_active_member() to anon, authenticated;
