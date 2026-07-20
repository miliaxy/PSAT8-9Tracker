# PSAT Pathway

A responsive PSAT 8/9 coaching and progress-tracking dashboard built with React, TypeScript, and Vite.

## V1 features

- Today view with assignments, completion state, estimated time, score-to-goal progress, and strategy reminders
- Weekly plan with normal, light, no-study, review, long-session, and lighter-Sunday patterns
- Practice-test score trends for total, Reading & Writing, and Math
- Detailed test records with domain results, strategy metrics, and question-level mistake classifications
- Skill dashboards that keep practice-test evidence separate from daily-drill evidence
- Math concept states and Khan Academy learning-path progress
- Prep-book and independent-reading progress
- Device-local demo task completion using `localStorage`
- Optional Supabase email/password sign-in with private per-student records
- Parent/student ownership rules enforced with PostgreSQL row-level security

## Data architecture

The typed domain models live in `src/types/models.ts`. Generic demo fixtures live in `src/data/demoData.ts` and are intentionally separate from the UI. With no environment variables, the app stays in fictional demo mode. With Supabase configured, it requires sign-in and loads only records the signed-in account may access.

The versioned schema is in `supabase/migrations`. Every personal table has row-level security. Browser code uses only the public Supabase publishable key; a service-role key must never be placed in a `VITE_` variable.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite.

## Connect Supabase

1. Create a Supabase project.
2. Run the migration in `supabase/migrations` with the Supabase CLI or the project SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.
4. Restart `pnpm dev`.

Local Supabase development also requires Docker Desktop:

```bash
pnpm supabase:start
pnpm supabase:reset
```

See `supabase/README.md` for the safe first-parent setup and data-import order.

## Verify

```bash
pnpm lint
pnpm build
```

## Publish

Pushes to `main` are deployed to GitHub Pages. The workflow builds with the repository's `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` Actions secrets; both are public browser configuration values, never service-role or OpenAI secrets.

## Privacy

This public repository must contain only fictional/demo student data. Do not commit real scores, answers, student records, credentials, secrets, or `.env` files.
