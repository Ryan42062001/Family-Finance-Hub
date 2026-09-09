# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-08

## Completed work relevant to current wave

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE
- FFH-002 — branch reconciliation — COMPLETE
- FFH-003 — Goals Policy — COMPLETE / REVALIDATED
- FFH-004 — Retirement Policy — COMPLETE / CLOSED BY FFH-D004
- FFH-005 — Regulatory Research — COMPLETE / REVALIDATED
- Phase 5C policy — APPROVED as FFH-D004

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
Status: COMPLETE AT POLICY/ANALYSIS GATE

#### FFH-006 — R1/R2 statutory remediation
Owner: Core Financial Engine Engineer
Status: COMPLETE — MANAGER ACCEPTS TASK OUTCOME
- R2 governmental 457(b) Roth catch-up: REMEDIATED
- validated production/test checkpoint: `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`
- Foundation CI #274: SUCCESS
- R1 SIMPLE formula change: intentionally NOT performed because persisted field semantics are ambiguous; routed to future FFH-011 rather than guessed

#### FFH-007 — HSA legal-capacity policy
Owner: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE — MANAGER SYNTHESIZED

#### FFH-008 — HSA persistence/runtime contract analysis
Owner: Application, Data & Integration Engineer
Status: COMPLETE — MANAGER SYNTHESIZED

Manager synthesis of FFH-007 + FFH-008 is canonical as `FFH-D005 — HSA legal-capacity policy and data contract`.

# FFH-PW-003 — HSA contract implementation + IRA policy

Status: ACTIVE

## FFH-009 — Define spousal-IRA scarce-compensation legal-capacity semantics

Assigned employee: Retirement & Tax-Advantaged Policy Analyst
Department: Policy
Status: ASSIGNED / ACTIVE
Dependency classification: INDEPENDENT within FFH-PW-003 after FFH-007 completion
Blocking dependency: none; FFH-005 R6 evidence is available
Required next role: Manager synthesis; then Core Engine remediation task if approved
Parallel Wave ID: FFH-PW-003

Objective:
Resolve FFH-005 R6 without production code. Current MFJ IRA logic can turn scarce joint compensation into a deterministic owner-ID room split, while the statutory spousal-IRA formula depends on joint compensation reduced by the other spouse's actual IRA contributions and does not create a permanent statutory first-owner priority.

Required policy analysis:
- use FFH-005 R6 authoritative research;
- distinguish the statutory feasible set from FFH deterministic allocation/routing policy;
- define how each spouse's actual YTD traditional+Roth IRA contributions affect remaining feasible room;
- define what FFH may safely expose as per-owner actionable room before future contribution choices are known;
- define deterministic routing/allocation without inventing statutory owner priority;
- preserve individual annual limits and aggregate joint-compensation constraints;
- address multiple IRA accounts, shared compensation, missing compensation/YTD facts, contribution already made vs future recommendation, one-time/Build/Windfall/Your Plan consumers, and order invariance;
- define targeted `more_information_needed` behavior and scenario acceptance cases;
- clearly classify statutory fact vs FFH policy vs mathematical consequence;
- do not write production code.

Acceptance criteria:
- implementation-ready policy recommendation for R6;
- no fixed owner-ID statutory priority invented;
- aggregate and individual-capacity invariants explicit;
- actual YTD contributions handled exactly once;
- deterministic behavior and scenario cases provided;
- role handoff updated.

## FFH-010 — Implement FFH-D005 HSA persistence and normalized input contract

Assigned employee: Application, Data & Integration Engineer
Department: Engineering
Status: ASSIGNED / ACTIVE
Dependency classification: INDEPENDENT of FFH-009; HARD predecessor for FFH-012
Target branch: `phase-5-money-priority-engine`
Blocking dependency: FFH-D005 approved — satisfied
Required next role: Manager review; then FFH-012 Core Engine
Parallel Wave ID: FFH-PW-003

Objective:
Implement the Application/Data side of FFH-D005. Establish one safe, tax-year-bound HSA persistence/capture/loader/normalized snapshot contract. Do not implement the Core Engine HSA legal-capacity algorithm in this task.

