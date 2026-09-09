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

## Phase 5 status

Implemented foundation includes the priority waterfall, existing-cash/residual accounting, Secure/Build/Optimize behaviors, retirement legal-capacity ledger, planning reruns, Phase 5A Hybrid Retirement Floor, and Phase 5B Goal Intelligence.

Phase 5C recurring goal-versus-retirement policy is approved in `FFH-D004`, but production implementation remains intentionally sequenced behind retirement-capacity remediation.

## Completed work

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE
- FFH-002 branch freshness reconciliation — COMPLETE
- FFH-003 Goals Policy — COMPLETE / REVALIDATED
- FFH-004 Retirement Policy — COMPLETE / CLOSED BY FFH-D004
- FFH-005 Regulatory Research — COMPLETE / REVALIDATED
- Manager Phase 5C synthesis — COMPLETE through FFH-D004

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
Status: COMPLETE AT POLICY/ANALYSIS GATE
- FFH-006 Core Engine R1/R2 task — COMPLETE
  - R2 governmental 457(b) Roth catch-up: remediated and CI-validated
  - R1 SIMPLE higher-limit: intentionally stopped at verified persisted-field semantic ambiguity
- FFH-007 HSA legal-capacity policy — COMPLETE
- FFH-008 HSA persistence/runtime analysis — COMPLETE
- Manager HSA synthesis — COMPLETE through FFH-D005

## Durable HSA decision — FFH-D005

The approved minimum-complete HSA remediation uses a person + tax-year profile plus month-level eligibility/coverage facts (or a lossless equivalent). Legacy account-level eligibility/coverage remains non-authoritative. Equal married-family allocation is the default absent another agreement; alternate allocation and last-month-rule reliance are explicit household choices within statutory constraints. R4 is replaced by owner-ceiling math using spouse allocation + owner catch-up + aggregate owner YTD. Application/Data establishes schema/capture/loader/normalized contract before Core Engine changes HSA capacity math.

## Active wave — FFH-PW-003

Title: HSA contract implementation + IRA policy
Status: ACTIVE

### FFH-009 — Define spousal-IRA scarce-compensation legal-capacity semantics
Owner: Retirement & Tax-Advantaged Policy Analyst
Status: ACTIVE
Dependency: FFH-007 complete; factual basis is FFH-005 R6

Objective:
Define the statutory feasible-set / FFH routing boundary for MFJ IRA contribution capacity when joint compensation is below the sum of both spouses' individual limits. Do not invent a statutory owner priority. Define use of actual YTD spouse contributions, safely exposable per-owner room, deterministic routing, missing-information behavior, and acceptance scenarios.

Next: Manager synthesis, then a Core Engine remediation task if approved.

### FFH-010 — Implement FFH-D005 HSA persistence and normalized input contract
Owner: Application, Data & Integration Engineer
Status: ACTIVE
Dependency: FFH-D005 approved

Objective:
Implement only the Application/Data side of FFH-D005 so the future Core Engine HSA calculation receives one authoritative normalized contract.

Required scope:
- additive Supabase migration(s) for person/tax-year HSA profile and month-level eligibility/coverage (or a proven lossless-equivalent shape);
- tax-year-bound alternate married-family allocation representation only when explicitly chosen;
- explicit tax-year binding for HSA YTD used by legal-capacity math, or a proven equivalent contract;
- household-scoped RLS consistent with current financial-data authorization;
- financial-profile or dedicated HSA capture UX/actions sufficient to create/update the approved legal facts without optimistic defaults;
- preserve legacy account HSA eligibility/coverage as non-authoritative hints; no optimistic backfill;
- Supabase loader + normalized Money Priority snapshot contract updates;
- Recommendation Refresh/material-basis integration for decision-relevant HSA facts;
- persistence/reload/null/unknown/RLS/order-invariance tests;
- DB/runtime enum/null parity;
- do not change `money-priority-retirement-accounts.ts` HSA legal-capacity algorithm except where unavoidable for compile-time contract compatibility; if unavoidable, stop and route the exact overlap to Manager/Core instead of silently implementing FFH-012;
- create migration file and, when linked Supabase tooling is available and repository workflow permits, apply/verify the migration separately from the code commit; never claim live parity without evidence;
- run/observe required repository verification and Foundation CI on exact final checkpoint.

Next: Manager review, then FFH-012 Core HSA implementation.

## Queued work

### FFH-011 — Define/remediate SIMPLE higher-limit persisted field contract
Owner: Application, Data & Integration Engineer
Status: QUEUED after FFH-010 unless Manager reorders

Objective:
Resolve R1's persisted-field ambiguity without guessing. Determine the current/legacy semantics and capture path for `simple_higher_limit_eligible` / `simpleHigherLimitEligible`; establish a safe prospective field/data contract for the statutory certain-applicable-SIMPLE category; address legacy/null/reconfirmation behavior; and recommend whether migration/rename/new field is required. No Core catch-up formula change in this task.

### FFH-012 — Implement FFH-D005 HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
Status: QUEUED after FFH-010 stable normalized contract

Objective:
Consume the approved HSA contract and implement month-sensitive base/catch-up capacity, Medicare/retroactivity behavior, explicit last-month-rule conditional basis, married equal/alternate allocation, R4 owner ceilings, YTD tax-year discipline, targeted uncertainty, downstream ledger/routing parity, and comprehensive HSA scenarios. Preserve one legal-capacity source across Existing Cash/Secure/Build/Windfall/Your Plan/hypotheticals/refresh.

### Future IRA remediation
Owner: Core Financial Engine Engineer
Status: BLOCKED on FFH-009 Manager synthesis

### Future Phase 5C implementation
Owner: Core Financial Engine Engineer
Status: POLICY APPROVED / NOT YET AUTHORIZED

Start only after retirement-capacity blockers have completed or have stable approved implementation checkpoints and overlapping Core Engine surfaces are safe.

## Current merge blockers

- R1 SIMPLE persisted-field semantics + any resulting code remediation
- R3/R4 HSA production implementation under FFH-D005
- R6 spousal-IRA policy + resulting remediation
- Phase 5C production implementation and integrated independent audits

R2 is remediated but remains subject to later integrated audit.

## Expected sequence

1. Run FFH-009 and FFH-010 in parallel.
2. Manager synthesize FFH-009 and issue IRA remediation if required.
3. Review FFH-010 exact schema/runtime checkpoint.
4. Run FFH-012 Core HSA implementation against that contract.
5. Run FFH-011 for R1; issue a narrow Core R1 follow-up if semantics require formula change.
6. Stabilize retirement-capacity surfaces and implement FFH-D004 Phase 5C.
7. Run Technical & Mathematical Audit and Financial Policy & Scenario Audit on the integrated Phase 5 checkpoint.
8. Resolve all blocking findings.
9. Evaluate PR #5 merge gate; merge only if clean.
10. Verify post-merge CI and reconcile canonical state.

Do not pre-authorize Phase 5D–5G production work from prior chat discussion.

## Phase 6 — Scenario Lab

Planned examples include increased retirement contributions, HSA maxing, extra mortgage payments, vehicle purchase, temporary income loss, raises, and monthly-savings changes. Scenario Lab remains downstream of an accepted Phase 5 recommendation engine and must not mutate live household data unless explicitly applied.

## Phase 7 — Private Beta

Planned scope includes household invitations/onboarding, recovery, security review, accessibility/mobile polish, and feedback collection.
