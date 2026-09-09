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

## Active milestone — Phase 5

### Implemented on the Phase 5 branch

Repository evidence supports the major V2 priority-engine foundation plus Phase 5A Hybrid Retirement Floor and Phase 5B Goal Intelligence.

Phase 5C recurring goal-versus-retirement policy is approved in `FFH-D004`, but implementation is intentionally deferred until known pre-existing retirement/HSA legal-capacity blockers are resolved.

### Completed work

#### FFH-001 — Canonical AI workflow bootstrap
Owner: Manager / Architect
Status: COMPLETE

#### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE

- FFH-002 — Phase 5 branch freshness reconciliation: COMPLETE
  - verified reconciliation checkpoint: `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`
  - branch became 0 behind current `main`
  - Foundation CI #245: SUCCESS
- FFH-003 — Phase 5C Goals Policy analysis: COMPLETE / REVALIDATED
- FFH-004 — Phase 5C Retirement Policy independent review: COMPLETE / CLOSED BY FFH-D004
- FFH-005 — 2026 statutory retirement/HSA verification: COMPLETE / REVALIDATED
- Manager synthesis: COMPLETE through `FFH-D004`

### Current blockers discovered by FFH-005 + revalidation

R1 — high-confidence SIMPLE higher-limit age-50 catch-up mismatch candidate.

R2 — high-confidence governmental 457(b) Roth catch-up rule omission.

R3 — high-confidence HSA legal-capacity data/model gap for partial-year eligibility / Medicare / last-month-rule cases.

R4 — HSA ordinary-versus-catch-up YTD attribution is a conservative product choice rather than a verified statutory requirement and requires explicit policy classification.

R6 — high-confidence MFJ spousal-IRA scarce-compensation legal-capacity representation issue: current deterministic owner-ID allocation can understate one spouse's legally possible room and is project modeling rather than a statutory owner-specific split.

R1, R2, R3, and R6 block final Phase 5 merge-readiness. R4 must be deliberately resolved/classified before final audit.

## FFH-PW-002 — Retirement statutory remediation + HSA legal-capacity semantics

Status: ACTIVE

### FFH-006 — Remediate verified retirement-capacity statutory mismatches
Owner: Core Financial Engine Engineer
Dependency classification: INDEPENDENT within FFH-PW-002
Status: ASSIGNED

Objective:
Remediate FFH-005 R1 and R2 only, without implementing Phase 5C or redesigning HSA/IRA policy.

Required outcomes:
- verify exact branch/head before editing;
- confirm `simpleHigherLimitEligible` semantics before applying R1;
- implement the verified 2026 certain-applicable-SIMPLE catch-up distinction where supported;
- apply the verified 2026 high-wage Roth catch-up requirement to governmental 457(b) age-based catch-up logic using modeled facts;
- preserve deferred special 457(b) catch-up boundaries;
- add focused boundary/adversarial regression tests;
- run literal `npm run verify` when tooling permits, production dependency audit, and verify CI on exact final production checkpoint;
- return exact SHA and handoff evidence.

### FFH-007 — Define HSA legal-capacity policy semantics for R3/R4
Owner: Retirement & Tax-Advantaged Policy Analyst
Dependency classification: INDEPENDENT within FFH-PW-002
Status: ASSIGNED

Objective:
Using FFH-005 authoritative findings, define desired FFH HSA legal-capacity semantics for annual/full-year eligibility, partial-year coverage, Medicare, last-month-rule uncertainty, married-family allocation, and current YTD attribution behavior.

Required next role: Manager synthesis with FFH-008.

### FFH-008 — Map HSA persistence/runtime contract
Owner: Application, Data & Integration Engineer
Dependency classification: SOFT DEPENDENCY on FFH-007; analysis-only in parallel
Status: ASSIGNED — ANALYSIS ONLY

Objective:
Inspect the existing HSA schema/forms/actions/snapshot/runtime data flow and propose the minimum safe persistence/runtime contract needed to implement FFH-007 policy. No production changes until Manager approval.

Required next role: Manager synthesis with FFH-007.

## FFH-009 — Define spousal-IRA scarce-compensation legal-capacity semantics

Owner: Retirement & Tax-Advantaged Policy Analyst
Status: QUEUED — DO NOT START UNTIL FFH-007 IS COMPLETE
Dependency classification: HARD scheduling dependency on FFH-007 because the same specialist owns both; factual basis from FFH-005 R6 is already available

Objective:
Define implementation-ready FFH policy for MFJ spousal-IRA legal capacity when joint compensation is below the sum of both spouses' individual IRA dollar limits, so deterministic engine routing is not misrepresented as a statutory fixed owner split.

Required analysis:
- use FFH-005 R6 authoritative spousal-IRA research;
- distinguish the statutory feasible set from FFH allocation/routing policy;
- determine how actual YTD contributions by each spouse affect remaining feasible capacity;
- define what the engine may safely expose as per-owner actionable room before the user's future contribution choices are known;
- define deterministic behavior without inventing a statutory owner priority;
- preserve aggregate compensation and individual annual-limit invariants;
- define missing-information behavior, scenario acceptance cases, and interaction with account routing;
- do not write production code.

Required next role: Manager synthesis followed by an implementation-ready Core Engine task if remediation is approved.

## Hard dependency after FFH-PW-002

Manager must synthesize FFH-007 and FFH-008 before authorizing HSA production changes.

FFH-009 must then resolve R6 policy semantics before final integrated audit/merge. It may be executed immediately after FFH-007 by the same Retirement Policy specialist.

Core Phase 5C implementation should not begin until R1/R2/R3/R6 have completed or approved remediation paths and overlapping Core Engine surfaces are stable.

## Expected next sequence

1. Complete FFH-006, FFH-007, FFH-008.
2. Manager approves HSA policy/data contract and issues implementation-ready HSA Engineering task(s).
3. Retirement Policy executes queued FFH-009; Manager approves spousal-IRA legal-capacity policy.
4. Implement/validate HSA and IRA remediation without overlapping unsafe Core changes.
5. Issue Core Engine implementation task for approved Phase 5C policy (`FFH-D004`) once retirement-capacity work is stable.
6. Require independent Technical Auditor and Financial Policy & Scenario Auditor reviews on the completed integrated Phase 5 checkpoint.
7. Resolve blocking findings.
8. Evaluate PR #5 merge gate.
9. If clean, merge, verify post-merge CI, and reconcile canonical state.

Do not pre-authorize Phase 5D–5G production work solely from prior chat discussion.

## Phase 6 — Scenario Lab

Planned examples include:
- increase retirement contribution rate;
- max an HSA;
- make extra mortgage payments;
- buy a vehicle;
- lose one income temporarily;
- receive a raise;
- change monthly savings.

Scenario Lab must not modify live household data unless a user explicitly applies a result.

Phase 6 remains a HARD downstream dependency on an accepted Phase 5 recommendation engine.

## Phase 7 — Private Beta

Planned scope includes independent household invitations/onboarding, account recovery, security review, accessibility/mobile polish, and feedback collection.

## Future considerations

Ideas already present in repository roadmap include bank/investment syncing, recurring transaction detection, shared household access, read-only advisor/family access, AI-generated financial explanations, and export/annual review reports.

These remain future concepts, not approved active milestones.
