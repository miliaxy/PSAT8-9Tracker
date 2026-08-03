-- Support one timed assignment containing several previously learned skills while
-- preserving skill-level evidence for every question.

drop index if exists public.drills_one_result_per_task_idx;

create unique index if not exists drills_one_result_per_task_skill_idx
  on public.drills (task_id, skill_id)
  where task_id is not null and skill_id is not null;

create or replace function public.save_mixed_drill_result(
  target_student_id uuid,
  target_task_id uuid,
  result jsonb
)
returns uuid[]
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  assigned_task public.daily_tasks%rowtype;
  catalog_skill public.skill_catalog%rowtype;
  skill_result jsonb;
  drill_id uuid;
  drill_ids uuid[] := array[]::uuid[];
  used_skill_ids text[] := array[]::text[];
  used_question_numbers integer[] := array[]::integer[];
  drill_day date;
  current_skill_id text;
  difficulty text;
  source_name text;
  session_note text;
  question_number integer;
  is_correct boolean;
  time_limit integer;
  time_spent numeric;
  classification text;
  mistake_note text;
  allowed_classifications constant text[] := array[
    'Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing',
    'Second-Guessed', 'Strategy', 'Misread Question', 'Guess', 'Other'
  ];
begin
  if not private.can_access_student(target_student_id) then
    raise exception 'This student profile is not available to your account';
  end if;

  select * into assigned_task
  from public.daily_tasks
  where id = target_task_id and student_id = target_student_id;
  if not found or assigned_task.category <> 'Drill' then
    raise exception 'This is not an available drill assignment';
  end if;

  if jsonb_typeof(coalesce(result -> 'skillResults', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(result -> 'skillResults', '[]'::jsonb)) < 2
     or jsonb_array_length(coalesce(result -> 'skillResults', '[]'::jsonb)) > 20 then
    raise exception 'A mixed drill needs between 2 and 20 question results';
  end if;

  begin
    drill_day := (result ->> 'drillDate')::date;
  exception when others then
    raise exception 'Choose a valid drill date';
  end;
  if drill_day > current_date then raise exception 'A drill result cannot be dated in the future'; end if;

  source_name := left(trim(coalesce(result ->> 'source', '')), 200);
  if length(source_name) < 1 then raise exception 'Add the drill source'; end if;
  session_note := nullif(left(trim(coalesce(result ->> 'notes', '')), 500), '');

  if jsonb_typeof(result -> 'timeLimitMinutes') <> 'number' then
    raise exception 'Time allowed must be a number';
  end if;
  time_limit := (result ->> 'timeLimitMinutes')::integer;
  if time_limit < 1 or time_limit > 180 then raise exception 'Time allowed is outside the permitted range'; end if;

  if result -> 'timeSpentMinutes' is not null and result -> 'timeSpentMinutes' <> 'null'::jsonb then
    if jsonb_typeof(result -> 'timeSpentMinutes') <> 'number' then raise exception 'Time used must be a number'; end if;
    time_spent := (result ->> 'timeSpentMinutes')::numeric;
    if time_spent < 0 or time_spent > 180 then raise exception 'Time used is outside the permitted range'; end if;
  end if;

  -- Replacing the linked rows makes the same form safe for both first entry and edits.
  delete from public.drills
  where task_id = target_task_id and student_id = target_student_id;

  for skill_result in
    select value from jsonb_array_elements(result -> 'skillResults')
  loop
    current_skill_id := skill_result ->> 'skillId';
    if current_skill_id is null or current_skill_id = any(used_skill_ids) then
      raise exception 'Every mixed-drill question needs a different linked skill';
    end if;
    if not exists (
      select 1 from public.daily_task_skills
      where task_id = target_task_id
        and student_id = target_student_id
        and daily_task_skills.skill_id = current_skill_id
    ) then
      raise exception 'Every mixed-drill result must use a skill linked to the assignment';
    end if;

    if coalesce(skill_result ->> 'questionNumber', '') !~ '^[0-9]+$' then
      raise exception 'Every mixed-drill result needs a question number';
    end if;
    question_number := (skill_result ->> 'questionNumber')::integer;
    if question_number < 1 or question_number > 20 or question_number = any(used_question_numbers) then
      raise exception 'Mixed-drill question numbers must be unique and between 1 and 20';
    end if;

    difficulty := skill_result ->> 'difficulty';
    if difficulty not in ('Easy', 'Medium', 'Hard') then raise exception 'Choose a valid difficulty for every question'; end if;
    if jsonb_typeof(skill_result -> 'correct') <> 'boolean' then raise exception 'Mark every question correct or incorrect'; end if;
    is_correct := (skill_result ->> 'correct')::boolean;

    select * into catalog_skill
    from public.skill_catalog
    where id = current_skill_id and is_active = true;
    if not found then raise exception 'Choose an active PSAT skill for every question'; end if;

    insert into public.drills (
      student_id, task_id, drill_date, skill_id, section, domain, skill_topic, difficulty,
      source, attempted, correct, incorrect, accuracy, time_limit_minutes, time_spent_minutes, notes
    ) values (
      target_student_id, target_task_id, drill_day, catalog_skill.id, catalog_skill.section,
      catalog_skill.domain, catalog_skill.name, difficulty, source_name,
      1, case when is_correct then 1 else 0 end, case when is_correct then 0 else 1 end,
      case when is_correct then 100 else 0 end, time_limit, time_spent, session_note
    ) returning id into drill_id;

    if not is_correct then
      classification := skill_result ->> 'classification';
      if not (classification = any(allowed_classifications)) then raise exception 'Choose a valid mistake type for every miss'; end if;
      mistake_note := nullif(left(trim(coalesce(skill_result ->> 'note', '')), 500), '');
      insert into public.drill_mistakes (drill_id, student_id, question_number, classification, note)
      values (drill_id, target_student_id, question_number, classification, mistake_note);
    end if;

    drill_ids := array_append(drill_ids, drill_id);
    used_skill_ids := array_append(used_skill_ids, current_skill_id);
    used_question_numbers := array_append(used_question_numbers, question_number);
  end loop;

  return drill_ids;
end;
$$;

revoke all on function public.save_mixed_drill_result(uuid, uuid, jsonb) from public;
grant execute on function public.save_mixed_drill_result(uuid, uuid, jsonb) to authenticated;

comment on function public.save_mixed_drill_result(uuid, uuid, jsonb) is
  'Atomically records or edits one mixed drill as per-skill question results linked to the assignment.';
