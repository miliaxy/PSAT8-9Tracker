-- Enforce the same instructional guardrails for every publication path,
-- including drafts edited outside the browser recommendation engine.

create or replace function private.validate_planning_draft_roadmap()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  task jsonb;
  task_text text;
  task_title text;
  task_category text;
  current_skill_id text;
  skill_state text;
  recent_attempted integer;
  recent_correct integer;
  roadmap_skill_ids jsonb;
  advances_milestone boolean := false;
  has_coaching_work boolean := false;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  if coalesce(new.draft ->> 'dayType', '') = 'no-study' then
    return new;
  end if;

  if jsonb_typeof(new.evidence_summary -> 'roadmap') is distinct from 'object'
     or jsonb_typeof(new.evidence_summary -> 'roadmap' -> 'prioritySkillIds') is distinct from 'array' then
    raise exception 'Refresh this draft against the active score roadmap before publishing';
  end if;

  roadmap_skill_ids := new.evidence_summary -> 'roadmap' -> 'prioritySkillIds';

  for task in select value from jsonb_array_elements(new.draft -> 'tasks')
  loop
    task_title := trim(coalesce(task ->> 'title', ''));
    task_category := coalesce(task ->> 'category', '');
    task_text := concat_ws(' ', task_title, task ->> 'description', task ->> 'resource');

    if task_category not in ('Reading', 'Practice test', 'Test strategy')
       and lower(task_title) <> 'parent priority' then
      has_coaching_work := true;
      if jsonb_typeof(task -> 'skillIds') is distinct from 'array'
         or jsonb_array_length(task -> 'skillIds') = 0 then
        raise exception 'Every learning, review, or drill assignment must be linked to an official PSAT 8/9 skill';
      end if;
    end if;

    if task_category = 'Drill' then
      if task_text !~* '[0-9]+[^.]{0,25}questions?' then
        raise exception 'Every drill needs an exact question count';
      end if;
      if task_text !~* '(Easy|Medium|Hard)' then
        raise exception 'Every drill must name its exact difficulty mix';
      end if;
      if task_text ~* 'College Board' and task_text !~* 'Exclude Active Questions' then
        raise exception 'College Board drills must keep Exclude Active Questions turned on';
      end if;
    end if;

    if jsonb_typeof(task -> 'skillIds') = 'array' then
      for current_skill_id in select jsonb_array_elements_text(task -> 'skillIds')
      loop
        if roadmap_skill_ids ? current_skill_id then advances_milestone := true; end if;

        select progress.concept_state into skill_state
        from public.student_skill_progress progress
        where progress.student_id = new.student_id and progress.skill_id = current_skill_id;

        if not found then
          raise exception 'Every linked skill needs a saved student-progress record';
        end if;

        if task_category = 'Drill' and skill_state in ('not_yet_taught', 'learning') then
          raise exception 'A concept that is not yet learned cannot be assigned as a drill';
        end if;

        if task_category = 'Drill' and task_text ~* 'Hard' then
          select coalesce(sum(recent.attempted), 0)::integer,
                 coalesce(sum(recent.correct), 0)::integer
          into recent_attempted, recent_correct
          from (
            select drill.attempted, drill.correct
            from public.drills drill
            where drill.student_id = new.student_id
              and drill.skill_id = current_skill_id
              and drill.drill_date < new.target_date
              and drill.difficulty in ('Easy', 'Medium', 'Mixed')
            order by drill.drill_date desc, drill.created_at desc, drill.id desc
            limit 5
          ) recent;

          if recent_attempted < 20
             or recent_correct::numeric / nullif(recent_attempted, 0) < 0.95 then
            raise exception 'Hard questions are locked until recent Easy/Medium evidence reaches 95%% across at least 20 questions';
          end if;
        end if;
      end loop;
    end if;
  end loop;

  if extract(isodow from new.target_date) between 1 and 5
     and has_coaching_work
     and not advances_milestone then
    raise exception 'At least one assignment must advance the active weekly score-roadmap milestone';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_planning_draft_roadmap() from public;

drop trigger if exists validate_planning_draft_roadmap_before_publish on public.planning_drafts;
create trigger validate_planning_draft_roadmap_before_publish
  before update of status on public.planning_drafts
  for each row execute function private.validate_planning_draft_roadmap();

comment on function private.validate_planning_draft_roadmap() is
  'Blocks publication when a plan is disconnected from the active score roadmap or violates core instructional safeguards.';
