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
- **Profile fields for facts the plan asks for** (round 2, Ryan 2026-11-13). The columns already exist, so there is no
  migration: insurance deductibles (new Insurance section), retirement-account details (employer match, year-to-date
  contributions except on HSA rows, plan-eligible pay), retirement goals (desired monthly spending in today's dollars,
  Social Security, pension; one preferences row per household), optional gross pay on income, and what an account's
  cash is for (only purposes that need no linked goal or debt; linked ones are kept). Every value list mirrors a
  database check, and writes stay scoped to the user's household through the existing RLS policies.
- Plain-language wording for the engine's common sentences (exact-sentence matches only; original kept as
  "technical wording").
- Sign-in and sign-up say "already signed in as …" with Sign out (QA #108 lesson).
- `docs/workflow/QA_CHECKLIST.md` gains money-plan, demo, profile-detail and signed-in checks (Q13–Q17).

## Out of scope / boundaries

- No new financial policy: every step, amount and reason comes from the existing engine and calculation modules.
  Presentation may group, order and word things, never change amounts or rules.
- Unknown or invalid inputs fail closed: no step is shown as Recommended when the engine says more information is
  needed.
- No schema or RLS changes. Auth changes are limited to the public `/demo` path and the signed-in notice. Simple mode,
  Scenario Lab merging and the other roadmap items are later phases.

## Done when

- CI green (`fast`, `rls-matrix`); `npm run verify` passes.
- Work mode QA on the Preview passes, including the new money-plan checks; Ryan accepts the plan.
- Independent review by a different model (ChatGPT), because this phase is HIGH risk.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
