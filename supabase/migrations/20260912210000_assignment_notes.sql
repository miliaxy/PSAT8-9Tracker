-- Private assignment feedback, retained when an unstarted plan is replaced.
create table public.assignment_notes (
  id uuid primary key,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  task_id uuid references public.daily_tasks(id) on delete set null,
  task_title text not null,
  task_date date not null,
  task_resource text,
  author_id uuid not null,
  author_role text not null check (author_role in ('student', 'parent')),
  kind text not null check (kind in ('note','blocked','unclear','completed','easy','difficult')),
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  planning_response text check (length(planning_response) <= 2000)
);
create index assignment_notes_student_date on public.assignment_notes(student_id, created_at desc);
create index assignment_notes_task on public.assignment_notes(task_id);
alter table public.assignment_notes enable row level security;
revoke all on public.assignment_notes from anon, authenticated;
grant select on public.assignment_notes to authenticated;
create policy assignment_notes_read_family on public.assignment_notes for select to authenticated
using (private.can_access_student(student_id));

create function public.add_assignment_note(note_id uuid, target_student_id uuid, target_task_id uuid, note_kind text, note_body text)
returns public.assignment_notes language plpgsql security definer set search_path = '' as $$
declare t public.daily_tasks%rowtype; n public.assignment_notes%rowtype;
begin
  if not private.can_access_student(target_student_id) then raise exception 'This student is not available to your account'; end if;
  if note_kind is null or note_kind not in ('note','blocked','unclear','completed','easy','difficult')
    or note_body is null or length(btrim(note_body)) not between 1 and 4000 then raise exception 'Choose a note type and enter 1 to 4000 characters'; end if;
  -- Safe retries after an uncertain network response never duplicate the note.
  select * into n from public.assignment_notes where id = note_id;
  if found then
    if n.author_id = auth.uid() and n.student_id = target_student_id and n.task_id = target_task_id
       and n.kind = note_kind and n.body = btrim(note_body) then return n; end if;
    raise exception 'This save identifier has already been used';
  end if;
  select * into t from public.daily_tasks where id = target_task_id and student_id = target_student_id for share;
  if not found then raise exception 'This assignment has changed. Copy your note and refresh the plan before saving.'; end if;
  insert into public.assignment_notes(id,student_id,task_id,task_title,task_date,task_resource,author_id,author_role,kind,body)
  values(note_id,target_student_id,t.id,t.title,t.task_date,t.resource,auth.uid(),
    case when private.can_manage_student(target_student_id) then 'parent' else 'student' end,note_kind,btrim(note_body)) returning * into n;
  return n;
end $$;

create function public.review_assignment_note(target_note_id uuid, response text)
returns public.assignment_notes language plpgsql security definer set search_path = '' as $$
declare n public.assignment_notes%rowtype;
begin
  select * into n from public.assignment_notes where id = target_note_id for update;
  if not found or not private.can_manage_student(n.student_id) then raise exception 'Only a linked parent can review this note'; end if;
  if response is null or length(btrim(response)) not between 1 and 2000 then raise exception 'Explain how this feedback affects the plan (1 to 2000 characters)'; end if;
  update public.assignment_notes set planning_response = btrim(response),reviewed_at = now() where id = target_note_id returning * into n;
  return n;
end $$;
revoke all on function public.add_assignment_note(uuid,uuid,uuid,text,text) from public;
revoke all on function public.review_assignment_note(uuid,text) from public;
grant execute on function public.add_assignment_note(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.review_assignment_note(uuid,text) to authenticated;

-- Every publication route must acknowledge feedback, including server-side callers.
create function private.require_assignment_feedback_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and old.status is distinct from 'published'
     and exists (select 1 from public.assignment_notes where student_id = new.student_id and reviewed_at is null) then
    raise exception 'Review new assignment notes and save a planning response before publishing';
  end if;
  return new;
end $$;
revoke all on function private.require_assignment_feedback_review() from public;
create trigger planning_feedback_review before update of status on public.planning_drafts
for each row execute function private.require_assignment_feedback_review();
