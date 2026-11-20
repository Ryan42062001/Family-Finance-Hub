# Current phase

FFH-P12 — Per-Paycheck Financial Planning

State: BUILDING
Risk: HIGH (money calculations and cash-flow timing, new household-scoped table, Supabase schema/RLS, P08 session/MFA,
financial noninterference)
Owner: Ryan
Spec (binding): GitHub issue #203 (all Owner-approved defaults + three binding safeguards: cross-month bills, paycheck vs
monthly income reconciliation, honest unfunded priorities). Also binding: the P10 guided-financial-input contract and
the P11 database-boundary contract for a new household table (`.ai/DECISIONS.md`, 2026-11-19 and 2026-11-20).
Activation: Ryan's FFH-P12 Fresh Primary Builder activation (2026-11-20) authorizes nonproduction implementation of all
of #203. Phase branch: `phase/ffh-p12-per-paycheck-planning`, started at `458b45a6aee5a1ef4e36a341a55331658dc06052`
(Production `8842f607432db2b07705e19c53542d0006b5df82` plus the P11 close-out carried forward from draft #202).
Previous phase: FFH-P11 RELEASED / CLOSED (PR #194, Production smoke 12/12).

**Production deployment is NOT authorized.** Every merge into `main` is a separate Production release requiring Ryan's
explicit exact-SHA authorization. Hosted SQL, Supabase Auth, Vercel (including moving the fixed Preview domain),
secrets and real data need Ryan's approval per action. P13 is not started.

## What P12 builds

- **Plan upcoming paychecks** (`/plan/paychecks`, entered from Your plan; no new navigation item). Optional per-income
  schedule facts (frequency, expected net per deposit, next expected date, semimonthly day anchors); everything else is
  derived on each request from a fresh server snapshot: a 60-day deposit timeline, P09 actual bills per interval
  (cross-month, pre-payday, due-on-payday caution), monthly-average envelopes for unscheduled spending, the unchanged
  Money Priority Engine recommendations apportioned to deposits in exact cents, honest shortfalls/unfunded priorities,
  income mismatch disclosure and P11 reported reserves as context only.
- New table `public.income_pay_schedules` (one per income source), built to the P11 database-boundary contract.
- Nothing else is written: no allocations, balances, completions or history; monthly income stays authoritative.
- QA rows Q70–Q84.

## Status (2026-11-20)

- Build PR #205 (dev → phase): migration `20261120200000` (`income_pay_schedules`, P11 DB-boundary contract), matrix
  1403 (+84), races 4/4 (CI), one-paste `scripts/hosted/apply-20261120200000.sql` (+ checks), `lib/paychecks/*`,
  `/plan/paychecks` (detailed + Simple), entry button on Your plan, QA rows Q70–Q84.
- Hosted migration: NOT applied (needs Ryan's separate approval). Preview domain: still on P11 (needs Ryan).
- Builder choices flagged for Ryan: `.ai/DECISIONS.md` ("FFH-P12 Builder implementation choices").
