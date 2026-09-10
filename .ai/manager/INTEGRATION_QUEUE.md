# Family Finance Hub — Manager Integration Queue

Workflow V2 integration control. Workers do not merge their own production tasks.

Last refreshed: 2026-09-09

## Ready for Manager

None.

## Remediation before integration

### FFH-011 — SIMPLE persisted-field contract
State: REMEDIATION
Candidate production SHA: `f85f7779a6bebac87d433289212f8671b46d8212`
Validation: Foundation CI #309 FAILURE; branch includes prior concurrent FFH-012 work, so attribution must be isolated.
Manager gate: current FFH-011 task file + role handoff must reach `READY_FOR_MANAGER` with defensible exact-checkpoint evidence.

### FFH-012 — HSA legal-capacity calculation
State: REMEDIATION
Latest isolated observed Core SHA: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Validation: Foundation CI #308 FAILURE at calculation-test stage.
Manager gate: exact root cause remediated, required validation green, task file + Core handoff at `READY_FOR_MANAGER`.

## Queued behind dependencies

### FFH-013 — Spousal-IRA shared compensation ledger
State: QUEUED
Gate: FFH-012 Manager acceptance unless Manager explicitly reorders.
Branching: use a short-lived Workflow V2 task branch from the then-approved integration base.

### Narrow R1 Core remediation
State: BLOCKED
Gate: FFH-011 Manager acceptance and collision-safe Core scheduling.

### Phase 5C implementation
State: QUEUED / POLICY APPROVED
Gate: current retirement-capacity blockers stable and Manager issues implementation task.

## Integration procedure

For new Workflow V2 isolated task branches:
1. worker reaches `READY_FOR_MANAGER` with `PRODUCTION_SHA`, `VALIDATED_CI`, and role handoff;
2. Manager independently verifies task scope/evidence;
3. Manager marks task `ACCEPTED` or `REMEDIATION`;
4. if accepted, Manager integrates the validated checkpoint into the milestone integration branch in dependency order;
5. Manager records `INTEGRATION_SHA`;
6. integration CI runs on that exact integrated state;
7. integration failure returns the responsible task to `REMEDIATION` or triggers troubleshooting escalation when appropriate;
8. only stable integrated behavior advances to checkpoint/final audit.

## Grandfathered shared-branch tasks

FFH-011 and FFH-012 began before Workflow V2. Their existing commits remain on `phase-5-money-priority-engine`; do not rewrite history merely to manufacture isolated task branches. Manager must instead use checkpoint comparison and ownership evidence to separate their failures.
