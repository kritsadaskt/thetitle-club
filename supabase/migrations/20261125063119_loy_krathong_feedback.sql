-- Standalone Loy Krathong 2026 public feedback (not event_survey_*).
-- Guests submit via RPC; admins read rows for dashboard / Excel export.

create table public.loy_krathong_feedback (
  id uuid primary key default gen_random_uuid(),
  location_slug text not null,
  locale text not null default 'th',
  food_positive text[] not null default '{}',
  food_improve text[] not null default '{}',
  food_positive_other text,
  food_improve_other text,
  venue_positive text[] not null default '{}',
  venue_improve text[] not null default '{}',
  venue_positive_other text,
  venue_improve_other text,
  activities_positive text[] not null default '{}',
  activities_improve text[] not null default '{}',
  activities_positive_other text,
  activities_improve_other text,
  submitted_at timestamptz not null default now(),
  constraint loy_krathong_feedback_location_check check (
    location_slug in (
      'the-title-legendary-bang-tao',
      'the-title-cielo-rawai',
      'the-title-serenity-naiyang'
    )
  ),
  constraint loy_krathong_feedback_locale_check check (
    locale in ('en', 'th', 'ru')
  ),
  constraint loy_krathong_feedback_other_len check (
    (food_positive_other is null or char_length(food_positive_other) <= 500)
    and (food_improve_other is null or char_length(food_improve_other) <= 500)
    and (venue_positive_other is null or char_length(venue_positive_other) <= 500)
    and (venue_improve_other is null or char_length(venue_improve_other) <= 500)
    and (activities_positive_other is null or char_length(activities_positive_other) <= 500)
    and (activities_improve_other is null or char_length(activities_improve_other) <= 500)
  )
);

comment on table public.loy_krathong_feedback is
  'Public Loy Krathong 2026 event feedback. One row per submission; location_slug from QR link.';

create index loy_krathong_feedback_location_submitted_idx
  on public.loy_krathong_feedback (location_slug, submitted_at desc);

create index loy_krathong_feedback_submitted_idx
  on public.loy_krathong_feedback (submitted_at desc);

alter table public.loy_krathong_feedback enable row level security;

revoke all on table public.loy_krathong_feedback from public, anon, authenticated;
grant select on table public.loy_krathong_feedback to authenticated;
grant select, insert, update, delete on table public.loy_krathong_feedback to service_role;

create policy "admins: read loy krathong feedback"
  on public.loy_krathong_feedback
  for select
  to authenticated
  using ((select public.is_profile_admin()));

-- Allowed option ids (must stay in sync with lib/loy-krathong-feedback.ts)
create or replace function public.loy_krathong_option_allowed(
  p_group text,
  p_id text
) returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_group
    when 'food_positive' then p_id in (
      'taste', 'sufficient', 'variety', 'quality', 'cleanliness',
      'presentation', 'service', 'others'
    )
    when 'food_improve' then p_id in (
      'taste', 'quantity', 'variety', 'temperature', 'cleanliness',
      'waiting', 'dietary', 'none', 'others'
    )
    when 'venue_positive' then p_id in (
      'decorations', 'atmosphere', 'venue_size', 'crowd', 'seating',
      'lighting_sound', 'layout', 'cleanliness_safety', 'others'
    )
    when 'venue_improve' then p_id in (
      'decorations_atmosphere', 'venue_size', 'overcrowding', 'seating',
      'lighting', 'music_volume', 'layout_access', 'cleanliness_safety',
      'none', 'others'
    )
    when 'activities_positive' then p_id in (
      'diy_krathong', 'queen_contest', 'dessert_workshop', 'games_family',
      'fun_engaging', 'all_ages', 'duration', 'staff', 'others'
    )
    when 'activities_improve' then p_id in (
      'variety', 'engagement', 'materials', 'waiting', 'ages',
      'schedule', 'communication', 'staff', 'none', 'others'
    )
    else false
  end;
$$;

create or replace function public.loy_krathong_sanitize_ids(
  p_group text,
  p_ids jsonb
) returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_id text;
  v_out text[] := '{}';
  v_seen text[] := '{}';
begin
  if p_ids is null or jsonb_typeof(p_ids) <> 'array' then
    return '{}';
  end if;

  for v_id in
    select jsonb_array_elements_text(p_ids)
  loop
    v_id := btrim(v_id);
    if v_id = '' then
      continue;
    end if;
    if not public.loy_krathong_option_allowed(p_group, v_id) then
      raise exception 'Invalid option "%" for %', v_id, p_group
        using errcode = 'P0001';
    end if;
    if not (v_id = any (v_seen)) then
      v_seen := array_append(v_seen, v_id);
      v_out := array_append(v_out, v_id);
    end if;
  end loop;

  -- "none" is exclusive in improve columns
  if p_group in ('food_improve', 'venue_improve', 'activities_improve')
     and 'none' = any (v_out)
     and cardinality(v_out) > 1 then
    v_out := array['none'];
  end if;

  return v_out;
