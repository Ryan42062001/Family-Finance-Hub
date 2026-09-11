# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-10
Workflow: V2 / FFH-D007
Detailed task authority: `.ai/tasks/FFH-###.md`
Dashboard: `.ai/tasks/TASK_INDEX.md`
Integration/readiness queue: `.ai/manager/INTEGRATION_QUEUE.md`

# FFH-PW-003 — Retirement-capacity remediation and HSA integration

Status: ACTIVE

## Completed / accepted in current wave

- FFH-009 — Retirement Policy — ACCEPTED / synthesized as FFH-D006.
- FFH-010 — App/Data HSA persistence + normalized contract — ACCEPTED at `8f39e7d6e638711a80300786869a407113d3d0c4`, Foundation CI #300 SUCCESS; live parity tracked by FFH-016.
- FFH-011 — App/Data SIMPLE persisted-field contract — ACCEPTED at in-place checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`; CI #348 returned to the 54-failure FFH-012 baseline after removing the one incremental FFH-011 SIMPLE regression. Live SIMPLE parity is now FFH-016; Core SIMPLE formula consumption is FFH-015.
- FFH-014 — Workflow V2 upgrade — CLOSED / FFH-D007 adopted.

## Current execution

### FFH-012 — HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
State: REMEDIATION
Task: `.ai/tasks/FFH-012.md`
Isolated candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Evidence: CI #308 FAILURE with 54 task-owned HSA-related calculation failures; the same aggregate failure count remains at accepted FFH-011 checkpoint CI #348.
Execution mode: WORK_MODE_HIGH_VALUE for sustained debugging/testing if credits are available; normal-chat fallback remains valid.
Next gate: focused D005 owner remediation -> exact validation -> current FFH-012 handoff -> `READY_FOR_MANAGER` / `BLOCKED` / escalation as supported.

### FFH-016 — live Supabase migration/runtime parity
Owner: Application, Data & Integration Engineer
State: ACTIVE / VERIFICATION-ONLY PRE-MERGE GATE
Task: `.ai/tasks/FFH-016.md`
Scope: accepted FFH-010 HSA contract + accepted FFH-011 SIMPLE contract.
Execution mode: WORK_MODE_HIGH_VALUE because the task spans repository, linked database/PostgREST/RLS, runtime persistence, and browser verification. Work mode is an accelerator, not a dependency.
Fallback: ordinary chat continues with GitHub + linked Supabase evidence, completes all available database/API/runtime checks, and explicitly isolates any browser-only remainder rather than stopping useful progress.
Next gate: reproducible live evidence -> current App/Data handoff -> `READY_FOR_MANAGER` / `BLOCKED`.

## Queued

- FFH-013 — Core spousal-IRA shared compensation ledger — QUEUED behind FFH-012.
- FFH-015 — narrow R1 SIMPLE Core remediation — QUEUED; FFH-011 dependency is satisfied, but wait for a collision-safe Core slot while FFH-012 is active.
- FFH-017 — Phase 5C implementation — QUEUED / policy approved; retirement-capacity baseline must stabilize first.
- FFH-018 — docs-only CI efficiency hardening — QUEUED for Product R&D discovery after current red remediation stabilizes.

# Current role status

Manager / Architect — EVENT-DRIVEN; current acceptance/activation event complete after canonical update
Application, Data & Integration Engineer — ACTIVE on FFH-016
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

- Keep active specialist execution to App/Data FFH-016 + Core FFH-012; Manager is event-driven.
- Do not make App/Data repair Core financial behavior or Core repair live persistence/runtime state outside its task.
- Reactivate Manager when either task reaches `READY_FOR_MANAGER`, `BLOCKED`, requests escalation, or when the user requests status/prioritization.
- Two actual same-root owner remediation failures are required before Troubleshooting escalation; docs-only red reruns do not count.
- Do not start FFH-013 and FFH-015 concurrently while Core overlap risk is unresolved; choose order after the FFH-012 Manager event.
- Do not start FFH-017, audits, or FFH-018 now.
- PR #5 body remains stale and must be refreshed before final merge review, not while core execution state is still moving.
