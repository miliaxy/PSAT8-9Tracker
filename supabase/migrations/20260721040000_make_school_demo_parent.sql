-- Model the dedicated school demo as a parent/guardian viewing a fictional student.

do $$
declare
  demo_user constant uuid := '459de374-cd1d-4e82-9097-05033c0814eb';
  demo_student constant uuid := '9f71311b-38e6-4279-beed-76dbe7cecca5';
begin
  if not exists (
    select 1 from public.profiles
    where id = demo_user and display_name = 'School Demo'
  ) or not exists (
    select 1 from public.student_profiles
    where id = demo_student and first_name = 'Jordan' and created_by = demo_user
  ) then
    return;
  end if;

  update public.profiles
  set role = 'parent_admin',
      display_name = 'School Demo Parent',
      updated_at = now()
  where id = demo_user;

  update public.student_profiles
  set auth_user_id = null,
      updated_at = now()
  where id = demo_student and auth_user_id = demo_user;

  insert into public.student_guardians (
    student_id, guardian_user_id, relationship, can_manage
  ) values (
    demo_student, demo_user, 'parent / guardian demo', true
  ) on conflict (student_id, guardian_user_id) do update
    set relationship = excluded.relationship,
        can_manage = excluded.can_manage;
end $$;
