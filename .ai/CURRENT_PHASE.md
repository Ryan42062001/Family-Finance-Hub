# Current phase

FFH-P03 — Your money plan (home screen)

State: BUILDING
Risk: HIGH (shows money recommendations to the household)
Owner: Ryan
Phase branch / PR: `phase/ffh-p03-money-plan` → `main`

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

Make the app answer "what should we do with our money this month?" on the first screen. The existing Money Priority
Engine already ranks recommendations with amounts, reasons, trade-offs and missing data; today it only appears inside
Scenario Lab. This phase shows it as a plain, ordered plan.

## Scope

- **Your money plan** page: the engine's ranked recommendations as steps (rank, title, monthly amount from its
  allocations, status Recommended / Worth considering / Needs more information, explanation, and expandable "why now",
  trade-offs and assumptions). Plan-level feasibility warnings shown as the engine reports them.
- It becomes the signed-in home: first item in the navigation and where sign-in lands. The current Overview stays as
  "Your numbers".
- **What's missing** checklist from the engine's `missingData`, each item linking to the profile section that fixes it.
- Headline badges from existing calculations: **months of cushion** (emergency fund) and **debt-free date** (debt
  payoff at current payments), each shown only when the inputs are complete.
- **Example household**: a read-only demo of the plan built from a fixed synthetic snapshot, reachable signed out
  from the sign-in page. It never reads or writes the database.
- `docs/workflow/QA_CHECKLIST.md` gains money-plan and demo checks.

## Out of scope / boundaries

- No new financial policy: every step, amount and reason comes from the existing engine and calculation modules.
  Presentation may group, order and word things, never change amounts or rules.
- Unknown or invalid inputs fail closed: no step is shown as Recommended when the engine says more information is
  needed.
- No schema, RLS or auth changes. Simple mode, Scenario Lab merging and the other roadmap items are later phases.

## Done when

- CI green (`fast`, `rls-matrix`); `npm run verify` passes.
- Work mode QA on the Preview passes, including the new money-plan checks; Ryan accepts the plan.
- Independent review by a different model (ChatGPT), because this phase is HIGH risk.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
