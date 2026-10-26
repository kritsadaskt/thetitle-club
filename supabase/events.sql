-- ============================================================
--  THE TITLE CLUB — Events and member registration (multi-venue)
--  Run in: Supabase Dashboard > SQL Editor
--  Prerequisite: schema.sql (is_profile_admin, profile_is_active_member, touch_updated_at)
--  For existing DBs that already ran the single-venue schema, also run event_venues.sql
-- ============================================================

-- ── 1. events ───────────────────────────────────────────────
create table if not exists public.events (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null,
  title        text        not null,
  description  text,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint events_slug_unique unique (slug),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
  before update on public.events
  for each row execute function touch_updated_at();

-- ── 2. event_venues ─────────────────────────────────────────
create table if not exists public.event_venues (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  slug          text        not null,
  name          text        not null,
  description   text,
  location      text,
  banner_image  text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint event_venues_event_slug_unique unique (event_id, slug),
  constraint event_venues_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint event_venues_ends_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists idx_event_venues_event_sort
  on public.event_venues (event_id, sort_order, starts_at);

drop trigger if exists event_venues_updated_at on public.event_venues;
create trigger event_venues_updated_at
  before update on public.event_venues
  for each row execute function touch_updated_at();

-- ── 3. event_registrations ──────────────────────────────────
-- One row per member per event. cancelled_at null means still registered.
-- venue_id is the location they registered for (one venue per event).
create table if not exists public.event_registrations (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  venue_id      uuid        not null references public.event_venues(id) on delete restrict,
  member_id     uuid        not null references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  cancelled_at  timestamptz,
  constraint event_registrations_member_event_unique unique (event_id, member_id)
);

create index if not exists idx_event_registrations_event_active
  on public.event_registrations (event_id)
  where cancelled_at is null;

create index if not exists idx_event_registrations_venue_active
  on public.event_registrations (venue_id)
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

create or replace function public.enforce_registration_venue_event()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.event_venues v
    where v.id = new.venue_id
      and v.event_id = new.event_id
  ) then
    raise exception 'venue does not belong to event';
  end if;
  return new;
end;
$$;

drop trigger if exists event_registrations_enforce_venue on public.event_registrations;
create trigger event_registrations_enforce_venue
  before insert or update of venue_id, event_id on public.event_registrations
  for each row execute function public.enforce_registration_venue_event();

-- ── 4. RLS ──────────────────────────────────────────────────
alter table public.events enable row level security;
alter table public.event_venues enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists "public: read active events" on public.events;
drop policy if exists "public: read events" on public.events;
create policy "public: read events"
  on public.events for select
  using (true);

drop policy if exists "admins: all events" on public.events;
create policy "admins: all events"
  on public.events for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

drop policy if exists "public: read event venues" on public.event_venues;
create policy "public: read event venues"
  on public.event_venues for select
  using (true);

drop policy if exists "admins: all event venues" on public.event_venues;
create policy "admins: all event venues"
  on public.event_venues for all
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
      from public.event_venues v
      where v.id = venue_id
        and v.event_id = event_id
        and v.starts_at > now()
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
      from public.event_venues v
      where v.id = venue_id
        and v.event_id = event_id
        and v.starts_at > now()
    )
  );

drop policy if exists "admins: all event registrations" on public.event_registrations;
create policy "admins: all event registrations"
  on public.event_registrations for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.event_venues to anon, authenticated;
grant insert, update, delete on public.event_venues to authenticated;
grant select, insert, update, delete on public.event_registrations to authenticated;
grant all on public.events to service_role;
grant all on public.event_venues to service_role;
grant all on public.event_registrations to service_role;

-- ── 5. event_registration_logs ──────────────────────────────
do $$
begin
  create type public.event_registration_action as enum ('registered', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.event_registration_logs (
  id              uuid        primary key default gen_random_uuid(),
  event_id        uuid        not null references public.events(id) on delete cascade,
  venue_id        uuid        references public.event_venues(id) on delete set null,
  member_id       uuid        not null references public.profiles(id) on delete cascade,
  registration_id uuid        references public.event_registrations(id) on delete set null,
  action          public.event_registration_action not null,
  occurred_at     timestamptz not null default now()
);

create index if not exists idx_event_registration_logs_timeline
  on public.event_registration_logs (event_id, member_id, occurred_at);

create or replace function public.log_event_registration_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.event_registration_logs (
      event_id, venue_id, member_id, registration_id, action, occurred_at
    ) values (
      new.event_id,
      new.venue_id,
      new.member_id,
      new.id,
      'registered',
      coalesce(new.registered_at, now())
    );
    return new;
  end if;

  if old.cancelled_at is null and new.cancelled_at is not null then
    insert into public.event_registration_logs (
      event_id, venue_id, member_id, registration_id, action, occurred_at
    ) values (
      new.event_id,
      new.venue_id,
      new.member_id,
      new.id,
      'cancelled',
      new.cancelled_at
    );
  elsif old.cancelled_at is not null and new.cancelled_at is null then
    insert into public.event_registration_logs (
      event_id, venue_id, member_id, registration_id, action, occurred_at
    ) values (
      new.event_id,
      new.venue_id,
      new.member_id,
      new.id,
      'registered',
      coalesce(new.registered_at, now())
    );
  elsif old.venue_id is distinct from new.venue_id
        and new.cancelled_at is null then
    insert into public.event_registration_logs (
      event_id, venue_id, member_id, registration_id, action, occurred_at
    ) values (
      new.event_id,
      new.venue_id,
      new.member_id,
      new.id,
      'registered',
      coalesce(new.registered_at, now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists event_registrations_log_change on public.event_registrations;
create trigger event_registrations_log_change
  after insert or update on public.event_registrations
  for each row execute function public.log_event_registration_change();

alter table public.event_registration_logs enable row level security;

drop policy if exists "members: read own registration logs" on public.event_registration_logs;
create policy "members: read own registration logs"
  on public.event_registration_logs for select
  to authenticated
  using (member_id = auth.uid());

drop policy if exists "admins: read registration logs" on public.event_registration_logs;
create policy "admins: read registration logs"
  on public.event_registration_logs for select
  to authenticated
  using (public.is_profile_admin());

revoke all on public.event_registration_logs from public, anon, authenticated;
grant select on public.event_registration_logs to authenticated;
grant all on public.event_registration_logs to service_role;
