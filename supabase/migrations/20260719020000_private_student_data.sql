-- PSAT Pathway private-data foundation.
-- This migration intentionally contains no student or family data.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  role text not null default 'student' check (role in ('parent_admin', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  grade smallint not null check (grade between 6 and 9),
  target_score smallint not null check (target_score between 240 and 1440),
  test_date date not null,
  baseline_score smallint not null check (baseline_score between 240 and 1440),
  current_score smallint not null check (current_score between 240 and 1440),
  avatar_initials text not null check (char_length(avatar_initials) between 1 and 4),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_guardians (
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  guardian_user_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null default 'guardian',
  can_manage boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_user_id)
);

create table public.skill_catalog (
  id text primary key,
  section text not null check (section in ('Reading & Writing', 'Math')),
  domain text not null,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0
);

create table public.student_skill_progress (
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  skill_id text not null references public.skill_catalog(id),
  concept_state text not null default 'not_yet_taught' check (concept_state in ('not_yet_taught', 'learning', 'needs_review', 'strong', 'mastered')),
  practice_test_rating text not null default 'No evidence' check (practice_test_rating in ('No evidence', 'Needs work', 'Developing', 'Improving', 'Strong')),
  practice_test_attempted integer not null default 0 check (practice_test_attempted >= 0),
  practice_test_correct integer not null default 0 check (practice_test_correct between 0 and practice_test_attempted),
  drill_rating text not null default 'No evidence' check (drill_rating in ('No evidence', 'Needs work', 'Developing', 'Improving', 'Strong')),
  drill_attempted integer not null default 0 check (drill_attempted >= 0),
  drill_correct integer not null default 0 check (drill_correct between 0 and drill_attempted),
  recent_drill_accuracy numeric(5,2) check (recent_drill_accuracy between 0 and 100),
  trend text not null default 'steady' check (trend in ('up', 'steady', 'down')),
  combined_status text not null default 'Not started' check (combined_status in ('Not started', 'Learning', 'Developing', 'Needs review', 'Strong', 'Mastered')),
  last_practiced date,
  khan_progress numeric(5,2) check (khan_progress between 0 and 100),
  next_step text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

create table public.practice_tests (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  test_date date not null,
  name text not null,
  total_score smallint not null check (total_score between 240 and 1440),
  reading_writing_score smallint not null check (reading_writing_score between 120 and 720),
  math_score smallint not null check (math_score between 120 and 720),
  total_correct integer not null check (total_correct >= 0),
  total_incorrect integer not null check (total_incorrect >= 0),
  reading_writing_correct integer not null check (reading_writing_correct >= 0),
  reading_writing_incorrect integer not null check (reading_writing_incorrect >= 0),
  math_correct integer not null check (math_correct >= 0),
  math_incorrect integer not null check (math_incorrect >= 0),
  reliability_note text,
  blanks integer not null default 0 check (blanks >= 0),
  pacing_issues integer not null default 0 check (pacing_issues >= 0),
  ninety_second_violations integer not null default 0 check (ninety_second_violations >= 0),
  rushed_questions integer not null default 0 check (rushed_questions >= 0),
  module_1_accuracy numeric(5,2) check (module_1_accuracy between 0 and 100),
  module_2_accuracy numeric(5,2) check (module_2_accuracy between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, student_id)
);

create table public.practice_test_domains (
  id uuid primary key default extensions.gen_random_uuid(),
  test_id uuid not null,
  student_id uuid not null,
  section text not null check (section in ('Reading & Writing', 'Math')),
  domain text not null,
  correct integer not null check (correct >= 0),
  total integer not null check (total >= 0 and correct <= total),
  foreign key (test_id, student_id) references public.practice_tests(id, student_id) on delete cascade
);

create table public.practice_test_mistakes (
  id uuid primary key default extensions.gen_random_uuid(),
  test_id uuid not null,
  student_id uuid not null,
  question_number integer not null check (question_number > 0),
  module smallint check (module in (1, 2)),
  section text not null check (section in ('Reading & Writing', 'Math')),
  domain text not null,
  skill_topic text not null,
  classification text not null check (classification in ('Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing', 'Second-Guessed', 'Strategy', 'Misread Question', 'Guess', 'Other')),
  user_note text,
  recommended_action text not null default '',
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (test_id, student_id) references public.practice_tests(id, student_id) on delete cascade
);

create table public.drills (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  drill_date date not null,
  section text not null check (section in ('Reading & Writing', 'Math')),
  domain text not null,
  skill_topic text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Mixed')),
  source text not null,
  attempted integer not null check (attempted >= 0),
  correct integer not null check (correct >= 0),
  incorrect integer not null check (incorrect >= 0 and correct + incorrect = attempted),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  time_limit_minutes integer check (time_limit_minutes > 0),
  time_spent_minutes numeric(6,2) check (time_spent_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, student_id)
);

create table public.drill_mistakes (
  id uuid primary key default extensions.gen_random_uuid(),
  drill_id uuid not null,
  student_id uuid not null,
  question_number integer check (question_number > 0),
  classification text not null check (classification in ('Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing', 'Second-Guessed', 'Strategy', 'Misread Question', 'Guess', 'Other')),
  note text,
  created_at timestamptz not null default now(),
  foreign key (drill_id, student_id) references public.drills(id, student_id) on delete cascade
);

create table public.study_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  week_of date not null,
  title text not null,
  goal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, student_id),
  unique (student_id, week_of)
);

