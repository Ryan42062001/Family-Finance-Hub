# Family Finance Hub — Task Template

Use this template for new meaningful tasks created after FFH-027. Historical tasks are not required to be rewritten solely to match this layout.

```md
# FFH-### — <Title>

Schema: FFH_TASK_V1
Owner: <role>
State: QUEUED
Execution mode: STANDARD_CHAT | WORK_MODE_PREFERRED | WORK_MODE_HIGH_VALUE
Dependency classification: INDEPENDENT | SOFT DEPENDENCY | HARD DEPENDENCY
Approved integration base: <branch/SHA or N/A>
Branch: <branch or N/A>
Activation: WAITING | READY | ACTIVE | USER_AUTHORIZED | BLOCKED
Blocked by: <task IDs or NONE>
Next owner: <role>

## Objective
...

## Required behavior
...

## Non-goals
...

## Owned files / systems
...

## Manager Integration Record
PRODUCTION_SHA: Not yet established
VALIDATED_CI: Not yet established
HANDOFF_SHA: Not yet established
INTEGRATION_SHA: Not yet established
MANAGER_VERDICT: PENDING
AUDIT_STATUS: NOT_READY

## Known CI ownership
- Task-owned: ...
- Inherited: reference `.ai/manager/KNOWN_CI_DEBT.md` entries, if any.

## Financial reconciliation gate
Applicability: REQUIRED | NOT_APPLICABLE — <reason>
Authoritative routing unit: <annual/monthly/one-time/N/A>
Aggregate-to-destination invariant: <exact invariant or N/A>
Required adversarial money boundaries: <odd-cent/order/shared-group/unit-conversion cases or N/A>

## Acceptance criteria
...

## Validation plan
...

## Next action
...
```

## Semantics
- `Activation` is operational metadata, not a replacement for `State`.
- `Blocked by` contains only real dependencies. Use `NONE` rather than inventing a dependency.
- `Next owner` identifies the role expected to act after the current gate; it does not transfer authority automatically.
- `Execution mode` is selected by the Manager when the task is created and may be overridden when circumstances change.
- `MANAGER_VERDICT` remains `PENDING` until the Manager independently accepts or rejects the worker result.
- A merged PR does not itself set `MANAGER_VERDICT`, `AUDIT_STATUS`, or `State`.
- `AUDIT_STATUS` may be `NOT_READY`, `REQUIRED`, `IN_PROGRESS`, `PASS`, `PASS_WITH_NON_BLOCKING_FINDINGS`, `FAIL_REMEDIATION_REQUIRED`, or `NOT_REQUIRED — <reason>`.
- Verification-only/control-plane tasks may use explicit `N/A — <reason>` checkpoint values where a production code SHA is not meaningful.
- Any task changing money routing, splitting, shared/grouped capacity, or annual/monthly conversion must mark the Financial reconciliation gate `REQUIRED` and apply `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`.
- `READY_FOR_MANAGER` evidence for a required reconciliation gate must include exact aggregate/destination reconciliation and the applicable adversarial money-boundary result.