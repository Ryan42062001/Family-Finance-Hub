# Current phase

FFH-P01 — Release Blocker Integration & Production Readiness

State: PUNCH_LIST
Risk: HIGH
Owner: Ryan
Builder: fresh Primary Builder
Activation baseline: `241b9d665c68b97e9947996ecc678752d9654d8c`
Phase branch: `phase/ffh-p01-release-readiness`

## Manager reconciliation at activation

- Speed Workflow V2.1 migration is CLOSED.
- FFH-050 root-entry remediation is already canonical on `main` through merged PR #69.
- FFH-051 repaired source target `4598770486fd3300cc1048103342fda4bb509aef` is already integrated on `main` through merged PR #76; all five audited auth/security blobs exactly match the frozen target.
- FFH-052 target `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a` is already integrated on `main` through merged PR #76; both audited Scenario Lab blobs exactly match the frozen target.
- Historical PRs #68, #70, #71, #72, #73, #74, #75, and #77 remain evidence lanes only. Do not merge, cherry-pick, retarget, close, or treat them as current implementation authority during this phase.
- Historical FFH-026 evidence remains useful but does not establish current production acceptance. The prior R5 security audit contains a blocking F11 response-identity history and leaves F13 browser/runtime behavior unverified.

## Phase objective

Turn current canonical `main` into one independently auditable release candidate by validating the already-integrated release-blocker fixes against current code, repairing only defects proven on the phase branch, synchronizing stale release documentation, and closing the remaining security/privacy/production-readiness evidence gates without reviving Workflow V3/V3.1 task machinery.

## Scope

1. Revalidate current-main auth confirmation/callback behavior, safe destinations, cookie/session establishment, first authenticated request, and trusted Host/origin handling.
2. Revalidate current-main Scenario Lab null-preference behavior, exact financial reconciliation, no unauthorized persistence, and no profile mutation.
3. Prove two-household negative isolation with synthetic test identities/data only and fail closed on any cross-household access.
4. Reconcile FFH-026 private source/oracle/dependency/browser evidence only through privacy-safe receipts; private bytes, secrets, and real household financial/account data stay out of repository/shared evidence.
5. Close or explicitly preserve as unresolved any fixture/oracle/dependency-host/F13 browser gate needed for the chosen current release-verification method.
6. Refresh stale release-facing documentation such as README status/production-readiness wording where supported by current evidence.
7. Produce rollback evidence/plan before any production acceptance.

## Exclusions and protected boundaries

- No historical branch cherry-pick or wholesale legacy PR merge.
- No invented financial policy or changed money-routing semantics without separate authority.
- No Supabase schema/RLS/live-data mutation without explicit bounded Ryan authorization.
- No production deployment, production alias promotion, auth configuration mutation, Private Beta, or paid domain/configuration from phase activation.
- No real household financial/account data in tests or evidence.
- No weakening repository protection or bypassing required `fast`.

## Required gates

- Branch FAST must pass.
- Whole-phase owner preview occurs before freeze.
- Consolidate one punch list after preview.
- Phase Sync records the candidate.
- FULL PHASE CI must run on the exact candidate SHA.
- Freeze one immutable candidate.
- Fresh independent HIGH-risk audit is mandatory.
- Any remediation requires a new exact-head candidate and fresh relevant re-audit.
- Ryan must explicitly authorize merge of the exact audited target.
- Merge does not authorize deployment.
- Post-merge FAST, Closure Sync, and closure FAST are required before CLOSED.

## Active punch list

1. Vercel Preview origin configuration: owner preview of exact candidate `95397aa945cfec77cd374b8e13e3ecfb4e7ce800` returned `{"error":"Authentication origin is not configured."}` on `/dashboard`. Preserve the fail-closed origin boundary. Configure only the Preview environment with the exact authorized Preview origin, rebuild the Preview, and resume owner preview. Supabase hosted-auth configuration remains separately authorized.
