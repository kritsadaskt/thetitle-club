-- ============================================================
--  THE TITLE CLUB — Localized content (th / ru) as jsonb
--  English stays in existing text columns; th/ru live in i18n.
--  Shape: { "th": { "title": "..." }, "ru": { "title": "..." } }
--  Run in: Supabase Dashboard > SQL Editor
-- ============================================================

alter table public.privileges
  add column if not exists i18n jsonb not null default '{}'::jsonb;

alter table public.privilege_categories
  add column if not exists i18n jsonb not null default '{}'::jsonb;

alter table public.partners
  add column if not exists i18n jsonb not null default '{}'::jsonb;

alter table public.events
  add column if not exists i18n jsonb not null default '{}'::jsonb;

alter table public.event_venues
  add column if not exists i18n jsonb not null default '{}'::jsonb;

alter table public.community_moments
  add column if not exists i18n jsonb not null default '{}'::jsonb;

comment on column public.privileges.i18n is
  'Optional th/ru translations: title, summary, description, terms, how_to_redeem, discount_label';
comment on column public.privilege_categories.i18n is
  'Optional th/ru translations: label';
comment on column public.partners.i18n is
  'Optional th/ru translations: description (brand name stays in name)';
comment on column public.events.i18n is
  'Optional th/ru translations: title, description';
comment on column public.event_venues.i18n is
  'Optional th/ru translations: name, description, location';
comment on column public.community_moments.i18n is
  'Optional th/ru translations: caption';
