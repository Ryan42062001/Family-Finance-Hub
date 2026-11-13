# Current phase

FFH-P04 — Automated sign-in and isolation tests

State: BUILDING
Risk: HIGH (authentication, household isolation and secrets handling)
Owner: Ryan
Phase branch / PR: `phase/ffh-p04-auto-isolation-tests` → `main`

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

Prove on every phase Preview, automatically and without anyone typing a password, that each synthetic test account
signs in as itself, sees only its own household, can load the money plan, and is fully signed out afterwards. Work
mode then focuses on look-and-feel and new screens.

## Scope

- A Playwright test suite (`tests/e2e/`) that, against a deployed Preview:
  - signs in as TestA, checks the "Signed in as" email and the household name, opens Your plan, Overview, Financial
    profile, Planning and Scenario Lab, and checks that no TestB marker (`ZZ-B-…` records, TestB's household name)
    appears; then signs out and checks that a protected page sends it back to Sign in;
  - does the same for TestB in the other direction (Q3, Q7, Q8 as automated checks);
  - reads only, apart from signing in and out; adds or changes no data.
- A GitHub Actions workflow that runs the suite when Vercel reports a successful Preview deployment of a
  `phase/...` branch (and on manual dispatch with a URL). Credentials come only from encrypted Actions secrets
  (`FFH_E2E_A_EMAIL`, `FFH_E2E_A_PASSWORD`, `FFH_E2E_B_EMAIL`, `FFH_E2E_B_PASSWORD`), which Ryan adds in GitHub
  settings. They are never printed, never written to files or artifacts, and screenshots/traces are not uploaded.
  Missing secrets make the run report BLOCKED, never PASS.
- The workflow refuses to run against Production or any host other than the Preview, and runs with read-only
  repository permissions.
- `docs/WORKFLOW.md` and the QA checklist note which checks are now automated.

## Out of scope / boundaries

- No app, schema, RLS or auth changes. No real data; synthetic TestA/TestB only.
- The tests never create, edit or delete records or accounts.

## Done when

- CI green (`fast`, `rls-matrix`); `npm run verify` passes.
- The new workflow passes against the phase Preview with Ryan's secrets in place, and fails (as a negative control)
  when pointed at a deliberately wrong expected identity.
- Independent review by a different model (ChatGPT), because this phase is HIGH risk.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
