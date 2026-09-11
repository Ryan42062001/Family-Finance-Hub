# Family Finance Hub — Manager Integration & Readiness Queue

Workflow V2 integration/readiness control with Workflow V3 workforce/chat/execution-mode overlay. Workers do not merge their own production tasks. Verification-only pre-merge gates may appear here even when they produce no production SHA.

Last refreshed: 2026-09-10

## Ready for Manager

None.

## Accepted / integrated control-plane work

### FFH-019 — Workflow V3 operating overlay
State: CLOSED / MANAGER ACCEPTED
Integration checkpoint: `11c757141fb17c00c5b37bc702cbd0ed55c38a5c`
Validation: exact PR #6 diff reviewed as control-plane/documentation only. The concurrent milestone-branch advance touched different task/state files, so integration was collision-free.
Remaining effect: V3 is canonical for five-department workforce presentation, task-scoped chats, context hygiene, and Work-mode routing/fallback. Workflow V2 remains authoritative underneath for task lifecycle, checkpoints, branch/integration safety, troubleshooting, financial safeguards, and audits.

## Accepted / integrated in place

### FFH-011 — SIMPLE persisted-field contract
State: ACCEPTED
Accepted production checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`
Integration checkpoint: same SHA under the grandfathered shared-branch exception.
Validation: Foundation CI #348 on the exact checkpoint remains globally red at calculation stage with 54 failures matching the Manager-isolated FFH-012 baseline. The one incremental FFH-011 SIMPLE regression observed at #309 is removed. Security/typecheck/lint/build were skipped by fail-fast and are not claimed green.
Remaining gates: live SIMPLE migration/runtime parity under FFH-016; narrow Core SIMPLE statutory consumption under FFH-015; later integrated validation and audits.

## Remediation before integration

### FFH-012 — HSA legal-capacity calculation
State: REMEDIATION
Isolated Core SHA: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Validation: Foundation CI #308 FAILURE with 54 task-owned HSA-related calculation failures. The same 54-failure set remains after FFH-011 remediation at #348.
Manager gate: focused D005 owner remediation, required exact-checkpoint validation, FFH-012 task + Core handoff at `READY_FOR_MANAGER`.

## Queued behind Core sequencing

### FFH-013 — Spousal-IRA shared compensation ledger
State: QUEUED
Gate: FFH-012 Manager acceptance unless Manager explicitly proves a safer reorder.

### FFH-015 — Narrow R1 SIMPLE Core remediation
State: QUEUED
Dependency status: FFH-011 acceptance SATISFIED.
Gate: collision-safe Core scheduling while FFH-012 remains active. At the FFH-012 Manager event, choose FFH-015 versus FFH-013 order from the exact overlap/diff state rather than starting both.

### FFH-017 — Phase 5C implementation
State: QUEUED / POLICY APPROVED
Gate: retirement-capacity blockers stable and Manager authorizes implementation.

### FFH-018 — Documentation-only CI efficiency hardening
State: QUEUED
Gate: current red remediation wave stable; Product R&D first designs a safe required-check strategy without weakening production validation.

## Active pre-merge runtime verification

### FFH-016 — Live Supabase migration/runtime parity
State: ACTIVE
Type: VERIFICATION-ONLY PRE-MERGE GATE
Execution mode: WORK_MODE_HIGH_VALUE with normal-chat fallback
PRODUCTION_SHA: N/A — VERIFICATION-ONLY
Scope: accepted FFH-010 HSA migration/contract plus accepted FFH-011 SIMPLE migration/contract.
Evidence required: actual migration application, PostgREST/persistence behavior, safe RLS role-matrix evidence, null/reload/runtime parity, normalized runtime propagation, and browser capture/reload where applicable.
Manager gate: reproducible live evidence + current App/Data handoff. Repository migration existence alone is not deployment proof.

## Integration procedure

For production tasks:
1. worker reaches `READY_FOR_MANAGER` with `PRODUCTION_SHA`, `VALIDATED_CI`, and role handoff;
2. Manager independently verifies task scope/evidence;
3. Manager marks `ACCEPTED` or `REMEDIATION`;
4. Manager integrates accepted isolated task work in dependency order;
5. Manager records `INTEGRATION_SHA` and verifies exact integration CI;
6. failures return to remediation/escalation as appropriate;
7. only stable integrated behavior advances to audit.

For verification-only gates:
1. task records `PRODUCTION_SHA: N/A — VERIFICATION-ONLY`;
2. owner produces actual runtime/deployment evidence tied to a named environment/contract without exposing secrets;
3. Manager independently verifies the evidence and marks the gate accepted/rejected;
4. no invented integration SHA is required unless remediation code is separately authorized.

## Grandfathered shared-branch tasks

FFH-011 and FFH-012 began before Workflow V2. Their existing commits remain on `phase-5-money-priority-engine`; do not rewrite history merely to manufacture isolated task branches. Documentation-only reruns inheriting the same red production state are not owner remediation attempts.
