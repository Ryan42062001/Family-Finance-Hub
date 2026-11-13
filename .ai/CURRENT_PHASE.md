# Current phase

FFH-P05 — Simple mode with guided setup

State: BUILDING
Risk: HIGH (a schema/RLS migration for the per-household switch, and a guided setup that writes household data)
Owner: Ryan
Phase branch / PR: `phase/ffh-p05-simple-mode` → `main`

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

Make the app easy for someone who wants a plan without the detail (Ryan's friend): a per-household **Simple mode**
switch and a short guided setup that goes straight to the money plan. Detailed mode stays exactly as it is.

## Scope (roadmap item 3)

- **Simple mode switch**, stored per household. Off by default; a household can turn it on or off. Adding the setting
  is a migration with RLS in a reviewed PR, covered by the RLS matrix.
- With Simple mode on, the app hides Scenario Lab, the HSA/SIMPLE IRA pages, chart details and most planning tools.
  Your plan and the essentials stay. Hiding is presentation only: the pages and the data are unchanged.
- **Guided setup** of about five questions (take-home pay, fixed bills, other spending, debts, savings) that saves
  through the existing validated profile actions, then opens Your plan. No new financial policy: the plan still
  comes only from the Money Priority Engine.
- **Install on the phone home screen**: a web app manifest and icons.
- QA checklist and the automated isolation check updated for the new screens.

## Open questions for Ryan (settle before building)

- Who may switch Simple mode: only the household owner, or any member?
- Is the guided setup offered to every new household, or only when Simple mode is on?

## Out of scope / boundaries

- No change to the money calculations or the engine's recommendations.
- Synthetic data only; no real household or financial data.

## Done when

- CI green (`fast`, `rls-matrix`, `e2e-isolation`); `npm run verify` passes; the RLS matrix covers the new setting.
- Work mode QA on the Preview, and independent review by a different model (ChatGPT), because this phase is HIGH risk.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
