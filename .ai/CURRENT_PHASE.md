# Current phase

FFH-P07 — Goals and monthly check-in

State: BUILDING — **OWNER SCOPE APPROVED** (2026-11-14); financial rules in `docs/FFH-P07_DESIGN.md`
**approved by Ryan as recommended** (2026-11-14); implementation on `claude/ffh-p07-ownership-handoff-6ky7io`
Risk: HIGH (goal savings calculations and new household financial data/RLS)
Owner: Ryan
Phase branch / future phase PR: `phase/ffh-p07-goals-and-check-ins` → `main`
Production baseline: FFH-P06 released via PR #143, merge `8d1a6aaa6e55f9f3369369ddfa1f3cdb3ad62f1c`.

**Production deployment is not authorized by this scope approval.** Merging this phase into `main` is a **separate Production release**, requiring Ryan's explicit exact-head authorization,
the release checklist in `docs/WORKFLOW.md`, and a Production smoke test. Approval of this P07 scope does **not**
authorize a hosted migration, changes to the Money Priority Engine, or any Production action.

## Goal

Help households track named savings goals and make consistent monthly financial check-ins without changing the
existing Money Priority Engine or asserting new financial policy.

## Owner-approved FFH-P07 product scope (2026-11-14)

### 1. Goals tracker

- Household goals have a **name**, **target amount**, **target date**, and **amount saved so far**.
- Show a **calculated monthly savings requirement** to reach the target by its date, with clear explanation of the
  inputs, handling of missing/expired dates, and honest unavailable states.
- **Goals remain a separate tracker** in P07. Do **not** add, rank, deduct, or recommend goal amounts as new steps
  in the Money Priority Engine. Any future integration needs separate Ryan financial-policy approval.

### 2. Monthly financial check-in and history

- A monthly check-in records **manually entered balances** and **whether the household followed that month's plan**
  (yes/no).
- Preserve **historical net-worth and cash-flow snapshots** so previous check-ins can be viewed later.
- Keep saved historical snapshots distinct from current live balances or recalculated plans; no implicit rewriting
  of historical records when current financial details change.
- Builder must document what data populates each snapshot, and how an unknown/unavailable value is represented,
  before implementing a new financial calculation. Do not invent missing amounts or interpretations.

### 3. Household permissions and privacy

- **Owner and member** may create/update goals and check-ins.
- **Viewer** is read-only; cannot edit, submit or delete financial records.
- All reads/writes must be scoped to the signed-in household. Enforce with reviewed migrations/RLS and server
  authorization, not presentation-only buttons. Preserve the one-household-per-user invariant.

## Explicitly deferred beyond FFH-P07

- **“Can we afford it?”** big-purchase scenario.
- **Irregular expenses** and automatic monthly set-asides.
- **Per-paycheck** planning/view.
- **30-day in-app balance update reminders**.

These remain roadmap candidates for separately scoped future phases; do not quietly implement them as part of P07.

## Builder implementation boundaries

- Start with a bounded data model, invariants, RLS matrix additions, synthetic fixtures and reproducible tests,
  then implement the goals and check-in UI. One active Builder on the phase implementation branch.
- Do not change existing Money Priority Engine calculations or priorities. If a monthly-required amount,
  rounding/cadence rule, date-boundary convention, net-worth/cash-flow snapshot definition or missing-value
  treatment is not already defined by a verified reusable source, **propose the specific rule for Ryan's
  approval before implementing it**. Product scope approval alone does not authorize invented financial policy.
- Use synthetic-only data for code, testing, Preview QA and issues. No real account or household data in
  repository/CI/evidence.
- Any hosted schema or configuration change requires **Ryan's explicit per-change authorization**, separate from
  this scope approval; hosted parity must be verified.
- No application changes, provider changes or Production release have been authorized by this documentation sync.

## Done when

- Real tests and exact-head CI green (`fast`, `rls-matrix`, `e2e-isolation` where applicable);
  `npm run verify` passes, and new owner/member/viewer RLS checks are proven against disposable data.
- Browser QA in ChatGPT Work Cloud Browser on approved Preview using synthetic TestA/TestB, plus relevant
  authentication/household regressions.
- Fresh independent **different-model** HIGH-risk audit at the exact frozen application code SHA.
- Hosted migrations only after Ryan authorizes each one; required hosted parity matches documented fingerprint.
- Ryan approves the exact release candidate for merge into `main` as a separate Production decision, and
  post-deployment Production smoke completes **12/12**.
