# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-08

## Completed work relevant to current phase

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
Status: COMPLETE AT POLICY/ANALYSIS GATE

- FFH-006 — Core Engine R1/R2 task: COMPLETE; R2 remediated, R1 returned as verified field-semantics ambiguity.
- FFH-007 — HSA legal-capacity policy: COMPLETE.
- FFH-008 — HSA persistence/runtime analysis: COMPLETE.
- FFH-D005 — HSA legal-capacity/data contract: APPROVED.

# FFH-PW-003 — HSA contract implementation + IRA policy/remediation preparation

Status: ACTIVE

## FFH-009 — Define spousal-IRA scarce-compensation legal-capacity semantics

Assigned employee: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE — MANAGER SYNTHESIZED

Result:
Manager approved FFH-D006. R6 legal-capacity semantics use owner conditional maxima plus one shared MFJ compensation ledger, no fixed owner-ID statutory split, and no inference that a missing manually entered IRA account proves $0 spouse YTD.

Required next role: Core Financial Engine Engineer under FFH-013 after the current Core HSA task sequence is safe.

## FFH-010 — Implement FFH-D005 HSA persistence and normalized input contract

Assigned employee: Application, Data & Integration Engineer
Department: Engineering
Status: ACTIVE — REMEDIATION/VALIDATION REQUIRED — NOT MANAGER ACCEPTED
Dependency classification: HARD predecessor for FFH-012
Target branch: `phase-5-money-priority-engine`

Latest production checkpoint: `ca22dac0dd6a10ec4d3c81daa057d430667f4406` (`fix: type-safe HSA enum validation`).
At that checkpoint the branch was 240 commits ahead and 0 behind `main`.

Observed evidence:
- substantial FFH-D005 implementation exists across additive migration, HSA capture/actions, snapshot/loader contract, normalized HSA input modules/tests, security tests, and hypothetical integration;
- prior exact/descendant Foundation CI runs #285, #290, and #293 failed at Type check;
- worker pushed `ca22dac0dd6a10ec4d3c81daa057d430667f4406` to address type-safe HSA enum validation;
- Foundation CI #296 (run `34302958985`) on that exact production checkpoint completed FAILURE;
- the exact remaining failing diagnostic was not reliably recovered from the Manager-visible workflow surface during this refresh;
- `.ai/engineering/app/HANDOFF.md` still contains FFH-008 rather than FFH-010, so the required completion handoff remains absent.

Objective remains:
Complete only the Application/Data side of FFH-D005 and establish one safe tax-year-bound HSA persistence/capture/loader/normalized snapshot contract. Do not implement the Core Engine HSA legal-capacity algorithm, Phase 5C, IRA/R6, or R1 SIMPLE behavior.

Immediate required work:
- refresh from the current branch/head before editing because Manager canonical docs may advance after the production checkpoint;
- diagnose the remaining exact-checkpoint CI failure and fix it without weakening FFH-D005 semantics;
- preserve additive/unknown-safe migration behavior and role-aware RLS;
- verify null/unknown, tax-year isolation, reload determinism, legacy non-affirmative behavior, alternate allocation behavior, and decision-basis refresh behavior;
- do not silently absorb Core HSA legal-capacity algorithm work;
- run/observe required validation and Foundation CI on the exact final production checkpoint;
- distinguish migration-file creation from actual linked Supabase application/runtime parity;
- persist a current FFH-010 HANDOFF with exact final production SHA, changed files, tests, CI evidence, and unverified items.

Acceptance gate:
FFH-010 is not complete until CI is green on the exact final production checkpoint and the role handoff is current, unless Manager explicitly documents a narrowly justified validation exception. No exception is authorized for the current red CI.

# Queued work

## FFH-011 — Define/remediate R1 SIMPLE persisted field contract

Assigned employee: Application, Data & Integration Engineer
Status: QUEUED AFTER FFH-010 MANAGER ACCEPTANCE

Objective:
Resolve what `simple_higher_limit_eligible` / `simpleHigherLimitEligible` safely means prospectively and for legacy data. Establish whether it can be explicitly bound to the statutory certain-applicable-SIMPLE category or whether rename/new field/reconfirmation is required. No Core formula change in this task.

## FFH-012 — Implement FFH-D005 HSA legal-capacity calculation

Assigned employee: Core Financial Engine Engineer
Status: QUEUED / HARD BLOCKED ON FFH-010 MANAGER ACCEPTANCE

Objective:
Implement the Core HSA legal-capacity algorithm against the accepted normalized contract: month-sensitive capacity, Medicare/retroactivity, explicit last-month-rule conditional treatment, married equal/alternate allocation, age-55 owner catch-up, R4 owner ceilings, tax-year-bound YTD, targeted uncertainty, and downstream ledger/routing parity.

## FFH-013 — Implement FFH-D006 spousal-IRA shared compensation ledger

Assigned employee: Core Financial Engine Engineer
Status: QUEUED AFTER FFH-012 unless Manager explicitly reorders after FFH-010 acceptance

Objective:
Replace sorted-owner scarce-compensation allocation with FFH-D006 owner + shared-capacity semantics. Preserve existing Roth direct-eligibility / Traditional deductibility behavior. Add scarcity/YTD/schedule/multi-account/order-invariance/possible-excess tests.

Reason for sequencing:
FFH-012 and FFH-013 both touch Core retirement-capacity surfaces, especially `money-priority-retirement-accounts.ts`; serialize them to avoid collision and stale-patch risk.

## Narrow R1 Core remediation

Assigned employee: Core Financial Engine Engineer
Status: FUTURE / BLOCKED ON FFH-011

## Phase 5C Core implementation

Assigned employee: Core Financial Engine Engineer
Status: POLICY APPROVED / NOT YET AUTHORIZED

# Current role status

Manager / Architect — ACTIVE on FFH-PW-003 orchestration
Application, Data & Integration Engineer — ACTIVE on FFH-010
Retirement & Tax-Advantaged Policy Analyst — IDLE after FFH-009 completion
Core Financial Engine Engineer — IDLE pending FFH-010 acceptance
Debt & Liquidity Policy Analyst — IDLE
Goals, Cash Flow & Allocation Policy Analyst — IDLE
Regulatory & Financial Research Analyst — IDLE unless a new unresolved external fact appears
Product & Technical R&D Engineer — IDLE
Technical & Mathematical Auditor — IDLE pending stable integrated implementation checkpoint
Financial Policy & Scenario Auditor — IDLE pending stable integrated implementation checkpoint

# Manager sequencing rules

- FFH-010 remains the only active specialist task until it reaches a green accepted exact production checkpoint with a current handoff.
- Do not activate FFH-012 while FFH-010's normalized input contract has red exact-checkpoint CI or lacks a current completion handoff.
- After FFH-010 acceptance, activate FFH-011 App/Data and FFH-012 Core Engine in parallel.
- After FFH-012, activate FFH-013 Core IRA remediation; integrate FFH-011 and issue narrow R1 Core work when safe.
- Phase 5C production implementation remains gated until retirement-capacity blockers have stable approved checkpoints.
- Auditors remain idle until there is a stable integrated checkpoint worth auditing.
