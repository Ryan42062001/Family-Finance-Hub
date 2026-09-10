# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-09
Workflow: V2 / FFH-D007
Detailed task authority: `.ai/tasks/FFH-###.md`
Dashboard: `.ai/tasks/TASK_INDEX.md`
Integration queue: `.ai/manager/INTEGRATION_QUEUE.md`

# FFH-PW-003 — Retirement-capacity remediation and HSA integration

Status: ACTIVE

## Completed / accepted in current wave

- FFH-009 — Retirement Policy — ACCEPTED / Manager synthesized as FFH-D006.
- FFH-010 — App/Data HSA persistence + normalized input contract — ACCEPTED at production checkpoint `8f39e7d6e638711a80300786869a407113d3d0c4`, Foundation CI #300 SUCCESS. Live linked Supabase/runtime parity remains a separate pre-merge gate.
- FFH-014 — Manager Workflow V2 operating-system upgrade — CLOSED; FFH-D007 approved.

## Current execution

### FFH-011 — SIMPLE persisted-field contract
Owner: Application, Data & Integration Engineer
State: REMEDIATION
Task file: `.ai/tasks/FFH-011.md`
Current candidate: `f85f7779a6bebac87d433289212f8671b46d8212`
Observed validation: Foundation CI #309 FAILURE; failure attribution must distinguish inherited concurrent FFH-012 work.
Next gate: worker reaches `READY_FOR_MANAGER` with exact defensible validation + current FFH-011 handoff.

### FFH-012 — HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
State: REMEDIATION
Task file: `.ai/tasks/FFH-012.md`
Latest isolated observed Core checkpoint: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Observed validation: Foundation CI #308 FAILURE at calculation-test stage.
Next gate: worker remediates exact failure and reaches `READY_FOR_MANAGER` with green required validation + current FFH-012 handoff.

## Queued / blocked

### FFH-013 — spousal-IRA shared compensation ledger
Owner: Core Financial Engine Engineer
State: QUEUED
Task file: `.ai/tasks/FFH-013.md`
Gate: FFH-012 Manager acceptance unless Manager explicitly reorders.
Branch: new Workflow V2 isolated task branch at activation.

### Narrow R1 Core remediation
Owner: Core Financial Engine Engineer
State: BLOCKED
Gate: FFH-011 Manager acceptance and collision-safe scheduling.

### FFH-010 live Supabase migration/runtime parity
Owner: Application, Data & Integration Engineer
State: QUEUED / REQUIRED BEFORE MERGE-READY
Gate/sequencing: Manager sets exact task when collision-free.

### Phase 5C Core implementation
Owner: Core Financial Engine Engineer
State: QUEUED / POLICY APPROVED / NOT YET ACTIVATED
Gate: retirement-capacity blockers stable and Manager issues task.

# Current role status

Manager / Architect — EVENT-DRIVEN ACTIVE for status/integration/assignment transitions
Application, Data & Integration Engineer — ACTIVE on FFH-011 remediation
Core Financial Engine Engineer — ACTIVE on FFH-012 remediation
Retirement & Tax-Advantaged Policy Analyst — IDLE
Debt & Liquidity Policy Analyst — IDLE
Goals, Cash Flow & Allocation Policy Analyst — IDLE
Regulatory & Financial Research Analyst — IDLE unless a material unresolved external fact appears
Product & Technical R&D Engineer — IDLE
Technical & Mathematical Auditor — IDLE pending stable integrated checkpoint
Financial Policy & Scenario Auditor — IDLE pending stable integrated checkpoint
Troubleshooting & Build Specialist — IDLE / ON-DEMAND only

# Workflow V2 operating rules for this wave

- Optimize safe throughput, not employee utilization; 2–4 active chats is the normal target.
- Workers update their authoritative task files as state changes; Manager no longer needs continuous polling.
- Reactivate Manager for `READY_FOR_MANAGER`, `BLOCKED`, escalation, integration CI failure, audit verdict, dependency unlock, or explicit status/roadmap request.
- FFH-011 and FFH-012 are grandfathered shared-branch tasks because they were already in flight before Workflow V2; do not rewrite history merely for branch isolation.
- New production tasks after Workflow V2 should normally use short-lived `ffh/<task-id>-<slug>` branches from a Manager-approved integration base.
- Workers do not merge their own production task branches.
- Manager independently verifies acceptance, integrates accepted work, records `INTEGRATION_SHA`, and verifies integration CI.
- A branch-head CI failure is not automatically owned by the newest task; use checkpoint/test/file evidence.
- If the same root CI/build/tooling issue survives two owner remediation iterations, request Troubleshooting & Build escalation rather than looping indefinitely.
- Auditors remain idle until stable integrated behavior exists; checkpoint audit may be used for a coherent high-risk cluster, with final Phase 5 dual audit still required.
