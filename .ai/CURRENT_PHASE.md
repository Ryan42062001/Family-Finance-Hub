# Current phase

FFH-P09 — Bills, due dates & exports

State: BUILDING — source implementation authorized by Ryan (2026-11-18) within issue #170's approved scope; hosted
changes, Preview reassignment and Production each need Ryan's separate approval
Risk: HIGH (money input representation, schema change on financial tables, household RLS, data export)
Owner: Ryan
Spec (binding): GitHub issue #170 (Owner-approved product decisions and invariants)
Phase branch: `phase/ffh-p09-bills-exports` (from Production `2a62022b5e5ae9d60a32fd7ac6745ffb4366e904`)
Phase PR: #178 (draft, into the phase branch)
Previous phase: FFH-P08 RELEASED / CLOSED (PR #176, Production smoke 12/12); its close-out (draft #177) is carried here.

**Production deployment is NOT authorized.** Every merge into `main` is a separate Production release requiring
Ryan's explicit exact-SHA authorization. Hosted SQL, Supabase Auth, Vercel, secrets and real data need Ryan's
approval per action.

## What P09 builds

- Expenses: actual payment + recurrence (monthly / quarterly / yearly); `monthly_amount` (the engine's only input) is
  derived in the database in exact cents, rounded up. Debts: monthly minimum payments unchanged.
- Optional due-date anchor and household-wide reminder (Off / due day / 1 / 3 / 7 days) on expenses and debts.
- `/bills`: Upcoming 30 days, All bills, Unscheduled, Due soon, collapsed current+11-month forecast of actual payments.
- Your plan: upcoming-bills summary; `/plan/print` (browser Save as PDF); `/plan/steps-csv` (formula-safe CSV).
- Account-menu entry "Bills & due dates"; no new bottom tab. Payment tracking is out of scope.

## Status

- Build: done in PR #178 (migration `20261118120000`, app, tests). Local: verify green; matrix 1235, coverage 10/10,
  upgrade check PASS.
- Next: CI green on #178 → merge to phase → Ryan's hosted steps (`docs/workflow/FFH-P09_HOSTED_CHANGES.md`) and
  Preview reassignment → Preview smoke + QA Q38–Q45 → one independent different-model HIGH-risk audit at a frozen
  SHA → fixes/recheck → Ryan's exact-SHA release decision → Production smoke 12/12.
