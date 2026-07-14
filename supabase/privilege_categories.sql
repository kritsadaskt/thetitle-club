-- ============================================================
--  THE TITLE CLUB — Privilege Categories (normalized)
--  Run in: Supabase Dashboard > SQL Editor
--  Prerequisite: schema.sql (+ partners.sql if used)
-- ============================================================

-- ── 1. privilege_categories table ───────────────────────────
create table if not exists public.privilege_categories (
  id         smallserial primary key,
  label      text        not null,
  key        text        not null,
  color      text        not null default 'bg-gray-100 text-gray-700 border-gray-200',
  sort_order smallint    not null default 0,
  created_at timestamptz not null default now(),
  constraint privilege_categories_key_unique unique (key)
);

-- ── 2. Seed default categories (from legacy enum) ─────────────
insert into public.privilege_categories (id, label, key, color, sort_order)
values
  (1, 'Health & Wellness', 'health', 'bg-emerald-50 text-emerald-700 border-emerald-200', 1),
  (2, 'F&B',               'fnb',    'bg-amber-50 text-amber-700 border-amber-200', 2),
  (3, 'Service',           'service','bg-sky-50 text-sky-700 border-sky-200', 3),
  (4, 'Lifestyle',         'lifestyle', 'bg-purple-50 text-purple-700 border-purple-200', 4)
on conflict (key) do update set
  label = excluded.label,
  color = excluded.color,
  sort_order = excluded.sort_order;

select setval(
  pg_get_serial_sequence('public.privilege_categories', 'id'),
  coalesce((select max(id) from public.privilege_categories), 1)
);

-- ── 3. privileges.category_id ───────────────────────────────
alter table public.privileges
  add column if not exists category_id smallint references public.privilege_categories(id) on delete restrict;

-- Migrate enum column → category_id (skip if category column already dropped)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'privileges'
      and column_name = 'category'
  ) then
    update public.privileges pr
    set category_id = pc.id
    from public.privilege_categories pc
    where pr.category_id is null
      and pc.key = pr.category::text;

    update public.privileges
    set category_id = (select id from public.privilege_categories where key = 'lifestyle' limit 1)
    where category_id is null;

    alter table public.privileges drop column category;
  end if;
end $$;

update public.privileges
set category_id = (select id from public.privilege_categories where key = 'lifestyle' limit 1)
where category_id is null;

alter table public.privileges
  alter column category_id set not null;

create index if not exists idx_privileges_category_id
  on public.privileges(category_id);

-- ── 4. RLS ──────────────────────────────────────────────────
alter table public.privilege_categories enable row level security;

create policy "public: read privilege categories"
  on public.privilege_categories for select
  using (true);

create policy "admins: all privilege categories"
  on public.privilege_categories for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- Note: legacy type privilege_category may remain unused; safe to drop manually later:
-- drop type if exists privilege_category;
