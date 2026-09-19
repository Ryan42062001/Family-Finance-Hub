# Family Finance Hub — Manager Integration & Readiness Queue

Last refreshed: 2026-09-11

## Active remediation

### FFH-025 — HSA compound authority materiality
Owner: Work Helper / Super Troubleshooter
State: ACTIVE
Parent: FFH-012
Reason: both independent post-FFH-023 auditors reproduced the same HIGH defect. Unknown/missing legal-spouse authority can be treated as immaterial when unresolved counterparty HSA eligibility/coverage can change the owner's legal amount under a supported spouse/family resolution.
Manager gate: reproduce, make the smallest FFH-022-consistent fix, preserve closed cent Findings B/C, validate, return READY_FOR_MANAGER_VERIFICATION. Manager integrates; both auditors re-audit the new exact integration SHA.

### FFH-011 — SIMPLE persisted-field security contract
Owner: Application/Data
State: REMEDIATION / candidate awaiting worker evidence completion
Branch: `task/FFH-011-simple-persisted-field-contract-remediation`
PR: #13, retargeted to `phase-5-money-priority-engine`
Candidate SHA: `c32942f1ee1dd700b2c8d23d2f6b641f37962fc8`
Candidate scope: one security-test file, semantic source-contract hardening only; no production change.
Exact branch CI run `34628911063` / job `103360669269`: calculations PASS, security PASS, typecheck FAIL on five pre-existing HSA/retirement test typing errors, later lint/build skipped. Manager has not accepted or merged because `.ai/tasks/FFH-011.md` and App/Data handoff have not yet been completed for this remediation.
Next gate: Implementation Engineer completes task/handoff evidence without taking ownership of inherited HSA/retirement typing debt.

## Accepted but parent-audit-gated

### FFH-023 — FFH-012 audit remediation
State: ACCEPTED
Integration: `1487b192491a704ca3500b42d22a50289ee1551b`
Dual re-audit confirms odd-cent allocation and Build/account reconciliation are closed and direct ambiguous relationship metadata no longer grants spouse authority. Parent FFH-012 remains REMEDIATION through FFH-025.

## Blocked live recovery

### FFH-020 — Supabase migration-history recovery/deployment
State: BLOCKED before first write
Unlock: secure environment with current Supabase CLI, supported authentication/link, and protected pre-change backup. Do not weaken the accepted FFH-024 gate. Stage-B live DDL push remains unauthorized.

### FFH-016 — live Supabase parity verification
State: BLOCKED behind Manager-accepted FFH-020 deployment.

## Queued
- FFH-018 — CI hardening/test-output observability; retain for after current correctness wave.
- FFH-013 / FFH-015 / FFH-017 — Core work remains queued until current blockers are reassessed.

## Audit status
FFH-012 is NOT audit-ready after the latest dual re-audit. Both auditors returned FAIL on `1487b192...`. Do not reactivate them until FFH-025 is Manager-integrated.

Phase 5 / PR #5 remains NOT MERGE READY.