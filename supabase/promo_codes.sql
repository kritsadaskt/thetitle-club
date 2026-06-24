-- ============================================================
--  THE TITLE CLUB — Promo Codes (unique pool + shared mode)
--  Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Enum-like types ─────────────────────────────────────────
do $$ begin
  create type promo_code_status as enum ('available', 'claimed', 'redeemed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type privilege_code_mode as enum ('shared', 'unique_pool');
exception when duplicate_object then null;
end $$;

-- ── privileges.code_mode ────────────────────────────────────
alter table public.privileges
  add column if not exists code_mode privilege_code_mode not null default 'shared';

comment on column public.privileges.code_mode is
  'shared = same privilege_code for all members; unique_pool = per-member codes from promo_codes table';

-- ── promo_codes table ───────────────────────────────────────
create table if not exists public.promo_codes (
  id            uuid               primary key default gen_random_uuid(),
  privilege_id  uuid               not null references public.privileges(id) on delete cascade,
  code          text               not null,
  status        promo_code_status  not null default 'available',
  claimed_by    uuid               references public.profiles(id) on delete set null,
  claimed_at    timestamptz,
  expires_at    timestamptz,
  redeemed_at   timestamptz,
  created_at    timestamptz        not null default now(),
  constraint promo_codes_privilege_code_unique unique (privilege_id, code)
);

create index if not exists idx_promo_codes_privilege_status
  on public.promo_codes(privilege_id, status);

create index if not exists idx_promo_codes_claimed_by
  on public.promo_codes(claimed_by)
  where claimed_by is not null;

create index if not exists idx_promo_codes_expires
  on public.promo_codes(expires_at)
  where status = 'claimed';

-- ── Release expired claimed codes (24h reservation) ─────────
create or replace function public.release_expired_promo_codes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer;
begin
  update public.promo_codes
  set
    status      = 'available',
    claimed_by  = null,
    claimed_at  = null,
    expires_at  = null
  where status = 'claimed'
    and expires_at is not null
    and expires_at < now();

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

revoke all on function public.release_expired_promo_codes() from public;
grant execute on function public.release_expired_promo_codes() to authenticated;

-- ── Claim one available code for a privilege ────────────────
create or replace function public.claim_promo_code(p_privilege_id uuid)
returns public.promo_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_code      public.promo_codes;
  v_privilege public.privileges;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.profile_is_active_member() then
    raise exception 'Membership is not active';
  end if;

  perform public.release_expired_promo_codes();

  select * into v_privilege
  from public.privileges
  where id = p_privilege_id and is_active = true;

  if not found then
    raise exception 'Privilege not found or inactive';
  end if;

  if v_privilege.code_mode <> 'unique_pool' then
    raise exception 'This privilege does not use unique promo codes';
  end if;

  -- Already has an active claim for this privilege
  if exists (
    select 1 from public.promo_codes
    where privilege_id = p_privilege_id
      and claimed_by = v_member_id
      and status = 'claimed'
      and (expires_at is null or expires_at > now())
  ) then
    raise exception 'You already have an active promo code for this privilege';
  end if;

  -- Already redeemed for this privilege
  if exists (
    select 1 from public.promo_codes
    where privilege_id = p_privilege_id
      and claimed_by = v_member_id
      and status = 'redeemed'
  ) then
    raise exception 'You have already used a promo code for this privilege';
  end if;

  -- Atomic claim: first available code
  update public.promo_codes
  set
    status     = 'claimed',
    claimed_by = v_member_id,
    claimed_at = now(),
    expires_at = now() + interval '24 hours'
  where id = (
    select id from public.promo_codes
    where privilege_id = p_privilege_id
      and status = 'available'
    order by created_at
    limit 1
    for update skip locked
  )
  returning * into v_code;

  if not found then
    raise exception 'No promo codes available';
  end if;

  return v_code;
end;
$$;

revoke all on function public.claim_promo_code(uuid) from public;
grant execute on function public.claim_promo_code(uuid) to authenticated;

-- ── Redeem (confirm use) a claimed code ─────────────────────
create or replace function public.redeem_promo_code(p_code_id uuid)
returns public.promo_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_code      public.promo_codes;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.release_expired_promo_codes();

  update public.promo_codes
  set
    status      = 'redeemed',
    redeemed_at = now(),
    expires_at  = null
  where id = p_code_id
    and claimed_by = v_member_id
    and status = 'claimed'
    and (expires_at is null or expires_at > now())
  returning * into v_code;

  if not found then
    raise exception 'Promo code not found, expired, or already used';
  end if;

  return v_code;
end;
$$;

revoke all on function public.redeem_promo_code(uuid) from public;
grant execute on function public.redeem_promo_code(uuid) to authenticated;

-- ── Stats helper for admin ──────────────────────────────────
create or replace function public.promo_code_stats(p_privilege_id uuid)
returns table (
  total     bigint,
  available bigint,
  claimed   bigint,
  redeemed  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'available')::bigint,
    count(*) filter (where status = 'claimed')::bigint,
    count(*) filter (where status = 'redeemed')::bigint
  from public.promo_codes
  where privilege_id = p_privilege_id;
$$;

revoke all on function public.promo_code_stats(uuid) from public;
grant execute on function public.promo_code_stats(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.promo_codes enable row level security;

-- Members see their own claimed/redeemed codes
create policy "members: read own promo codes"
  on public.promo_codes for select
  using (claimed_by = auth.uid());

-- Admins full access
create policy "admins: all promo codes"
  on public.promo_codes for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());
