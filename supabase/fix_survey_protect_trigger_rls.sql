-- ============================================================
--  Fix: saving/updating survey questions fails with
--  "query would be affected by row-level security policy for
--   table event_survey_answers"
--
--  Cause: protect_answered_survey_question() ran as invoker and
--  could not reliably read event_survey_answers under RLS.
-- ============================================================

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

revoke all on function public.protect_answered_survey_question() from public;
grant execute on function public.protect_answered_survey_question() to authenticated, service_role;
