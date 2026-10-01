# FFH-P01 release-readiness evidence

This document records current, privacy-safe evidence for the FFH-P01 candidate. It does not authorize production deployment, Supabase or auth configuration changes, Private Beta, merge, or use of real household data.

Lifecycle state: `PUNCH_LIST`. Owner preview was attempted and is blocked by missing Vercel Preview-origin configuration. All later workflow gates remain pending.

## Gate matrix

| Gate | Current result | Evidence / remaining authority |
| --- | --- | --- |
| Confirmation and PKCE callback source behavior | VERIFIED | Exact email confirmation type, bounded unique token, session-backed success, safe internal destinations, and unchanged PKCE exchange are covered by `tests/security/ffh-051-auth-remediation.test.ts`. |
| Canonical auth origin | VERIFIED in repository | Confirmation, callback, protected-route redirect, and sign-up email redirect use one fail-closed `NEXT_PUBLIC_SITE_URL` boundary. HTTPS is required except explicit loopback development. |
| Production site URL, Supabase redirect allowlist, and email-template configuration | REQUIRES SEPARATE PRODUCTION AUTHORIZATION | No hosted auth or environment configuration was read or changed in FFH-P01. |
| Cookie/session establishment and first authenticated browser request | UNVERIFIED | Requires an owner-authorized preview/runtime exercise with a synthetic account. Source and contract tests do not substitute for browser/runtime evidence. |
| Scenario Lab null-preference reconciliation | VERIFIED | The current calculation test proves a $3,500 to $4,000 monthly-expense scenario changes capacity from $1,300 to $800 while preferences remain `null`. |
| Scenario Lab persistence/profile mutation | VERIFIED in repository | Tests prove the saved profile remains byte-for-byte equivalent and the Scenario Lab application surface contains no database or browser-storage write path. |
| Household isolation in current source | VERIFIED in repository | Authenticated membership derives the household server-side; every Scenario Lab snapshot relation is explicitly filtered by that household; security suites validate RLS policy shape and mutation constraints. |
| Deployed two-household negative RLS isolation | REQUIRES SEPARATE PRODUCTION AUTHORIZATION / UNVERIFIED | Repository tests do not execute deployed PostgreSQL policies. Run the rollback-only synthetic procedure from `docs/SECURITY_TESTS.md` only after bounded authorization. |
| FFH-026 historical F09–F14 gates | NOT INHERITED | Historical receipts are evidence only. Current deterministic source gates are rerun here; the historical F11 response-identity issue and F13 browser/runtime gap are not declared closed without current runtime evidence. |
| Private fixture/oracle/dependency custody | NOT REQUIRED for public deterministic suite | No private bytes or substituted oracle are needed for the current calculation/security suites. Any later production canary requiring private custody needs separate authorization and a privacy-safe receipt. |

## Owner preview procedure

Use synthetic identities and synthetic financial values only. On an authorized preview/runtime environment:

1. Confirm `NEXT_PUBLIC_SITE_URL`, the Supabase redirect allowlist, and confirmation email template point to the same exact HTTPS origin.
2. Sign up a synthetic user, follow the confirmation link, and verify the first authenticated request reaches the expected internal destination with a valid session cookie.
3. Verify an external or lookalike origin and an external `next` destination fail closed without leaking tokens or provider details.
4. With a profile whose preferences are absent, change monthly expenses from $3,500 to $4,000 in Scenario Lab and confirm capacity changes from $1,300 to $800.
5. Reload the saved profile and confirm preferences remain absent and no profile value changed.
6. Record only pass/fail, exact candidate SHA, runtime/deployment identity, and privacy-safe timestamps. Do not record tokens, cookies, email links, credentials, or household values beyond the synthetic fixture contract.

## Rollback plan

Before any separately authorized production promotion, record the exact previous known-good deployment and candidate SHA, snapshot the non-secret auth origin/redirect configuration, and verify that no schema migration is included. If auth, session, or household isolation fails, stop the release and Private Beta, restore the previous Vercel production alias and prior auth origin/redirect configuration, then rerun auth and isolation checks. FFH-P01 performs no schema migration, so database rollback is not part of this candidate. No rollback or production change has been performed by this phase.
