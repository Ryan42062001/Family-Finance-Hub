# Family Finance Hub — Project State

Last refreshed: 2026-09-09

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active milestone integration branch: `phase-5-money-priority-engine`
PR #5: OPEN / UNMERGED / NON-DRAFT / mergeable when last checked.

Workflow V2 / FFH-D007 is now canonical for task execution, integration, troubleshooting escalation, and replacement-chat bootstrapping.

## Stable product state on main

`main` contains completed Foundation, Household Financial Profile, Dashboard, and Phase 4 Planning Tools.

## Phase 5 status

Phase 5 remains ACTIVE on PR #5 and NOT MERGE READY.

Phase 5A: IMPLEMENTED / final integrated audit required.
Phase 5B: IMPLEMENTED / final integrated audit required.
Phase 5C: POLICY APPROVED under FFH-D004 / production implementation not yet activated.

## Completed waves

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
Status: COMPLETE AT POLICY/ANALYSIS GATE

- FFH-006: COMPLETE; R2 remediated at validated checkpoint `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`, Foundation CI #274 SUCCESS; R1 returned as semantic ambiguity.
- FFH-007: COMPLETE.
- FFH-008: COMPLETE.
- HSA Manager synthesis: APPROVED as FFH-D005.

## Active wave — FFH-PW-003

Status: ACTIVE

### FFH-009 — Retirement Policy R6
State: ACCEPTED / Manager synthesized as FFH-D006.

### FFH-010 — App/Data HSA persistence + normalized contract
State: ACCEPTED.
Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4`.
Foundation CI #300 / run `34306364189`: SUCCESS on exact production checkpoint.

Unverified deployment boundary retained:
- repository migration `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql` is not proven applied to the linked/live Supabase project;
- live PostgREST/RLS/browser parity remains required before merge-ready status.

### FFH-011 — App/Data R1 SIMPLE persisted-field contract
State: REMEDIATION.
Task authority: `.ai/tasks/FFH-011.md`.
Candidate production checkpoint: `f85f7779a6bebac87d433289212f8671b46d8212`.
Foundation CI #309: FAILURE; because FFH-011 sits above concurrent FFH-012 work on the grandfathered shared branch, failure ownership must be established rather than assumed.

### FFH-012 — Core HSA legal-capacity calculation
State: REMEDIATION.
Task authority: `.ai/tasks/FFH-012.md`.
Latest isolated observed Core checkpoint before the FFH-011 head: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`.
Foundation CI #308: FAILURE at calculation-test stage.

### FFH-014 — Workflow V2 operating-system upgrade
State: CLOSED.
Durable decision: FFH-D007.
No production financial behavior changed.

## Current findings / disposition

### R1 — SIMPLE higher-limit semantics/correctness
MERGE BLOCKER. FFH-011 is in remediation. Narrow Core formula remediation remains blocked until FFH-011 is Manager-accepted.

### R2 — governmental 457(b) Roth catch-up
REMEDIATED by FFH-006; later integrated audit required.

### R3/R4 — HSA legal-capacity model
FFH-D005 approved. FFH-010 App/Data contract ACCEPTED. FFH-012 Core implementation is in remediation.

### R6 — MFJ spousal-IRA scarce-compensation allocation
Policy resolved by FFH-D006. FFH-013 remains merge-blocking and queued after FFH-012 unless Manager explicitly reorders.

## Queued work

1. FFH-013 — Core Engine spousal-IRA shared compensation ledger after FFH-012 acceptance unless Manager explicitly reorders.
2. Narrow Core R1 formula remediation after FFH-011 acceptance and collision-safe scheduling.
3. FFH-010 linked Supabase migration/runtime parity verification before merge-ready status.
4. Phase 5C Core implementation under FFH-D004 after retirement-capacity blockers are stable.
5. Independent Technical & Mathematical Audit and Financial Policy & Scenario Audit on stable integrated Phase 5 behavior.

## Workflow V2 operating state

Canonical execution files:
- `.ai/tasks/README.md`
- `.ai/tasks/TASK_INDEX.md`
- `.ai/tasks/FFH-011.md`
- `.ai/tasks/FFH-012.md`
- `.ai/tasks/FFH-013.md`
- `.ai/manager/INTEGRATION_QUEUE.md`
- `.ai/roles/*.md`

Normal task lifecycle:
`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`, plus `BLOCKED` / `REMEDIATION`.

New production tasks default to isolated short-lived task branches and Manager integration. FFH-011/012 remain grandfathered shared-branch exceptions because they predate Workflow V2.

Manager is event-driven rather than continuously polling. Default active-chat target is roughly 2–4. Current useful active set is Manager when orchestration is needed, App/Data FFH-011, and Core FFH-012. All other permanent roles are IDLE.

Same-root CI/build/tooling failure surviving two owner remediation iterations triggers the on-demand Troubleshooting & Build Specialist rather than an indefinite troubleshooting loop.

Replacement employee chats should bootstrap from `.ai/roles/<role>.md`, canonical shared state, the active task file, and the role handoff rather than requiring large prompt-history reconstruction.

## Validation state

Verified successful historical CI checkpoints include:
- #245 on `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`
- #249 on `f6a138e78083afe6bdf83bc42117c705bda9ca09`
- #269 on `71705039f0abf1945202631109975edeb5632920`
- #274 on `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`
- #277 on `60de76c449bae1128908292f2efa24bb7cbd971d`
- #300 on FFH-010 production checkpoint `8f39e7d6e638711a80300786869a407113d3d0c4`

Current red execution checkpoints:
- #308 on observed isolated FFH-012 Core checkpoint `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
- #309 on FFH-011 candidate/head `f85f7779a6bebac87d433289212f8671b46d8212`, with concurrent/inherited attribution unresolved

Literal local `npm run verify` is not claimed unless directly observed. No CI result is itself an audit verdict.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine
Milestone status: ACTIVE / NOT MERGE READY
Active wave: FFH-PW-003
Manager: EVENT-DRIVEN ACTIVE
Application/Data: ACTIVE / REMEDIATION on FFH-011
Core Engine: ACTIVE / REMEDIATION on FFH-012
Retirement Policy: IDLE
Debt/Liquidity Policy: IDLE
Goals/Cash Flow Policy: IDLE
Regulatory Research: IDLE
Product R&D: IDLE
Technical Auditor: IDLE pending stable integrated checkpoint
Financial Policy & Scenario Auditor: IDLE pending stable integrated checkpoint
Troubleshooting & Build: IDLE / ON-DEMAND

Exact next sequence:
1. FFH-011 and FFH-012 owners remediate independently and update task files as states change.
2. When either reaches `READY_FOR_MANAGER`, reactivate Manager for independent acceptance.
3. After FFH-012 acceptance, activate FFH-013 on an isolated Workflow V2 task branch if safe.
4. After FFH-011 acceptance, authorize narrow R1 Core remediation on an isolated task branch when collision-safe.
5. Resolve FFH-010 live Supabase migration/runtime parity before merge-ready status.
6. Stabilize retirement-capacity work, then implement FFH-D004 Phase 5C.
7. Use checkpoint audit where useful, then run required final dual independent audits before merge.
