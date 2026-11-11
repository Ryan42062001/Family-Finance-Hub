# Current phase

FFH-P01 — Release Blocker Integration & Production Readiness

State: PUNCH_LIST
Risk: HIGH
Owner: Ryan
Phase branch / PR: `phase/ffh-p01-release-readiness`, draft PR #81
Status page: `docs/FFH-P01_RELEASE_READINESS.md`

Production deployment, Private Beta and hosted configuration changes are separate Ryan decisions and are not
authorized by this phase, its CI or its merge.

## Goal

Make current `main` plus this branch one auditable release candidate: auth and household isolation proven, the
Scenario Lab and UI punch list accepted by Ryan, docs current, and a rollback plan ready.

## Done

- Auth confirmation and callback hardening, including encoded control characters in `next` (tests pass).
- Scenario Lab no-write and null-preference behavior (tests pass).
- Next.js 16.4.6: no high or critical advisories.
- The two-household RLS matrix runs in CI on every push: 913/913, rollback, zero residue.
- Laptop Gate A/B PowerShell harness retired; CI replaces it.

## Open, in order

1. Ryan: preview the current branch (UI refresh and the Scenario Lab plain-language punch list), including the
   two-account isolation check from the status page.
2. Hosted parity: Ryan runs the read-only `scripts/rls-local/parity.sql` in the hosted Supabase SQL editor; every row
   must equal `scripts/rls-local/parity.expected.txt`.
3. Deployed auth checks: Ryan runs `node scripts/smoke/deployed-auth-smoke.mjs <preview URL>` and checks the session
   cookie in the browser.
4. Independent phase review of the PR #81 diff, using `docs/workflow/REVIEW_PROMPT.md`. Fix any HIGH or above; backlog the rest.
5. Ryan merges. Production release is a separate decision, after the final audit and the rollback plan.

## Boundaries

No real household data; no hosted Supabase/Vercel changes without Ryan; no schema/RLS changes in this phase.