create table public.study_days (
  id uuid primary key default extensions.gen_random_uuid(),
  plan_id uuid not null,
  student_id uuid not null,
  study_date date not null,
  day_type text not null default 'normal' check (day_type in ('normal', 'light', 'no-study', 'long', 'review')),
  focus text not null default '',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, student_id),
  unique (plan_id, study_date),
  foreign key (plan_id, student_id) references public.study_plans(id, student_id) on delete cascade
);

create table public.daily_tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  day_id uuid not null,
  student_id uuid not null,
  task_date date not null,
  title text not null,
  description text not null default '',
  category text not null check (category in ('Learn', 'Drill', 'Review', 'Test strategy', 'Reading')),
  section text check (section in ('Reading & Writing', 'Math')),
  minutes integer not null check (minutes > 0),
  resource text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, student_id),
  foreign key (day_id, student_id) references public.study_days(id, student_id) on delete cascade
);

create table public.daily_task_skills (
  task_id uuid not null,
  student_id uuid not null,
  skill_id text not null references public.skill_catalog(id),
  primary key (task_id, skill_id),
  foreign key (task_id, student_id) references public.daily_tasks(id, student_id) on delete cascade
);

create table public.books (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  title text not null,
  author text not null,
  category text not null check (category in ('Current', 'Up next', 'Completed')),
  pages_read integer not null default 0 check (pages_read >= 0),
  total_pages integer not null check (total_pages > 0 and pages_read <= total_pages),
  weekly_goal_pages integer not null check (weekly_goal_pages >= 0),
  note text not null default '',
  accent text not null default '#635bdb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_resource_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  provider text not null check (provider in ('Khan Academy', 'Prep book')),
  title text not null,
  section text not null check (section in ('Reading & Writing', 'Math', 'Both')),
  sequence integer not null check (sequence > 0),
  status text not null check (status in ('Completed', 'In progress', 'Locked', 'Ready')),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, provider, sequence)
);

create index student_profiles_auth_user_idx on public.student_profiles(auth_user_id);
create index student_profiles_created_by_idx on public.student_profiles(created_by);
create index student_guardians_user_idx on public.student_guardians(guardian_user_id, student_id);
create index student_skill_progress_student_idx on public.student_skill_progress(student_id);
create index practice_tests_student_idx on public.practice_tests(student_id, test_date desc);
create index practice_test_domains_student_idx on public.practice_test_domains(student_id, test_id);
create index practice_test_mistakes_student_idx on public.practice_test_mistakes(student_id, test_id);
create index drills_student_idx on public.drills(student_id, drill_date desc);
create index drill_mistakes_student_idx on public.drill_mistakes(student_id, drill_id);
create index study_plans_student_idx on public.study_plans(student_id, week_of desc);
create index study_days_student_idx on public.study_days(student_id, study_date);
create index daily_tasks_student_idx on public.daily_tasks(student_id, task_date);
create index daily_task_skills_student_idx on public.daily_task_skills(student_id, task_id);
create index books_student_idx on public.books(student_id);
create index learning_resources_student_idx on public.learning_resource_progress(student_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'student');
  return new;
end;
$$;

