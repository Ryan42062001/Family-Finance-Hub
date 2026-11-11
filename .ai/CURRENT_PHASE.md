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

1. ~~Owner preview checks~~ Done 2026-11-11: two-account isolation, Scenario Lab no-write, sign-in page, Secure cookie.
2. ~~Hosted parity~~ Done: 9/9 (2026-11-11).
3. ~~Deployed auth checks~~ Done: smoke test 12/12 on the Preview and Production; session cookie Secure/Lax/`/`.
4. Independent phase review: FAIL at `338394226b25` (1 HIGH, 3 MEDIUM, 1 LOW, no isolation bypass). All fixed; targeted re-review of the fixes by the same independent reviewer is pending, plus Ryan's rerun of the updated hosted `parity.sql`.
5. Ryan merges. Production release is a separate decision, after the final audit and the rollback plan.

## Boundaries

No real household data; no hosted Supabase/Vercel changes without Ryan; no schema/RLS changes in this phase.
