# Family Finance Hub — Task State System

This directory is the authoritative per-task execution layer for Family Finance Hub Workflow V2.

## Authority

Repository evidence remains authoritative. For task execution state, the order is:
1. the task's `.ai/tasks/FFH-###.md` file;
2. verified branch/SHA/CI/runtime evidence referenced by that file;
3. Manager integration/acceptance records;
4. role `HANDOFF.md` summaries;
5. `.ai/tasks/TASK_INDEX.md`, which is a Manager-maintained dashboard/cache and may lag a task file briefly.

A role handoff no longer substitutes for task state. `HANDOFF.md` remains useful for role continuity, but every active or queued production/policy/audit assignment should have its own task file.

## States

Normal lifecycle:

`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`

Exception states:
- `BLOCKED` — cannot proceed until an external dependency/fact is resolved.
- `REMEDIATION` — implementation exists but validation, integration, or review found a correctable failure.

State meanings:
- `QUEUED`: Manager-authorized future work; do not start yet.
- `ACTIVE`: owner may implement/perform assigned work.
- `VALIDATING`: candidate work exists and required validation is running or being assembled.
- `READY_FOR_MANAGER`: owner believes acceptance criteria are satisfied; exact evidence/checkpoints are recorded.
- `ACCEPTED`: Manager independently accepted the task result for its stated scope.
- `AUDIT_READY`: accepted integrated behavior is stable enough for required independent audit.
- `CLOSED`: all task-specific gates are complete and no further action is required.
- `BLOCKED`: owner must stop the blocked portion and record the exact dependency/evidence needed.
- `REMEDIATION`: owner remains responsible unless Manager reassigns/escalates.

## Transition authority

Manager may set any state and is the only role that may set `ACCEPTED`, `AUDIT_READY`, or `CLOSED`.

Task owner may transition its own task among `ACTIVE`, `VALIDATING`, `READY_FOR_MANAGER`, `BLOCKED`, and `REMEDIATION` as evidence changes. A worker may never self-accept.

When a task reaches `READY_FOR_MANAGER`, the worker updates both the task file and its role handoff, then stops changing production scope unless Manager requests remediation.

## Required task fields

Each task file must include:
- Task ID and title
- Owner
- State
- Dependency classification and prerequisites
- Approved integration base
- Task branch / branch exception
- Objective and non-goals
- Acceptance criteria
- Owned files/systems and overlap risks
- Production checkpoint SHA
- Validation checkpoint / CI run
- Handoff checkpoint SHA
- Integration checkpoint SHA
- Validation status
- Failed-attempt / escalation count when applicable
- Blocking issues and unverified items
- Exact next action

Use `Not yet established` instead of inventing checkpoint values.

## Checkpoint vocabulary

- `PRODUCTION_SHA`: commit containing the task's production/test changes that were validated.
- `VALIDATED_CI`: exact CI/workflow run tied to `PRODUCTION_SHA` (or a later test-only checkpoint explicitly described).
- `HANDOFF_SHA`: documentation commit containing the worker's completed handoff/task-state update.
- `INTEGRATION_SHA`: Manager-created/verified commit that integrates the accepted task into the milestone integration branch.

Documentation commits after a green production checkpoint do not invalidate that checkpoint. Always distinguish the four values.

## Branching default

New production tasks created after Workflow V2 should use a short-lived task branch from a Manager-approved integration base, normally:

`ffh/<task-id-lowercase>-<short-slug>`

Workers do not merge their own task branches. The Manager accepts a validated production checkpoint, integrates it into the milestone branch, then verifies integration CI.

Manager may explicitly authorize shared-branch work when collision risk is low or tooling makes isolation impractical. The exception and reason must be recorded in the task file.

FFH-011 and FFH-012 were already in flight on `phase-5-money-priority-engine` when Workflow V2 was adopted and are grandfathered as shared-branch exceptions. Do not rewrite their history solely to satisfy the new branch convention.

## CI ownership and inherited failures

Task files must identify the expected owned test surface and known concurrent/inherited failures. A red branch-level CI run is not automatically attributable to the newest task if earlier concurrent work was already red.

Before remediation, compare candidate/base checkpoints and identify the earliest failing checkpoint when evidence permits.

## Two-strike troubleshooting escalation

A task owner gets the first remediation attempt for a diagnosed CI/build/tooling problem. If the same root problem survives two owner remediation iterations, mark the task `REMEDIATION`, increment its escalation count, and request the on-demand Troubleshooting & Build Specialist.

This rule counts repeated attempts against the same root cause, not unrelated red runs.

The Troubleshooting specialist may diagnose CI, TypeScript/build, test harness, dependency, environment, branch/rebase, and regression-isolation problems. It may not invent or redefine financial policy/business semantics. If the root cause is financial behavior, schema meaning, or product policy, it returns the issue to the owning permanent role/Manager.

## Event-driven Manager model

Manager does not need to poll continuously. Manager should be reactivated when:
- a task becomes `READY_FOR_MANAGER`;
- a task becomes `BLOCKED`;
- troubleshooting escalation is requested;
- integration CI fails;
- an audit reaches a verdict;
- a dependency transition unlocks queued work;
- the user requests a status/roadmap decision.

Otherwise, active workers may continue independently from their task files.

## Chat rotation

Chats are execution interfaces, not canonical memory. Prefer fresh chats before context degradation becomes costly.

Default rotation guideline: replace a worker chat after roughly 3–5 substantial tasks, after a long troubleshooting episode, or whenever responsiveness/context quality degrades. A replacement chat reads its role charter, canonical shared files, active task file, and relevant handoff; it must not require a giant manually maintained replacement prompt.