Required implementation behavior:
- refresh canonical state and verify branch/head before editing;
- use additive migration(s);
- implement a canonical person + tax-year HSA profile plus month-level eligibility/coverage facts, or a lossless-equivalent representation that satisfies FFH-D005;
- represent month eligibility as eligible/ineligible/unknown and coverage as self-only/family/none-or-unknown with DB/runtime parity;
- represent Medicare effective timing and explicit last-month-rule reliance/status at person/tax-year scope where required by FFH-D005;
- distinguish future-month planning assumptions from confirmed facts when future periods are captured;
- implement tax-year-bound explicit alternate married-family ordinary allocation only when the household chooses one; derive equal default rather than persisting duplicate default values;
- explicitly bind HSA YTD used for legal-capacity math to the same tax year or implement/prove an equivalent current-year contract;
- preserve legacy account `hsa_eligible` / `hsa_coverage_type` as non-authoritative hints; no optimistic backfill or silent semantic strengthening;
- preserve existing account balance, ownership, and contribution meaning;
- preserve null/unknown through DB -> actions -> loader -> normalized snapshot;
- add/update capture UX/actions sufficient for users to provide the approved facts without optimistic defaults;
- update Supabase loader and normalized Money Priority snapshot input contract;
- include HSA decision-basis changes in Recommendation Refresh/material-change behavior where required;
- apply current role-aware household RLS to new financial data;
- do not infer owner/spouse eligibility from authenticated user, creator, sole adult, account name, or absence of an HSA account;
- do not change HSA legal-capacity formula/routing behavior in `money-priority-retirement-accounts.ts`; if compile-time/shared-contract overlap would require substantive Core behavior, stop that portion and route it to Manager/FFH-012;
- do not implement Phase 5C, IRA/R6, or R1 SIMPLE behavior.

Required tests / validation:
- migration/schema constraints and runtime union parity;
- role-aware RLS owner/member/viewer/nonmember behavior where applicable;
- null/unknown round-trip persistence;
- person/tax-year/month reload determinism;
- legacy rows remain non-affirmative until reconfirmed;
- multiple HSA accounts do not duplicate person legal facts at the persistence/snapshot layer;
- spouse legal facts can exist without spouse HSA account;
- alternate allocation storage and equal-default absence behavior;
- tax-year isolation and no automatic carryforward;
- recommendation-refresh/material-basis change coverage;
- input/order invariance where relevant;
- literal `npm run verify` when tooling permits; otherwise report constituent CI evidence without claiming the wrapper;
- production dependency audit and Foundation CI on exact final production checkpoint;
- if migration is applied to linked Supabase, verify actual runtime/database parity separately and report exact evidence; never claim application from migration file existence alone.

Acceptance criteria:
- FFH-D005 persistence/capture/loader/normalized contract implemented without Core legal-capacity algorithm drift;
- no optimistic legacy migration;
- one authoritative normalized HSA legal-fact source established;
- migration/backward compatibility and RLS validated;
- exact changed files/checkpoint/CI recorded;
- role handoff updated.

# Queued work

## FFH-011 — Define/remediate R1 SIMPLE higher-limit persisted field contract

Assigned employee: Application, Data & Integration Engineer
Status: QUEUED AFTER FFH-010 unless Manager reorders

Objective:
Resolve what `simple_higher_limit_eligible` / `simpleHigherLimitEligible` safely means prospectively and for legacy data. Establish whether the existing field can be explicitly bound to the statutory certain-applicable-SIMPLE category or whether a rename/new field/reconfirmation path is required. Do not change the Core catch-up formula in this task.

## FFH-012 — Implement FFH-D005 HSA legal-capacity calculation

Assigned employee: Core Financial Engine Engineer
Status: QUEUED / BLOCKED ON FFH-010 STABLE NORMALIZED CONTRACT

Objective:
Implement month-sensitive HSA legal-capacity behavior, Medicare/retroactive recomputation and warning, explicit last-month-rule conditional treatment, married equal/alternate allocation, age-55 owner catch-up, R4 owner ceilings, YTD tax-year discipline, uncertainty, and downstream capacity-ledger/routing parity. No schema ownership in this task.

## Future IRA remediation task

Assigned employee: Core Financial Engine Engineer
Status: BLOCKED ON FFH-009 MANAGER SYNTHESIS

## Future Phase 5C implementation

Assigned employee: Core Financial Engine Engineer
Status: POLICY APPROVED / NOT YET AUTHORIZED
Blocking condition: retirement-capacity remediation surfaces must be stable enough to avoid conflicting Core changes.

# Current role status

Manager / Architect — ACTIVE
Retirement & Tax-Advantaged Policy Analyst — ACTIVE on FFH-009
Application, Data & Integration Engineer — ACTIVE on FFH-010
Core Financial Engine Engineer — IDLE after FFH-006; queued FFH-012 after FFH-010
Debt & Liquidity Policy Analyst — IDLE
Goals, Cash Flow & Allocation Policy Analyst — IDLE
Regulatory & Financial Research Analyst — IDLE unless a new unresolved external fact appears
Product & Technical R&D Engineer — IDLE
Technical & Mathematical Auditor — IDLE pending stable integrated implementation checkpoint
Financial Policy & Scenario Auditor — IDLE pending stable integrated implementation checkpoint

# Manager sequencing rules

- FFH-009 and FFH-010 may run in parallel.
- Manager must synthesize FFH-009 before IRA production remediation.
- FFH-012 must not begin until FFH-010 establishes the normalized HSA input contract and Manager accepts the checkpoint.
- FFH-011 is owned by Application/Data and follows FFH-010 unless Manager explicitly reorders.
- Phase 5C production implementation remains gated until retirement-capacity blockers have completed or stable approved remediation checkpoints and Core surface collision risk is acceptable.
- Auditors remain idle until there is a stable integrated checkpoint worth auditing.
