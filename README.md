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

## Data architecture

The typed domain models live in `src/types/models.ts`. Generic demo fixtures live in `src/data/demoData.ts` and are intentionally separate from the UI.

The current version has no authentication, backend, Supabase client, or Netlify configuration. Its interfaces are structured so private per-student persistence and parent/student roles can be added later without rebuilding the UI model.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite.

## Verify

```bash
pnpm lint
pnpm build
```

## Privacy

This public repository must contain only fictional/demo student data. Do not commit real scores, answers, student records, credentials, secrets, or `.env` files.
