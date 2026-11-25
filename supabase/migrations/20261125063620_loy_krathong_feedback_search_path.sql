-- Pin search_path on helper functions (advisor: function_search_path_mutable).
-- Idempotent; safe if already applied via MCP.

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

revoke all on function public.loy_krathong_option_allowed(text, text) from public;
revoke all on function public.loy_krathong_sanitize_ids(text, jsonb) from public;
revoke all on function public.loy_krathong_trim_other(text[], text) from public;
