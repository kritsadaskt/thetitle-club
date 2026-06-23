-- ============================================================
--  THE TITLE CLUB — Partners (normalized shops)
--  Run in: Supabase Dashboard > SQL Editor
--  Prerequisite: schema.sql (+ promo_codes.sql if used)
-- ============================================================

-- ── 1. partners table ───────────────────────────────────────
create table if not exists public.partners (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  logo_url     text,
  website_url  text,
  description  text,
  is_active    boolean     not null default true,
  sort_order   smallint    not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint partners_name_unique unique (name)
);

create index if not exists idx_partners_active_sort
  on public.partners(is_active, sort_order);

create trigger partners_updated_at
  before update on public.partners
  for each row execute function touch_updated_at();

-- ── 2. privileges.partner_id ────────────────────────────────
alter table public.privileges
  add column if not exists partner_id uuid references public.partners(id) on delete restrict;

-- ── 3. Migrate existing partner_name → partners ─────────────
insert into public.partners (name, logo_url, sort_order)
select distinct on (lower(trim(partner_name)))
  trim(partner_name),
  nullif(trim(partner_logo), ''),
  0
from public.privileges
where trim(partner_name) <> ''
  and not exists (
    select 1 from public.partners p
    where lower(p.name) = lower(trim(privileges.partner_name))
  )
order by lower(trim(partner_name)), partner_name;

update public.privileges pr
set partner_id = p.id
from public.partners p
where pr.partner_id is null
  and lower(trim(pr.partner_name)) = lower(p.name);

-- Sync logo from first privilege row if partner has no logo
update public.partners p
set logo_url = sub.logo
from (
  select distinct on (partner_id) partner_id, partner_logo as logo
  from public.privileges
  where partner_logo is not null and trim(partner_logo) <> ''
  order by partner_id, created_at
) sub
where p.id = sub.partner_id
  and (p.logo_url is null or trim(p.logo_url) = '');

-- ── 4. RLS ──────────────────────────────────────────────────
alter table public.partners enable row level security;

-- Public / members: read active partners (landing page)
create policy "public: read active partners"
  on public.partners for select
  using (is_active = true);

-- Admins: full access
create policy "admins: all partners"
  on public.partners for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- Note: partner_name / partner_logo on privileges kept for rollback.
-- Drop in a future migration after app fully uses partner_id join.
