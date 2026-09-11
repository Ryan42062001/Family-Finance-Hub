# Family Finance Hub — Project State

Last refreshed: 2026-09-11

## Repository
Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Main last verified: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active milestone: `phase-5-money-priority-engine`
PR #5 remains open/unmerged and NOT MERGE READY.

Workflow V3 remains canonical for workforce/chat/execution routing; Workflow V2 remains authoritative for lifecycle, checkpoints, CI ownership, integration, troubleshooting, financial safeguards, and audit gates. Work Helper / Super Troubleshooter is an on-demand dedicated recovery role.

## Phase 5 correctness state
FFH-010: ACCEPTED; live migration deployment remains under FFH-020.
FFH-011: REMEDIATION. Narrow security-test candidate exists at `c32942f1...` / PR #13; its owned security gate passes, but worker task/handoff completion is still required before Manager acceptance.
FFH-012: REMEDIATION after dual post-FFH-023 re-audit FAIL on `1487b192...`.
FFH-013: QUEUED.
FFH-015: QUEUED.
FFH-016: BLOCKED behind FFH-020.
FFH-017: QUEUED.
FFH-018: QUEUED CI hardening/test-output observability.
FFH-020: BLOCKED before live write on secure CLI/auth/backup execution capability.
FFH-022: ACCEPTED authority.
FFH-023: ACCEPTED / integrated at `1487b192...`.
FFH-024: ACCEPTED Supabase recovery plan.
FFH-025: ACTIVE narrow HSA materiality remediation.

## FFH-012 latest audit result
Both Technical/Mathematical and Financial Policy/Scenario auditors independently agree:
- Finding A OPEN — HIGH: compound unknown legal-spouse authority plus unresolved counterparty eligibility/coverage can expose optimistic HSA room.
- Finding B CLOSED: odd-cent shared ordinary allocation conserves exact cents.
- Finding C CLOSED: Build aggregate and destination routing reconcile exactly with no one-cent tolerance escape.

The remaining HIGH case is implementation, not authority. Accepted FFH-022 already requires `more_information_needed` wherever spouse status can change the legally supportable result, while preserving locality when the result is truly invariant.

FFH-025 is the smallest follow-up. Do not broadly rewrite the HSA engine or reopen policy.

## Current CI / validation state
FFH-023 integration Foundation CI #404 on `1487b192...` passes calculations and then fails the separately owned FFH-011 SIMPLE security contract. Later gates were skipped.

FFH-011 candidate CI run `34628911063` / job `103360669269` on `c32942f1...` passes calculations and security, then reaches five inherited TypeScript test errors. Those errors predate the one-file FFH-011 change and require separate ownership attribution if they remain after current integrations.

Permanent detailed CI test-output artifact capture is not yet implemented; FFH-018 remains queued.

## Live Supabase state
FFH-020 remains blocked before the first migration-history repair because a secure Supabase CLI/auth/protected-backup execution environment was unavailable. No live mutation occurred. Accepted FFH-024 remains the recovery authority. FFH-023's additive spouse-authority migration is repository-only and also remains undeployed.

## Smallest useful workforce
- Work Helper / Super Troubleshooter — ACTIVE on FFH-025.
- Implementation Engineer / App-Data — finish FFH-011 task/handoff evidence on existing PR #13; no unrelated code remediation.
- Auditor/QA — IDLE until new FFH-025 integration checkpoint.
- Financial Policy — IDLE.
- R&D — IDLE.
- Manager — event-driven.

## Exact next sequence
1. Complete FFH-025 and Manager-integrate a validated bounded fix.
2. Complete FFH-011 worker evidence; Manager verify/merge the narrow security-test correction separately.
3. Re-run both independent FFH-012 audits on the new FFH-025 integration SHA.
4. Separately route any inherited TypeScript validation debt that remains; do not misattribute it to FFH-011.
5. Resume FFH-020 only when secure CLI/auth/backup capability exists; then FFH-016 follows accepted deployment.
6. Execute FFH-018 CI observability/hardening after current correctness blockers stabilize.
7. Only then reassess FFH-013/015/017 and Phase-5 merge readiness.