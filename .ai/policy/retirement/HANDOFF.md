# Retirement & Tax-Advantaged Policy Analyst Handoff

HANDOFF

Task ID: FFH-004
Role: Retirement & Tax-Advantaged Policy Analyst
Status: ASSIGNED
Verified starting state: Phase 5A Hybrid Retirement Floor is implemented on the active Phase 5 branch; Phase 5B Goal Intelligence is also implemented. Phase 5C goal-versus-retirement allocation competition is not repository-approved.
Assigned objective: Independently define the retirement-policy protections and opportunity-cost constraints that should govern Phase 5C, without writing production code and without adopting the Goals Policy conclusion before forming an initial recommendation.
Work completed: None yet.
Evidence produced: Manager task specification in `.ai/manager/ACTIVE_ASSIGNMENTS.md`.
Tests / validation actually performed: None by this role yet.
Files updated: None by this role yet.
Open findings: Phase 5C needs a durable distinction between protected retirement floor and additional retirement opportunity above the floor when goals compete for recurring Build capacity.
Blocking issues: None after FFH-001 bootstrap. Current statutory facts should be sourced from FFH-005 or independently authoritative current sources rather than memory.
Unverified items: Any prior chat-only Phase 5C–5G design; any current tax/account rule not verified from authoritative sources.
Recommended next role: Manager / Architect for synthesis with FFH-003 and FFH-005.
Exact next action: Refresh canonical `.ai` state and Phase 5A/5B repository evidence, perform the independent retirement-policy analysis, persist it in this role directory, and update this handoff.
Checkpoint / SHA: Not verified in this session.

Policy questions to resolve:
- Which retirement dollars are truly protected versus merely additional opportunity?
- How should BEHIND / ON_TRACK / AHEAD states change the strength of retirement protection?
- Under what conditions, if any, may legitimate goal funding reduce additional retirement above the protected floor?
- When must employer match remain completely unaffected?
- How should legal room, scheduled contributions, feasible recurring capacity, projection shortfall, and account routing uncertainty constrain recommendations?
- What missing-data states should prevent confident tradeoff recommendations?
- What scenarios must Engineering later pass?

Constraints:
- Employer match remains Secure.
- Do not equate statutory room with available cash flow.
- Do not fabricate legal contribution capacity.
- Do not coordinate the initial recommendation with FFH-003 before independently reaching a conclusion.
