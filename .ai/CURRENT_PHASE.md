# Current phase

FFH-P01 — Release Blocker Integration & Production Readiness

State: CLOSED
Risk: HIGH
Owner: Ryan
Merged: PR #81 into `main` at `ec75d9883793cac0845bb64f6fb4e433e3237e42` (Ryan-authorized, 2026-11-11), from the exact
head `9f93cbd` checked by FULL PHASE CI run 42968075639.
Status page: `docs/FFH-P01_RELEASE_READINESS.md`

Production deployment is not authorized by this closure. The live site still runs the pre-FFH-P01 `main` deployment until
Ryan separately decides on a release.

## What FFH-P01 delivered

- Auth hardening: safe redirects (including encoded control characters), canonical-origin checks, and a Secure session
  cookie on HTTPS.
- Household isolation proven continuously: the 913-assertion two-household RLS matrix runs in CI on every push, hosted
  parity is 9/9, and the owner checked two accounts.
- Next.js 16.4.6 (no high or critical advisories), the signed-out header shows no app tabs, and UI/Scenario Lab
  refinements.
- Simplified workflow: one builder, one independent review per phase, browser QA by ChatGPT Work mode.

## Before any Production release (separate Ryan decision)

1. Comprehensive independent pre-release audit (a different model), with fixes and re-check.
2. Fix Vercel automatic deployments (stopped after 2026-11-07).
3. Exercise the rollback plan (`docs/FFH-P01_RELEASE_READINESS.md`).
4. Delete the synthetic test accounts (TestA/TestB and older ones), using a dependency-aware cleanup
   (`households_created_by_fkey`).
5. Email deliverability (custom sending domain) before inviting anyone else.

## Next phase

Not yet chosen. Ryan picks the next goal; the Builder then writes its scope here (template:
`docs/workflow/PHASE_TEMPLATE.md`).