create or replace function private.can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.student_profiles student
    where student.id = target_student_id
      and (
        student.auth_user_id = (select auth.uid())
        or student.created_by = (select auth.uid())
        or exists (
          select 1
          from public.student_guardians guardian
          where guardian.student_id = student.id
            and guardian.guardian_user_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function private.can_manage_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.student_profiles student
    where student.id = target_student_id
      and (
        student.created_by = (select auth.uid())
        or exists (
          select 1
          from public.student_guardians guardian
          where guardian.student_id = student.id
            and guardian.guardian_user_id = (select auth.uid())
            and guardian.can_manage
        )
      )
  );
$$;

create or replace function private.enforce_student_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.can_manage_student(old.student_id) then
    return new;
  end if;

  if not private.can_access_student(old.student_id) then
    raise exception 'Not authorized to update this task';
  end if;

  if (to_jsonb(new) - array['completed', 'completed_at', 'updated_at'])
     is distinct from
     (to_jsonb(old) - array['completed', 'completed_at', 'updated_at']) then
    raise exception 'Students may only update task completion';
  end if;

  if new.completed is distinct from old.completed then
    new.completed_at = case when new.completed then now() else null end;
  else
    new.completed_at = old.completed_at;
  end if;

  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.can_access_student(uuid) from public;
revoke all on function private.can_manage_student(uuid) from public;
revoke all on function private.enforce_student_task_update() from public;
grant execute on function private.can_access_student(uuid) to authenticated;
grant execute on function private.can_manage_student(uuid) to authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'student_profiles', 'student_skill_progress', 'practice_tests',
    'practice_test_mistakes', 'drills', 'study_plans', 'study_days',
    'daily_tasks', 'books', 'learning_resource_progress'
  ] loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create trigger enforce_student_task_update
  before update on public.daily_tasks
  for each row execute function private.enforce_student_task_update();

insert into public.skill_catalog (id, section, domain, name, description, sort_order) values
  ('rw-central-ideas', 'Reading & Writing', 'Information and Ideas', 'Central ideas and details', 'Identify a text''s main idea and the details that support it.', 10),
  ('rw-command-evidence', 'Reading & Writing', 'Information and Ideas', 'Command of evidence', 'Choose evidence that best supports a claim or conclusion.', 20),
  ('rw-inferences', 'Reading & Writing', 'Information and Ideas', 'Inferences', 'Draw supportable conclusions from what a text states and implies.', 30),
  ('rw-words-context', 'Reading & Writing', 'Craft and Structure', 'Words in context', 'Determine precise word meaning and purpose from context.', 40),
  ('rw-text-structure', 'Reading & Writing', 'Craft and Structure', 'Text structure and purpose', 'Analyze how a text is organized and why it was written.', 50),
  ('rw-cross-text', 'Reading & Writing', 'Craft and Structure', 'Cross-text connections', 'Compare related ideas and viewpoints across texts.', 60),
  ('rw-rhetorical-synthesis', 'Reading & Writing', 'Expression of Ideas', 'Rhetorical synthesis', 'Use notes to meet a specific writing goal.', 70),
  ('rw-transitions', 'Reading & Writing', 'Expression of Ideas', 'Transitions', 'Select transitions that express the intended logical relationship.', 80),
  ('rw-boundaries', 'Reading & Writing', 'Standard English Conventions', 'Boundaries', 'Use punctuation and sentence boundaries correctly.', 90),
  ('rw-form-structure-sense', 'Reading & Writing', 'Standard English Conventions', 'Form, structure, and sense', 'Apply grammar, agreement, and usage conventions.', 100),
  ('math-linear-equations', 'Math', 'Algebra', 'Linear equations in one variable', 'Solve and interpret linear equations in one variable.', 110),
  ('math-linear-functions', 'Math', 'Algebra', 'Linear functions', 'Represent and analyze linear relationships.', 120),
  ('math-systems', 'Math', 'Algebra', 'Systems of linear equations', 'Solve systems and interpret their solutions.', 130),
  ('math-nonlinear', 'Math', 'Advanced Math', 'Nonlinear equations and functions', 'Work with quadratic, exponential, and other nonlinear relationships.', 140),
  ('math-equivalent-expressions', 'Math', 'Advanced Math', 'Equivalent expressions', 'Rewrite expressions into useful equivalent forms.', 150),
  ('math-ratios', 'Math', 'Problem-Solving and Data Analysis', 'Ratios, rates, and proportional relationships', 'Solve multistep ratio, rate, and proportion problems.', 160),
  ('math-percentages', 'Math', 'Problem-Solving and Data Analysis', 'Percentages', 'Reason with percent change and percent relationships.', 170),
  ('math-data', 'Math', 'Problem-Solving and Data Analysis', 'Data and probability', 'Interpret data displays, statistics, and probability.', 180),
  ('math-area-volume', 'Math', 'Geometry and Trigonometry', 'Area and volume', 'Use area, surface area, and volume relationships.', 190),
  ('math-lines-angles', 'Math', 'Geometry and Trigonometry', 'Lines, angles, and triangles', 'Apply angle relationships and triangle properties.', 200)
