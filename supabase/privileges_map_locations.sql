-- Multi-branch store locations for privilege directions (run in Supabase SQL Editor).
-- Shape: [{ "name": "Branch name", "mapUrl": "https://maps.google.com/..." }, ...]

alter table public.privileges
  add column if not exists map_locations jsonb not null default '[]'::jsonb;

comment on column public.privileges.map_locations is
  'Store branches for directions: JSON array of { name, mapUrl }.';

-- Migrate legacy single map_url into map_locations when present.
update public.privileges
set map_locations = jsonb_build_array(
  jsonb_build_object('name', 'Store', 'mapUrl', map_url)
)
where coalesce(trim(map_url), '') <> ''
  and (
    map_locations is null
    or map_locations = '[]'::jsonb
  );

alter table public.privileges
  drop column if exists map_url;
