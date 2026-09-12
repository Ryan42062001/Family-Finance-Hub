# Family Finance Hub — Workflow V3.1 Determinism Overlay

Status: APPROVED / CANONICAL OPERATING OVERLAY / CONTROL-PLANE ONLY
Task: FFH-027
Base workflow: `.ai/shared/WORKFLOW_V3.md` + `.ai/shared/WORKFLOW.md`

This overlay tightens control-plane determinism without changing financial policy, production behavior, specialist authority, or the five-department operating model.

Future Manager activation prompts and replacement-chat bootstraps should include `.ai/shared/WORKFLOW_V3_1.md` in addition to `.ai/shared/WORKFLOW_V3.md` and `.ai/shared/WORKFLOW.md`. Repository/task/runtime/CI evidence remains authoritative over chat memory.

## 1. Machine-checkable task state

New tasks should use `Schema: FFH_TASK_V1` and the template in `.ai/tasks/TASK_TEMPLATE.md`.

All task states must remain within the canonical lifecycle:
`QUEUED`, `ACTIVE`, `VALIDATING`, `READY_FOR_MANAGER`, `ACCEPTED`, `AUDIT_READY`, `CLOSED`, `BLOCKED`, `REMEDIATION`.

Do not create ad hoc lifecycle states such as `READY_FOR_MANAGER_VERIFICATION`. Put finer-grained gate detail in `Activation`, `AUDIT_STATUS`, `Next action`, or Manager Integration Record fields instead.

`TASK_INDEX.md` is still a Manager-maintained dashboard/cache, but its task state must match the authoritative task file at committed checkpoints. Temporary in-edit drift is acceptable; committed control-plane drift is not.

Run `npm run ai:validate-state` before accepting control-plane changes. CI also runs this validator.

## 2. Manager Integration Record

Every `FFH_TASK_V1` task carries one compact Manager Integration Record with:
- `PRODUCTION_SHA`
- `VALIDATED_CI`
- `HANDOFF_SHA`
- `INTEGRATION_SHA`
- `MANAGER_VERDICT`
- `AUDIT_STATUS`

These fields remain semantically distinct. `N/A — <reason>` is allowed for verification-only or control-plane tasks where a production checkpoint is not meaningful.

A worker reaching `READY_FOR_MANAGER` is not equivalent to Manager acceptance. A merged PR is not equivalent to Manager acceptance. An integrated checkpoint is not automatically audit-ready. Closure requires the task's required audit/validation gates plus Manager disposition.

## 3. Merge-versus-acceptance lifecycle

Preferred production flow:
`ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> integrate/merge -> AUDIT_READY -> CLOSED`.

When a task must be integrated before final acceptance evidence is available, record that explicitly in the Manager Integration Record and keep the lifecycle state at the narrowest truthful gate. Never use PR merge state as a substitute for task state.

## 4. CI failure ownership registry

Manager owns `.ai/manager/KNOWN_CI_DEBT.md`.

Known inherited failures receive stable `CI-###` identifiers with exact failure identity, ownership basis, last verified checkpoint, and closure gate. Tasks should reference these IDs instead of repeatedly copying ambiguous prose.

A known-debt entry never excuses new failures. If failure identity changes, re-attribute from evidence rather than assuming the old debt still applies.

## 5. Frozen audit packets

For high-impact audits, especially dual technical/policy audits, Manager should create or instantiate the packet structure in `.ai/audit/AUDIT_PACKET_TEMPLATE.md`.

Both auditors receive the same frozen target SHA, requirements, changed-file set, integration CI, prior findings, and known CI debt. They do not receive each other's verdicts before submitting their own.

Auditors may inspect additional evidence necessary to verify the frozen target, but may not silently switch the audited checkpoint.

## 6. Dependency-driven activation metadata

New tasks should record:
- `Activation`
- `Blocked by`
- `Next owner`
- dependency classification

These fields are routing metadata, not new authority. Manager remains the router. Workers do not activate dependent tasks merely because a prerequisite appears complete; Manager verifies the transition first.

`Activation: READY` means the dependency graph permits work to start. `Activation: ACTIVE` or `USER_AUTHORIZED` means execution is currently authorized. `Activation: BLOCKED` must name the real blocker.

## 7. Execution-mode classification

Every new meaningful task records exactly one:
- `STANDARD_CHAT`
- `WORK_MODE_PREFERRED`
- `WORK_MODE_HIGH_VALUE`

Manager chooses the mode based on expected value, not task prestige.

Use `STANDARD_CHAT` for bounded policy/research/audit/small implementation/control-plane work.
Use `WORK_MODE_PREFERRED` for multi-file implementation, repeated test cycles, broad integration work, or runtime/browser interaction where sustained execution materially helps.
Use `WORK_MODE_HIGH_VALUE` for long-running, highly interactive, database/browser/deployment/recovery work where Work mode is expected to provide major acceleration.

Preferred/high-value remains an accelerator, not a dependency, unless the task file identifies a capability that truly cannot be reproduced through normal chat/tools.

## 8. Validation compatibility rule

The state validator applies canonical state/index consistency to all current tasks. Stronger field requirements apply to `FFH_TASK_V1` tasks so historical tasks do not need mass formatting rewrites merely to adopt this overlay.

Future tasks should use `FFH_TASK_V1` unless Manager records a specific exception.

## 9. Adoption boundary

FFH-027 is control-plane only. It does not accept FFH-012, resolve FFH-020, activate Phase 6/7, change Supabase state, or alter financial calculations.
