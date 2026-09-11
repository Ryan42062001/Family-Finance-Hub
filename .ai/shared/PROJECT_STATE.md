# Family Finance Hub — Project State

Last refreshed: 2026-09-10

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active milestone integration branch: `phase-5-money-priority-engine`
Manager-verified FFH-016 blocked checkpoint before FFH-020 activation: `04db9dd7b38480f823c659944c3a3f52924972df`.
PR #5 remains open/unmerged/non-draft and Phase 5 remains not merge-ready.

Workflow V3 is canonical for workforce presentation, task-scoped chat lifecycle, execution-mode routing, Work-mode fallback, and replacement-chat bootstrapping. `.ai/shared/WORKFLOW.md` remains the authoritative Workflow V2 base for task lifecycle, checkpoint vocabulary, branch/integration safety, troubleshooting escalation, financial safeguards, and audit gates.

## Stable product state on main

`main` contains completed Foundation, Household Financial Profile, Dashboard, and Phase 4 Planning Tools.

## Phase 5 status

Phase 5 remains ACTIVE on PR #5 and NOT MERGE READY.

Phase 5A: IMPLEMENTED / final integrated audit required.
Phase 5B: IMPLEMENTED / final integrated audit required.
Phase 5C: POLICY APPROVED under FFH-D004 / implementation task FFH-017 queued and not activated.

## Active wave — FFH-PW-003

### FFH-009 — Retirement Policy R6
State: ACCEPTED / Manager synthesized as FFH-D006.

### FFH-010 — App/Data HSA persistence + normalized contract
State: ACCEPTED.
Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4`.
Foundation CI #300 / run `34306364189`: SUCCESS on exact production checkpoint.
Repository contract is accepted, but its live migration `20260909005000` is not deployed to the linked Supabase project. FFH-020 now owns the deployment prerequisite; FFH-016 resumes independent parity verification afterward.

### FFH-011 — App/Data R1 SIMPLE persisted-field contract
State: ACCEPTED.
Accepted/in-place integration checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`.
Foundation CI #348 on that exact checkpoint remains globally red at calculation stage with 54 failures matching the Manager-isolated FFH-012 baseline; the one incremental FFH-011 SIMPLE failure previously observed at #309 is removed.
Repository contract is accepted, but its live migration `20260909033000` is not deployed to the linked Supabase project. FFH-020 now owns deployment. Core statutory SIMPLE formula consumption remains FFH-015.

### FFH-012 — Core HSA legal-capacity calculation
State: REMEDIATION.
Task authority: `.ai/tasks/FFH-012.md`.
Isolated Core candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`.
Foundation CI #308: FAILURE with 54 task-owned HSA-related calculation failures. Core must diagnose/remediate that set and reach READY_FOR_MANAGER.
Escalation count remains zero in the authoritative task unless newer task evidence supersedes it.

### FFH-014 — Workflow V2 operating-system upgrade
State: CLOSED / FFH-D007 adopted.
No production financial behavior changed.

### FFH-016 — live Supabase migration/runtime parity verification
State: BLOCKED / VERIFICATION-ONLY.
Fresh live evidence at branch checkpoint `04db9dd7b38480f823c659944c3a3f52924972df` confirms linked Supabase project `tsqwvggojeudgspnumze` is `ACTIVE_HEALTHY`, but migration history ends at `20260903135253 phase_5b_goal_intelligence`. FFH-010 migration `20260909005000` and FFH-011 migration `20260909033000` are absent, and all six required HSA/SIMPLE schema objects are absent.
PostgREST, RLS role-matrix, persistence/reload, normalized runtime, Recommendation Refresh, and browser parity remain prerequisite-blocked. No schema/data/runtime repairs were made under FFH-016.
Unlock: Manager accepts FFH-020 deployment evidence, then reactivates FFH-016.

### FFH-019 — Workflow V3 operating overlay
State: CLOSED / MANAGER ACCEPTED.
PR #6 merged into the Phase 5 milestone branch at `11c757141fb17c00c5b37bc702cbd0ed55c38a5c`.
No production financial behavior, schema, or audit gate changed.

### FFH-020 — accepted FFH-010/011 live migration deployment
State: ACTIVE / DEPLOYMENT-ONLY ENVIRONMENT REMEDIATION.
Owner: Application, Data & Integration Engineer.
Execution classification: WORK_MODE_HIGH_VALUE; normal-chat fallback remains valid.
Authorized target: linked Supabase project `tsqwvggojeudgspnumze`.
Authorized source: exact accepted migrations `20260909005000_ffh_010_hsa_input_contract.sql` then `20260909033000_ffh_011_simple_plan_limit_contract.sql` from the current milestone branch.
No migration-source edits, financial-policy changes, Core changes, backfills, unrelated Supabase refactors, or hand-edited live DDL are authorized. Drift/failure returns BLOCKED to Manager.
Next gate: actual migration-history + schema/RLS/policy/grant + available security-advisor evidence -> App/Data handoff -> READY_FOR_MANAGER or BLOCKED.

## Current validation / runtime evidence

At accepted FFH-011 checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`, Foundation CI #348 is red with 54 calculation failures, exactly returning to the previously isolated FFH-012 failure count after the FFH-011 incremental SIMPLE regression was removed. Downstream security/typecheck/lint/build steps were skipped by fail-fast and remain unverified at that checkpoint.

