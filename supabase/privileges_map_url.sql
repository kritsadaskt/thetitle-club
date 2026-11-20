-- DEPRECATED: superseded by supabase/privileges_map_locations.sql
-- Kept for history. Do not run on fresh environments that already use map_locations.

alter table public.privileges
  add column if not exists map_url text;

comment on column public.privileges.map_url is
  'DEPRECATED — use map_locations jsonb instead.';
