-- Link evidence to the assignment that produced it and support full-test tasks.

alter table public.daily_tasks drop constraint if exists daily_tasks_category_check;
alter table public.daily_tasks add constraint daily_tasks_category_check
  check (category in ('Learn', 'Drill', 'Review', 'Test strategy', 'Practice test', 'Reading'));

alter table public.drills
  add column if not exists task_id uuid references public.daily_tasks(id) on delete set null;
alter table public.practice_tests
  add column if not exists task_id uuid references public.daily_tasks(id) on delete set null;

create unique index if not exists drills_one_result_per_task_idx
  on public.drills (task_id) where task_id is not null;
create unique index if not exists practice_tests_one_result_per_task_idx
  on public.practice_tests (task_id) where task_id is not null;

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
  assigned_task public.daily_tasks%rowtype;
  linked_task_id uuid;
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

  if jsonb_typeof(result -> 'taskId') = 'string' then
    linked_task_id := (result ->> 'taskId')::uuid;
    select * into assigned_task from public.daily_tasks
    where id = linked_task_id and student_id = target_student_id;
    if not found or assigned_task.category <> 'Drill' then
      raise exception 'This is not an available drill assignment';
    end if;
    if exists (select 1 from public.drills where task_id = linked_task_id) then
      raise exception 'A result has already been recorded for this assignment';
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

  insert into public.drills (
    student_id, task_id, drill_date, skill_id, section, domain, skill_topic, difficulty,
    source, attempted, correct, incorrect, accuracy, time_limit_minutes, time_spent_minutes, notes
  ) values (
    target_student_id, linked_task_id, drill_day, catalog_skill.id, catalog_skill.section,
    catalog_skill.domain, catalog_skill.name, result ->> 'difficulty',
    left(trim(result ->> 'source'), 200), attempted_count, correct_count,
    attempted_count - correct_count, round(100.0 * correct_count / attempted_count, 2),
    case when jsonb_typeof(result -> 'timeLimitMinutes') = 'number' then (result ->> 'timeLimitMinutes')::integer end,
    case when jsonb_typeof(result -> 'timeSpentMinutes') = 'number' then (result ->> 'timeSpentMinutes')::numeric end,
    nullif(left(trim(coalesce(result ->> 'notes', '')), 500), '')
  ) returning id into drill_id;

  for mistake in select value from jsonb_array_elements(coalesce(result -> 'mistakes', '[]'::jsonb)) loop
    question_number := case when jsonb_typeof(mistake -> 'questionNumber') = 'number' then (mistake ->> 'questionNumber')::integer end;
    if question_number is not null and (question_number < 1 or question_number > attempted_count) then
      raise exception 'A mistake question number is outside the drill range';
    end if;
    if not ((mistake ->> 'classification') = any(allowed_classifications)) then raise exception 'Choose a valid mistake type'; end if;
    insert into public.drill_mistakes (drill_id, student_id, question_number, classification, note)
    values (drill_id, target_student_id, question_number, mistake ->> 'classification', nullif(left(trim(coalesce(mistake ->> 'note', '')), 500), ''));
  end loop;

  return drill_id;
end;
$$;

