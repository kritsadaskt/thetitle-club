-- ============================================================
--  THE TITLE CLUB — Hide privileges outside valid_from / valid_until
--  Dates are calendar days in Asia/Bangkok.
--  valid_until null = no expiry. Inclusive on both ends.
--  Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Members: only active + currently valid privileges
drop policy if exists "active members: read active privileges" on public.privileges;
create policy "active members: read active privileges"
  on public.privileges for select
  using (
    is_active = true
    and public.profile_is_active_member()
    and valid_from <= (timezone('Asia/Bangkok', now()))::date
    and (
      valid_until is null
      or valid_until >= (timezone('Asia/Bangkok', now()))::date
    )
  );

-- Public marketing (landing): same validity window
drop policy if exists "public: read active privileges for marketing" on public.privileges;
create policy "public: read active privileges for marketing"
  on public.privileges for select
  to anon, authenticated
  using (
    is_active = true
    and valid_from <= (timezone('Asia/Bangkok', now()))::date
    and (
      valid_until is null
      or valid_until >= (timezone('Asia/Bangkok', now()))::date
    )
  );

-- Claim unique promo codes only while privilege is in validity window
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
  v_today     date := (timezone('Asia/Bangkok', now()))::date;
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
  where id = p_privilege_id
    and is_active = true
    and valid_from <= v_today
    and (valid_until is null or valid_until >= v_today);

  if not found then
    raise exception 'Privilege not found or inactive';
  end if;

  if v_privilege.code_mode <> 'unique_pool' then
    raise exception 'This privilege does not use unique promo codes';
  end if;

  if exists (
    select 1 from public.promo_codes
    where privilege_id = p_privilege_id
      and claimed_by = v_member_id
      and status = 'claimed'
      and (expires_at is null or expires_at > now())
  ) then
    raise exception 'You already have an active promo code for this privilege';
  end if;

  if exists (
    select 1 from public.promo_codes
    where privilege_id = p_privilege_id
      and claimed_by = v_member_id
      and status = 'redeemed'
  ) then
    raise exception 'You have already used a promo code for this privilege';
  end if;

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
