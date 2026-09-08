# Retirement & Tax-Advantaged Policy Analyst Handoff

HANDOFF

Task ID: FFH-004
Role: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE — READY FOR MANAGER SYNTHESIS
Verified starting state: Active branch `phase-5-money-priority-engine` was verified at `711b7e895dc9cd29283af9c981cfcbe15cb4db63` before role-owned policy writes. Phase 5A Hybrid Retirement Floor and Phase 5B Goal Intelligence were inspected from repository documentation/source. Phase 5C remained not repository-approved at task start.
Assigned objective: Independently define the retirement-policy protections and opportunity-cost constraints that should govern Phase 5C, without writing production code and without adopting the Goals Policy conclusion before forming an initial recommendation.
Work completed: Created `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md` with the independent retirement-side Phase 5C recommendation, classifications, invariants, missing-data behavior, status-specific constraints, scenarios, acceptance cases, tradeoffs, and open Manager synthesis questions.
Evidence produced: Repository-backed analysis of Phase 5A floor outputs and policy constants, Phase 5B Goal Intelligence boundaries, and the active Manager assignment. Policy artifact commit: `f5e7213f51bac66c8eabfb6a3c9118f4ee3033fa`.
Tests / validation actually performed: No production tests were run because this role made policy-documentation changes only. Repository state and relevant source/doc behavior were inspected directly through GitHub. Branch checkpoint was re-read immediately before the policy write.
Files updated:
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md` (created)
- `.ai/policy/retirement/HANDOFF.md` (this update)
Open findings:
- Manager must synthesize the exact goal-evidence threshold that may displace additional retirement for BEHIND / ON_TRACK households.
- Manager must decide deterministic tie behavior between qualifying goals and additional retirement.
- FFH-005 may provide verified contribution-timing facts that Manager could choose to use as a tie-break.
- A cross-policy decision remains on whether a truly essential goal that cannot coexist with the protected retirement floor should remain an explicit Build infeasibility or be elevated through a separate required/Secure policy path; Retirement Policy recommends explicit classification rather than silently raiding the floor.
Blocking issues: None for Manager synthesis. Phase 5C remains blocked from Engineering until Manager synthesizes FFH-003, FFH-004, and FFH-005 and records approved durable policy.
Unverified items:
- FFH-003 Goals Policy conclusion was intentionally not consulted before forming this independent recommendation.
- FFH-005 current 2026 statutory/account facts were not yet relied upon in this review.
- No current statutory dollar limit, contribution deadline, carryforward rule, or tax-treatment detail is asserted by FFH-004.
Recommended next role: Manager / Architect.
Exact next action: Manager should read `PHASE_5C_RETIREMENT_POLICY.md`, FFH-003 Goals Policy, and FFH-005 Regulatory Research, resolve the identified cross-policy questions, record approved Phase 5C durable decision(s), and only then issue Engineering implementation work.
Checkpoint / SHA: `f5e7213f51bac66c8eabfb6a3c9118f4ee3033fa` is the verified policy-artifact commit; this HANDOFF update creates a later documentation-only commit.

Policy classification:
- Employer match remains Secure/non-contestable: ESTABLISHED FFH PROJECT POLICY.
- Existing Phase 5A 15% normal, 12% AHEAD, 25% maximum protected corrective, and 5% employee guardrail thresholds: ESTABLISHED FFH PROJECT POLICY.
- Ordinary goal competition cannot reduce the Phase 5A protected retirement floor: PROPOSED FFH PROJECT POLICY.
- Only retirement above the floor is contestable: PROPOSED FFH PROJECT POLICY.
- BEHIND / ON_TRACK / AHEAD change the strength of additional-retirement opportunity cost, not the existence of the protected floor: PROPOSED FFH PROJECT POLICY.
- Exact current statutory limits/timing rules: EXTERNAL FACTS REQUIRED; not asserted here.

Retirement invariants established:
- employer match cannot be reduced by ordinary goal competition;
- protected retirement floor cannot be reduced by ordinary goal competition;
- additional retirement cannot exceed verified remaining legal room or recurring cash capacity;
- legal room and household cash-flow capacity remain distinct;
- scheduled contributions and YTD contributions cannot be counted twice;
- one-time cash and recurring capacity remain distinct;
- unknown capacity cannot become false zero room or false permission to downshift retirement;
- structural retirement shortfall must remain visible when the corrective target is infeasible.

Scenarios evaluated: 10 policy scenarios covering BEHIND floor shortfall, structurally infeasible correction, ON_TRACK legitimate-goal competition, deadline gaming, AHEAD goal competition, incomplete employer match, missing retirement data, exhausted legal room, scheduled-room reservation, and one-time-cash separation.

External facts relied upon: None beyond repository-established project policy/state. No current-law numeric value was used as a policy premise.

External facts still required: FFH-005 verification of current 2026 account limits/shared-limit mechanics and any account-specific timing/expiration facts Manager may want to use in final Phase 5C tie-breaking.

Implementation readiness: READY FOR MANAGER SYNTHESIS. NOT READY FOR ENGINEERING until Manager approval.
