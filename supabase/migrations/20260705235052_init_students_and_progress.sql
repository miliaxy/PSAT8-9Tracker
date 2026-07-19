-- Students belong to a signed-in parent (auth.users). One parent, many kids.
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  grade text default '8',
  exam text not null default 'psat_8_9',
  target_score int,
  test_date date,
  baseline jsonb default '{}'::jsonb,
  schedule jsonb default '{}'::jsonb,
  blackouts jsonb default '[]'::jsonb,
  resources jsonb default '{"khan":true,"princeton":true}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists student_progress (
  student_id uuid primary key references students (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table students enable row level security;
alter table student_progress enable row level security;

drop policy if exists "own students" on students;
create policy "own students" on students
  for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

drop policy if exists "own progress" on student_progress;
create policy "own progress" on student_progress
  for all
  using (exists (select 1 from students s where s.id = student_id and s.parent_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = student_id and s.parent_id = auth.uid()));

create index if not exists idx_students_parent on students (parent_id);;
