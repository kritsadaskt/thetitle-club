-- ============================================================
--  THE TITLE CLUB — Post-event exit surveys (per venue)
--  Prerequisite: events.sql, i18n_columns.sql
--    (is_profile_admin, profile_is_active_member, touch_updated_at)
--  Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. event_venue_surveys ──────────────────────────────────
create table if not exists public.event_venue_surveys (
  venue_id   uuid        primary key references public.event_venues(id) on delete cascade,
  event_id   uuid        not null references public.events(id) on delete cascade,
  is_active  boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_venue_surveys_event
  on public.event_venue_surveys (event_id);

drop trigger if exists event_venue_surveys_updated_at on public.event_venue_surveys;
create trigger event_venue_surveys_updated_at
  before update on public.event_venue_surveys
  for each row execute function touch_updated_at();

-- Keep event_id in sync with the venue
create or replace function public.enforce_survey_venue_event()
returns trigger
language plpgsql
as $$
begin
  select v.event_id into new.event_id
  from public.event_venues v
  where v.id = new.venue_id;
  if new.event_id is null then
    raise exception 'venue does not exist';
  end if;
  return new;
end;
$$;

drop trigger if exists event_venue_surveys_enforce_event on public.event_venue_surveys;
create trigger event_venue_surveys_enforce_event
  before insert or update of venue_id on public.event_venue_surveys
  for each row execute function public.enforce_survey_venue_event();

-- ── 2. event_survey_questions ───────────────────────────────
do $$
begin
  create type public.event_survey_question_type as enum (
    'rating',
    'single',
    'text',
    'yesno'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.event_survey_questions (
  id             uuid        primary key default gen_random_uuid(),
  venue_id       uuid        not null references public.event_venues(id) on delete cascade,
  prompt         text        not null,
  i18n           jsonb       not null default '{}'::jsonb,
  question_type  public.event_survey_question_type not null,
  options        jsonb       not null default '[]'::jsonb,
  required       boolean     not null default true,
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint event_survey_questions_prompt_nonempty
    check (char_length(trim(prompt)) > 0)
);

create index if not exists idx_event_survey_questions_venue
  on public.event_survey_questions (venue_id, sort_order);

drop trigger if exists event_survey_questions_updated_at on public.event_survey_questions;
create trigger event_survey_questions_updated_at
  before update on public.event_survey_questions
  for each row execute function touch_updated_at();

comment on column public.event_survey_questions.i18n is
  'Optional th/ru translations: { "th": { "prompt": "..." }, "ru": { "prompt": "..." } }';
comment on column public.event_survey_questions.options is
  'For single: [{ "id": "uuid", "label": "EN", "i18n": { "th": { "label": "..." }, "ru": { "label": "..." } } }]';

-- Validate options shape for single-choice questions
create or replace function public.validate_survey_question()
returns trigger
language plpgsql
as $$
declare
  opt jsonb;
  opt_id text;
  opt_label text;
  opt_count integer;
begin
  new.prompt := trim(new.prompt);
  if new.prompt = '' then
    raise exception 'question prompt is required';
  end if;

  if new.question_type = 'single' then
    if jsonb_typeof(new.options) <> 'array' then
      raise exception 'single-choice options must be an array';
    end if;
    opt_count := jsonb_array_length(new.options);
    if opt_count < 2 then
      raise exception 'single-choice questions need at least 2 options';
    end if;
    for opt in select * from jsonb_array_elements(new.options)
    loop
      opt_id := opt->>'id';
      opt_label := trim(coalesce(opt->>'label', ''));
      if opt_id is null or opt_id = '' then
        raise exception 'each option needs an id';
      end if;
      if opt_label = '' then
        raise exception 'each option needs an English label';
      end if;
    end loop;
  else
    new.options := '[]'::jsonb;
  end if;

  return new;
end;
$$;

drop trigger if exists event_survey_questions_validate on public.event_survey_questions;
create trigger event_survey_questions_validate
  before insert or update on public.event_survey_questions
  for each row execute function public.validate_survey_question();

-- ── 3. event_survey_responses ───────────────────────────────
create table if not exists public.event_survey_responses (
  id              uuid        primary key default gen_random_uuid(),
  venue_id        uuid        not null references public.event_venues(id) on delete cascade,
  event_id        uuid        not null references public.events(id) on delete cascade,
  member_id       uuid        not null references public.profiles(id) on delete cascade,
  registration_id uuid        not null references public.event_registrations(id) on delete restrict,
  submitted_at    timestamptz not null default now(),
  constraint event_survey_responses_member_venue_unique unique (venue_id, member_id)
);

create index if not exists idx_event_survey_responses_venue
  on public.event_survey_responses (venue_id, submitted_at desc);

create index if not exists idx_event_survey_responses_event
  on public.event_survey_responses (event_id);

-- ── 4. event_survey_answers ─────────────────────────────────
create table if not exists public.event_survey_answers (
  id                   uuid        primary key default gen_random_uuid(),
  response_id          uuid        not null references public.event_survey_responses(id) on delete cascade,
  question_id          uuid        not null references public.event_survey_questions(id) on delete restrict,
  question_type        public.event_survey_question_type not null,
  prompt_snapshot      text        not null,
  rating_value         smallint    check (rating_value is null or (rating_value between 1 and 5)),
  option_id            text,
  option_label_snapshot text,
  yesno_value          boolean,
  text_value           text,
  constraint event_survey_answers_response_question_unique unique (response_id, question_id),
  constraint event_survey_answers_value_shape check (
    (question_type = 'rating' and rating_value is not null
      and option_id is null and option_label_snapshot is null
      and yesno_value is null
      and (text_value is null or char_length(text_value) <= 2000))
    or
    (question_type = 'single' and option_id is not null and option_label_snapshot is not null
      and rating_value is null and yesno_value is null and text_value is null)
    or
    (question_type = 'yesno' and yesno_value is not null
      and rating_value is null and option_id is null and option_label_snapshot is null
      and text_value is null)
    or
    (question_type = 'text' and text_value is not null
      and char_length(text_value) <= 2000
      and rating_value is null and option_id is null and option_label_snapshot is null
      and yesno_value is null)
  )
);

create index if not exists idx_event_survey_answers_question
  on public.event_survey_answers (question_id);

create index if not exists idx_event_survey_answers_response
  on public.event_survey_answers (response_id);

-- Block destructive edits once answers exist (after answers table exists).
-- SECURITY DEFINER + row_security off: the trigger must read answers even when
-- the invoking admin/member would otherwise hit RLS on event_survey_answers
-- ("query would be affected by row-level security policy").
create or replace function public.protect_answered_survey_question()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_answers boolean;
  old_opt_ids text[];
  new_opt_ids text[];
  removed_id text;
begin
  set local row_security = off;

  select exists (
    select 1
    from public.event_survey_answers a
    where a.question_id = old.id
  ) into has_answers;

  if not has_answers then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'cannot delete a question that already has answers';
  end if;

  if new.question_type is distinct from old.question_type then
    raise exception 'cannot change type of a question that already has answers';
  end if;

  if old.question_type = 'single' then
    select coalesce(array_agg(x), '{}')
      into old_opt_ids
    from (
      select jsonb_array_elements(old.options)->>'id' as x
    ) s;

    select coalesce(array_agg(x), '{}')
      into new_opt_ids
    from (
      select jsonb_array_elements(new.options)->>'id' as x
    ) s;

    foreach removed_id in array old_opt_ids
    loop
      if not (removed_id = any (new_opt_ids)) then
        if exists (
          select 1
          from public.event_survey_answers a
          where a.question_id = old.id
            and a.option_id = removed_id
        ) then
          raise exception 'cannot remove an option that already has answers';
        end if;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists event_survey_questions_protect on public.event_survey_questions;
create trigger event_survey_questions_protect
  before update or delete on public.event_survey_questions
  for each row execute function public.protect_answered_survey_question();

-- ── 5. submit_venue_survey ──────────────────────────────────
create or replace function public.submit_venue_survey(
  p_venue_id uuid,
  p_answers  jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_event_id uuid;
  v_starts_at timestamptz;
  v_survey_active boolean;
  v_registration_id uuid;
  v_response_id uuid;
  v_question record;
  v_answer jsonb;
  v_rating smallint;
  v_option_id text;
  v_option_label text;
  v_yesno boolean;
  v_text text;
  v_opt jsonb;
  v_found boolean;
begin
  if v_member_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.profile_is_active_member() then
    raise exception 'membership must be active';
  end if;

  select v.event_id, v.starts_at
    into v_event_id, v_starts_at
  from public.event_venues v
  where v.id = p_venue_id;

  if v_event_id is null then
    raise exception 'venue not found';
  end if;

  -- Open for the whole Bangkok calendar day of the venue start (not only after starts_at)
  if (timezone('Asia/Bangkok', v_starts_at))::date
       > (timezone('Asia/Bangkok', now()))::date then
    raise exception 'survey is not open yet';
  end if;

  select s.is_active into v_survey_active
  from public.event_venue_surveys s
  where s.venue_id = p_venue_id;

  if coalesce(v_survey_active, false) is not true then
    raise exception 'survey is not active';
  end if;

  select r.id into v_registration_id
  from public.event_registrations r
  where r.event_id = v_event_id
    and r.venue_id = p_venue_id
    and r.member_id = v_member_id
    and r.cancelled_at is null;

  if v_registration_id is null then
    raise exception 'only registered members can submit';
  end if;

  if exists (
    select 1
    from public.event_survey_responses resp
    where resp.venue_id = p_venue_id
      and resp.member_id = v_member_id
  ) then
    raise exception 'survey already submitted';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'answers must be an array';
  end if;

  insert into public.event_survey_responses (
    venue_id, event_id, member_id, registration_id
  ) values (
    p_venue_id, v_event_id, v_member_id, v_registration_id
  )
  returning id into v_response_id;

  for v_question in
    select *
    from public.event_survey_questions q
    where q.venue_id = p_venue_id
    order by q.sort_order, q.created_at
  loop
    select elem
      into v_answer
    from jsonb_array_elements(p_answers) as elem
    where (elem->>'questionId')::uuid = v_question.id
    limit 1;

    if v_answer is null then
      if v_question.required then
        raise exception 'missing answer for question %', v_question.id;
      end if;
      continue;
    end if;

    if v_question.question_type = 'rating' then
      begin
        v_rating := (v_answer->>'rating')::smallint;
      exception when others then
        raise exception 'invalid rating for question %', v_question.id;
      end;
      if v_rating is null or v_rating < 1 or v_rating > 5 then
        raise exception 'rating must be 1–5 for question %', v_question.id;
      end if;

      -- Score below half of 1–5 (i.e. 1 or 2) requires feedback text
      v_text := nullif(trim(coalesce(v_answer->>'text', '')), '');
      if v_rating < 3 then
        if v_text is null then
          raise exception 'feedback required for low rating on question %', v_question.id;
        end if;
        if char_length(v_text) > 2000 then
          raise exception 'text too long for question %', v_question.id;
        end if;
      else
        v_text := null;
      end if;

      insert into public.event_survey_answers (
        response_id, question_id, question_type, prompt_snapshot, rating_value, text_value
      ) values (
        v_response_id, v_question.id, 'rating', v_question.prompt, v_rating, v_text
      );

    elsif v_question.question_type = 'single' then
      v_option_id := trim(coalesce(v_answer->>'optionId', ''));
      if v_option_id = '' then
        raise exception 'option required for question %', v_question.id;
      end if;
      v_found := false;
      v_option_label := null;
      for v_opt in select * from jsonb_array_elements(v_question.options)
      loop
        if (v_opt->>'id') = v_option_id then
          v_found := true;
          v_option_label := trim(coalesce(v_opt->>'label', ''));
          exit;
        end if;
      end loop;
      if not v_found or v_option_label is null or v_option_label = '' then
        raise exception 'invalid option for question %', v_question.id;
      end if;
      insert into public.event_survey_answers (
        response_id, question_id, question_type, prompt_snapshot,
        option_id, option_label_snapshot
      ) values (
        v_response_id, v_question.id, 'single', v_question.prompt,
        v_option_id, v_option_label
      );

    elsif v_question.question_type = 'yesno' then
      if (v_answer->>'yesno') is null then
        raise exception 'yes/no required for question %', v_question.id;
      end if;
      begin
        v_yesno := (v_answer->>'yesno')::boolean;
      exception when others then
        raise exception 'invalid yes/no for question %', v_question.id;
      end;
      insert into public.event_survey_answers (
        response_id, question_id, question_type, prompt_snapshot, yesno_value
      ) values (
        v_response_id, v_question.id, 'yesno', v_question.prompt, v_yesno
      );

    elsif v_question.question_type = 'text' then
      v_text := trim(coalesce(v_answer->>'text', ''));
      if v_text = '' then
        if v_question.required then
          raise exception 'text required for question %', v_question.id;
        end if;
        continue;
      end if;
      if char_length(v_text) > 2000 then
        raise exception 'text too long for question %', v_question.id;
      end if;
      insert into public.event_survey_answers (
        response_id, question_id, question_type, prompt_snapshot, text_value
      ) values (
        v_response_id, v_question.id, 'text', v_question.prompt, v_text
      );
    end if;
  end loop;

  -- Reject unknown question ids in the payload
  if exists (
    select 1
    from jsonb_array_elements(p_answers) as elem
    where (elem->>'questionId')::uuid is not null
      and not exists (
        select 1
        from public.event_survey_questions q
        where q.venue_id = p_venue_id
          and q.id = (elem->>'questionId')::uuid
      )
  ) then
    raise exception 'unknown question in answers';
  end if;

  return v_response_id;
end;
$$;

revoke all on function public.submit_venue_survey(uuid, jsonb) from public;
grant execute on function public.submit_venue_survey(uuid, jsonb) to authenticated;

-- ── 6. RLS ──────────────────────────────────────────────────
alter table public.event_venue_surveys enable row level security;
alter table public.event_survey_questions enable row level security;
alter table public.event_survey_responses enable row level security;
alter table public.event_survey_answers enable row level security;

-- Surveys: registered members can read their venue survey; admins all
drop policy if exists "members: read registered venue survey" on public.event_venue_surveys;
create policy "members: read registered venue survey"
  on public.event_venue_surveys for select
  to authenticated
  using (
    public.is_profile_admin()
    or exists (
      select 1
      from public.event_registrations r
      where r.venue_id = event_venue_surveys.venue_id
        and r.member_id = auth.uid()
        and r.cancelled_at is null
    )
  );

drop policy if exists "admins: all venue surveys" on public.event_venue_surveys;
create policy "admins: all venue surveys"
  on public.event_venue_surveys for all
  to authenticated
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- Questions: same visibility as surveys
drop policy if exists "members: read registered venue questions" on public.event_survey_questions;
create policy "members: read registered venue questions"
  on public.event_survey_questions for select
  to authenticated
  using (
    public.is_profile_admin()
    or exists (
      select 1
      from public.event_registrations r
      where r.venue_id = event_survey_questions.venue_id
        and r.member_id = auth.uid()
        and r.cancelled_at is null
    )
  );

drop policy if exists "admins: all survey questions" on public.event_survey_questions;
create policy "admins: all survey questions"
  on public.event_survey_questions for all
  to authenticated
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- Responses
drop policy if exists "members: read own survey responses" on public.event_survey_responses;
create policy "members: read own survey responses"
  on public.event_survey_responses for select
  to authenticated
  using (member_id = auth.uid() or public.is_profile_admin());

drop policy if exists "admins: all survey responses" on public.event_survey_responses;
create policy "admins: all survey responses"
  on public.event_survey_responses for all
  to authenticated
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

-- Answers (via owning response)
drop policy if exists "members: read own survey answers" on public.event_survey_answers;
create policy "members: read own survey answers"
  on public.event_survey_answers for select
  to authenticated
  using (
    public.is_profile_admin()
    or exists (
      select 1
      from public.event_survey_responses r
      where r.id = event_survey_answers.response_id
        and r.member_id = auth.uid()
    )
  );

drop policy if exists "admins: all survey answers" on public.event_survey_answers;
create policy "admins: all survey answers"
  on public.event_survey_answers for all
  to authenticated
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

revoke all on public.event_venue_surveys from public, anon;
revoke all on public.event_survey_questions from public, anon;
revoke all on public.event_survey_responses from public, anon;
revoke all on public.event_survey_answers from public, anon;

grant select on public.event_venue_surveys to authenticated;
grant insert, update, delete on public.event_venue_surveys to authenticated;

grant select on public.event_survey_questions to authenticated;
grant insert, update, delete on public.event_survey_questions to authenticated;

grant select on public.event_survey_responses to authenticated;
grant select on public.event_survey_answers to authenticated;

grant all on public.event_venue_surveys to service_role;
grant all on public.event_survey_questions to service_role;
grant all on public.event_survey_responses to service_role;
grant all on public.event_survey_answers to service_role;
