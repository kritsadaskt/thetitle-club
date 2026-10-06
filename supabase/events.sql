-- ============================================================
--  THE TITLE CLUB — Events and member registration
--  Run in: Supabase Dashboard > SQL Editor
--  Prerequisite: schema.sql (is_profile_admin, profile_is_active_member, touch_updated_at)
-- ============================================================

-- ── 1. events ───────────────────────────────────────────────
create table if not exists public.events (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null,
  title        text        not null,
  description  text,
  location     text,
  cover_image  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint events_slug_unique unique (slug),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint events_ends_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists idx_events_active_starts
  on public.events (is_active, starts_at);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
  before update on public.events
  for each row execute function touch_updated_at();

-- ── 2. event_registrations ──────────────────────────────────
-- One row per member per event. cancelled_at null means still registered.
-- Cancelling then registering again updates the same row.
create table if not exists public.event_registrations (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  member_id     uuid        not null references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  cancelled_at  timestamptz,
  constraint event_registrations_member_event_unique unique (event_id, member_id)
);

create index if not exists idx_event_registrations_event_active
  on public.event_registrations (event_id)
  where cancelled_at is null;

create or replace function public.protect_event_registration_keys()
returns trigger
language plpgsql
as $$
begin
  if new.event_id is distinct from old.event_id
     or new.member_id is distinct from old.member_id then
    raise exception 'registration identity cannot change';
  end if;
  return new;
end;
$$;

drop trigger if exists event_registrations_protect_keys on public.event_registrations;
create trigger event_registrations_protect_keys
  before update on public.event_registrations
  for each row execute function protect_event_registration_keys();

-- ── 3. RLS ──────────────────────────────────────────────────
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists "public: read active events" on public.events;
create policy "public: read active events"
  on public.events for select
  using (is_active = true);

drop policy if exists "admins: all events" on public.events;
create policy "admins: all events"
  on public.events for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

drop policy if exists "members: read own registrations" on public.event_registrations;
create policy "members: read own registrations"
  on public.event_registrations for select
  to authenticated
  using (member_id = auth.uid());

drop policy if exists "members: register for open events" on public.event_registrations;
create policy "members: register for open events"
  on public.event_registrations for insert
  to authenticated
  with check (
    member_id = auth.uid()
    and cancelled_at is null
    and public.profile_is_active_member()
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.is_active = true
        and e.starts_at > now()
    )
  );

drop policy if exists "members: update own registration before start" on public.event_registrations;
create policy "members: update own registration before start"
  on public.event_registrations for update
  to authenticated
  using (
    member_id = auth.uid()
    and public.profile_is_active_member()
  )
  with check (
    member_id = auth.uid()
    and public.profile_is_active_member()
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.is_active = true
        and e.starts_at > now()
    )
  );

drop policy if exists "admins: all event registrations" on public.event_registrations;
create policy "admins: all event registrations"
  on public.event_registrations for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_registrations to authenticated;
grant all on public.events to service_role;
grant all on public.event_registrations to service_role;