FFH-016 independently proved that repository migration-file existence did not equal live deployment: project `tsqwvggojeudgspnumze` was healthy, yet both accepted September 9 migrations and all six required schema objects were absent. This is now an explicit deployment prerequisite rather than a verification ambiguity.

## Current findings / disposition

### R1 — SIMPLE higher-limit semantics/correctness
Persistence/runtime semantic contract: ACCEPTED under FFH-011.
Live migration deployment: FFH-020 ACTIVE.
Independent live parity: FFH-016 BLOCKED pending FFH-020 acceptance.
Core statutory formula consumption: merge-blocking under FFH-015, queued for a collision-safe Core slot.

### R2 — governmental 457(b) Roth catch-up
REMEDIATED by FFH-006; later integrated audit required.

### R3/R4 — HSA legal-capacity model
FFH-D005 approved. FFH-010 App/Data contract ACCEPTED. FFH-012 Core implementation remains in remediation. FFH-020 owns live accepted-migration deployment. FFH-016 resumes independent runtime parity after deployment acceptance.

### R6 — MFJ spousal-IRA scarce-compensation allocation
Policy resolved by FFH-D006. FFH-013 remains merge-blocking and queued after FFH-012 unless Manager explicitly reorders.

## Queued / active work

- FFH-012 — Core HSA legal-capacity remediation; ACTIVE specialist execution / task state REMEDIATION.
- FFH-020 — deploy accepted FFH-010 + FFH-011 migrations to linked Supabase; ACTIVE App/Data deployment task.
- FFH-016 — live HSA + SIMPLE Supabase/runtime parity; BLOCKED until Manager accepts FFH-020 deployment evidence.
- FFH-013 — Core spousal-IRA shared compensation ledger; QUEUED behind FFH-012.
- FFH-015 — narrow R1 SIMPLE Core remediation; QUEUED because FFH-011 dependency is satisfied but Core remains occupied by FFH-012.
- FFH-017 — Phase 5C implementation; QUEUED / policy approved but gated on stable retirement-capacity work.
- FFH-018 — docs-only CI efficiency hardening discovery; QUEUED until current red remediation stabilizes.
- final independent Technical & Mathematical and Financial Policy & Scenario audits remain gated on stable integrated work.

## Workflow V3 operating state

Canonical execution state lives in `.ai/tasks/`; role handoffs are continuity evidence rather than authoritative task status.

Normal lifecycle remains:
`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`, plus `BLOCKED` / `REMEDIATION`.

Verification-only and deployment-only tasks use runtime/deployment evidence rather than invented production SHAs when no new source implementation is produced.

Manager is event-driven. Current smallest useful specialist set is App/Data FFH-020 + Core FFH-012. FFH-016 is BLOCKED and should not consume a separate active chat until FFH-020 is accepted. All other specialist capabilities and Troubleshooting & Build are IDLE.

## Merge blockers

Phase 5 remains blocked by:
- FFH-012 HSA remediation;
- FFH-013 R6 implementation;
- FFH-015 Core SIMPLE formula remediation;
- FFH-020 live accepted-migration deployment;
- FFH-016 live Supabase/runtime parity after deployment;
- FFH-017 Phase 5C implementation;
- full branch validation once fail-fast can progress past calculation tests;
- required independent audits and any resulting remediation;
- final PR #5 description/status refresh and clean merge validation.

## Exact next sequence

1. Core continues focused FFH-012 owner remediation and reports READY_FOR_MANAGER/BLOCKED/escalation when supported.
2. In parallel, App/Data executes FFH-020: preflight the linked Supabase project, apply only the exact accepted FFH-010 then FFH-011 migrations via a proper migration-history mechanism, verify deployment/schema/security evidence, and return READY_FOR_MANAGER or BLOCKED.
3. Manager independently verifies FFH-020 deployment evidence. If accepted, reactivate FFH-016 for the remaining PostgREST/RLS/persistence/runtime/browser parity gate.
4. Manager acts on FFH-012 independently when it reaches an event. After FFH-012 acceptance, choose the safest Core order between FFH-015 and FFH-013 from the exact overlap state; do not run them concurrently by default.
5. Stabilize retirement-capacity work, then activate FFH-017.
6. Run checkpoint/final audits as appropriate, remediate blockers, refresh PR #5, and merge only if clean.
7. Consider FFH-018 only after current remediation is stable; do not alter CI merely to hide existing red evidence.
