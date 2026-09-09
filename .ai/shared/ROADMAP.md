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

Phase 5C recurring goal-versus-retirement policy is now approved in `FFH-D004`, but implementation is intentionally deferred until known pre-existing regulatory/modeling blockers are resolved.

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

- FFH-003 — Phase 5C Goals Policy analysis: COMPLETE
- FFH-004 — Phase 5C Retirement Policy independent review: COMPLETE
- FFH-005 — 2026 statutory retirement/HSA verification: COMPLETE
- Manager synthesis: COMPLETE through `FFH-D004`

### Current blockers discovered by FFH-005

R1 — high-confidence SIMPLE higher-limit age-50 catch-up mismatch candidate.

R2 — high-confidence governmental 457(b) Roth catch-up rule omission.

R3 — high-confidence HSA legal-capacity data/model gap for partial-year eligibility / Medicare / last-month-rule cases.

R4 — HSA ordinary-versus-catch-up YTD attribution is a conservative product choice rather than a verified statutory requirement and requires explicit policy classification.

R1–R3 block final Phase 5 merge-readiness. R4 must be deliberately resolved/classified before final audit.

## FFH-PW-002 — Retirement statutory remediation + HSA legal-capacity semantics

Status: ACTIVE

### FFH-006 — Remediate verified retirement-capacity statutory mismatches
Owner: Core Financial Engine Engineer
Dependency classification: INDEPENDENT within FFH-PW-002

Objective:
Remediate FFH-005 R1 and R2 only, without implementing Phase 5C or redesigning HSA policy.

Required outcomes:
- verify the exact current branch/head before editing;
- confirm `simpleHigherLimitEligible` semantics against repository schema/docs before applying R1; if semantics are genuinely ambiguous, stop only that subpart and return evidence to Manager rather than guessing;
- implement the verified 2026 certain-applicable-SIMPLE age-50 catch-up distinction where supported;
- apply the verified 2026 high-wage Roth catch-up requirement to governmental 457(b) age-based catch-up logic using existing plan/sponsor-wage/Roth-support facts where available;
- preserve the explicitly deferred governmental 457(b) special last-three-years catch-up boundary;
- do not change Phase 5C, HSA eligibility semantics, goal policy, or unrelated account behavior;
- add focused boundary/adversarial regression tests;
- run literal `npm run verify` when tooling permits, production dependency audit, and verify CI on the exact final production checkpoint;
- return exact SHA and handoff evidence.

Required audit after implementation: later integrated Technical + Policy Audit; Manager may request focused audit earlier if implementation risk warrants it.

### FFH-007 — Define HSA legal-capacity policy semantics for R3/R4
Owner: Retirement & Tax-Advantaged Policy Analyst
Dependency classification: INDEPENDENT within FFH-PW-002

Objective:
Using FFH-005 authoritative findings, define the desired FFH policy/data semantics for HSA legal capacity when annual eligibility, partial-year coverage, Medicare enrollment, last-month-rule use, married-family allocation, and YTD contributions interact.

Required analysis:
- determine what `hsa_eligible` may safely mean in authoritative recommendations;
- decide whether current annual/account-level facts can ever support full-year actionable capacity without additional timing facts;
- define conservative `more_information_needed` behavior when statutory capacity cannot be established;
- decide ordinary married-family base allocation behavior when users do not specify an allocation (including whether IRS equal default should be used);
- decide whether the current ordinary-versus-catch-up YTD attribution blocker should remain as a deliberate conservative project rule or be replaced by a legally sufficient allocation model;
- distinguish current law, project policy, product-design choice, and data requirement;
- define scenario acceptance cases and backward-compatibility expectations;
- do not write production code.

Required next role: Manager synthesis with FFH-008.

### FFH-008 — Map HSA persistence/runtime contract
Owner: Application, Data & Integration Engineer
Dependency classification: SOFT DEPENDENCY on FFH-007; may proceed in parallel as analysis-only

Objective:
Inspect the existing HSA schema, migrations, financial-profile forms/actions, snapshot loader, persistence/runtime contract, and account/person ownership model. Produce the minimum technically sound data-contract options needed to support safe R3/R4 policy without implementing production changes yet.

Required analysis:
- identify current persisted HSA fields and exact semantics actually represented;
- identify where HSA eligibility/coverage facts live and how they enter the authoritative snapshot;
- determine options for supporting month-level/period eligibility, Medicare timing, last-month-rule qualification, married-family allocation choice, and any spouse/person-level facts required by FFH-007;
- identify migrations/backfill/default/legacy-record risks;
- identify runtime/database parity requirements and likely files/components affected;
- distinguish minimal safe interim option from richer long-term model;
- do not change production schema/code until Manager approves a policy/data contract.

Required next role: Manager synthesis with FFH-007.

## Hard dependency after FFH-PW-002

Manager must synthesize FFH-007 and FFH-008 before authorizing HSA production changes.

Core Phase 5C implementation should not begin until the known R1/R2/R3 statutory/modeling blockers have an approved remediation path and overlapping Core Engine surfaces are no longer at material collision risk.

## Expected next sequence

1. Complete FFH-006, FFH-007, FFH-008.
2. Manager approves HSA policy/data contract and issues implementation-ready HSA Engineering task(s).
3. Implement and validate HSA remediation.
4. Issue Core Engine implementation task for approved Phase 5C policy (`FFH-D004`) once overlapping retirement-capacity work is stable.
5. Require independent Technical Auditor and Financial Policy & Scenario Auditor reviews on the completed integrated Phase 5 checkpoint.
6. Resolve blocking findings.
7. Evaluate PR #5 merge gate.
8. If clean, merge, verify post-merge CI, and reconcile canonical state.

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
