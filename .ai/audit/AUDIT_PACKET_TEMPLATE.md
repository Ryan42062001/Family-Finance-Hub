# Family Finance Hub — Frozen Audit Packet Template

Use this template when the Manager routes a high-impact implementation or policy result to one or more independent auditors.

The packet is a frozen evidence boundary. Both auditors should receive the same packet/checkpoint and should not receive each other's conclusions before submitting their own verdicts.

## Packet identity
AUDIT_PACKET_ID: `<task>-<integration-sha-short>-<date>`
PARENT_TASK: `FFH-###`
AUDIT_TARGET_SHA: `<exact INTEGRATION_SHA or other exact checkpoint>`
MANAGER_ACCEPTANCE_RECORD: `<task section / commit / PR evidence>`
REQUIRED_AUDITS: `TECHNICAL | POLICY | BOTH`
FROZEN_AT: `<timestamp/date>`

## Governing requirements
- Task objective and acceptance criteria: `<path>`
- Canonical policy/decision artifacts: `<paths>`
- Relevant predecessor findings: `<paths/IDs>`
- Explicit non-goals: `<summary or path>`

## Exact implementation evidence
- Integration SHA: `<sha>`
- PR(s): `<numbers>`
- Changed files: `<paths>`
- Relevant production/test files: `<paths>`
- Exact integration CI: `<run/job>`
- Known inherited CI debt: `<CI-### or NONE>`

## Questions both auditors must answer independently
1. Does the exact target satisfy every blocking acceptance criterion in the assigned audit domain?
2. Did the target preserve required financial/data invariants and previously closed findings?
3. Are any observed failures inherited, task-owned, integration-only, or unrelated baseline/tooling failures?
4. Are tests/scenarios sufficient to support the verdict, including edge cases and order/rounding behavior when relevant?
5. Is any uncertainty material enough to block acceptance/closure?

## Prior findings to revisit
- Finding A: `<OPEN/CLOSED and exact issue>`
- Finding B: `<OPEN/CLOSED and exact issue>`
- Finding C: `<OPEN/CLOSED and exact issue>`

## Auditor independence rules
- Do not rely on another auditor's verdict or reasoning.
- Do not assume passing tests prove policy correctness.
- Do not assume plausible financial outputs prove code correctness.
- Classify findings exactly as `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- Final verdict must be exactly `PASS`, `PASS WITH NON-BLOCKING FINDINGS`, or `FAIL — REMEDIATION REQUIRED`.
- Auditors may inspect additional repository evidence necessary to validate the frozen target, but must not silently switch the audited SHA.

## Manager disposition after audits
Manager compares both independent verdicts against the same frozen target. Disagreements are resolved by identifying conflicting assumptions/evidence; verdicts are not averaged. Closure occurs only when all required blocking audit gates are satisfied.