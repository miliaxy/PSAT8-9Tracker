-- Atomic drill-result capture plus automatic skill-evidence recalculation.

alter table public.drills
  add column if not exists skill_id text references public.skill_catalog(id);

update public.drills as drill
set skill_id = catalog.id
from public.skill_catalog as catalog
where drill.skill_id is null
  and catalog.section = drill.section
  and catalog.domain = drill.domain
  and lower(catalog.name) = lower(drill.skill_topic);

create index if not exists drills_student_skill_date_idx
  on public.drills (student_id, skill_id, drill_date desc);

create or replace function private.refresh_drill_skill_progress(
  target_student_id uuid,
  target_skill_id text
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  current_progress public.student_skill_progress%rowtype;
  total_attempted integer := 0;
  total_correct integer := 0;
  recent_attempted integer := 0;
  recent_correct integer := 0;
  previous_attempted integer := 0;
  previous_correct integer := 0;
  recent_accuracy numeric(5,2);
  previous_accuracy numeric(5,2);
  next_rating text;
  next_trend text := 'steady';
  next_status text;
  next_action text;
  latest_date date;
begin
  if target_skill_id is null then return; end if;

  insert into public.student_skill_progress (student_id, skill_id)
  values (target_student_id, target_skill_id)
  on conflict (student_id, skill_id) do nothing;

  select * into current_progress
  from public.student_skill_progress
  where student_id = target_student_id and skill_id = target_skill_id;

  with ordered as (
    select attempted, correct, drill_date,
      row_number() over (order by drill_date desc, created_at desc, id desc) as position
    from public.drills
    where student_id = target_student_id and skill_id = target_skill_id
  )
  select
    coalesce(sum(attempted), 0)::integer,
    coalesce(sum(correct), 0)::integer,
    coalesce(sum(attempted) filter (where position <= 5), 0)::integer,
    coalesce(sum(correct) filter (where position <= 5), 0)::integer,
    coalesce(sum(attempted) filter (where position between 6 and 10), 0)::integer,
    coalesce(sum(correct) filter (where position between 6 and 10), 0)::integer,
    max(drill_date)
  into total_attempted, total_correct, recent_attempted, recent_correct,
    previous_attempted, previous_correct, latest_date
  from ordered;

  recent_accuracy := case when recent_attempted > 0 then round(100.0 * recent_correct / recent_attempted, 2) end;
  previous_accuracy := case when previous_attempted > 0 then round(100.0 * previous_correct / previous_attempted, 2) end;

  next_rating := case
    when total_attempted = 0 then 'No evidence'
    when recent_accuracy < 60 then 'Needs work'
    when recent_accuracy < 75 then 'Developing'
    when recent_accuracy < 85 then 'Improving'
    else 'Strong'
  end;

  if previous_accuracy is not null and recent_accuracy >= previous_accuracy + 8 then next_trend := 'up'; end if;
  if previous_accuracy is not null and recent_accuracy <= previous_accuracy - 8 then next_trend := 'down'; end if;

  next_status := case
    when total_attempted = 0 and current_progress.practice_test_rating = 'No evidence' then 'Not started'
    when next_rating = 'Needs work' or current_progress.practice_test_rating = 'Needs work' then 'Needs review'
    when current_progress.concept_state = 'mastered' and next_rating = 'Strong' and current_progress.practice_test_rating = 'Strong' then 'Mastered'
    when next_rating = 'Strong' and current_progress.practice_test_rating in ('Strong', 'Improving', 'No evidence') then 'Strong'
    when current_progress.concept_state in ('not_yet_taught', 'learning') then 'Learning'
    else 'Developing'
  end;

  next_action := case
    when next_rating = 'No evidence' then 'Complete a short baseline drill and classify every miss.'
    when recent_accuracy < 60 then 'Review the concept before another timed drill.'
    when recent_accuracy < 75 then 'Use guided medium practice and explain every correction.'
    when recent_accuracy < 85 then 'Repeat with mixed questions and gentle timing.'
    else 'Use spaced review or a harder mixed set to confirm retention.'
  end;

  update public.student_skill_progress
  set drill_rating = next_rating,
      drill_attempted = total_attempted,
      drill_correct = total_correct,
      recent_drill_accuracy = recent_accuracy,
      trend = next_trend,
      combined_status = next_status,
      last_practiced = latest_date,
      next_step = next_action,
      updated_at = now()
  where student_id = target_student_id and skill_id = target_skill_id;
end;
$$;

revoke all on function private.refresh_drill_skill_progress(uuid, text) from public;

create or replace function private.refresh_drill_skill_progress_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_drill_skill_progress(old.student_id, old.skill_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.student_id, old.skill_id) is distinct from (new.student_id, new.skill_id) then
    perform private.refresh_drill_skill_progress(old.student_id, old.skill_id);
  end if;
  perform private.refresh_drill_skill_progress(new.student_id, new.skill_id);
  return new;
end;
$$;

drop trigger if exists refresh_drill_skill_progress_after_change on public.drills;
create trigger refresh_drill_skill_progress_after_change
  after insert or update or delete on public.drills
  for each row execute function private.refresh_drill_skill_progress_trigger();

create or replace function public.record_drill_result(
  target_student_id uuid,
  result jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  catalog_skill public.skill_catalog%rowtype;
  drill_id uuid;
  attempted_count integer;
  correct_count integer;
  drill_day date;
  mistake jsonb;
  question_number integer;
  allowed_classifications constant text[] := array[
    'Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing',
    'Second-Guessed', 'Strategy', 'Misread Question', 'Guess', 'Other'
  ];
begin
  if not private.can_access_student(target_student_id) then
    raise exception 'This student profile is not available to your account';
  end if;

  if coalesce(result ->> 'attempted', '') !~ '^[0-9]+$'
     or coalesce(result ->> 'correct', '') !~ '^[0-9]+$' then
    raise exception 'Attempted and correct must be whole numbers';
  end if;
  attempted_count := (result ->> 'attempted')::integer;
  correct_count := (result ->> 'correct')::integer;
  if attempted_count < 1 or attempted_count > 100 or correct_count < 0 or correct_count > attempted_count then
    raise exception 'The drill score is outside the allowed range';
  end if;

  begin
    drill_day := (result ->> 'drillDate')::date;
  exception when others then
    raise exception 'Choose a valid drill date';
  end;
  if drill_day > current_date then raise exception 'A drill result cannot be dated in the future'; end if;

  select * into catalog_skill
  from public.skill_catalog
  where id = result ->> 'skillId' and is_active = true;
  if not found then raise exception 'Choose an active PSAT skill'; end if;

  if result ->> 'difficulty' not in ('Easy', 'Medium', 'Hard', 'Mixed') then
    raise exception 'Choose a valid difficulty';
  end if;
  if length(trim(coalesce(result ->> 'source', ''))) < 1 then raise exception 'Add the drill source'; end if;
  if jsonb_typeof(coalesce(result -> 'mistakes', '[]'::jsonb)) <> 'array' then raise exception 'Mistakes must be a list'; end if;
  if jsonb_array_length(coalesce(result -> 'mistakes', '[]'::jsonb)) > attempted_count - correct_count then
    raise exception 'There cannot be more mistake details than incorrect answers';
  end if;

  insert into public.drills (
    student_id, drill_date, skill_id, section, domain, skill_topic, difficulty,
    source, attempted, correct, incorrect, accuracy, time_limit_minutes,
    time_spent_minutes, notes
  ) values (
    target_student_id,
    drill_day,
    catalog_skill.id,
    catalog_skill.section,
    catalog_skill.domain,
    catalog_skill.name,
    result ->> 'difficulty',
    left(trim(result ->> 'source'), 200),
    attempted_count,
    correct_count,
    attempted_count - correct_count,
    round(100.0 * correct_count / attempted_count, 2),
    case when jsonb_typeof(result -> 'timeLimitMinutes') = 'number' then (result ->> 'timeLimitMinutes')::integer end,
    case when jsonb_typeof(result -> 'timeSpentMinutes') = 'number' then (result ->> 'timeSpentMinutes')::numeric end,
    nullif(left(trim(coalesce(result ->> 'notes', '')), 500), '')
  ) returning id into drill_id;

  for mistake in select value from jsonb_array_elements(coalesce(result -> 'mistakes', '[]'::jsonb)) loop
    question_number := case
      when jsonb_typeof(mistake -> 'questionNumber') = 'number' then (mistake ->> 'questionNumber')::integer
    end;
    if question_number is not null and (question_number < 1 or question_number > attempted_count) then
      raise exception 'A mistake question number is outside the drill range';
    end if;
    if not ((mistake ->> 'classification') = any(allowed_classifications)) then
      raise exception 'Choose a valid mistake type';
    end if;

    insert into public.drill_mistakes (drill_id, student_id, question_number, classification, note)
    values (
      drill_id,
      target_student_id,
      question_number,
      mistake ->> 'classification',
      nullif(left(trim(coalesce(mistake ->> 'note', '')), 500), '')
    );
  end loop;

  return drill_id;
end;
$$;

revoke all on function public.record_drill_result(uuid, jsonb) from public;
grant execute on function public.record_drill_result(uuid, jsonb) to authenticated;

comment on function public.record_drill_result(uuid, jsonb) is
  'Records one drill and its optional mistakes atomically; a trigger recalculates skill evidence immediately.';
