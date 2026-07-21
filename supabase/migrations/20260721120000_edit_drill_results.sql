-- Let an authenticated student or guardian correct a saved assignment drill result
-- without granting broad direct update access to private drill records.

create or replace function public.update_drill_result(
  target_student_id uuid,
  target_drill_id uuid,
  result jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  existing_drill public.drills%rowtype;
  catalog_skill public.skill_catalog%rowtype;
  assigned_task public.daily_tasks%rowtype;
  attempted_count integer;
  correct_count integer;
  drill_day date;
  time_limit integer;
  time_spent numeric;
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

  select * into existing_drill from public.drills
  where id = target_drill_id and student_id = target_student_id;
  if not found then raise exception 'This drill result is not available to your account'; end if;

  if existing_drill.task_id is not null then
    select * into assigned_task from public.daily_tasks
    where id = existing_drill.task_id and student_id = target_student_id;
    if not found or assigned_task.category <> 'Drill' then
      raise exception 'This is not an available drill assignment';
    end if;
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

  select * into catalog_skill from public.skill_catalog
  where id = result ->> 'skillId' and is_active = true;
  if not found then raise exception 'Choose an active PSAT skill'; end if;
  if assigned_task.section is not null and assigned_task.section <> catalog_skill.section then
    raise exception 'Choose a skill from the assigned section';
  end if;

  if result ->> 'difficulty' not in ('Easy', 'Medium', 'Hard', 'Mixed') then raise exception 'Choose a valid difficulty'; end if;
  if length(trim(coalesce(result ->> 'source', ''))) < 1 then raise exception 'Add the drill source'; end if;
  if jsonb_typeof(coalesce(result -> 'mistakes', '[]'::jsonb)) <> 'array' then raise exception 'Mistakes must be a list'; end if;
  if jsonb_array_length(coalesce(result -> 'mistakes', '[]'::jsonb)) > attempted_count - correct_count then
    raise exception 'There cannot be more mistake details than incorrect answers';
  end if;

  if result -> 'timeLimitMinutes' <> 'null'::jsonb then
    if jsonb_typeof(result -> 'timeLimitMinutes') <> 'number' then raise exception 'Time allowed must be a number'; end if;
    time_limit := (result ->> 'timeLimitMinutes')::integer;
    if time_limit < 1 or time_limit > 180 then raise exception 'Time allowed is outside the permitted range'; end if;
  end if;
  if result -> 'timeSpentMinutes' <> 'null'::jsonb then
    if jsonb_typeof(result -> 'timeSpentMinutes') <> 'number' then raise exception 'Time used must be a number'; end if;
    time_spent := (result ->> 'timeSpentMinutes')::numeric;
    if time_spent < 0 or time_spent > 180 then raise exception 'Time used is outside the permitted range'; end if;
  end if;

  update public.drills set
    drill_date = drill_day,
    skill_id = catalog_skill.id,
    section = catalog_skill.section,
    domain = catalog_skill.domain,
    skill_topic = catalog_skill.name,
    difficulty = result ->> 'difficulty',
    source = left(trim(result ->> 'source'), 200),
    attempted = attempted_count,
    correct = correct_count,
    incorrect = attempted_count - correct_count,
    accuracy = round(100.0 * correct_count / attempted_count, 2),
    time_limit_minutes = time_limit,
    time_spent_minutes = time_spent,
    notes = nullif(left(trim(coalesce(result ->> 'notes', '')), 500), ''),
    updated_at = now()
  where id = target_drill_id and student_id = target_student_id;

  delete from public.drill_mistakes
  where drill_id = target_drill_id and student_id = target_student_id;

  for mistake in select value from jsonb_array_elements(coalesce(result -> 'mistakes', '[]'::jsonb)) loop
    question_number := case when jsonb_typeof(mistake -> 'questionNumber') = 'number' then (mistake ->> 'questionNumber')::integer end;
    if question_number is not null and (question_number < 1 or question_number > attempted_count) then
      raise exception 'A mistake question number is outside the drill range';
    end if;
    if not ((mistake ->> 'classification') = any(allowed_classifications)) then raise exception 'Choose a valid mistake type'; end if;
    insert into public.drill_mistakes (drill_id, student_id, question_number, classification, note)
    values (target_drill_id, target_student_id, question_number, mistake ->> 'classification', nullif(left(trim(coalesce(mistake ->> 'note', '')), 500), ''));
  end loop;

  return target_drill_id;
end;
$$;

revoke all on function public.update_drill_result(uuid, uuid, jsonb) from public;
grant execute on function public.update_drill_result(uuid, uuid, jsonb) to authenticated;

comment on function public.update_drill_result(uuid, uuid, jsonb) is
  'Corrects one accessible drill result, replaces its mistake details, and triggers skill-progress recalculation.';
