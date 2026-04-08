-- Optional standalone: same function is included at the end of profiles_email_insert_policy.sql
-- Run in Supabase SQL Editor after profiles exists (e.g. if you already ran the policy file without this RPC).
-- Creates a reliable profile row for the logged-in user even when client INSERT is blocked by RLS.

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
