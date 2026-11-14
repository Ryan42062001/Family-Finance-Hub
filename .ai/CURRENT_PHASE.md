# Current phase

FFH-P07 — Goals and monthly check-in

State: PLANNED (decisions from Ryan needed before building)
Risk: HIGH (new money calculations and new household data, with RLS)
Owner: Ryan
Phase branch / PR: `phase/ffh-p07-goals-and-check-ins` → `main`

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

Help a household work toward named goals and keep the plan current: goals with target dates and the monthly amount
needed, and a monthly check-in with history of net worth and cash flow.

## Scope (roadmap item 5)

- Goals: name, target amount, target date, amount saved so far; the monthly amount needed to reach it on time.
- Monthly check-in ("did you do this month's plan?") that records a snapshot, with history of net worth and cash flow.
- Also listed under item 5, to be split into later phases if the scope is too large for one reviewed phase:
  "Can we afford it?", irregular costs as a monthly set-aside, a per-paycheck view, and an in-app balance reminder
  after 30 days.

## Decisions needed from Ryan before building (no financial policy is invented)

- Which parts of item 5 belong in FFH-P07 and which move to a later phase.
- How goals relate to the money plan (for example, whether a goal's monthly amount appears as a plan step, and its
  order relative to the engine's existing steps), or whether goals stay a separate tracker for now.
- What a check-in records (balances entered by hand, a yes/no on the month's plan, or both) and who in the household
  may do it (owner and member, not viewer, by default).

## Out of scope / boundaries

- No change to existing money-engine calculations unless Ryan decides it. Synthetic data only.

## Done when

- CI green (`fast`, `rls-matrix`, `e2e-isolation`); `npm run verify` passes; the RLS matrix covers any new tables.
- Work mode QA on the Preview for the new screens, and independent review by a different model (ChatGPT).
- Any hosted migration applied with Ryan's authorization and hosted parity matching.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
