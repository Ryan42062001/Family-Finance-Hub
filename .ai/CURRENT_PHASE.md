# Current phase

FFH-P07 — Goals and monthly check-in

State: PLANNED — scope APPROVED by Ryan on 2026-11-14; implementation NOT STARTED
Risk: HIGH (household-owned goal/check-in data, new monthly-savings calculations, RLS)
Owner: Ryan
Phase branch: `phase/ffh-p07-goals-and-check-ins`
Baseline prior to this documentation change: `2253fdfb46f5b8114f5f8a84017c3697a1525dda`
Production baseline: FFH-P06, merged PR #143 at `8d1a6aaa6e55f9f3369369ddfa1f3cdb3ad62f1c`

Every merge into `main` is a Production release and requires a NEW, explicit, exact-SHA authorization
from Ryan, the release checklist in `docs/WORKFLOW.md`, and 12/12 Production smoke afterward.
Production deployment is NOT authorized by this FFH-P07 scope approval. It does not authorize a
merge to `main`, any hosted Supabase/Vercel change, use of real data, or a new financial policy.

## Goal

Help a household track named savings goals and perform a monthly financial check-in, with understandable
historical net worth and cash-flow snapshots. Keep these new capabilities separate from the existing
Money Priority Engine in FFH-P07.

## Owner-approved FFH-P07 scope (2026-11-14)

### 1. Standalone goals tracker

- Each goal has a name, target amount, target date, and amount saved so far.
- Display a monthly savings requirement to meet the goal's remaining target by its deadline.
- Goals are **tracking/informational only** for this phase. Do not insert goal amounts as engine plan
  steps, change engine ordering, change debt/savings priorities, divert funds, or imply automatic transfers.
- The Builder must present and test a deterministic, explicitly documented date/month-count convention,
  rounding/cents policy, and edge behavior (already funded, overdue/near-term date, zero/invalid
  target) before treating the amount as validated financial guidance. Do not invent a new budgeting
  or investment rule.

### 2. Monthly household check-in

- Let an owner or member enter or update manual financial balances for a check-in, indicate whether
  the household followed that month's plan (yes/no), and see dated history of net worth and cash
  flow snapshots.
- Make clear what snapshot fields and sources mean. A check-in must not silently rewrite existing
  underlying accounts, debt, income, expenses, or Money Priority Engine inputs.
- Specify the household's check-in month identity, balance field definitions, history/snapshot
  behavior and cash-flow computation/provenance in the Builder's design for review before coding.
  Do not invent actual balances or infer missing facts as confirmed.

### 3. Household permissions and security

- Owners and members can create/edit goals and submit/update check-ins for **their own household**.
- Viewers may read their own household's goals/check-in history but **cannot** create/edit/delete them.
- Members/viewers cannot see, mutate, or infer another household's data. Use reviewed migrations,
  RLS and adversarial matrix probes for every new table/function. Preserve the existing
  one-household-per-account invariant and all authentication boundaries.
- Use synthetic TestA/TestB data only in QA, CI, screenshots and reports.

## Explicitly deferred beyond FFH-P07

- `Can we afford it?` large-purchase planning.
- Irregular yearly/quarterly costs as monthly set-asides.
- Per-paycheck plan view.
- In-app reminder to update balances after 30 days (email reminders remain separately deferred).

These are **not** FFH-P07 implementation or acceptance criteria. Plan them as separately scoped
future phases with independent Owner decisions and required audits.

## Implementation and product guardrails

- **No modifications to existing Money Priority Engine calculations or ordering.** The new goal
  calculation is limited to the clearly labeled, separate goal tracker.
- Builder: Claude Code (single active source Builder). Work Cloud Browser QA and a fresh
  different-model ChatGPT reviewer remain independent. Read `docs/WORKFLOW.md`.
- Builder starts with a concise schema/formula/snapshot design and scoped test plan. Unresolved
  detailed financial-convention choices are surfaced to Ryan, not silently assumed.
- Implement source, SQL migrations/RLS, tests and screens on reviewed feature branches/PRs.
  Hosted migrations, provider configuration and real-data operations each require Ryan's
  separate explicit approval.

## Done when

- The agreed goal and monthly check-in experiences work with synthetic owner/member/viewer roles,
  and all calculations are deterministic, tested and clearly labeled.
- `npm run verify` and required `fast`, `rls-matrix`, and `e2e-isolation` checks pass on the
  intended exact SHA; required role/isolation/adversarial tests cover new tables.
- Authorized non-production Preview tested by ChatGPT Work, with a complete PASS/FAIL/NOT RUN
  report for new screens and applicable auth/financial regressions.
- Fresh independent different-model HIGH-risk source/release review passes at the exact frozen
  candidate SHA; BLOCKER/CRITICAL/HIGH findings are fixed and re-reviewed.
- Ryan separately authorizes each hosted migration and verifies parity; then explicitly approves
  a particular `main` production merge after the release checklist; Production smoke passes 12/12.
