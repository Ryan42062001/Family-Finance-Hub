# Family Finance Hub — Project State

Last refreshed: 2026-09-08

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Active development branch: `phase-5-money-priority-engine`
PR #5: OPEN / UNMERGED / NON-DRAFT / mergeable when last checked.

Verified pre-Manager-refresh Phase 5 head: `64ccac6e2901946a31bba2e0758ec9d33cce8218` (`docs: hand off completed FFH-010 HSA app data contract`).
At that checkpoint the branch was 245 commits ahead and 0 behind `main`, with current `main` as merge base.

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

- FFH-006: COMPLETE; R2 remediated at validated checkpoint `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`, Foundation CI #274 SUCCESS; R1 returned as semantic ambiguity.
- FFH-007: COMPLETE.
- FFH-008: COMPLETE.
- HSA Manager synthesis: APPROVED as FFH-D005.

## Active wave — FFH-PW-003

Status: ACTIVE

### FFH-009 — Retirement Policy R6
Status: COMPLETE / MANAGER SYNTHESIZED as FFH-D006.

### FFH-010 — App/Data HSA persistence + normalized contract
Status: COMPLETE / MANAGER ACCEPTED.

Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4` (`test: align Secure fixtures with FFH-D005 HSA contract`).
Current FFH-010 role handoff landed at branch head `64ccac6e2901946a31bba2e0758ec9d33cce8218` and is documentation-only relative to the validated production checkpoint.

Foundation CI #300 (run `34306364189`) on exact production checkpoint `8f39e7d6e638711a80300786869a407113d3d0c4`: SUCCESS.
Verified successful steps on that exact SHA: dependency install, production dependency audit, calculation tests, security policy-contract tests, TypeScript typecheck, lint, and production build.

Manager acceptance basis:
- exact production CI is green;
- current FFH-010 handoff is present and complete;
- final repair updated stale Secure test fixtures rather than weakening the required FFH-D005 normalized HSA contract;
- role handoff explicitly preserved task exclusions and evidence boundaries.

Unverified FFH-010 deployment boundary retained:
- repository migration `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql` was not proven applied to the linked/live Supabase project;
- live PostgREST/RLS/browser runtime parity therefore remains unverified and must be resolved before merge-ready status is claimed.

### FFH-011 — App/Data R1 SIMPLE persisted-field contract
Status: ACTIVE.

Objective: Resolve what `simple_higher_limit_eligible` / `simpleHigherLimitEligible` safely means prospectively and for legacy data. Bind it explicitly to the verified statutory category or establish rename/new-field/reconfirmation semantics. No Core formula change in FFH-011.

### FFH-012 — Core HSA legal-capacity calculation
Status: ACTIVE.

Objective: Implement FFH-D005 against the accepted normalized HSA contract, including month-sensitive capacity, Medicare/retroactivity treatment, explicit last-month-rule conditional handling, married equal/alternate allocation, age-55 owner catch-up, R4 owner ceilings, tax-year-bound YTD, targeted uncertainty, and downstream ledger/routing parity.

FFH-011 and FFH-012 are dependency-safe parallel work because FFH-010's normalized input contract is now accepted and the two tasks own different concerns/files except where coordination must be explicit.

## Current findings / disposition

### R1 — SIMPLE higher-limit semantics/correctness
MERGE BLOCKER. FFH-011 ACTIVE in App/Data. Narrow Core formula follow-up remains blocked until FFH-011 resolves the persisted semantics.

### R2 — governmental 457(b) Roth catch-up
REMEDIATED by FFH-006; later integrated audit required.

### R3/R4 — HSA legal-capacity model
FFH-D005 policy/data contract APPROVED. FFH-010 App/Data contract COMPLETE / ACCEPTED. FFH-012 Core implementation ACTIVE.

### R6 — MFJ spousal-IRA scarce-compensation allocation
POLICY RESOLVED through FFH-D006; FFH-013 production remediation remains merge-blocking and queued after FFH-012 unless Manager explicitly reorders.

FFH-D006 requires owner conditional maxima plus one shared MFJ compensation ledger, not a fixed owner-ID split. No recorded IRA account is not proof of $0 spouse IRA YTD because current retirement accounts are manually entered and no inventory-completeness certification exists.

## Queued work

1. FFH-013 — Core Engine: implement FFH-D006 spousal-IRA shared compensation ledger after FFH-012 unless Manager later proves a safer reorder.
2. Narrow Core R1 formula remediation after FFH-011 if required.
3. FFH-010 linked Supabase migration/runtime parity verification before merge-ready status.
4. Phase 5C Core implementation under FFH-D004 after retirement-capacity blockers are stable.
5. Independent Technical & Mathematical Audit and Financial Policy & Scenario Audit on the integrated Phase 5 checkpoint.

## Validation state

Verified successful CI checkpoints include:
- #245 on `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`
- #249 on `f6a138e78083afe6bdf83bc42117c705bda9ca09`
- #269 on `71705039f0abf1945202631109975edeb5632920`
- #274 on `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`
- #277 on `60de76c449bae1128908292f2efa24bb7cbd971d`
- #300 on exact FFH-010 production checkpoint `8f39e7d6e638711a80300786869a407113d3d0c4`

Earlier FFH-010 red runs #285, #290, #293, and #296 remain provenance only and are superseded for acceptance by exact green #300.

Literal local `npm run verify` is not claimed unless directly observed. No CI result is itself an audit verdict.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine
Milestone status: ACTIVE / NOT MERGE READY
Completed waves: FFH-PW-001, FFH-PW-002
Active wave: FFH-PW-003
Manager: ACTIVE
Application/Data: ACTIVE on FFH-011
Core Engine: ACTIVE on FFH-012
Retirement Policy: IDLE after FFH-009 completion
Debt/Liquidity Policy: IDLE
Goals/Cash Flow Policy: IDLE
Regulatory Research: IDLE unless a new unresolved external fact appears
Product R&D: IDLE
Technical Auditor: IDLE pending stable integrated implementation checkpoint
Financial Policy & Scenario Auditor: IDLE pending stable integrated implementation checkpoint

Exact next sequence:
1. FFH-011 resolves R1 persisted semantics without changing Core formula behavior.
2. FFH-012 implements HSA legal-capacity behavior against the accepted FFH-010 contract.
3. Manager independently reviews each completed handoff/checkpoint; FFH-011 and FFH-012 may complete in either order.
4. After FFH-012 acceptance, activate FFH-013 Core IRA remediation; after FFH-011 acceptance, authorize narrow R1 Core remediation if required and collision-safe.
5. Resolve FFH-010 live Supabase migration/runtime parity before merge-ready status.
6. Stabilize retirement-capacity work, then implement FFH-D004 Phase 5C.
7. Run dual independent audits before merge.
