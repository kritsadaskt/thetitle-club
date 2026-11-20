-- ============================================================
--  Auto-approve on signup (server-side) + lock privileged profile columns
--  Fixes UAT C1: members could set is_admin / status on their own row.
--
--  Behaviour after this script:
--    • New signups become 'active' immediately (no admin approval) — set by the DB trigger,
--      not by the browser.
--    • Members can still edit their own personal fields (name, phone, whatsapp, gender, age,
--      nationality, resident_status, project_name, house_number).
--    • Members can NOT change: is_admin, status, approved_at, approved_by, member_id,
--      qr_token, email, created_at. Attempts are silently reverted (so older frontend builds
--      that still send these fields keep working).
--    • Admins (is_profile_admin()) and server-side/service-role/SQL-editor calls (auth.uid() is null)
--      are not restricted — approve / reject / suspend still work.
--
--  Run in: Supabase SQL Editor (try on a branch/staging first). Safe to re-run.
-- ============================================================

-- 1) Signup trigger: create the profile as 'active' right away
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, gender, age, nationality, phone, whatsapp,
    resident_status, project_name, house_number, status, approved_at
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when new.raw_user_meta_data->>'gender' in ('male', 'female', 'other')
         then (new.raw_user_meta_data->>'gender')::gender_type end,
    case when (new.raw_user_meta_data->>'age') ~ '^[0-9]+$'
         then (new.raw_user_meta_data->>'age')::smallint end,
    nullif(trim(new.raw_user_meta_data->>'nationality'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(trim(new.raw_user_meta_data->>'whatsapp'), ''),
    case when new.raw_user_meta_data->>'resident_status' in ('owner', 'tenant')
         then (new.raw_user_meta_data->>'resident_status')::resident_status end,
    nullif(trim(new.raw_user_meta_data->>'project_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'house_number'), ''),
    'active',
    now()
  );
  return new;
end;
$$;

alter table public.profiles alter column status set default 'active';

-- 2) Guard trigger: members cannot touch privileged columns
create or replace function public.protect_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Server-side (service role, SQL editor, auth trigger) or admin: no restriction
  if auth.uid() is null or public.is_profile_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Self-insert fallback (ensure_my_profile / client insert): auto-approved, never admin
    new.is_admin    := false;
    new.status      := 'active';
    new.approved_at := now();
    new.approved_by := null;
    new.member_id   := generate_member_id();
    new.qr_token    := gen_random_uuid()::text;
    new.created_at  := now();
    new.email       := (select u.email from auth.users u where u.id = new.id);
    return new;
  end if;

  -- UPDATE by a regular member: keep protected values from the existing row
  new.is_admin    := old.is_admin;
  new.status      := old.status;       -- rejected/suspended members cannot re-activate themselves
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.member_id   := old.member_id;
  new.qr_token    := old.qr_token;
  new.email       := old.email;        -- email is used for outgoing mail; change via Auth only
  new.created_at  := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_cols();

-- 3) Trigger functions must not be callable as RPC
revoke execute on function public.protect_profile_privileged_cols() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 4) Verify (read-only) — expect 0 rows unless an admin is intentional
-- select id, email, member_id, created_at from public.profiles where is_admin;
