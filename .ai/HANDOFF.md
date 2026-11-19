# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-19 — FFH-P09 released and closed.

- **Production:** FFH-P09 Bills, due dates & exports, merged as `83979c1c9e3b6f2e6ac1f26f3d5643c8f98061db` from phase
  head `d4de2a1c9ae91ee92566b42d3f1d3d3faba748bf` (PR #186, Ryan's explicit authorization 2026-11-19). Production
  smoke **12/12** (run by the Builder; Production served `83979c1`); signed-out `/bills`, `/plan/print`,
  `/plan/steps-csv` redirect to sign-in. P09 **CLOSED**. (P08's close-out shipped inside this release; #177 closed.)
- **P09 shipped:** expenses entered as actual payment + recurrence (monthly / quarterly / yearly), with
  `expenses.monthly_amount` derived in the database in exact cents rounded up (trigger + CHECK; engine unchanged);
  optional anchored due dates and household in-app reminders on expenses and debts; `/bills` (Upcoming 30 days, All
  bills, Unscheduled, Due soon, 12-month forecast of actual payments); Your plan summary, `/plan/print`,
  `/plan/steps-csv` (formula-safe, private no-store). Spec: issue #170.
- **Hosted Supabase:** migration `20261118120000` applied, parity 9/9, **26 migrations**. Always run
  `scripts/rls-local/strip-cr.sql` after pasting a migration and before `parity.sql` (`docs/WORKFLOW.md`).
- **Evidence:** audit receipt `docs/workflow/FFH-P09_AUDIT.md` (PASS; P09-01/02 fixed); hosted log
  `docs/workflow/FFH-P09_HOSTED_CHANGES.md`; QA results on PR #178; decisions in `.ai/DECISIONS.md`.
- **CI:** `rls-matrix` now also runs the P09 legacy upgrade check (`scripts/rls-ci/p09-upgrade.sh`).
- **Backlog:** P08 F04 LOW (invitation create/cancel as household-locked RPCs), N01 raw onboarding error message,
  picomatch audit exception review by 2027-01-18, items in `.ai/DECISIONS.md`. Known P09 interpretation: "today" is
  the UTC date (as elsewhere in the app).
- **Next phase:** none open in this repo. Ryan chooses and starts it (do not begin P10 without his go).
- **Builder setup for the next chat:** start on the cloud environment **Family-Finance-Hub**; rules in `AGENTS.md`.
  The Preview domain still points at `phase/ffh-p09-bills-exports`; move it when the next phase branch starts.
- **Repository bookkeeping:** this close-out is carried forward to the next authorized release (draft PR into `main`,
  not merged alone, which would deploy Production).
