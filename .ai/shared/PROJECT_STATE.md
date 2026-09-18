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
FFH-011: ACCEPTED; SIMPLE persisted-field contract consumed by closed FFH-015.
FFH-012: CLOSED.
FFH-013: CLOSED.
FFH-015: CLOSED.
FFH-016: BLOCKED behind Manager-accepted FFH-020 deployment; verification-only pre-merge gate.
FFH-017: CLOSED on final frozen target `c563d011...`; fresh Technical + Policy closure audits PASS with zero findings.
FFH-018: ACTIVE for CI/test-output observability discovery/design only; implementation remains separately Manager-gated.
FFH-020: BLOCKED before live write on secure CLI/auth/protected-backup execution capability.
FFH-022: ACCEPTED authority.
FFH-023: ACCEPTED / historical integration; later FFH-025/028 closed the FFH-012 recovery wave.
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

## Current Phase-5 merge-readiness — 2026-09-18

PR #5 remains open/unmerged and **NOT MERGE READY**.

FFH-017 financial-engine correctness is no longer a blocker. The remaining real blockers are:
1. FFH-020 secure live migration deployment/recovery, currently environment-blocked before any live write;
2. Manager acceptance of FFH-020;
3. FFH-016 live Supabase/PostgREST/RLS/persistence/reload/browser parity;
4. final integrated Phase-5 Technical + Financial Policy audit/review on the stable post-runtime-gate baseline;
5. PR #5 description/status refresh and final merge review.

FFH-018 discovery/design may proceed safely in parallel and is not itself a merge blocker. No workflow implementation is authorized by that discovery activation.

The FFH-020 blocker is an execution-environment/live-deployment issue, not a financial-engine correctness defect.

Phase 6 production work remains blocked until Phase 5 is actually accepted.
