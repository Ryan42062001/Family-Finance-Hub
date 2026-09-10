# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-09
Workflow: V2 / FFH-D007
Detailed task authority: `.ai/tasks/FFH-###.md`
Dashboard: `.ai/tasks/TASK_INDEX.md`
Integration/readiness queue: `.ai/manager/INTEGRATION_QUEUE.md`

# FFH-PW-003 — Retirement-capacity remediation and HSA integration

Status: ACTIVE

## Completed / accepted in current wave

- FFH-009 — Retirement Policy — ACCEPTED / synthesized as FFH-D006.
- FFH-010 — App/Data HSA persistence + normalized contract — ACCEPTED at `8f39e7d6e638711a80300786869a407113d3d0c4`, Foundation CI #300 SUCCESS; live parity tracked by FFH-016.
- FFH-014 — Workflow V2 upgrade — CLOSED / FFH-D007 adopted.

## Current execution

### FFH-011 — SIMPLE persisted-field contract
Owner: Application, Data & Integration Engineer
State: REMEDIATION
Task: `.ai/tasks/FFH-011.md`
Candidate: `f85f7779a6bebac87d433289212f8671b46d8212`
Evidence: CI #309 FAILURE. Independent checkpoint comparison isolates one FFH-011-specific failure: `SIMPLE age 40 higher=true uses plan-specific limit`; 54 other failures are inherited from FFH-012 and are out of App/Data scope.
Next gate: focused owner remediation -> exact validation -> current FFH-011 handoff -> `READY_FOR_MANAGER`.

### FFH-012 — HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
State: REMEDIATION
Task: `.ai/tasks/FFH-012.md`
Isolated candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Evidence: CI #308 FAILURE with 54 task-owned HSA-related calculation failures.
Next gate: focused D005 owner remediation -> exact validation -> current FFH-012 handoff -> `READY_FOR_MANAGER`.

Neither task has yet completed an actual post-diagnosis Workflow V2 owner remediation iteration. Documentation-triggered reruns do not count toward troubleshooting escalation.

## Queued / blocked

- FFH-013 — Core spousal-IRA shared compensation ledger — QUEUED behind FFH-012.
- FFH-015 — narrow R1 SIMPLE Core remediation — BLOCKED on FFH-011 acceptance + safe Core slot.
- FFH-016 — live Supabase migration/runtime parity — QUEUED verification-only pre-merge gate; HSA now, SIMPLE after FFH-011 acceptance.
- FFH-017 — Phase 5C implementation — QUEUED / policy approved; retirement-capacity baseline must stabilize first.
- FFH-018 — docs-only CI efficiency hardening — QUEUED for Product R&D discovery after current red remediation stabilizes.

No downstream task should be activated now.

# Current role status

Manager / Architect — EVENT-DRIVEN ACTIVE for this Work-mode integration event; otherwise status/integration transitions
Application, Data & Integration Engineer — ACTIVE / REMEDIATION on FFH-011
Core Financial Engine Engineer — ACTIVE / REMEDIATION on FFH-012
Retirement & Tax-Advantaged Policy Analyst — IDLE
Debt & Liquidity Policy Analyst — IDLE
Goals, Cash Flow & Allocation Policy Analyst — IDLE
Regulatory & Financial Research Analyst — IDLE
Product & Technical R&D Engineer — IDLE
Technical & Mathematical Auditor — IDLE
Financial Policy & Scenario Auditor — IDLE
Troubleshooting & Build Specialist — IDLE / ON-DEMAND

# Manager sequencing rules

- Keep active execution to App/Data FFH-011 + Core FFH-012; Manager is event-driven.
- Do not make App/Data repair inherited HSA failures or Core repair the SIMPLE failure.
- Reactivate Manager when either task reaches `READY_FOR_MANAGER`, `BLOCKED`, or requests escalation.
- Two actual same-root owner remediation failures are required before Troubleshooting escalation; docs-only red reruns do not count.
- Do not start FFH-013, FFH-015, FFH-017, audits, or FFH-018 now.
- FFH-016 is a required pre-merge runtime gate but remains queued while App/Data is occupied.
- Do not alter CI workflow mid-remediation merely to suppress known red runs; FFH-018 handles that later.
- PR #5 body remains stale and must be refreshed before final merge review, not while core execution state is still moving.
