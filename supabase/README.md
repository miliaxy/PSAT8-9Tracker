# Supabase setup

This folder defines the private data layer for PSAT Pathway. Migrations contain generic schema and skill taxonomy only—never family or student records.

## Safe setup order

1. Create the Supabase project and apply the migration.
2. Add the project URL and publishable key to `.env.local`.
3. Create the parent's account through the app and confirm its email.
4. In the Supabase SQL editor, promote that one verified account to parent administrator using the placeholder query below.
5. Create and link the private student profile.
6. Import the real tracker data only after access has been tested with both parent and student accounts.

```sql
update public.profiles
set role = 'parent_admin'
where id = (
  select id from auth.users where email = 'PARENT_EMAIL_HERE'
);
```

Do not replace the placeholder in a committed file. Run the edited query only inside the private Supabase project.

## Security model

- New accounts always start as `student`; browser-supplied metadata cannot grant an admin role.
- A parent administrator can create and manage linked student records.
- A linked student can read their own dashboard and update only task completion.
- Unauthenticated users receive no table access.
- The `private` schema contains security-definer helper functions and is not exposed by the Data API.
- All personal-table queries also filter by `student_id`, which supports both clarity and indexed RLS checks.

Never expose the Supabase service-role key in browser code. It bypasses row-level security and belongs only in a trusted server environment if one is added later.
