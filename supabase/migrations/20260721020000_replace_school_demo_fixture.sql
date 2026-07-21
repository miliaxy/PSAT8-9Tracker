-- Replace the fictional school-demo records with a deliberately neutral dataset.
-- This migration targets only the dedicated demo student and contains no real-student data.

do $$
declare
  demo_student constant uuid := '9f71311b-38e6-4279-beed-76dbe7cecca5';
  demo_plan uuid;
  demo_day_1 uuid;
  demo_day_2 uuid;
  demo_day_3 uuid;
  demo_test_1 uuid;
  demo_test_2 uuid;
  demo_task uuid;
begin
  if not exists (
    select 1 from public.student_profiles
    where id = demo_student and first_name = 'Jordan'
  ) then
    return;
  end if;

  -- Remove the old demo evidence and plan before inserting the clean fixture.
  delete from public.planning_drafts where student_id = demo_student;
  delete from public.practice_tests where student_id = demo_student;
  delete from public.drills where student_id = demo_student;
  delete from public.study_plans where student_id = demo_student;
  delete from public.student_skill_progress where student_id = demo_student;
  delete from public.books where student_id = demo_student;
  delete from public.learning_resource_progress where student_id = demo_student;

  update public.student_profiles
  set target_score = 1150,
      baseline_score = 880,
      current_score = 960,
      updated_at = now()
  where id = demo_student;

  insert into public.practice_tests (
    student_id, test_date, name, total_score, reading_writing_score, math_score,
    total_correct, total_incorrect, reading_writing_correct, reading_writing_incorrect,
    math_correct, math_incorrect, reliability_note, blanks, pacing_issues,
    ninety_second_violations, rushed_questions, module_1_accuracy, module_2_accuracy
  ) values (
    demo_student, '2026-05-09', 'Sample baseline', 880, 450, 430,
    48, 50, 27, 27, 21, 23, 'Fictional demonstration result.', 2, 5, 0, 4, 57, 41
  ) returning id into demo_test_1;

  insert into public.practice_tests (
    student_id, test_date, name, total_score, reading_writing_score, math_score,
    total_correct, total_incorrect, reading_writing_correct, reading_writing_incorrect,
    math_correct, math_incorrect, reliability_note, blanks, pacing_issues,
    ninety_second_violations, rushed_questions, module_1_accuracy, module_2_accuracy
  ) values (
    demo_student, '2026-07-12', 'Sample progress check', 960, 500, 460,
    57, 41, 32, 22, 25, 19, 'Fictional demonstration result under standard timing.', 0, 2, 0, 2, 69, 54
  ) returning id into demo_test_2;

  insert into public.practice_test_domains (test_id, student_id, section, domain, correct, total) values
    (demo_test_1, demo_student, 'Reading & Writing', 'Information and Ideas', 5, 15),
    (demo_test_1, demo_student, 'Reading & Writing', 'Expression of Ideas', 9, 12),
    (demo_test_1, demo_student, 'Math', 'Algebra', 10, 15),
    (demo_test_1, demo_student, 'Math', 'Problem-Solving and Data Analysis', 4, 10),
    (demo_test_2, demo_student, 'Reading & Writing', 'Information and Ideas', 8, 15),
    (demo_test_2, demo_student, 'Reading & Writing', 'Expression of Ideas', 11, 12),
    (demo_test_2, demo_student, 'Math', 'Algebra', 12, 15),
    (demo_test_2, demo_student, 'Math', 'Problem-Solving and Data Analysis', 6, 10);

  insert into public.practice_test_mistakes (
    test_id, student_id, question_number, module, section, domain, skill_topic,
    classification, user_note, recommended_action, reviewed
  ) values
    (demo_test_2, demo_student, 7, 1, 'Reading & Writing', 'Information and Ideas',
      'Central Ideas and Details', 'Misread Question', 'Selected a detail instead of the main idea.',
      'Restate the passage purpose before choosing an answer.', false),
    (demo_test_2, demo_student, 18, 2, 'Math', 'Problem-Solving and Data Analysis',
      'Percentages', 'Concept Gap', 'Used the original value as the final value.',
      'Review percent change with a worked example before another drill.', false);

  insert into public.drills (
    student_id, drill_date, section, domain, skill_topic, difficulty, source,
    attempted, correct, incorrect, accuracy, time_limit_minutes, time_spent_minutes,
    notes, skill_id
  ) values
    (demo_student, '2026-07-08', 'Reading & Writing', 'Information and Ideas',
      'Central Ideas and Details', 'Easy', 'Sample question set', 10, 7, 3, 70, 12, 11,
      'Fictional practice evidence.', 'rw-central-ideas'),
    (demo_student, '2026-07-10', 'Math', 'Problem-Solving and Data Analysis',
      'Percentages', 'Easy', 'Sample question set', 10, 6, 4, 60, 16, 15,
      'Fictional practice evidence.', 'math-percentages'),
    (demo_student, '2026-07-11', 'Reading & Writing', 'Expression of Ideas',
      'Transitions', 'Medium', 'Sample question set', 10, 10, 0, 100, 12, 10,
      'Fictional practice evidence.', 'rw-transitions');

  -- Drill triggers create progress rows; replace those generated summaries with
  -- this fixture's complete, internally consistent practice-test and drill evidence.
  delete from public.student_skill_progress where student_id = demo_student;

  insert into public.student_skill_progress (
    student_id, skill_id, concept_state, practice_test_rating,
    practice_test_attempted, practice_test_correct, drill_rating,
    drill_attempted, drill_correct, recent_drill_accuracy, trend,
    combined_status, last_practiced, next_step
  ) values
    (demo_student, 'rw-central-ideas', 'needs_review', 'Needs work', 10, 5,
      'Developing', 10, 7, 70, 'up', 'Needs review', '2026-07-08',
      'Review how a main idea differs from a supporting detail.'),
    (demo_student, 'math-percentages', 'learning', 'Needs work', 8, 3,
      'Developing', 10, 6, 60, 'steady', 'Needs review', '2026-07-10',
      'Finish the percent-change lesson before completing another drill.'),
    (demo_student, 'rw-transitions', 'strong', 'Strong', 9, 8,
      'Strong', 10, 10, 100, 'up', 'Strong', '2026-07-11',
      'Maintain with occasional mixed practice.'),
    (demo_student, 'math-linear-equations', 'strong', 'Improving', 10, 8,
      'Strong', 10, 9, 90, 'steady', 'Strong', '2026-07-06',
      'Maintain with a short mixed set next week.');

  insert into public.study_plans (student_id, week_of, title, goal)
  values (demo_student, '2026-07-20', 'Fictional sample week',
    'Demonstrate how evidence can become a simple, editable study plan.')
  returning id into demo_plan;

  insert into public.study_days (plan_id, student_id, study_date, day_type, focus, note)
  values (demo_plan, demo_student, '2026-07-20', 'normal',
    'Central ideas and percentages',
    'Read each question carefully and record what caused every missed answer.')
  returning id into demo_day_1;

  insert into public.study_days (plan_id, student_id, study_date, day_type, focus, note)
  values (demo_plan, demo_student, '2026-07-21', 'normal',
    'Percent change and main ideas',
    'Explain the method in your own words before starting the drill.')
  returning id into demo_day_2;

  insert into public.study_days (plan_id, student_id, study_date, day_type, focus, note)
  values (demo_plan, demo_student, '2026-07-22', 'light',
    'Review and independent reading', null)
  returning id into demo_day_3;

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_1, demo_student, '2026-07-20', 'Main idea: review one example',
    'Compare a main idea with two supporting details and explain the difference.',
    'Review', 'Reading & Writing', 12, 'Sample lesson library'
  ) returning id into demo_task;
  insert into public.daily_task_skills values (demo_task, demo_student, 'rw-central-ideas');

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_1, demo_student, '2026-07-20', 'Main idea: 8-question sample drill',
    'Complete 8 Easy questions, then review and classify each missed answer.',
    'Drill', 'Reading & Writing', 10, 'Sample question set'
  ) returning id into demo_task;
  insert into public.daily_task_skills values (demo_task, demo_student, 'rw-central-ideas');

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_1, demo_student, '2026-07-20', 'Percent change: learn the method',
    'Study two worked examples and write the percent-change steps in your own words.',
    'Learn', 'Math', 20, 'Sample lesson library'
  ) returning id into demo_task;
  insert into public.daily_task_skills values (demo_task, demo_student, 'math-percentages');

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_1, demo_student, '2026-07-20', 'Independent reading',
    'Read an article or book for 15 minutes and write a one-sentence summary.',
    'Reading', 'Reading & Writing', 15, 'Student choice'
  );

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_2, demo_student, '2026-07-21', 'Percent change: finish the lesson',
    'Complete the remaining examples and check each step against the answer key.',
    'Learn', 'Math', 20, 'Sample lesson library'
  ) returning id into demo_task;
  insert into public.daily_task_skills values (demo_task, demo_student, 'math-percentages');

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_2, demo_student, '2026-07-21', 'Main idea: 10-question sample drill',
    'Complete 5 Easy and 5 Medium questions and record the result.',
    'Drill', 'Reading & Writing', 12, 'Sample question set'
  ) returning id into demo_task;
  insert into public.daily_task_skills values (demo_task, demo_student, 'rw-central-ideas');

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_3, demo_student, '2026-07-22', 'Review two saved mistakes',
    'Re-solve two fictional sample mistakes and write the corrected rule for each.',
    'Review', null, 15, 'Sample mistake log'
  );

  insert into public.daily_tasks (
    day_id, student_id, task_date, title, description, category, section, minutes, resource
  ) values (
    demo_day_3, demo_student, '2026-07-22', 'Independent reading',
    'Read a student-selected text for 15 minutes and note one important idea.',
    'Reading', 'Reading & Writing', 15, 'Student choice'
  );

  insert into public.books (
    student_id, title, author, category, pages_read, total_pages, weekly_goal_pages, note, accent
  ) values (
    demo_student, 'Student-selected reading', 'Sample library', 'Current', 20, 120, 40,
    'Fictional placeholder; replace with any appropriate title.', '#4f7cac'
  );

  insert into public.learning_resource_progress (
    student_id, provider, title, section, sequence, status, progress, note
  ) values
    (demo_student, 'Khan Academy', 'Percentages sample module', 'Math', 1, 'In progress', 40,
      'Fictional progress for the school demonstration.'),
    (demo_student, 'Prep book', 'Main ideas sample chapter', 'Reading & Writing', 1, 'Ready', 0,
      'Fictional progress for the school demonstration.');
end $$;
