# Family Finance Hub — Project State

Last refreshed: 2026-09-10

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active milestone integration branch: `phase-5-money-priority-engine`
Pre-this-Manager-update head: `8f56a68a9ab018e15f0e32b11df140e04c4db615` (`docs: mark FFH-011 ready for manager`).
At that checkpoint the branch is 294 commits ahead and 0 behind `main`; PR #5 is open/unmerged/non-draft and remains not merge-ready.

Workflow V2 / FFH-D007 is canonical for task execution, integration, troubleshooting escalation, and replacement-chat bootstrapping. No `.ai/shared/WORKFLOW_V3.md` is present on the active milestone branch.

## Stable product state on main

`main` contains completed Foundation, Household Financial Profile, Dashboard, and Phase 4 Planning Tools.

## Phase 5 status

Phase 5 remains ACTIVE on PR #5 and NOT MERGE READY.

Phase 5A: IMPLEMENTED / final integrated audit required.
Phase 5B: IMPLEMENTED / final integrated audit required.
Phase 5C: POLICY APPROVED under FFH-D004 / implementation task FFH-017 queued and not activated.

## Active wave — FFH-PW-003

### FFH-009 — Retirement Policy R6
State: ACCEPTED / Manager synthesized as FFH-D006.

### FFH-010 — App/Data HSA persistence + normalized contract
State: ACCEPTED.
Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4`.
Foundation CI #300 / run `34306364189`: SUCCESS on exact production checkpoint.
Live deployment/runtime parity remains tracked by FFH-016.

### FFH-011 — App/Data R1 SIMPLE persisted-field contract
State: ACCEPTED.
Accepted/in-place integration checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`.
Foundation CI #348 on that exact checkpoint remains globally red at calculation stage with 54 failures matching the Manager-isolated FFH-012 baseline; the one incremental FFH-011 SIMPLE failure previously observed at #309 is removed.
Security policy-contract tests, typecheck, lint, and build were skipped after calculation fail-fast and are not claimed green. Live SIMPLE migration/runtime parity is transferred to FFH-016. Narrow Core SIMPLE formula consumption remains FFH-015.

### FFH-012 — Core HSA legal-capacity calculation
State: REMEDIATION.
Task authority: `.ai/tasks/FFH-012.md`.
Isolated Core candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`.
Foundation CI #308: FAILURE with 54 task-owned HSA-related calculation failures. Core must diagnose/remediate that set and reach READY_FOR_MANAGER.
Escalation count remains zero in the authoritative task because no completed owner remediation iteration has yet been recorded there.

### FFH-014 — Workflow V2 operating-system upgrade
State: CLOSED / FFH-D007 adopted.
No production financial behavior changed.

### FFH-016 — live Supabase migration/runtime parity verification
State: ACTIVE / VERIFICATION-ONLY.
Scope now combines accepted FFH-010 HSA and accepted FFH-011 SIMPLE migrations/contracts.
Execution classification: WORK_MODE_HIGH_VALUE; normal-chat fallback remains valid.

## Current branch-level validation evidence

At accepted FFH-011 checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`, Foundation CI #348 is red with 54 calculation failures, exactly returning to the previously isolated FFH-012 failure count after the FFH-011 incremental SIMPLE regression was removed.

The branch therefore remains red because of FFH-012, not because FFH-011 still demonstrates an owned regression. Downstream security/typecheck/lint/build steps were skipped by fail-fast and remain unverified until a checkpoint can progress past calculations.

Historical verified green checkpoints include #274 for FFH-006 and #300 for accepted FFH-010. CI results are validation evidence, not audit verdicts.

## Current findings / disposition

### R1 — SIMPLE higher-limit semantics/correctness
Persistence/runtime semantic contract: ACCEPTED under FFH-011.
Core statutory formula consumption: still merge-blocking under FFH-015, now QUEUED for a collision-safe Core slot.
Live migration/runtime parity: FFH-016 ACTIVE.

### R2 — governmental 457(b) Roth catch-up
REMEDIATED by FFH-006; later integrated audit required.

### R3/R4 — HSA legal-capacity model
FFH-D005 approved. FFH-010 App/Data contract ACCEPTED. FFH-012 Core implementation remains in remediation. FFH-016 owns live migration/runtime parity.

### R6 — MFJ spousal-IRA scarce-compensation allocation
Policy resolved by FFH-D006. FFH-013 remains merge-blocking and queued after FFH-012 unless Manager explicitly reorders.

## Queued / active work

- FFH-012 — Core HSA legal-capacity remediation; ACTIVE specialist execution / task state REMEDIATION.
- FFH-016 — live HSA + SIMPLE Supabase/runtime parity; ACTIVE verification-only App/Data task.
- FFH-013 — Core spousal-IRA shared compensation ledger; QUEUED behind FFH-012.
- FFH-015 — narrow R1 SIMPLE Core remediation; QUEUED because FFH-011 dependency is satisfied but Core remains occupied by FFH-012.
- FFH-017 — Phase 5C implementation; QUEUED / policy approved but gated on stable retirement-capacity work.
- FFH-018 — docs-only CI efficiency hardening discovery; QUEUED until current red remediation stabilizes.
- final independent Technical & Mathematical and Financial Policy & Scenario audits remain gated on stable integrated work.

## Workflow V2 operating state

Canonical execution state lives in `.ai/tasks/`; role handoffs are continuity evidence rather than authoritative task status.

Normal lifecycle:
`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`, plus `BLOCKED` / `REMEDIATION`.

New production tasks default to isolated short-lived task branches with Manager integration. FFH-011/012 are grandfathered shared-branch exceptions.

Verification-only tasks may use `PRODUCTION_SHA: N/A — VERIFICATION-ONLY` and are accepted on reproducible runtime/deployment evidence rather than an invented production checkpoint.

Manager is event-driven. Current smallest useful specialist set is App/Data FFH-016 + Core FFH-012. All other permanent roles and Troubleshooting & Build are IDLE.

## Merge blockers

Phase 5 remains blocked by:
- FFH-012 HSA remediation;
- FFH-013 R6 implementation;
- FFH-015 Core SIMPLE formula remediation;
- FFH-016 live Supabase/runtime parity;
- FFH-017 Phase 5C implementation;
- full branch validation once fail-fast can progress past calculation tests;
- required independent audits and any resulting remediation;
- final PR #5 description/status refresh and clean merge validation.

## Exact next sequence

1. Core performs focused FFH-012 owner remediation against the 54 task-owned HSA failures and reports READY_FOR_MANAGER/BLOCKED/escalation when supported.
2. In parallel, App/Data executes FFH-016 live HSA + SIMPLE migration/runtime parity verification.
3. Manager acts when either reaches READY_FOR_MANAGER, BLOCKED, or requests escalation.
4. After FFH-012 acceptance, choose the safest Core order between FFH-015 and FFH-013 from the exact overlap state; do not run them concurrently by default.
5. Stabilize retirement-capacity work, then activate FFH-017.
6. Run checkpoint/final audits as appropriate, remediate blockers, refresh PR #5, and merge only if clean.
7. Consider FFH-018 only after current remediation is stable; do not alter CI merely to hide existing red evidence.
