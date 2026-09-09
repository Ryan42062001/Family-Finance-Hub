# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-08

## Completed management/bootstrap work

### FFH-001 — Canonical AI workflow bootstrap
Owner: Manager / Architect
Status: COMPLETE

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE

- FFH-002 — Phase 5 branch freshness reconciliation — COMPLETE
- FFH-003 — Phase 5C Goals Policy analysis — COMPLETE
- FFH-004 — Phase 5C Retirement Policy review — COMPLETE
- FFH-005 — 2026 statutory retirement/HSA verification — COMPLETE

Manager synthesis of FFH-003/004/005 is persisted as `FFH-D004`.

## FFH-PW-002 — Retirement statutory remediation + HSA legal-capacity semantics

Status: ACTIVE

### FFH-006 — Remediate retirement-capacity statutory mismatches

Assigned employee: Core Financial Engine Engineer
Department: Engineering
Status: ASSIGNED
Dependency classification: INDEPENDENT within FFH-PW-002
Target branch: `phase-5-money-priority-engine`
Verified predecessor reconciliation checkpoint: `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`
Last specialist head before Manager synthesis: `f6a138e78083afe6bdf83bc42117c705bda9ca09`
Blocking dependency: none after Manager task publication
Required next role: Manager review; later integrated Technical + Policy Audit
Parallel Wave ID: FFH-PW-002

Objective:
Remediate FFH-005 findings R1 and R2 only. Do not implement Phase 5C and do not redesign HSA behavior.

Required technical behavior:
- refresh canonical `.ai` state and verify current branch/head before editing;
- inspect the exact schema/documentation semantics of `simpleHigherLimitEligible` before changing SIMPLE logic;
- if that field genuinely does not map to the statutory certain-applicable-SIMPLE category, stop R1 only and return evidence rather than guessing;
- where semantics support the mapping, implement the verified 2026 $3,850 age-50+ catch-up for the higher-applicable-SIMPLE category outside the age-60–63 super-catch-up band;
- preserve the verified $5,250 SIMPLE age-60–63 catch-up behavior;
- extend the 2026 high-wage Roth catch-up rule to governmental 457(b) age-based catch-up opportunities using the authoritative sponsor-wage/Roth-support facts already modeled where available;
- preserve the separate/deferred governmental 457(b) special last-three-years catch-up boundary;
- missing Roth-support or sponsor-wage facts must not become fabricated eligibility;
- no Phase 5C, Goal Intelligence, HSA semantics, or unrelated routing changes.

Required tests / validation:
- targeted SIMPLE tests for age 50–59, 60–63, and 64+; higher-limit eligible vs ordinary category; exact catch-up amounts and no stacking;
- targeted governmental 457(b) tests for below/above threshold, Roth support true/false/unknown, ordinary age-based catch-up, and preservation of the special-catch-up boundary;
- regression tests showing unaffected account types retain behavior;
- literal `npm run verify` must be run and observed when execution tooling permits;
- production dependency audit must be run/observed;
- Foundation CI must be verified on the exact final production checkpoint;
- exact final SHA and changed files recorded.

Acceptance criteria:
- R1 and R2 are either remediated with evidence or a precisely scoped semantic ambiguity is returned to Manager;
- no new financial-policy behavior beyond verified external rules;
- no production change outside authorized scope;
- required tests/validation actually observed and reported;
- role handoff updated.

### FFH-007 — Define HSA legal-capacity policy semantics

Assigned employee: Retirement & Tax-Advantaged Policy Analyst
Department: Policy
Status: ASSIGNED
Dependency classification: INDEPENDENT within FFH-PW-002
Branch: repository read; role-owned policy artifacts only
Blocking dependency: none after FFH-005
Required next role: Manager synthesis with FFH-008
Parallel Wave ID: FFH-PW-002

Objective:
Resolve the policy/modeling questions raised by FFH-005 R3 and R4 so Engineering receives explicit HSA legal-capacity semantics rather than inventing them.

