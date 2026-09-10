# Family Finance Hub — Manager Integration & Readiness Queue

Workflow V2 integration/readiness control. Workers do not merge their own production tasks. Verification-only pre-merge gates may appear here even when they produce no production SHA.

Last refreshed: 2026-09-09

## Ready for Manager

None.

## Remediation before integration

### FFH-011 — SIMPLE persisted-field contract
State: REMEDIATION
Candidate production SHA: `f85f7779a6bebac87d433289212f8671b46d8212`
Validation: Foundation CI #309 FAILURE. Independent failure isolation attributes 54 failures to already-red FFH-012 and one incremental FFH-011 failure: `SIMPLE age 40 higher=true uses plan-specific limit`.
Manager gate: App/Data repairs only its owned regression, completes exact-checkpoint validation, updates FFH-011 task + role handoff to `READY_FOR_MANAGER`.

### FFH-012 — HSA legal-capacity calculation
State: REMEDIATION
Isolated Core SHA: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Validation: Foundation CI #308 FAILURE with 54 task-owned HSA-related calculation failures.
Manager gate: focused D005 remediation, required exact-checkpoint validation, FFH-012 task + Core handoff at `READY_FOR_MANAGER`.

## Queued behind dependencies

### FFH-013 — Spousal-IRA shared compensation ledger
State: QUEUED
Gate: FFH-012 Manager acceptance unless Manager explicitly reorders.

### FFH-015 — Narrow R1 SIMPLE Core remediation
State: BLOCKED
Gate: FFH-011 Manager acceptance and collision-safe Core scheduling.

### FFH-017 — Phase 5C implementation
State: QUEUED / POLICY APPROVED
Gate: retirement-capacity blockers stable and Manager authorizes implementation.

### FFH-018 — Documentation-only CI efficiency hardening
State: QUEUED
Gate: current red remediation wave stable; Product R&D first designs a safe required-check strategy without weakening production validation.

## Pre-merge runtime verification

### FFH-016 — Live Supabase migration/runtime parity
State: QUEUED
Type: VERIFICATION-ONLY PRE-MERGE GATE
PRODUCTION_SHA: N/A — VERIFICATION-ONLY
Current required scope: accepted FFH-010 HSA migration/contract; add FFH-011 SIMPLE migration/contract after FFH-011 acceptance.
Evidence required: actual migration application, PostgREST/persistence behavior, safe RLS role-matrix evidence, null/reload/runtime parity, and browser capture/reload where applicable.
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
