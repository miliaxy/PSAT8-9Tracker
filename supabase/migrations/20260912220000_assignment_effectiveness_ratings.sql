alter table public.assignment_notes add column effectiveness_rating integer
  check (effectiveness_rating between 1 and 5);
-- The existing nonblank body is the required rationale. Keep ordinary notes optional-rating.
create function public.add_assignment_rating(note_id uuid, target_student_id uuid, target_task_id uuid, rating integer, rationale text)
returns public.assignment_notes language plpgsql security definer set search_path = '' as $$
declare n public.assignment_notes%rowtype;
begin
  if not private.can_access_student(target_student_id) then raise exception 'This student is not available to your account'; end if;
  if rating is null or rating not between 1 and 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  if rationale is null or length(btrim(rationale)) not between 1 and 4000 then raise exception 'Explain your rating (1 to 4000 characters)'; end if;
  select * into n from public.assignment_notes where id = note_id for update;
  if found and n.effectiveness_rating is distinct from rating then raise exception 'This save identifier has already been used'; end if;
  -- Reuse family/task validation, snapshots and retry checks from ordinary notes.
  n := public.add_assignment_note(note_id,target_student_id,target_task_id,'note',rationale);
  update public.assignment_notes set effectiveness_rating = rating where id = n.id returning * into n;
  return n;
end $$;
revoke all on function public.add_assignment_rating(uuid,uuid,uuid,integer,text) from public;
grant execute on function public.add_assignment_rating(uuid,uuid,uuid,integer,text) to authenticated;