end;
$$;

create or replace function public.loy_krathong_trim_other(
  p_ids text[],
  p_other text
) returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
begin
  if not ('others' = any (p_ids)) then
    return null;
  end if;
  v := nullif(btrim(coalesce(p_other, '')), '');
  if v is not null and char_length(v) > 500 then
    raise exception 'Other text is too long (max 500 characters)'
      using errcode = 'P0001';
  end if;
  return v;
end;
$$;

create or replace function public.submit_loy_krathong_feedback(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location text;
  v_locale text;
  v_food_pos text[];
  v_food_imp text[];
  v_venue_pos text[];
  v_venue_imp text[];
  v_act_pos text[];
  v_act_imp text[];
  v_food_pos_other text;
  v_food_imp_other text;
  v_venue_pos_other text;
  v_venue_imp_other text;
  v_act_pos_other text;
  v_act_imp_other text;
  v_id uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid payload' using errcode = 'P0001';
  end if;

  v_location := btrim(coalesce(p_payload->>'locationSlug', p_payload->>'location_slug', ''));
  if v_location not in (
    'the-title-legendary-bang-tao',
    'the-title-cielo-rawai',
    'the-title-serenity-naiyang'
  ) then
    raise exception 'Invalid location' using errcode = 'P0001';
  end if;

  v_locale := btrim(coalesce(p_payload->>'locale', 'th'));
  if v_locale not in ('en', 'th', 'ru') then
    raise exception 'Invalid locale' using errcode = 'P0001';
  end if;

  v_food_pos := public.loy_krathong_sanitize_ids('food_positive', p_payload->'foodPositive');
  v_food_imp := public.loy_krathong_sanitize_ids('food_improve', p_payload->'foodImprove');
  v_venue_pos := public.loy_krathong_sanitize_ids('venue_positive', p_payload->'venuePositive');
  v_venue_imp := public.loy_krathong_sanitize_ids('venue_improve', p_payload->'venueImprove');
  v_act_pos := public.loy_krathong_sanitize_ids('activities_positive', p_payload->'activitiesPositive');
  v_act_imp := public.loy_krathong_sanitize_ids('activities_improve', p_payload->'activitiesImprove');

  if cardinality(v_food_pos) + cardinality(v_food_imp)
     + cardinality(v_venue_pos) + cardinality(v_venue_imp)
     + cardinality(v_act_pos) + cardinality(v_act_imp) < 1 then
    raise exception 'Select at least one option' using errcode = 'P0001';
  end if;

  v_food_pos_other := public.loy_krathong_trim_other(v_food_pos, p_payload->>'foodPositiveOther');
  v_food_imp_other := public.loy_krathong_trim_other(v_food_imp, p_payload->>'foodImproveOther');
  v_venue_pos_other := public.loy_krathong_trim_other(v_venue_pos, p_payload->>'venuePositiveOther');
  v_venue_imp_other := public.loy_krathong_trim_other(v_venue_imp, p_payload->>'venueImproveOther');
  v_act_pos_other := public.loy_krathong_trim_other(v_act_pos, p_payload->>'activitiesPositiveOther');
  v_act_imp_other := public.loy_krathong_trim_other(v_act_imp, p_payload->>'activitiesImproveOther');

  insert into public.loy_krathong_feedback (
    location_slug,
    locale,
    food_positive,
    food_improve,
    food_positive_other,
    food_improve_other,
    venue_positive,
    venue_improve,
    venue_positive_other,
    venue_improve_other,
    activities_positive,
    activities_improve,
    activities_positive_other,
    activities_improve_other
  ) values (
    v_location,
    v_locale,
    v_food_pos,
    v_food_imp,
    v_food_pos_other,
    v_food_imp_other,
    v_venue_pos,
    v_venue_imp,
    v_venue_pos_other,
    v_venue_imp_other,
    v_act_pos,
    v_act_imp,
    v_act_pos_other,
    v_act_imp_other
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.loy_krathong_option_allowed(text, text) from public;
revoke all on function public.loy_krathong_sanitize_ids(text, jsonb) from public;
revoke all on function public.loy_krathong_trim_other(text[], text) from public;
revoke all on function public.submit_loy_krathong_feedback(jsonb) from public;

grant execute on function public.submit_loy_krathong_feedback(jsonb) to anon, authenticated;
