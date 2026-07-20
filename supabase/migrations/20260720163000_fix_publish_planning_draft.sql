-- Correct the daily task day-id mapping in the parent publishing function.

create or replace function public.publish_planning_draft(target_draft_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_draft public.planning_drafts%rowtype;
  v_week_start date;
  v_plan_id uuid;
  v_day_id uuid;
  v_task_id uuid;
  v_task jsonb;
  v_skill_id text;
  v_task_minutes integer;
  v_total_minutes integer := 0;
  v_available_minutes integer;
  v_task_section text;
begin
  select * into selected_draft
  from public.planning_drafts
  where id = target_draft_id
  for update;

  if not found then
    raise exception 'Planning draft not found';
  end if;

  if not private.can_manage_student(selected_draft.student_id) then
    raise exception 'Only a parent administrator can publish homework';
  end if;

  if selected_draft.status <> 'draft' then
    raise exception 'Only an editable draft can be published';
  end if;

  if jsonb_typeof(selected_draft.draft -> 'tasks') is distinct from 'array' then
    raise exception 'A daily plan must contain an assignments array';
  end if;

  if jsonb_array_length(selected_draft.draft -> 'tasks') < 1
     or jsonb_array_length(selected_draft.draft -> 'tasks') > 8 then
    raise exception 'A daily plan must contain between 1 and 8 assignments';
  end if;

  if coalesce(selected_draft.parent_inputs ->> 'availableMinutes', '') !~ '^[0-9]+$' then
    raise exception 'The daily plan needs a valid available-time limit';
  end if;
  v_available_minutes := (selected_draft.parent_inputs ->> 'availableMinutes')::integer;
  if v_available_minutes < 15 or v_available_minutes > 180 then
    raise exception 'Available study time must be between 15 and 180 minutes';
  end if;

  v_week_start := selected_draft.target_date
    - (extract(isodow from selected_draft.target_date)::integer - 1);

  insert into public.study_plans (student_id, week_of, title, goal)
  values (
    selected_draft.student_id,
    v_week_start,
    'Weekly study plan',
    'Build skill, accuracy, and confident test-day habits.'
  )
  on conflict (student_id, week_of) do update
    set updated_at = now()
  returning id into v_plan_id;

  insert into public.study_days (plan_id, student_id, study_date, day_type, focus, note)
  values (
    v_plan_id,
    selected_draft.student_id,
    selected_draft.target_date,
    coalesce(nullif(selected_draft.draft ->> 'dayType', ''), 'normal'),
    coalesce(nullif(selected_draft.draft ->> 'focus', ''), 'Focused PSAT practice'),
    nullif(selected_draft.draft ->> 'coachNote', '')
  )
  on conflict (plan_id, study_date) do update set
    day_type = excluded.day_type,
    focus = excluded.focus,
    note = excluded.note,
    updated_at = now()
  returning id into v_day_id;

  if exists (
    select 1 from public.daily_tasks existing_task
    where existing_task.day_id = v_day_id and existing_task.completed
  ) then
    raise exception 'Completed homework exists for this date and will not be replaced';
  end if;

  delete from public.daily_tasks existing_task where existing_task.day_id = v_day_id;

  for v_task in select value from jsonb_array_elements(selected_draft.draft -> 'tasks') loop
    if coalesce(v_task ->> 'title', '') = ''
       or coalesce(v_task ->> 'description', '') = ''
       or coalesce(v_task ->> 'category', '') not in ('Learn', 'Drill', 'Review', 'Test strategy', 'Reading')
       or coalesce(v_task ->> 'minutes', '') !~ '^[0-9]+$' then
      raise exception 'Every assignment needs a title, description, valid category, and minutes';
    end if;

    v_task_minutes := (v_task ->> 'minutes')::integer;
    if v_task_minutes < 1 or v_task_minutes > 180 then
      raise exception 'Assignment minutes must be between 1 and 180';
    end if;
    v_total_minutes := v_total_minutes + v_task_minutes;

    v_task_section := nullif(v_task ->> 'section', '');
    if v_task_section is not null and v_task_section not in ('Reading & Writing', 'Math') then
      raise exception 'Assignment section is not valid';
    end if;

    insert into public.daily_tasks (
      day_id,
      student_id,
      task_date,
      title,
      description,
      category,
      section,
      minutes,
      resource
    ) values (
      v_day_id,
      selected_draft.student_id,
      selected_draft.target_date,
      v_task ->> 'title',
      v_task ->> 'description',
      v_task ->> 'category',
      v_task_section,
      v_task_minutes,
      nullif(v_task ->> 'resource', '')
    ) returning id into v_task_id;

    if jsonb_typeof(v_task -> 'skillIds') = 'array' then
      for v_skill_id in select jsonb_array_elements_text(v_task -> 'skillIds') loop
        insert into public.daily_task_skills (task_id, student_id, skill_id)
        select v_task_id, selected_draft.student_id, v_skill_id
        where exists (select 1 from public.skill_catalog catalog where catalog.id = v_skill_id)
        on conflict do nothing;
      end loop;
    end if;
  end loop;

  if v_total_minutes > v_available_minutes then
    raise exception 'The assignments exceed the parent-approved study time';
  end if;

  update public.planning_drafts
  set status = 'archived'
  where student_id = selected_draft.student_id
    and target_date = selected_draft.target_date
    and status = 'draft'
    and id <> selected_draft.id;

  update public.planning_drafts
  set status = 'published', published_at = now()
  where id = selected_draft.id;

  return selected_draft.target_date;
end;
$$;

revoke all on function public.publish_planning_draft(uuid) from public;
grant execute on function public.publish_planning_draft(uuid) to authenticated;

comment on function public.publish_planning_draft(uuid) is
  'Atomically replaces an unstarted day with a reviewed parent planning draft.';
