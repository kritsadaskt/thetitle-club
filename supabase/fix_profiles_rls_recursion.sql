-- Fixes: ERROR: infinite recursion detected in policy for relation "profiles" (42P17)
-- Cause: policies that use EXISTS (SELECT ... FROM profiles ...) re-evaluate RLS on profiles.
-- Run this entire script in Supabase SQL Editor.

-- 1) Helper functions (bypass RLS only inside these definer functions)
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

-- 2) Drop policies that recurse (names must match schema.sql)
drop policy if exists "admins: read all profiles" on public.profiles;
drop policy if exists "admins: update all profiles" on public.profiles;
drop policy if exists "active members: read active privileges" on public.privileges;
drop policy if exists "admins: all privileges" on public.privileges;
drop policy if exists "admins: read all redemptions" on public.redemption_logs;
drop policy if exists "active members: read published moments" on public.community_moments;
drop policy if exists "admins: all community moments" on public.community_moments;

-- 3) Recreate without subqueries on profiles
create policy "admins: read all profiles"
  on public.profiles for select
  using (public.is_profile_admin());

create policy "admins: update all profiles"
  on public.profiles for update
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

create policy "active members: read active privileges"
  on public.privileges for select
  using (
    is_active = true
    and public.profile_is_active_member()
  );

create policy "admins: all privileges"
  on public.privileges for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

create policy "admins: read all redemptions"
  on public.redemption_logs for select
  using (public.is_profile_admin());

create policy "active members: read published moments"
  on public.community_moments for select
  using (
    is_published = true
    and public.profile_is_active_member()
  );

create policy "admins: all community moments"
  on public.community_moments for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());
