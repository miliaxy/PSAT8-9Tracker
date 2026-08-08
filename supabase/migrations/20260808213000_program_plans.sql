-- Private, student-specific long-range program plans.
-- This migration creates reusable structure only and contains no student data.

create table if not exists public.program_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  start_date date not null,
  end_date date not null,
  concept_deadline date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  plan jsonb not null default '{"blocks":[]}'::jsonb,
  created_by uuid not null references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= concept_deadline and concept_deadline <= end_date),
  check (jsonb_typeof(plan) = 'object'),
  check (jsonb_typeof(coalesce(plan -> 'blocks', '[]'::jsonb)) = 'array')
);

create index if not exists program_plans_student_idx
  on public.program_plans(student_id, status, start_date desc);

create unique index if not exists program_plans_one_published_per_student_idx
  on public.program_plans(student_id)
  where status = 'published';

drop trigger if exists set_program_plans_updated_at on public.program_plans;
create trigger set_program_plans_updated_at
  before update on public.program_plans
  for each row execute function private.set_updated_at();

alter table public.program_plans enable row level security;

revoke all on public.program_plans from anon;
revoke all on public.program_plans from authenticated;
grant select, insert, update, delete on public.program_plans to authenticated;

drop policy if exists "program_plans_select_accessible" on public.program_plans;
create policy "program_plans_select_accessible" on public.program_plans
  for select to authenticated
  using (
    private.can_access_student(student_id)
    and (status = 'published' or private.can_manage_student(student_id))
  );

drop policy if exists "program_plans_insert_managed" on public.program_plans;
create policy "program_plans_insert_managed" on public.program_plans
  for insert to authenticated
  with check (
    private.can_manage_student(student_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "program_plans_update_managed" on public.program_plans;
create policy "program_plans_update_managed" on public.program_plans
  for update to authenticated
  using (private.can_manage_student(student_id))
  with check (private.can_manage_student(student_id));

drop policy if exists "program_plans_delete_managed" on public.program_plans;
create policy "program_plans_delete_managed" on public.program_plans
  for delete to authenticated
  using (private.can_manage_student(student_id));

comment on table public.program_plans is
  'Private parent-approved long-range learning allocations; student-specific rows never belong in public fixtures.';
