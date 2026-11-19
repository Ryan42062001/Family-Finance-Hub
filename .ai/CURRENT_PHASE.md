# Current phase

FFH-P11 — Irregular Expense Set-Asides

State: BUILDING (authorized by Ryan, 2026-11-19)
Risk: HIGH (money calculations, new household-scoped persistence, Supabase schema/RLS, session authorization)
Owner: Ryan
Spec (binding): GitHub issue #172 (11 Owner decisions + 2 safeguards); P10-approved guided-financial-input contract
(`.ai/DECISIONS.md`, 2026-11-19).
Phase branch: `phase/ffh-p11-irregular-expense-set-asides`, started at `d41e92626c9eeb676d0bb8ece6f52be2152d4d3a`
(Production `cc7c70724df7bc3b8e5729cbec1fcd96cf6ef57e` plus the P10 close-out carried forward from draft #193)
Phase PR: #194 (phase → `main`, draft; collects QA, audit and release evidence)
Previous phase: FFH-P10 RELEASED / CLOSED (PR #189, Production smoke 12/12).

**Production deployment is NOT authorized.** Every merge into `main` is a separate Production release requiring
Ryan's explicit exact-SHA authorization. Hosted SQL (this phase's migration), Supabase Auth, Vercel (including moving
the fixed Preview domain), secrets and real data need Ryan's approval per action.

## What P11 builds

- **Set-asides on Bills** (`/bills`, no new menu item): for each scheduled quarterly/yearly expense, an optional tracker
  of the **amount the household reports as set aside** for the active cycle's due date. Shows the bill amount, the P09
  monthly planning amount (already budgeted, unchanged), reported amount, still needed, surplus, progress, saving
  periods and a catch-up suggestion (exact cents, rounded up) only when meaningful. Honest states: funded, in progress,
  due now, cycle confirmation needed. Explicit next-cycle confirmation with a typed carryover; stop tracking keeps the
  bill. Non-mutating notes on the 12-month forecast.
- Code: `lib/bills/set-aside*.ts`, `lib/supabase/set-asides.ts`, `app/bills/SetAsides.tsx`, `app/bills/set-aside-actions.ts`.
- **Migration** `20261119100000_ffh_p11_bill_set_asides.sql`: table `public.bill_set_asides` (composite FK to
  `expenses(id, household_id)` on delete cascade, one per expense, version-guarded), RLS via the session-gated household
  helpers. One-paste hosted file `scripts/hosted/apply-20261119100000.sql` (needs Ryan's authorization).
- Never read by the plan, its snapshot, the Money Priority Engine or the exports.
- QA rows Q58–Q69.

## Status (2026-11-19)

- Built and merged into the phase branch: #195 (build), #196 (pre-migration compatibility), #197 (pre-freeze
  `/code-review high` fixes + the Ryan-approved P07 check-in account-deletion fix). `fast` + `rls-matrix` green on each.
- Hosted migration applied by Ryan: 17/17 PASS (27 migrations, parity 9/9). Production smoke 12/12 afterwards.
- Fixed Preview serves the phase branch; Preview smoke 12/12. Next: `e2e-isolation` on the exact head, Browser QA
  Q58–Q69, freeze a candidate, one independent different-model HIGH-risk audit.