create or replace function public.record_practice_test_result(
  target_student_id uuid,
  result jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  assigned_task public.daily_tasks%rowtype;
  catalog_skill public.skill_catalog%rowtype;
  linked_task_id uuid;
  test_id uuid;
  test_day date;
  total_score integer;
  reading_writing_score integer;
  math_score integer;
  mistake jsonb;
  question_number integer;
  module_number integer;
  allowed_classifications constant text[] := array[
    'Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing',
    'Second-Guessed', 'Strategy', 'Misread Question', 'Guess', 'Other'
  ];
begin
  if not private.can_access_student(target_student_id) then
    raise exception 'This student profile is not available to your account';
  end if;

  if jsonb_typeof(result -> 'taskId') = 'string' then
    linked_task_id := (result ->> 'taskId')::uuid;
    select * into assigned_task from public.daily_tasks
    where id = linked_task_id and student_id = target_student_id;
    if not found or assigned_task.category <> 'Practice test' then
      raise exception 'This is not an available practice-test assignment';
    end if;
    if exists (select 1 from public.practice_tests where task_id = linked_task_id) then
      raise exception 'A result has already been recorded for this assignment';
    end if;
  end if;

  if coalesce(result ->> 'totalScore', '') !~ '^[0-9]+$'
     or coalesce(result ->> 'readingWritingScore', '') !~ '^[0-9]+$'
     or coalesce(result ->> 'mathScore', '') !~ '^[0-9]+$' then
    raise exception 'Scores must be whole numbers';
  end if;
  total_score := (result ->> 'totalScore')::integer;
  reading_writing_score := (result ->> 'readingWritingScore')::integer;
  math_score := (result ->> 'mathScore')::integer;
  if total_score <> reading_writing_score + math_score
     or total_score not between 240 and 1440
     or reading_writing_score not between 120 and 720
     or math_score not between 120 and 720 then
    raise exception 'The PSAT 8/9 scores are outside the allowed range';
  end if;

  begin
    test_day := (result ->> 'testDate')::date;
  exception when others then
    raise exception 'Choose a valid practice-test date';
  end;
  if test_day > current_date then raise exception 'A practice-test result cannot be dated in the future'; end if;
  if length(trim(coalesce(result ->> 'name', ''))) < 1 then raise exception 'Add the practice-test name'; end if;
  if jsonb_typeof(coalesce(result -> 'mistakes', '[]'::jsonb)) <> 'array' then raise exception 'Mistakes must be a list'; end if;

  insert into public.practice_tests (
    student_id, task_id, test_date, name, total_score, reading_writing_score, math_score,
    total_correct, total_incorrect, reading_writing_correct, reading_writing_incorrect,
    math_correct, math_incorrect, reliability_note
  ) values (
    target_student_id, linked_task_id, test_day, left(trim(result ->> 'name'), 160),
    total_score, reading_writing_score, math_score, 0, 0, 0, 0, 0, 0,
    nullif(left(trim(coalesce(result ->> 'reliabilityNote', '')), 500), '')
  ) returning id into test_id;

  for mistake in select value from jsonb_array_elements(coalesce(result -> 'mistakes', '[]'::jsonb)) loop
    if coalesce(mistake ->> 'questionNumber', '') !~ '^[0-9]+$' then raise exception 'Every mistake needs a question number'; end if;
    question_number := (mistake ->> 'questionNumber')::integer;
    if question_number < 1 or question_number > 98 then raise exception 'A mistake question number is outside the PSAT 8/9 range'; end if;
    module_number := case when jsonb_typeof(mistake -> 'module') = 'number' then (mistake ->> 'module')::integer end;
    if module_number is not null and module_number not in (1, 2) then raise exception 'Choose module 1 or 2'; end if;
    if not ((mistake ->> 'classification') = any(allowed_classifications)) then raise exception 'Choose a valid mistake type'; end if;

    select * into catalog_skill from public.skill_catalog
    where id = mistake ->> 'skillId' and is_active = true;
    if not found then raise exception 'Choose an active skill for every mistake'; end if;

    insert into public.practice_test_mistakes (
      test_id, student_id, question_number, module, section, domain, skill_topic,
      classification, user_note, recommended_action
    ) values (
      test_id, target_student_id, question_number, module_number, catalog_skill.section,
      catalog_skill.domain, catalog_skill.name, mistake ->> 'classification',
      nullif(left(trim(coalesce(mistake ->> 'note', '')), 500), ''),
      'Review the explanation, identify the rule, and retry a related question.'
    );
  end loop;

  if not exists (
    select 1 from public.practice_tests
    where student_id = target_student_id and test_date > test_day
  ) then
    update public.student_profiles set current_score = total_score, updated_at = now()
    where id = target_student_id;
  end if;

  return test_id;
end;
$$;

revoke all on function public.record_practice_test_result(uuid, jsonb) from public;
grant execute on function public.record_practice_test_result(uuid, jsonb) to authenticated;

comment on function public.record_practice_test_result(uuid, jsonb) is
  'Records a score-first practice test plus optional classified mistakes for one assigned full test.';
