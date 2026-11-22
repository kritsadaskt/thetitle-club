-- Projects residents choose on the public registration form.
-- profiles.project_name keeps storing the chosen name as text, so existing
-- members are unaffected when this list changes.

create table public.residence_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint residence_projects_name_trimmed check (name = btrim(name) and char_length(name) > 0),
  constraint residence_projects_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.residence_projects is
  'Projects shown on the member registration form. Admins manage rows; visitors can read active names only.';

create unique index residence_projects_name_lower_idx
  on public.residence_projects (lower(name));

create index residence_projects_active_sort_idx
  on public.residence_projects (sort_order, name)
  where is_active;

create trigger residence_projects_updated_at
  before update on public.residence_projects
  for each row execute function public.touch_updated_at();

alter table public.residence_projects enable row level security;

-- Default privileges on this project grant every Data API role full access.
-- Keep anonymous clients read-only; writes stay on authenticated and are still gated by RLS.
revoke all on table public.residence_projects from public, anon, authenticated;
grant select on table public.residence_projects to anon, authenticated;
grant insert, update, delete on table public.residence_projects to authenticated;
grant select, insert, update, delete on table public.residence_projects to service_role;

create policy "public: read active residence projects"
  on public.residence_projects
  for select
  to anon, authenticated
  using (is_active = true);

create policy "admins: all residence projects"
  on public.residence_projects
  for all
  to authenticated
  using ((select public.is_profile_admin()))
  with check ((select public.is_profile_admin()));

insert into public.residence_projects (name, sort_order)
values
  ('THE Title WEST WING rawai', 1),
  ('THE TITLE V rawai', 2),
  ('THE TITLE Residencies nai-yang', 3),
  ('THE TITLE HALO 1 nai-yang', 4),
  ('THE TITLE Legendary Bang-Tao', 5),
  ('THE TITLE Serenity nai-yang', 6);
