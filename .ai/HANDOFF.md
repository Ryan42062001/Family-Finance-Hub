# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-19 — FFH-P09 FREEZE_READY (audit PASS, QA PASS, hosted parity 9/9); awaiting Ryan's release decision.

- **Production:** FFH-P08 Account settings and security, merged as `2a62022b5e5ae9d60a32fd7ac6745ffb4366e904` from phase
  head `1aaa96cd89f1e35b49d61c23731f2a37e23ed632` (PR #176, Ryan's explicit authorization 2026-11-18). Production
  smoke **12/12** (run by the Builder; Production served `2a62022`). P08 **CLOSED**.
- **P08 shipped:** `/account` change password (current password required by app and provider; minimum 8), optional
  authenticator-app two-factor sign-in (approved-factor registry, backup authenticator, turn off), permanent account
  deletion (re-auth + typed DELETE; shared-household owners refused), Owner-assisted 2FA reset
  (`private.owner_reset_mfa`, R11). Every household/financial path requires `private.session_ok()` (live session;
  aal2 via an approved factor when 2FA is on). Email change deferred (R1).
- **Hosted Supabase:** migrations `20261118100000` + `20261118110000` applied, parity 9/9, 25 migrations; Auth settings
  on (secure password change, current password required, min 8, TOTP). Procedure: `docs/workflow/FFH-P08_HOSTED_CHANGES.md`.
- **Evidence:** audit receipt `docs/workflow/FFH-P08_AUDIT.md`; spike `docs/workflow/FFH-P08_SPIKE_RESULTS.md`; QA
  34/0/3 (PR #168 comment); decisions R1–R11 in `.ai/DECISIONS.md`.
- **Backlog:** F04 LOW (invitation create/cancel as household-locked RPCs), N01 raw onboarding error message, moderate
  npm advisories, picomatch audit exception review by 2027-01-18, items in `.ai/DECISIONS.md`.
- **Active phase:** FFH-P09 Bills, due dates & exports (spec: issue #170), `phase/ffh-p09-bills-exports`, PR #178.
  See `.ai/CURRENT_PHASE.md`; hosted steps for Ryan: `docs/workflow/FFH-P09_HOSTED_CHANGES.md`; local DB checks
  include `scripts/rls-local/local-harness/run.sh upgrade` (legacy rows across the P09 migration).
- **Builder setup for the next chat:** start on the cloud environment **Family-Finance-Hub** (PostgreSQL + npm deps,
  network allows the Production and Preview sites). Rules: `AGENTS.md` → Builder efficiency. The Preview domain still
  points at `phase/ffh-p08-account-security`; move it when the next phase branch starts.
- **Repository bookkeeping:** this close-out is carried forward to the next authorized release (draft PR into `main`,
  not merged alone, which would deploy Production).