Required policy analysis:
- use FFH-005 authoritative 2026 HSA findings as external factual constraints;
- define what current/future `hsa_eligible` may safely mean for actionable annual capacity;
- determine whether an annual boolean can support full-year capacity only under explicit full-year or last-month-rule-qualified semantics;
- define treatment of partial-year eligibility, coverage changes, Medicare enrollment/retroactivity, and last-month-rule uncertainty;
- define targeted `more_information_needed` behavior when legal capacity is not established;
- decide married-family ordinary-base allocation when users do not explicitly choose a split, including whether to use the IRS equal default;
- decide whether the current ordinary-versus-catch-up YTD attribution blocker remains an intentional conservative FFH rule or is replaced by a different legally sufficient capacity model;
- preserve spouse-specific age-55 catch-up ownership;
- define legacy-record/backward-compatibility expectations from a policy perspective;
- provide scenario acceptance cases and clear classifications: statutory fact vs FFH policy vs product/data choice;
- do not write production code.

Acceptance criteria:
- implementation-ready policy recommendation for R3/R4;
- no statutory claim without FFH-005/authoritative support;
- no silent redefinition of persisted field meaning without migration/data implications being acknowledged;
- role handoff updated with open questions for Manager only where unavoidable.

### FFH-008 — Map HSA persistence/runtime contract

Assigned employee: Application, Data & Integration Engineer
Department: Engineering
Status: ASSIGNED — ANALYSIS ONLY
Dependency classification: SOFT DEPENDENCY on FFH-007; may proceed concurrently
Target branch: repository read; no production changes authorized
Blocking dependency: none for analysis; implementation blocked on Manager synthesis of FFH-007/008
Required next role: Manager synthesis
Parallel Wave ID: FFH-PW-002

Objective:
Map the current HSA persistence/runtime architecture and propose the minimum safe data-contract options needed to implement FFH-007 policy and resolve FFH-005 R3/R4. Do not implement schema or application changes yet.

Required analysis:
- inspect Supabase migrations/schema, account/person ownership, financial-profile forms/actions, snapshot loader, runtime normalization, and relevant tests;
- document current HSA fields, defaults, null semantics, and where they enter authoritative calculations;
- determine minimum data needed for month/period eligibility, coverage changes, Medicare timing, last-month-rule qualification, married-family allocation choice, and spouse/person-level facts;
- identify whether facts belong on person, HSA account, household/tax profile, or another explicit model;
- provide a minimal safe interim option and a richer long-term option where useful;
- identify migration/backfill/default risks and how legacy rows must avoid silently becoming affirmative eligibility;
- define runtime/database parity requirements and likely affected files/systems;
- identify collision/coordination risk with Core Engine HSA capacity code;
- do not edit production code, schema, migration, UI, or calculation behavior.

Acceptance criteria:
- repository-grounded technical options with tradeoffs;
- exact current data-flow documented;
- migration/backward-compatibility risks explicit;
- no implementation before Manager policy/data-contract approval;
- role handoff updated.

## Manager synthesis rules for FFH-PW-002

- FFH-006 is independent of FFH-007/008 and may implement in parallel.
- FFH-008 may analyze in parallel with FFH-007 but must not implement before policy synthesis.
- Manager must reconcile FFH-007 and FFH-008 before issuing HSA production implementation.
- Phase 5C production implementation remains blocked until R1/R2/R3 have a completed or approved remediation path and overlapping Core Engine work is stable.

## Currently idle roles

Debt & Liquidity Policy Analyst — IDLE. The approved Phase 5C decision preserves the retirement floor and exposes essential-goal/floor infeasibility rather than silently reclassifying it; no new Debt/Liquidity policy task is currently required.

Goals, Cash Flow & Allocation Policy Analyst — IDLE after FFH-003 completion.

Regulatory & Financial Research Analyst — IDLE after FFH-005 completion; reactivate only if FFH-006/007 reveals a factual uncertainty not answered by the existing authoritative research.

Product & Technical R&D Engineer — IDLE. Current blockers are correctness/data-contract work, not speculative R&D.

Technical & Mathematical Auditor — IDLE pending completed regulatory/HSA remediation and a stable integrated checkpoint.

Financial Policy & Scenario Auditor — IDLE pending completed regulatory/HSA remediation plus later Phase 5C implementation checkpoint.
