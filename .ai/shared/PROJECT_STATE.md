# Family Finance Hub — Project State

Last refreshed: 2026-09-08

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active development branch: `phase-5-money-priority-engine`
PR #5: OPEN / UNMERGED / NON-DRAFT / mergeable when last checked.

Current verified pre-refresh Phase 5 head: `8e3e35dcba362b0751c5ea89d0f1d42bace3569c`.
At that checkpoint the branch was 233 commits ahead and 0 behind `main`, with current `main` as merge base.

FFH-010 implementation checkpoint: `fd520a1abc98c7841306b3e73f23d6a60f7ed614`.
Foundation CI #285 on that exact checkpoint: FAILURE at Type check. Dependency install, production dependency audit, calculation tests, and security policy-contract tests succeeded; lint/build were skipped after the typecheck failure.

Foundation CI #290 on Manager descendant `8e3e35dcba362b0751c5ea89d0f1d42bace3569c`: FAILURE at the same Type check stage. Dependency install, production dependency audit, calculation tests, and security policy-contract tests again succeeded; lint/build were skipped. The repeated failure confirms the branch remains red and FFH-010 is not Manager-acceptable yet.

The current `.ai/engineering/app/HANDOFF.md` still closes FFH-008 rather than FFH-010. No current FFH-010 completion handoff is therefore present.

## Stable product state on main

`main` contains completed Foundation, Household Financial Profile, Dashboard, and Phase 4 Planning Tools.

## Phase 5 status

Phase 5 remains ACTIVE on PR #5 and NOT MERGE READY.

Phase 5A: IMPLEMENTED / final integrated audit required.
Phase 5B: IMPLEMENTED / final integrated audit required.
Phase 5C: POLICY APPROVED under FFH-D004 / production implementation not yet authorized.

## Completed waves

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
Status: COMPLETE AT POLICY/ANALYSIS GATE

- FFH-006: COMPLETE WITH R1 SEMANTIC BLOCKER; R2 remediated at validated checkpoint `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`, Foundation CI #274 SUCCESS.
- FFH-007: COMPLETE.
- FFH-008: COMPLETE.
- HSA Manager synthesis: APPROVED as FFH-D005.

## Current findings / disposition

### R1 — SIMPLE higher-limit semantics/correctness
MERGE BLOCKER. External formula fact is verified, but `simpleHigherLimitEligible` persisted semantics remain ambiguous. FFH-011 is queued for App/Data after FFH-010.

### R2 — governmental 457(b) Roth catch-up
REMEDIATED by FFH-006; later integrated audit required.

### R3/R4 — HSA legal-capacity model
POLICY/DATA CONTRACT APPROVED through FFH-D005. FFH-010 is implementing the App/Data contract; Core HSA algorithm remains queued as FFH-012 after FFH-010 acceptance.

### R6 — MFJ spousal-IRA scarce-compensation allocation
POLICY RESOLVED through FFH-D006; production remediation remains merge-blocking.

FFH-D006 requires owner conditional maxima plus one shared MFJ compensation ledger, not a fixed owner-ID split. No recorded IRA account is not proof of $0 spouse IRA YTD because current retirement accounts are manually entered and no inventory-completeness certification exists.

## Active wave — FFH-PW-003

Status: ACTIVE

### FFH-009 — Retirement Policy R6
Status: COMPLETE / MANAGER SYNTHESIZED as FFH-D006.

### FFH-010 — App/Data HSA persistence + normalized contract
Status: ACTIVE / REMEDIATION + VALIDATION REQUIRED.

Substantial implementation exists at `fd520a1abc98c7841306b3e73f23d6a60f7ed614`, including additive HSA migration, dedicated HSA capture/actions, normalized HSA input-contract modules/tests, snapshot/loader integration, security test additions, and hypothetical integration.

Current acceptance blockers:
- CI #285 failed Type check on the implementation checkpoint;
- CI #290 failed Type check again on the Manager descendant containing the same production code;
- current FFH-010 handoff is absent.

FFH-010 remains the only active specialist task.

## Queued work

1. FFH-011 — App/Data: resolve R1 SIMPLE persisted-field contract after FFH-010.
2. FFH-012 — Core Engine: implement FFH-D005 HSA legal-capacity calculation after FFH-010 stable normalized contract and Manager acceptance.
3. FFH-013 — Core Engine: implement FFH-D006 spousal-IRA shared compensation ledger after FFH-012 unless Manager later proves a safer reorder.
4. Narrow Core R1 formula remediation after FFH-011 if required.
5. Phase 5C Core implementation under FFH-D004 after retirement-capacity surfaces are stable.
6. Independent Technical & Mathematical Audit and Financial Policy & Scenario Audit on the integrated Phase 5 checkpoint.

## Validation state

Verified successful CI checkpoints:
- #245 on `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`
- #249 on `f6a138e78083afe6bdf83bc42117c705bda9ca09`
- #269 on `71705039f0abf1945202631109975edeb5632920`
- #274 on `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`
- #277 on `60de76c449bae1128908292f2efa24bb7cbd971d`

Current FFH-010-related CI:
- #285 FAILURE on `fd520a1abc98c7841306b3e73f23d6a60f7ed614` at Type check.
- #290 FAILURE on `8e3e35dcba362b0751c5ea89d0f1d42bace3569c` at Type check.

Literal local `npm run verify` must not be claimed unless actually observed. No CI result is itself an audit verdict.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine
Milestone status: ACTIVE / NOT MERGE READY
Completed waves: FFH-PW-001, FFH-PW-002
Active wave: FFH-PW-003
Active specialist assignment: FFH-010 only
Manager: ACTIVE
Retirement Policy: IDLE after FFH-009 completion
Core Engine: IDLE pending FFH-010 acceptance
Application/Data: ACTIVE on FFH-010
Auditors: IDLE pending stable integrated implementation checkpoint

Exact next sequence:
1. FFH-010 refreshes from current branch, diagnoses/fixes the typecheck failure, completes validation, and persists a current handoff.
2. Manager accepts/rejects the exact FFH-010 checkpoint.
3. On acceptance, activate FFH-011 App/Data and FFH-012 Core Engine in parallel.
4. After FFH-012, activate FFH-013 Core IRA remediation while FFH-011/R1 follow-up proceeds dependency-safely.
5. Stabilize retirement-capacity work, then implement FFH-D004 Phase 5C.
6. Run dual independent audits before merge.
