-- ============================================================
--  THE TITLE CLUB — Supabase Schema
--  Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Enum types ──────────────────────────────────────────────
create type member_status as enum (
  'pending_verification',
  'pending_approval',
  'active',
  'suspended',
  'rejected'
);

create type resident_status as enum ('owner', 'tenant');

create type gender_type as enum ('male', 'female', 'other');

create type privilege_category as enum ('health', 'fnb', 'service', 'lifestyle');

create type redemption_method as enum ('qr', 'visual');

-- ── Helper: auto-generate sequential member_id ──────────────
create sequence if not exists member_seq start 1;

create or replace function generate_member_id()
returns text language plpgsql as $$
declare
  year_str text := to_char(now(), 'YYYY');
  seq_num  int  := nextval('member_seq');
begin
  return 'TTC-' || year_str || '-' || lpad(seq_num::text, 3, '0');
end;
$$;

-- ── 1. profiles ─────────────────────────────────────────────
-- One row per user. id must match auth.users.id (set by Supabase Auth).
create table if not exists profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  member_id        text        unique not null default generate_member_id(),
  qr_token         text        unique not null default gen_random_uuid()::text,

  -- Personal
  full_name        text        not null,
  gender           gender_type,
  age              smallint    check (age >= 18 and age <= 120),
  nationality      text,

  -- Contact
  email            text,
  phone            text,
  whatsapp         text,

  -- Property
  resident_status  resident_status,
  project_name     text,

  -- Membership
  status           member_status not null default 'pending_verification',
  is_admin         boolean       not null default false,

  -- Timestamps
  created_at       timestamptz not null default now(),
  approved_at      timestamptz,
  approved_by      uuid        references profiles(id)
);

-- Trigger: auto-create profile row when a new user signs up via Supabase Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── 2. privileges ────────────────────────────────────────────
create table if not exists privileges (
  id             uuid             primary key default gen_random_uuid(),
  title          text             not null,
  partner_name   text             not null,
  partner_logo   text,
  cover_image    text,
  summary        text,
  description    text,
  terms          text,
  how_to_redeem  text,
  category       privilege_category not null default 'lifestyle',
  discount_label text,
  privilege_code text,
  is_active      boolean          not null default true,
  valid_from     date             not null default current_date,
  valid_until    date,
  sort_order     smallint         not null default 0,
  created_at     timestamptz      not null default now(),
  updated_at     timestamptz      not null default now()
);

-- Auto-update updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger privileges_updated_at
  before update on privileges
  for each row execute function touch_updated_at();

-- ── 3. redemption_logs ───────────────────────────────────────
create table if not exists redemption_logs (
  id            uuid             primary key default gen_random_uuid(),
  member_id     uuid             not null references profiles(id) on delete cascade,
  privilege_id  uuid             not null references privileges(id) on delete cascade,
  method        redemption_method not null default 'qr',
  redeemed_at   timestamptz      not null default now(),
  notes         text
);

create index idx_redemption_member   on redemption_logs(member_id);
create index idx_redemption_privilege on redemption_logs(privilege_id);
create index idx_redemption_date      on redemption_logs(redeemed_at desc);

-- ── 4. community_moments ─────────────────────────────────────
create table if not exists community_moments (
  id           uuid        primary key default gen_random_uuid(),
  image_url    text        not null,
  caption      text,
  event_date   date,
  is_published boolean     not null default false,
  sort_order   smallint    not null default 0,
  created_at   timestamptz not null default now()
);

-- ── RLS helpers (SECURITY DEFINER + row_security off for lookup — avoids 42P17 recursion) ──
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

-- ============================================================
--  Row Level Security (RLS)
-- ============================================================

alter table profiles         enable row level security;
alter table privileges       enable row level security;
alter table redemption_logs  enable row level security;
alter table community_moments enable row level security;

-- ── profiles RLS ─────────────────────────────────────────────
-- Members can read/update their own profile
create policy "members: read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "members: update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "members: insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Admins can read all profiles
create policy "admins: read all profiles"
  on profiles for select
  using (public.is_profile_admin());

