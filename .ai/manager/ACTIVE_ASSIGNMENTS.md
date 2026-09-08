# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-08

## FFH-001 — Canonical AI workflow bootstrap

Title: Bootstrap repository-persisted AI operating state
Assigned employee: Manager / Architect
Department: Management
Status: COMPLETE upon verified bootstrap commit
Dependency classification: INDEPENDENT
Branch: `phase-5-money-priority-engine`
Starting SHA: `e979ff19f09fdd07a954347150608a87122f5183`
Blocking dependency: none
Required next role: Manager orchestration of FFH-PW-001
Parallel Wave ID: none

## FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery

Status: ACTIVE after FFH-001

### FFH-002 — Phase 5 branch freshness reconciliation

Assigned employee: Core Financial Engine Engineer
Department: Engineering
Status: ASSIGNED
Dependency classification: INDEPENDENT within FFH-PW-001
Target branch: `phase-5-money-priority-engine`
Verified pre-bootstrap Phase 5 SHA: `e979ff19f09fdd07a954347150608a87122f5183`
Current `main` SHA observed during bootstrap: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`
Blocking dependency: FFH-001 bootstrap must exist first
Required next role: Technical Auditor after a stable reconciliation checkpoint and after Manager determines audit scope
Parallel Wave ID: FFH-PW-001

Objective:
Reconcile the active Phase 5 branch with current `main` without inventing or changing financial policy. The observed upstream-only delta is the `main` README milestone-status commit, but the engineer must re-verify before acting.

Required behavior:
- refresh canonical `.ai` state first;
- verify current target branch and SHA;
- verify current `main` SHA and compare divergence;
- integrate/rebase/merge current `main` as appropriate without silently discarding either side;
- preserve all Phase 5A/5B calculation behavior unless a real integration conflict requires escalation;
- do not implement Phase 5C;
- run the repository's required verification on the final checkpoint;
- verify Foundation CI for the exact final checkpoint when available;
- update `.ai/engineering/engine/HANDOFF.md` with evidence and exact SHA.

Acceptance criteria:
- branch is no longer stale against the verified `main` checkpoint or any remaining divergence is explicitly explained;
- no unintended production changes outside required integration reconciliation;
- `npm run verify` result actually observed;
- production dependency audit result actually observed if part of CI/local validation;
- exact final commit SHA recorded;
- no fabricated pass claims.

### FFH-003 — Phase 5C Goals Policy analysis

Assigned employee: Goals, Cash Flow & Allocation Policy Analyst
Department: Policy
Status: ASSIGNED
Dependency classification: INDEPENDENT within FFH-PW-001
Branch: repository read against active Phase 5 state; policy artifacts only unless Manager explicitly authorizes more
Starting state: Phase 5A + Phase 5B implemented; Phase 5B states Phase 5C will introduce intentional goal-versus-retirement allocation competition
Blocking dependency: FFH-001 bootstrap
Required next role: Manager synthesis
Parallel Wave ID: FFH-PW-001

Objective:
Produce an implementation-ready policy analysis for Phase 5C from the Goals/Cash Flow perspective. Define when and how Goal Intelligence should affect competition for recurring Build capacity relative to additional retirement, while preserving existing emergency/debt/Secure safeguards.

Required analysis:
- use repository Phase 5A retirement-floor output and Phase 5B Goal Intelligence as inputs;
- distinguish essential core need from full desired target;
- distinguish fixed/limited/flexible deadlines, underfunding consequences, borrowing/debt exposure, schedule state, target reasonableness, and satisfied goals;
- define which goal dollars may outrank, tie, or remain below additional retirement;
- prevent optional/lifestyle deadline gaming from becoming protected financial need;
- preserve one-time versus recurring capacity and residual-needs invariants;
- identify missing-data behavior and targeted `more_information_needed` cases;
- provide scenario acceptance cases and edge cases;
- do not invent statutory retirement limits;
- do not write production code.

Expected artifact:
Update `.ai/policy/goals/HANDOFF.md` and optionally one concise role-owned analysis file if needed.

### FFH-004 — Phase 5C Retirement Policy independent review

Assigned employee: Retirement & Tax-Advantaged Policy Analyst
Department: Policy
Status: ASSIGNED
Dependency classification: INDEPENDENT within FFH-PW-001
Branch: repository read against active Phase 5 state; policy artifacts only unless Manager explicitly authorizes more
Starting state: Phase 5A hybrid retirement floor implemented; Phase 5B Goal Intelligence implemented
Blocking dependency: FFH-001 bootstrap
Required next role: Manager synthesis
Parallel Wave ID: FFH-PW-001

Objective:
Independently analyze Phase 5C from the retirement-policy perspective without first adopting the Goals Policy conclusion. Define the retirement protections and opportunity-cost constraints that should govern any competition between goals and additional retirement.

Required analysis:
- preserve employer match as Secure and separate from additional retirement;
- reason from the Phase 5A protected retirement floor, projection state, legal capacity, scheduled contributions, and feasible recurring capacity;
- distinguish protected floor from additional opportunity above the floor;
- identify when goal funding may permissibly reduce only additional retirement, versus when retirement protection should remain dominant;
- address BEHIND / ON_TRACK / AHEAD implications;
- address HSA/IRA/workplace-account sequencing only as product policy, with statutory facts sourced from FFH-005 where needed;
- identify missing-data behavior and policy uncertainty;
- provide scenario acceptance cases and edge cases;
- do not coordinate with FFH-003 before forming the initial independent recommendation;
- do not write production code.

Expected artifact:
Update `.ai/policy/retirement/HANDOFF.md` and optionally one concise role-owned analysis file if needed.

### FFH-005 — Current statutory retirement/HSA verification

Assigned employee: Regulatory & Financial Research Analyst
Department: R&D
Status: ASSIGNED
Dependency classification: INDEPENDENT within FFH-PW-001
Branch: policy/research artifacts only
Blocking dependency: FFH-001 bootstrap
Required next role: Manager synthesis; may also inform FFH-004
Parallel Wave ID: FFH-PW-001

Objective:
Verify the current 2026 statutory/account rules materially relevant to the existing Phase 5 retirement/HSA engine and Phase 5C policy synthesis using authoritative sources.

Required research:
- 2026 elective deferral limits for 401(k), 403(b), TSP, and governmental 457(b), including applicable age-based catch-up treatment;
- defined-contribution annual-additions limit and compensation interaction;
- IRA contribution limits and relevant compensation/eligibility constraints needed by the engine;
- HSA self-only/family base limits and age-55 catch-up structure, including married-family allocation considerations materially relevant to current implementation;
- authoritative effective dates and source links/citations;
- clearly separate statutory facts from project policy and assumptions;
- flag any repository constant/documentation that appears inconsistent or cannot be verified;
- do not redesign product policy or write production code.

Expected artifact:
Update `.ai/research/regulatory/HANDOFF.md` and optionally `.ai/research/regulatory/SOURCES.md`.

## Currently idle roles

Debt & Liquidity Policy Analyst — IDLE. No unresolved Phase 5C question currently requires independent debt/liquidity ownership; activate if Goals/Retirement synthesis exposes a real liquidity/debt conflict.

Application, Data & Integration Engineer — IDLE. No independent data/persistence implementation task is yet approved.

Product & Technical R&D Engineer — IDLE. Active Phase 5 stabilization/policy work outranks speculative future exploration.

Technical & Mathematical Auditor — IDLE pending a stable post-reconciliation implementation checkpoint and defined audit scope.

Financial Policy & Scenario Auditor — IDLE pending approved Phase 5C policy and completed implementation checkpoint.
