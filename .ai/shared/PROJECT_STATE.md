# Family Finance Hub — Project State

Last refreshed: 2026-09-09

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active milestone integration branch: `phase-5-money-priority-engine`
Pre-this-Manager-update head: `540a9972463e7a6ff2ffbc42bc454f320e7dd550` (`docs: finalize Workflow V2 task dashboard`).
At that checkpoint the branch was 278 commits ahead and 0 behind `main` per independent Work-mode review; PR #5 remained open/unmerged/non-draft and was not merge-ready.

Workflow V2 / FFH-D007 is canonical for task execution, integration, troubleshooting escalation, and replacement-chat bootstrapping.

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
Live deployment/runtime parity remains unverified and is now tracked by FFH-016.

### FFH-011 — App/Data R1 SIMPLE persisted-field contract
State: REMEDIATION.
Task authority: `.ai/tasks/FFH-011.md`.
Candidate: `f85f7779a6bebac87d433289212f8671b46d8212`.
Foundation CI #309: FAILURE.
Independent Work-mode checkpoint comparison isolated one FFH-011-specific failure: `SIMPLE age 40 higher=true uses plan-specific limit`. The other 54 calculation failures were already present on the isolated FFH-012 checkpoint and are inherited/out of App/Data scope.
Escalation count remains zero because repeated docs-only CI runs are not owner remediation attempts.

### FFH-012 — Core HSA legal-capacity calculation
State: REMEDIATION.
Task authority: `.ai/tasks/FFH-012.md`.
Isolated Core candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`.
Foundation CI #308: FAILURE with 54 task-owned HSA-related calculation failures. Core must diagnose root cause(s) within that set rather than treating the count as one proven cause.
Escalation count remains zero pending an actual owner remediation iteration.

### FFH-014 — Workflow V2 operating-system upgrade
State: CLOSED / FFH-D007 adopted.
No production financial behavior changed.

## Current branch-level validation evidence

At pre-update Workflow V2 head `540a9972463e7a6ff2ffbc42bc454f320e7dd550`, Foundation CI #334 was red with the same 55 calculation failures identified by independent Work-mode analysis:
- 54 inherited from FFH-012 baseline #308;
- 1 incremental FFH-011 SIMPLE failure from #309.

Documentation-only runs after the candidate production commits repeatedly inherited this same red state. They are provenance, not owner remediation attempts, and do not trigger Troubleshooting escalation by themselves.

Historical verified green checkpoints include #274 for FFH-006 and #300 for accepted FFH-010. CI results are validation evidence, not audit verdicts.

## Current findings / disposition

### R1 — SIMPLE higher-limit semantics/correctness
MERGE BLOCKER. FFH-011 is in focused remediation. FFH-015 now tracks the narrow Core follow-up and remains BLOCKED until FFH-011 is accepted and Core scheduling is collision-safe.

### R2 — governmental 457(b) Roth catch-up
REMEDIATED by FFH-006; later integrated audit required.

### R3/R4 — HSA legal-capacity model
FFH-D005 approved. FFH-010 App/Data contract ACCEPTED. FFH-012 Core implementation remains in remediation.

### R6 — MFJ spousal-IRA scarce-compensation allocation
Policy resolved by FFH-D006. FFH-013 remains merge-blocking and queued after FFH-012 unless Manager explicitly reorders.

## Queued / blocked work

- FFH-013 — Core spousal-IRA shared compensation ledger; QUEUED behind FFH-012.
- FFH-015 — narrow R1 SIMPLE Core remediation; BLOCKED on FFH-011 acceptance + safe Core slot.
- FFH-016 — live Supabase migration/runtime parity verification; QUEUED verification-only pre-merge gate. Covers FFH-010 HSA and, after acceptance, FFH-011 SIMPLE migration/runtime parity.
- FFH-017 — Phase 5C implementation; QUEUED / policy approved but gated on stable retirement-capacity work.
- FFH-018 — docs-only CI efficiency hardening discovery; QUEUED until current red remediation stabilizes.
- final independent Technical & Mathematical and Financial Policy & Scenario audits remain gated on stable integrated work.

## Workflow V2 operating state

Canonical execution state lives in `.ai/tasks/`; role handoffs are continuity evidence rather than authoritative task status.

Normal lifecycle:
`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`, plus `BLOCKED` / `REMEDIATION`.

New production tasks default to isolated short-lived task branches with Manager integration. FFH-011/012 are grandfathered shared-branch exceptions.

Verification-only tasks may use `PRODUCTION_SHA: N/A — VERIFICATION-ONLY` and are accepted on reproducible runtime/deployment evidence rather than an invented production checkpoint.

Manager is event-driven. Default active-chat target is 2–4. Current useful active set is Manager when orchestration is needed, App/Data FFH-011, and Core FFH-012. All other permanent roles and Troubleshooting & Build are IDLE.

## Merge blockers

Phase 5 remains blocked by:
- FFH-011 remediation and FFH-015 Core follow-up;
- FFH-012 HSA remediation;
- FFH-013 R6 implementation;
- FFH-016 live Supabase/runtime parity;
- FFH-017 Phase 5C implementation;
- required independent audits and any resulting remediation;
- final PR #5 description/status refresh and clean merge validation.

## Exact next sequence

1. App/Data performs one focused FFH-011 owner remediation iteration for the isolated SIMPLE failure only.
2. Core performs one focused FFH-012 owner remediation iteration against the 54 task-owned HSA failures.
3. Manager acts when either reaches READY_FOR_MANAGER, BLOCKED, or requests escalation.
4. After FFH-012 acceptance, schedule FFH-013 if safe; after FFH-011 acceptance, schedule FFH-015 when Core collision risk permits.
5. Complete FFH-016 before merge-ready status.
6. Stabilize retirement-capacity work, then activate FFH-017.
7. Run checkpoint/final audits as appropriate, remediate blockers, refresh PR #5, and merge only if clean.
8. Consider FFH-018 only after current remediation is stable; do not alter CI merely to hide existing red evidence.
