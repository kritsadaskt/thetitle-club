-- ============================================================
--  THE TITLE CLUB — Multi-venue events
--  Run after events.sql (or apply via migration)
--  Moves location / schedule / banner onto event_venues.
--  Members register for one venue per event.
-- ============================================================

-- ── 1. event_venues ─────────────────────────────────────────
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

-- ── 2. Backfill one venue per existing event ────────────────
insert into public.event_venues (
  event_id, slug, name, description, location, banner_image, starts_at, ends_at, sort_order
)
select
  e.id,
  'main',
  e.title,
  e.description,
  e.location,
  e.cover_image,
  e.starts_at,
  e.ends_at,
  0
from public.events e
where not exists (
  select 1 from public.event_venues v where v.event_id = e.id
)
and e.starts_at is not null;

-- ── 3. venue_id on registrations ────────────────────────────
alter table public.event_registrations
  add column if not exists venue_id uuid references public.event_venues(id) on delete restrict;

update public.event_registrations r
set venue_id = v.id
from public.event_venues v
where v.event_id = r.event_id
  and v.slug = 'main'
  and r.venue_id is null;

-- Fail loudly if any registration lacks a venue after backfill
do $$
begin
  if exists (select 1 from public.event_registrations where venue_id is null) then
    raise exception 'event_registrations.venue_id backfill incomplete';
  end if;
end $$;

alter table public.event_registrations
  alter column venue_id set not null;

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

-- ── 4. venue_id on logs ─────────────────────────────────────
alter table public.event_registration_logs
  add column if not exists venue_id uuid references public.event_venues(id) on delete set null;

update public.event_registration_logs l
set venue_id = r.venue_id
from public.event_registrations r
where r.id = l.registration_id
  and l.venue_id is null;

update public.event_registration_logs l
set venue_id = v.id
from public.event_venues v
where v.event_id = l.event_id
  and v.slug = 'main'
  and l.venue_id is null;

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
    -- Venue switch while active: treat as a new registration at the new venue
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

-- ── 5. RLS for venues + registration open window ────────────
alter table public.event_venues enable row level security;

drop policy if exists "public: read event venues" on public.event_venues;
create policy "public: read event venues"
  on public.event_venues for select
  using (true);

drop policy if exists "admins: all event venues" on public.event_venues;
create policy "admins: all event venues"
  on public.event_venues for all
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

grant select on public.event_venues to anon, authenticated;
grant insert, update, delete on public.event_venues to authenticated;
grant all on public.event_venues to service_role;

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

-- ── 6. Drop moved columns from events ───────────────────────
drop index if exists idx_events_active_starts;

alter table public.events drop constraint if exists events_ends_after_start;

alter table public.events
  drop column if exists location,
  drop column if exists cover_image,
  drop column if exists starts_at,
  drop column if exists ends_at;
