# Current phase

FFH-P09 — Bills, due dates & exports

State: CLOSED — released to Production (Ryan's explicit authorization, 2026-11-19) via PR #186, merge
`83979c1c9e3b6f2e6ac1f26f3d5643c8f98061db` from phase head `d4de2a1c9ae91ee92566b42d3f1d3d3faba748bf`; Production smoke 12/12
Risk: HIGH (money input representation, schema change on financial tables, household RLS, data export)
Owner: Ryan
Spec (binding): GitHub issue #170 (Owner-approved product decisions and invariants)
Phase branch: `phase/ffh-p09-bills-exports` (from Production `2a62022b5e5ae9d60a32fd7ac6745ffb4366e904`)
Phase PR: #178 (draft, into the phase branch)
Previous phase: FFH-P08 RELEASED / CLOSED (PR #176, Production smoke 12/12); its close-out (draft #177) is carried here.

**Production deployment is NOT authorized.** Every merge into `main` is a separate Production release requiring
Ryan's explicit exact-SHA authorization. Hosted SQL, Supabase Auth, Vercel, secrets and real data need Ryan's
approval per action.

## What P09 builds

- Expenses: actual payment + recurrence (monthly / quarterly / yearly); `monthly_amount` (the engine's only input) is
  derived in the database in exact cents, rounded up. Debts: monthly minimum payments unchanged.
- Optional due-date anchor and household-wide reminder (Off / due day / 1 / 3 / 7 days) on expenses and debts.
- `/bills`: Upcoming 30 days, All bills, Unscheduled, Due soon, collapsed current+11-month forecast of actual payments.
- Your plan: upcoming-bills summary; `/plan/print` (browser Save as PDF); `/plan/steps-csv` (formula-safe CSV).
- Account-menu entry "Bills & due dates"; no new bottom tab. Payment tracking is out of scope.

## Release readiness (2026-11-19)

- **Candidate:** phase head after this release-prep PR (the release PR names the exact SHA). App code last changed at
  `dceba8db0deaef7c7794f8218af5509365ab21bb` (audit fixes, PR #184); commits after it are docs only.
- **CI:** exact-head green required on the candidate (`fast`; `rls-matrix` 1235 assertions, coverage 10/10, race and
  real-provider suites, P09 upgrade check; `e2e-isolation` TestA/TestB on the Preview incl. `/bills` and `/plan/print`).
- **Hosted (Ryan):** pre-check `25 | false | false`; migration `20261118120000` applied and recorded; existing rows
  `0 | 0 | 0`; `strip-cr.sql` then parity **9/9**, 26 migrations. Preview on the phase branch; smoke 12/12.
- **Browser QA:** Q38–Q45 PASS (Q38/Q43 device parts by Ryan; Q41 re-checked after #180). Findings #180 and #182
  fixed and closed; no open `qa-finding` issues.
- **Independent audit (different model):** `REVIEW RESULT: PASS` at `6bd5c708e16b9d9fabaa86f2258cd0a50736d669`;
  P09-01 MEDIUM and P09-02 LOW fixed in #184. Receipt: `docs/workflow/FFH-P09_AUDIT.md`.
- **Release checklist:** no new environment variables in P09 (Production variables unchanged since P08); hosted parity
  matches the candidate (no migration after `20261118120000`); after the merge, Production smoke
  `node scripts/smoke/deployed-auth-smoke.mjs https://family-finance-hub-taupe.vercel.app` must be 12/12, plus the
  signed-out `/bills`, `/plan/print`, `/plan/steps-csv` redirects.
