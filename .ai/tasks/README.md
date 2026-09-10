# Family Finance Hub — Task State System

This directory is the authoritative per-task execution layer for Family Finance Hub Workflow V2.

## Authority

Repository evidence remains authoritative. For task execution state, the order is:
1. the task's `.ai/tasks/FFH-###.md` file;
2. verified branch/SHA/CI/runtime evidence referenced by that file;
3. Manager integration/acceptance records;
4. role `HANDOFF.md` summaries;
5. `.ai/tasks/TASK_INDEX.md`, which is a Manager-maintained dashboard/cache and may lag a task file briefly.

A role handoff no longer substitutes for task state. `HANDOFF.md` remains useful for role continuity, but every active or queued meaningful production, policy, audit, research, or verification assignment should have its own task file.

## States

Normal lifecycle:

`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`

Exception states:
- `BLOCKED` — cannot proceed until an external dependency/fact is resolved.
- `REMEDIATION` — work exists but validation, integration, or review found a correctable failure.

Manager is the only role that may set `ACCEPTED`, `AUDIT_READY`, or `CLOSED`. Owners may move their own task among `ACTIVE`, `VALIDATING`, `READY_FOR_MANAGER`, `BLOCKED`, and `REMEDIATION` as evidence changes, but may never self-accept.

When a task reaches `READY_FOR_MANAGER`, the owner updates both its task file and role handoff, then stops expanding scope unless Manager requests remediation.

## Required task fields

Each task file should include as applicable:
- Task ID/title, owner, state, dependencies;
- approved integration base and branch/branch exception;
- objective, required behavior, non-goals, acceptance criteria;
- owned files/systems and overlap risks;
- `PRODUCTION_SHA`;
- `VALIDATED_CI` or equivalent runtime evidence;
- `HANDOFF_SHA`;
- `INTEGRATION_SHA`;
- validation status;
- remediation/escalation count;
- blockers, unverified items, exact next action.

Use `Not yet established` rather than inventing checkpoint values.

## Checkpoint vocabulary

- `PRODUCTION_SHA`: commit containing task production/test changes that were validated.
- `VALIDATED_CI`: exact CI/workflow run tied to `PRODUCTION_SHA`, or an explicitly documented test-only descendant.
- `HANDOFF_SHA`: documentation checkpoint containing the worker's completed handoff/task-state update.
- `INTEGRATION_SHA`: Manager-created/verified checkpoint integrating accepted production work into the milestone branch.

Documentation commits after a green production checkpoint do not invalidate that checkpoint. Do not collapse these into a generic latest SHA.

## Verification-only tasks

A meaningful pre-merge task may prove runtime, database, deployment, security-role, or browser behavior without changing repository production code. These are `VERIFICATION-ONLY` tasks and still use the normal task-state lifecycle.

For a verification-only task:
- record `PRODUCTION_SHA: N/A — VERIFICATION-ONLY` unless a separate remediation commit is explicitly authorized;
- identify the target environment/contract without exposing credentials or secrets;
- record actual runtime/deployment/database/browser evidence instead of inventing CI or code checkpoints;
- distinguish source/migration-file existence from proof that it is applied/live;
- record `INTEGRATION_SHA: N/A` unless remediation code is later integrated;
- reach `READY_FOR_MANAGER` only when the required reproducible evidence exists;
- Manager accepts/rejects the gate independently from that evidence.

Verification-only readiness gates belong in `.ai/manager/INTEGRATION_QUEUE.md` even when they are not code integrations.

## Branching default

New production tasks created after Workflow V2 should use a short-lived task branch from a Manager-approved integration base, normally:

`ffh/<task-id-lowercase>-<short-slug>`

Workers do not merge their own task branches. Manager accepts a validated production checkpoint, integrates it into the milestone branch, then verifies integration CI.

Shared-branch work is an explicit exception whose reason/overlap risk must be recorded. FFH-011 and FFH-012 were already in flight on `phase-5-money-priority-engine` when Workflow V2 was adopted and are grandfathered; do not rewrite their history solely to satisfy the branch convention.

## CI ownership and inherited failures

A red branch-level CI run is not automatically attributable to the newest task. Task files must identify owned test surfaces and known concurrent/inherited failures. Compare candidate/base checkpoints and failing-test sets when evidence permits.

Documentation-only reruns that reproduce an unchanged production failure do not count as additional owner remediation attempts.

## Two-strike troubleshooting escalation

The task owner gets the first remediation attempt for a diagnosed CI/build/tooling problem. If the same root problem survives two actual owner remediation iterations, keep/mark the task `REMEDIATION`, increment the escalation count, and request the on-demand Troubleshooting & Build Specialist.

This counts same-root-cause remediation attempts, not unrelated or documentation-triggered red runs. The specialist may diagnose CI, TypeScript/build, test harness, dependency, environment, branch/rebase, and regression-isolation problems; it may not invent financial policy/business/schema semantics.

## Event-driven Manager model

Manager should be reactivated when:
- a task becomes `READY_FOR_MANAGER` or `BLOCKED`;
- troubleshooting escalation is requested;
- integration CI fails;
- an audit reaches a verdict;
- a dependency transition unlocks work;
- the user requests status/roadmap action.

Otherwise active workers continue from authoritative task files.

## Canonical refresh discipline

Task files are the high-frequency execution truth. `.ai/tasks/TASK_INDEX.md`, `PROJECT_STATE.md`, `ACTIVE_ASSIGNMENTS.md`, and `INTEGRATION_QUEUE.md` should be refreshed on meaningful task/validation/dependency transitions. `ROADMAP.md` should be refreshed when milestone/task disposition changes materially; it is not intended as a per-commit execution log.

## Chat rotation

Chats are execution interfaces, not canonical memory. Prefer fresh chats before context degradation becomes costly. Default guideline: replace a worker after roughly 3–5 substantial tasks, after a long troubleshooting episode, or when responsiveness/context quality degrades. Replacement chats read their role charter, canonical shared state, active task file, and relevant handoff rather than receiving giant manually maintained prompts.
