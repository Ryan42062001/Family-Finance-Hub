# Current phase

FFH-P05 — Simple mode with guided setup

State: BUILDING
Risk: HIGH (a schema migration on the self-scoped profiles table, and a guided setup that writes household data)
Owner: Ryan
Phase branch / PR: `phase/ffh-p05-simple-mode` → `main`

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

Make the app easy for someone who wants a plan without the detail (Ryan's friend): a per-user **Simple mode** switch
and a short guided setup that goes straight to the money plan. Detailed mode stays exactly as it is.

## Scope (roadmap item 3)

- **Simple mode switch, stored per user** (Ryan, 2026-11-13): a `simple_mode` column on `profiles`, off by default.
  Each signed-in person turns their own view on or off; it never changes what anyone else in the household sees.
  `profiles` is already self-scoped by RLS (select/insert/update only your own row), so no new policy is needed. The
  migration is in a reviewed PR, and the RLS matrix gains checks that nobody can read or change another user's
  setting.
- With Simple mode on, the app hides Scenario Lab, the HSA/SIMPLE IRA pages, chart details and most planning tools.
  Your plan and the essentials stay. Hiding is presentation only: the pages and the data are unchanged.
- **Guided setup, offered to every new household** (Ryan, 2026-11-13), with a way to skip it: about five questions (take-home pay, fixed bills, other spending, debts, savings) that saves
  through the existing validated profile actions, then opens Your plan. No new financial policy: the plan still
  comes only from the Money Priority Engine.
- **Install on the phone home screen**: a web app manifest and icons.
- QA checklist and the automated isolation check updated for the new screens.

## Decisions (Ryan, 2026-11-13)

- Simple mode is per user, not per household, so each person sees the view they want.
- The guided setup is offered to every new household (it can be skipped).

## Out of scope / boundaries

- No change to the money calculations or the engine's recommendations.
- Synthetic data only; no real household or financial data.

## Done when

- CI green (`fast`, `rls-matrix`, `e2e-isolation`); `npm run verify` passes; the RLS matrix covers the new setting.
- Work mode QA on the Preview, and independent review by a different model (ChatGPT), because this phase is HIGH risk.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
