# Goals, Cash Flow & Allocation Policy Analyst Handoff

HANDOFF

Task ID: FFH-003
Role: Goals, Cash Flow & Allocation Policy Analyst
Status: ASSIGNED
Verified starting state: Phase 5A Hybrid Retirement Floor and Phase 5B Goal Intelligence exist on the active Phase 5 branch. Repository documentation states Phase 5B does not change Build economics and that Phase 5C will later consume Goal Intelligence when actual goal-versus-retirement allocation competition is intentionally introduced.
Assigned objective: Produce an implementation-ready Goals/Cash Flow policy for Phase 5C without writing production code.
Work completed: None yet.
Evidence produced: Manager task specification in `.ai/manager/ACTIVE_ASSIGNMENTS.md`.
Tests / validation actually performed: None by this role yet.
Files updated: None by this role yet.
Open findings: Phase 5C policy is not repository-approved. Prior chat designs are non-canonical until reviewed.
Blocking issues: None after FFH-001 bootstrap. Regulatory facts must not be invented; identify dependencies for FFH-005 where needed.
Unverified items: Any external statutory rule not already authoritatively verified; any prior chat-only Phase 5C design.
Recommended next role: Manager / Architect for synthesis with FFH-004 and FFH-005.
Exact next action: Refresh canonical `.ai` state and repository Phase 5A/5B docs/code, perform the independent policy analysis, persist the result in this role directory, and update this handoff.
Checkpoint / SHA: Not verified in this session.

Policy questions to resolve:
- Which Goal Intelligence evidence can legitimately cause goal funding to outrank, tie, or remain below additional retirement?
- How should core need versus desired target affect allocation?
- How do deadline flexibility, consequence severity, schedule state, debt exposure, and target reasonableness interact without becoming a magic score?
- Which goal dollars are protected/required versus important versus optional?
- How are funded/satisfied goals and missing evidence handled?
- What scenarios must Engineering later pass?

Constraints:
- Preserve Secure/emergency/debt protections.
- Preserve one-time versus recurring capacity and residual-needs invariants.
- Do not invent statutory limits.
- Do not coordinate the initial recommendation with FFH-004 before independently reaching a conclusion.
