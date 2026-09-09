# Family Finance Hub — Canonical Roadmap

Last refreshed: 2026-09-08

## Product vision

Family Finance Hub is a private-first household financial planning application that helps a household understand current finances and decide what to do with the next dollar.

Long-term differentiators include the Money Priority Engine, Household Financial Roadmap, Paycheck Planner, and Scenario Lab.

## Phase status

- Phase 1 — Secure Foundation: COMPLETE
- Phase 2 — Household Financial Profile: COMPLETE
- Phase 3 — Dashboard: COMPLETE
- Phase 4 — Planning Tools: COMPLETE on stable `main`
- Phase 5 — Money Priority Engine: ACTIVE on PR #5; NOT MERGED
- Phase 6 — Scenario Lab: PLANNED / NOT STARTED
- Phase 7 — Private Beta: PLANNED / NOT STARTED

## Phase 5 approved policy

- Phase 5A Hybrid Retirement Floor: IMPLEMENTED; final integrated audit required.
- Phase 5B Goal Intelligence: IMPLEMENTED; final integrated audit required.
- Phase 5C recurring goal-versus-retirement competition: APPROVED as FFH-D004; implementation intentionally sequenced after retirement-capacity remediation.
- HSA legal-capacity/data contract: APPROVED as FFH-D005.
- MFJ spousal-IRA scarce-compensation capacity: APPROVED as FFH-D006.

## Completed waves

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
COMPLETE.

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
COMPLETE AT POLICY/ANALYSIS GATE.

- FFH-006: R2 remediated; R1 correctly stopped at persisted-field ambiguity.
- FFH-007: HSA policy complete.
- FFH-008: HSA persistence/runtime analysis complete.
- FFH-D005 approved.

## Active wave — FFH-PW-003

Title: HSA contract implementation + IRA policy/remediation preparation
Status: ACTIVE

### FFH-009 — Spousal-IRA scarce-compensation policy
Owner: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE / SYNTHESIZED

Result:
FFH-D006 now requires owner conditional maxima plus one shared MFJ compensation ledger; no fixed owner-ID statutory split; no summing conditional maxima as independent room; no zero-YTD inference from absence of a manually entered IRA account; order-invariant routing; actual YTD consumed once; scheduled/current-plan dollars reserve rather than masquerade as YTD.

### FFH-010 — Implement FFH-D005 HSA persistence + normalized input contract
Owner: Application, Data & Integration Engineer
Status: ACTIVE / NOT ACCEPTED

Current implementation checkpoint: `fd520a1abc98c7841306b3e73f23d6a60f7ed614`.

Repository evidence shows substantial scope landed: additive HSA migration, dedicated HSA capture/actions, person/tax-year/month contract, normalized HSA input module/tests, snapshot/loader updates, security tests, and hypothetical integration.

Foundation CI #285 on that exact checkpoint FAILED at Type check. Calculation tests, security contract tests, and production dependency audit succeeded before the failure; lint/build were skipped. Required FFH-010 handoff has not yet replaced the old FFH-008 handoff.

FFH-010 remains active until it:
- fixes the typecheck failure;
- runs/observes required validation;
- verifies CI on the exact final production checkpoint;
- persists a current FFH-010 handoff;
- reports migration/runtime evidence separately from migration-file existence.

## Queued next wave after FFH-010 acceptance

### FFH-011 — Resolve R1 SIMPLE persisted-field contract
Owner: Application, Data & Integration Engineer
Status: QUEUED

Define safe prospective + legacy semantics for `simple_higher_limit_eligible` / `simpleHigherLimitEligible`; determine whether existing field can explicitly represent the statutory certain-applicable-SIMPLE category or requires rename/new field/reconfirmation. No Core formula change in FFH-011.

### FFH-012 — Implement FFH-D005 HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
Status: QUEUED / HARD BLOCKED ON FFH-010 ACCEPTED CONTRACT

Implement month-sensitive HSA base/catch-up capacity, Medicare/retroactivity, explicit last-month-rule conditional treatment, married equal/alternate allocation, owner ceilings, tax-year YTD discipline, targeted uncertainty, and downstream ledger/routing parity against the accepted normalized contract.

FFH-011 and FFH-012 should run in parallel after FFH-010 acceptance because they are dependency-safe and owned by different workers.

## Queued after FFH-012

### FFH-013 — Implement FFH-D006 spousal-IRA shared compensation ledger
Owner: Core Financial Engine Engineer
Status: QUEUED

Replace sorted-owner scarce-compensation allocation with approved owner + shared-capacity semantics. Preserve existing Roth eligibility / Traditional deductibility behavior. Add adversarial scarcity, YTD, schedule, multi-account, order-invariance, and possible-excess tests.

FFH-013 is serialized after FFH-012 because both touch Core retirement-capacity surfaces.

### Narrow R1 Core remediation
Owner: Core Financial Engine Engineer
Status: FUTURE / BLOCKED ON FFH-011

Implement only the formula/data behavior required by the approved FFH-011 field contract.

### Phase 5C Core implementation
Owner: Core Financial Engine Engineer
Status: POLICY APPROVED / NOT YET AUTHORIZED

Start only after retirement-capacity blockers have stable approved checkpoints and Core-surface collision risk is acceptable.

## Current merge blockers

- R1 SIMPLE field semantics and any resulting Core remediation.
- R3/R4 HSA production completion under FFH-D005.
- R6 spousal-IRA production remediation under FFH-D006.
- Phase 5C production implementation.
- final Technical & Mathematical Audit.
- final Financial Policy & Scenario Audit.

R2 is remediated but remains subject to integrated audit.

## Expected sequence

1. Finish FFH-010: fix typecheck, validate, handoff, Manager acceptance.
2. Run FFH-011 App/Data + FFH-012 Core HSA in parallel.
3. Manager integrate both.
4. Run FFH-013 Core IRA remediation; issue narrow Core R1 follow-up when FFH-011 semantics are ready and dependency-safe.
5. Stabilize retirement-capacity surfaces.
6. Implement FFH-D004 Phase 5C.
7. Run independent Technical & Mathematical Auditor and Financial Policy & Scenario Auditor on the integrated Phase 5 checkpoint.
8. Resolve blocking findings.
9. Evaluate PR #5 merge gate; merge only if clean.
10. Verify post-merge CI and reconcile canonical state.

Do not pre-authorize Phase 5D–5G production work from prior chat discussion.

## Phase 6 — Scenario Lab

PLANNED / NOT STARTED. Remains downstream of an accepted Phase 5 recommendation engine.

## Phase 7 — Private Beta

PLANNED / NOT STARTED. Includes household onboarding/invitations, recovery, security review, accessibility/mobile polish, and feedback collection.
