-- ============================================================
--  Allow optional feedback text on rating answers (low scores).
--  Updates value-shape check + submit_venue_survey RPC.
-- ============================================================

alter table public.event_survey_answers
  drop constraint if exists event_survey_answers_value_shape;

alter table public.event_survey_answers
  add constraint event_survey_answers_value_shape check (
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
  );

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