on conflict (id) do update set
  section = excluded.section,
  domain = excluded.domain,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_guardians enable row level security;
alter table public.skill_catalog enable row level security;
alter table public.student_skill_progress enable row level security;
alter table public.practice_tests enable row level security;
alter table public.practice_test_domains enable row level security;
alter table public.practice_test_mistakes enable row level security;
alter table public.drills enable row level security;
alter table public.drill_mistakes enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_days enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.daily_task_skills enable row level security;
alter table public.books enable row level security;
alter table public.learning_resource_progress enable row level security;

-- Scope grants to PSAT Pathway tables so this migration can safely coexist
-- with unrelated or legacy tables in an existing Supabase project.
revoke all on public.profiles, public.student_profiles, public.student_guardians,
  public.skill_catalog, public.student_skill_progress, public.practice_tests,
  public.practice_test_domains, public.practice_test_mistakes, public.drills,
  public.drill_mistakes, public.study_plans, public.study_days, public.daily_tasks,
  public.daily_task_skills, public.books, public.learning_resource_progress from anon;
revoke all on public.profiles, public.student_profiles, public.student_guardians,
  public.skill_catalog, public.student_skill_progress, public.practice_tests,
  public.practice_test_domains, public.practice_test_mistakes, public.drills,
  public.drill_mistakes, public.study_plans, public.study_days, public.daily_tasks,
  public.daily_task_skills, public.books, public.learning_resource_progress from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.student_profiles, public.student_guardians,
  public.student_skill_progress, public.practice_tests, public.practice_test_domains,
  public.practice_test_mistakes, public.drills, public.drill_mistakes, public.study_plans,
  public.study_days, public.daily_tasks, public.daily_task_skills, public.books,
  public.learning_resource_progress to authenticated;
grant select on public.skill_catalog to authenticated;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "student_profiles_select_accessible" on public.student_profiles
  for select to authenticated using (private.can_access_student(id));
create policy "student_profiles_insert_parent" on public.student_profiles
  for insert to authenticated with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid()) and profile.role = 'parent_admin'
    )
  );
create policy "student_profiles_update_managed" on public.student_profiles
  for update to authenticated using (private.can_manage_student(id)) with check (private.can_manage_student(id));
create policy "student_profiles_delete_managed" on public.student_profiles
  for delete to authenticated using (private.can_manage_student(id));

create policy "student_guardians_select_accessible" on public.student_guardians
  for select to authenticated using (private.can_access_student(student_id));
create policy "student_guardians_insert_managed" on public.student_guardians
  for insert to authenticated with check (private.can_manage_student(student_id));
create policy "student_guardians_update_managed" on public.student_guardians
  for update to authenticated using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id));
create policy "student_guardians_delete_managed" on public.student_guardians
  for delete to authenticated using (private.can_manage_student(student_id));

create policy "skill_catalog_select_authenticated" on public.skill_catalog
  for select to authenticated using (true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_skill_progress', 'practice_tests', 'practice_test_domains',
    'practice_test_mistakes', 'drills', 'drill_mistakes', 'study_plans',
    'study_days', 'daily_task_skills', 'books', 'learning_resource_progress'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.can_access_student(student_id))',
      table_name || '_select_accessible', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.can_manage_student(student_id))',
      table_name || '_insert_managed', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id))',
      table_name || '_update_managed', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.can_manage_student(student_id))',
      table_name || '_delete_managed', table_name
    );
  end loop;
end;
$$;

create policy "daily_tasks_select_accessible" on public.daily_tasks
  for select to authenticated using (private.can_access_student(student_id));
create policy "daily_tasks_insert_managed" on public.daily_tasks
  for insert to authenticated with check (private.can_manage_student(student_id));
create policy "daily_tasks_update_accessible" on public.daily_tasks
  for update to authenticated using (private.can_access_student(student_id)) with check (private.can_access_student(student_id));
create policy "daily_tasks_delete_managed" on public.daily_tasks
  for delete to authenticated using (private.can_manage_student(student_id));

comment on schema private is 'Security helper functions; not exposed through the Data API.';
comment on table public.skill_catalog is 'Generic PSAT 8/9 taxonomy only; contains no student data.';
