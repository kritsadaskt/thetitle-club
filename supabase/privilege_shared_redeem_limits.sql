-- ============================================================
--  THE TITLE CLUB — Shared privilege redeem limits + AIS-style gate
--  Admin sets shared_redeem_limit + shared_redeem_period (day/week/month/year).
--  Null limit = unlimited (still logs on begin for audit).
--  Run in: Supabase Dashboard > SQL Editor
-- ============================================================

alter table public.privileges
  add column if not exists shared_redeem_limit integer,
  add column if not exists shared_redeem_period text;

alter table public.privileges
  drop constraint if exists privileges_shared_redeem_limit_check;
alter table public.privileges
  add constraint privileges_shared_redeem_limit_check
  check (
    (shared_redeem_limit is null and shared_redeem_period is null)
    or (
      shared_redeem_limit is not null
      and shared_redeem_limit > 0
      and shared_redeem_period in ('day', 'week', 'month', 'year')
    )
  );

create index if not exists idx_redemption_privilege_member_at
  on public.redemption_logs (privilege_id, member_id, redeemed_at desc);

-- Period start (Asia/Bangkok calendar) as timestamptz
create or replace function public.shared_redeem_period_start(p_period text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Bangkok', now()))::date;
  v_start date;
begin
  if p_period is null then
    return '-infinity'::timestamptz;
  end if;

  case p_period
    when 'day' then
      v_start := v_today;
    when 'week' then
      -- ISO week: Monday = start
      v_start := v_today - ((extract(isodow from v_today)::integer) - 1);
    when 'month' then
      v_start := date_trunc('month', v_today::timestamp)::date;
    when 'year' then
      v_start := date_trunc('year', v_today::timestamp)::date;
    else
      raise exception 'Invalid shared redeem period';
  end case;

  return (v_start::timestamp at time zone 'Asia/Bangkok');
end;
$$;

create or replace function public.get_shared_redeem_quota(p_privilege_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_privilege public.privileges;
  v_today     date := (timezone('Asia/Bangkok', now()))::date;
  v_used      integer := 0;
  v_start     timestamptz;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.profile_is_active_member() then
    raise exception 'Membership is not active';
  end if;

  select * into v_privilege
  from public.privileges
  where id = p_privilege_id and is_active = true;

  if not found then
    raise exception 'Privilege not found or inactive';
  end if;

  if v_privilege.code_mode <> 'shared' then
    raise exception 'This privilege does not use a shared code';
  end if;

  if v_privilege.valid_from > v_today
     or (v_privilege.valid_until is not null and v_privilege.valid_until < v_today) then
    raise exception 'Privilege is outside its validity window';
  end if;

  if v_privilege.shared_redeem_limit is not null then
    v_start := public.shared_redeem_period_start(v_privilege.shared_redeem_period);
    select count(*)::integer into v_used
    from public.redemption_logs
    where privilege_id = p_privilege_id
      and member_id = v_member_id
      and redeemed_at >= v_start;
  end if;

  return jsonb_build_object(
    'allowed', (
      v_privilege.shared_redeem_limit is null
      or v_used < v_privilege.shared_redeem_limit
    ),
    'used', v_used,
    'limit', v_privilege.shared_redeem_limit,
    'period', v_privilege.shared_redeem_period
  );
end;
$$;

revoke all on function public.get_shared_redeem_quota(uuid) from public;
grant execute on function public.get_shared_redeem_quota(uuid) to authenticated;

-- Consume one shared redeem and return quota + redemption id
create or replace function public.begin_shared_redeem(p_privilege_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_privilege public.privileges;
  v_today     date := (timezone('Asia/Bangkok', now()))::date;
  v_used      integer := 0;
  v_start     timestamptz;
  v_log_id    uuid;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.profile_is_active_member() then
    raise exception 'Membership is not active';
  end if;

  -- Serialize per member+privilege so concurrent confirms cannot double-spend quota
  perform pg_advisory_xact_lock(
    hashtext(v_member_id::text || ':' || p_privilege_id::text)
  );

  select * into v_privilege
  from public.privileges
  where id = p_privilege_id and is_active = true;

  if not found then
    raise exception 'Privilege not found or inactive';
  end if;

  if v_privilege.code_mode <> 'shared' then
    raise exception 'This privilege does not use a shared code';
  end if;

  if v_privilege.valid_from > v_today
     or (v_privilege.valid_until is not null and v_privilege.valid_until < v_today) then
    raise exception 'Privilege is outside its validity window';
  end if;

  if v_privilege.shared_redeem_limit is not null then
    v_start := public.shared_redeem_period_start(v_privilege.shared_redeem_period);
    select count(*)::integer into v_used
    from public.redemption_logs
    where privilege_id = p_privilege_id
      and member_id = v_member_id
      and redeemed_at >= v_start;

    if v_used >= v_privilege.shared_redeem_limit then
      return jsonb_build_object(
        'allowed', false,
        'used', v_used,
        'limit', v_privilege.shared_redeem_limit,
        'period', v_privilege.shared_redeem_period,
        'redemption_id', null
      );
    end if;
  end if;

  insert into public.redemption_logs (member_id, privilege_id, method)
  values (v_member_id, p_privilege_id, 'qr')
  returning id into v_log_id;

  v_used := v_used + 1;

  return jsonb_build_object(
    'allowed', true,
    'used', v_used,
    'limit', v_privilege.shared_redeem_limit,
    'period', v_privilege.shared_redeem_period,
    'redemption_id', v_log_id
  );
end;
$$;

revoke all on function public.begin_shared_redeem(uuid) from public;
grant execute on function public.begin_shared_redeem(uuid) to authenticated;
