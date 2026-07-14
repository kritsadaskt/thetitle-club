-- Admin approval only — no email verification step.
-- Run once in Supabase SQL Editor, then re-run handle_new_user_extended.sql.

alter table public.profiles
  alter column status set default 'pending_approval';

update public.profiles
set status = 'pending_approval'
where status = 'pending_verification';
