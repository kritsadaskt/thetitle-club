-- Run once in Supabase SQL Editor (fixes missing profile rows + adds email on profiles).
-- 1) Stores auth email on profiles for admin UI / display
-- 2) Allows authenticated users to INSERT their own row if the signup trigger did not run

alter table public.profiles add column if not exists email text;

-- Backfill from auth.users (safe to re-run)
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

-- Let logged-in users create their own profile if missing (e.g. legacy auth user, failed trigger)
drop policy if exists "members: insert own profile" on public.profiles;
create policy "members: insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Reliable profile creation (bypasses RLS). App calls public.ensure_my_profile via RPC.
create or replace function public.ensure_my_profile(p_full_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, full_name)
  values (
    uid,
    coalesce(nullif(trim(p_full_name), ''), 'Member')
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_my_profile(text) from public;
grant execute on function public.ensure_my_profile(text) to authenticated;
