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

Repository evidence supports implementation of the major V2 priority-engine foundation plus Phase 5A Hybrid Retirement Floor and Phase 5B Goal Intelligence.

These remain unmerged and require branch freshness plus the audit/acceptance gates defined by the canonical workflow.

### Immediate sequence

#### FFH-001 — Canonical AI workflow bootstrap
Owner: Manager / Architect
Status: COMPLETE when the bootstrap commit is verified.

Objective: persist repository-first project state, roadmap, decisions, workflow, role handoffs, and active assignments so specialist chats can refresh without carrying large chat history.

#### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: ACTIVE after bootstrap.

Independent workstreams:

- FFH-002 — Phase 5 branch freshness reconciliation
  - Owner: Core Financial Engine Engineer
  - Dependency: none after FFH-001
  - Classification: INDEPENDENT within the wave
  - Goal: reconcile `phase-5-money-priority-engine` with current `main`, preserve Phase 5 behavior, rerun required verification, and return exact checkpoint evidence.

- FFH-003 — Phase 5C Goals Policy analysis
  - Owner: Goals, Cash Flow & Allocation Policy Analyst
  - Dependency: Phase 5A/5B repository state
  - Classification: INDEPENDENT within the wave
  - Goal: define implementation-ready goal-versus-retirement allocation competition using Goal Intelligence without inventing regulatory facts or engineering behavior.

- FFH-004 — Phase 5C Retirement Policy independent review
  - Owner: Retirement & Tax-Advantaged Policy Analyst
  - Dependency: Phase 5A/5B repository state
  - Classification: INDEPENDENT within the wave
  - Goal: independently define retirement-floor protections, opportunity-cost constraints, and conditions under which goal funding may or may not reduce additional retirement allocations.

- FFH-005 — Current statutory retirement/HSA verification
  - Owner: Regulatory & Financial Research Analyst
  - Dependency: none after FFH-001
  - Classification: INDEPENDENT within the wave
  - Goal: verify current 2026 statutory/account rules relevant to Phase 5C and existing Phase 5 retirement/HSA policy using authoritative sources, with effective dates and source citations.

### Hard dependency after FFH-PW-001

Manager must synthesize FFH-003, FFH-004, and FFH-005 before authorizing Phase 5C production implementation.

Engineering must not invent the Phase 5C policy.

Technical and Policy Auditors remain idle until there is a stable post-reconciliation implementation checkpoint and an approved policy specification to audit.

### Expected next sequence after policy synthesis

1. Manager approves/persists the Phase 5C durable policy decision(s).
2. Manager issues implementation-ready Engineering task(s), potentially a new Parallel Work Wave if code surfaces are safely separable.
3. Engineering implements approved behavior and tests.
4. Technical Auditor and Financial Policy & Scenario Auditor independently audit the completed checkpoint in parallel.
5. Manager evaluates the complete merge gate.
6. If clean, reconcile PR #5 documentation/state, merge, verify post-merge CI, and update canonical state.

Do not pre-authorize Phase 5D–5G production work solely from prior chat discussion. Those designs must be recovered, reviewed against current repository state, and explicitly approved when they become the legitimate next dependency.

## Phase 6 — Scenario Lab

Planned examples in the existing product roadmap include:
- increase retirement contribution rate;
- max an HSA;
- make extra mortgage payments;
- buy a vehicle;
- lose one income temporarily;
- receive a raise;
- change monthly savings.

Scenario Lab must not modify live household data unless a user explicitly applies a result.

Phase 6 remains a HARD downstream dependency on a sufficiently stable/accepted Phase 5 recommendation engine. Do not start production implementation while Phase 5 is unresolved unless Manager identifies a truly independent preparatory task.

## Phase 7 — Private Beta

Planned scope includes independent household invitations/onboarding, account recovery, security review, accessibility/mobile polish, and feedback collection.

## Future considerations

Ideas already present in repository roadmap include bank/investment syncing, recurring transaction detection, shared household access, read-only advisor/family access, AI-generated financial explanations, and export/annual review reports.

These are future concepts, not approved active milestones.