-- Admins can update all profiles (approve / reject / suspend)
create policy "admins: update all profiles"
  on profiles for update
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- ── privileges RLS ───────────────────────────────────────────
-- Active members can read active privileges
create policy "active members: read active privileges"
  on privileges for select
  using (
    is_active = true
    and public.profile_is_active_member()
  );

-- Admins can do everything
create policy "admins: all privileges"
  on privileges for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- ── redemption_logs RLS ──────────────────────────────────────
-- Members see only their own logs
create policy "members: read own redemptions"
  on redemption_logs for select
  using (member_id = auth.uid());

-- Members can insert their own logs
create policy "members: insert own redemptions"
  on redemption_logs for insert
  with check (member_id = auth.uid());

-- Admins can read all logs
create policy "admins: read all redemptions"
  on redemption_logs for select
  using (public.is_profile_admin());

-- ── community_moments RLS ────────────────────────────────────
-- Active members can read published moments
create policy "active members: read published moments"
  on community_moments for select
  using (
    is_published = true
    and public.profile_is_active_member()
  );

-- Admins can do everything
create policy "admins: all community moments"
  on community_moments for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- ============================================================
--  Seed data — Privileges (mirrors mock-data.ts)
--  Run separately after schema is applied
-- ============================================================

insert into privileges (title, partner_name, summary, description, terms, how_to_redeem, category, discount_label, is_active, valid_from, valid_until, sort_order)
values
(
  'BDMS Private Hospital Discount',
  'Bangkok Hospital Phuket',
  '15% off room charges & medication',
  'Enjoy a 15% discount on room charges and a 15% discount on medication costs for both inpatient and outpatient services at BDMS-affiliated private hospitals in Phuket, including Bangkok Hospital Phuket.',
  E'• Valid for THE TITLE CLUB members only\n• Present your Digital Membership Card at reception\n• Discount applies to room charges and medication only\n• Cannot be combined with other promotions or insurance coverage\n• Valid for member and immediate family members',
  E'1. Open your Membership Card on the app\n2. Show the QR Code to the hospital reception\n3. Staff will verify your membership\n4. Discount will be applied to your bill',
  'health', '15% OFF', true, '2024-01-01', '2024-12-31', 1
),
(
  'SAWANU One-Day Boat Trip',
  'SAWANU Phuket',
  'Special discount on island hopping day trip',
  'Receive special discounted rates on a one-day boat trip with SAWANU, perfect for island hopping, sightseeing, and relaxing by the sea around Phuket''s stunning islands.',
  E'• Valid for THE TITLE CLUB members and up to 3 guests\n• Advance booking required (minimum 48 hours)\n• Subject to weather conditions\n• Life jackets provided\n• Includes snorkeling equipment',
  E'1. Contact SAWANU via Line or phone to book\n2. Mention THE TITLE CLUB membership\n3. Show your Membership Card on the day\n4. Enjoy your trip!',
  'lifestyle', 'Special Rate', true, '2024-01-01', '2024-12-31', 2
),
(
  'Splash Beach Resort Water Park',
  'Splash Beach Resort',
  '10–15% off water park admission',
  'Get 10–15% off water park admission for walk-in guests at Splash Beach Resort, offering a fun and exciting experience for all ages.',
  E'• Valid for walk-in guests only\n• Maximum 5 guests per membership per visit\n• Children under 3 years old are free',
  E'1. Go to the ticket counter at Splash Beach Resort\n2. Inform staff you are a THE TITLE CLUB member\n3. Show your QR Code on the Membership Card\n4. Enjoy the water park!',
  'lifestyle', '10–15% OFF', true, '2024-01-01', '2024-12-31', 3
),
(
  'Villa Cleaning Service Discount',
  'Clean Pro Phuket',
  '10% off professional villa cleaning',
  'Enjoy 10% off professional villa and condo cleaning services by Clean Pro Phuket. Experienced, insured, and trusted by The Title residents.',
  E'• Valid for THE TITLE CLUB members only\n• Minimum booking: 3-hour session\n• Discount on labor cost only\n• Advance booking required\n• Available Monday–Saturday',
  E'1. Call or Line Clean Pro Phuket to schedule\n2. Mention THE TITLE CLUB membership\n3. Staff will verify at time of service\n4. Discount applied to invoice',
  'service', '10% OFF', true, '2024-01-01', null, 4
);
