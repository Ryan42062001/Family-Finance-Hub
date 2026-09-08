# Goals, Cash Flow & Allocation Policy Analyst Handoff

HANDOFF

Task ID: FFH-003
Role: Goals, Cash Flow & Allocation Policy Analyst
Status: COMPLETE — MANAGER SYNTHESIS REQUIRED
Verified starting state: This session initially refreshed `phase-5-money-priority-engine` at Manager-bootstrap head `711b7e895dc9cd29283af9c981cfcbe15cb4db63` and verified the canonical `.ai` state, FFH-003 assignment, Phase 5A retirement-floor documentation/code, Phase 5B Goal Intelligence documentation/code, current Build allocator, snapshot contract, Goal Intelligence tests, and residual-needs pipeline. During the independent analysis the branch advanced through concurrent FFH-004 role-owned documentation and FFH-002 branch reconciliation. FFH-002's verified reconciliation checkpoint `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe` merged current `main` and reported no production financial-engine change; its subsequent handoff commit was `d4c23cdeb7e579196c330ffa112b0330420aa6e2`. FFH-003 then persisted its policy artifact at `01842189382c6be52d02c05cce0649dff8cfbb8e` on top of that current branch state.
Assigned objective: Produce an implementation-ready Goals/Cash Flow policy for Phase 5C without writing production code. Define when Goal Intelligence may cause goal funding to outrank, share priority with, or remain below additional retirement while preserving Secure, retirement-floor, one-time/recurring, and residual-needs safeguards.
Work completed: Produced the independent Goals-side Phase 5C specification in `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`. The recommendation makes competition tranche-based: remaining essential/important core need is separated from desired-solution excess; only qualified core tranches may outrank or share priority with additional retirement; optional and desired-excess dollars remain below additional retirement. The Goals-side policy treats Phase 5A protected retirement floor and Secure employer-match/reserve/debt protections as outside this competition pending Manager synthesis. It defines explicit OUTRANK / CO_PRIORITY / BELOW / MORE_INFORMATION_NEEDED relationships without a magic score; proposes proportional equal-fulfillment-ratio allocation for true co-priority scarcity; defines schedule-state, target-reasonableness, borrowing/debt-exposure, missing-data, order-invariance, one-time/recurring, and residual-needs behavior; and provides 14 worked scenarios plus 22 future Engineering acceptance scenarios.
Evidence produced: Repository-grounded analysis from canonical `.ai` state; `docs/PHASE_5_MONEY_PRIORITY_ENGINE.md`; `lib/calculations/money-priority-goal-intelligence.ts`; `money-priority-goal-intelligence.test.ts`; `money-priority-build.ts`; `money-priority-retirement-floor.ts`; `money-priority-snapshot.ts`; and `money-priority-residual-needs.ts`. Policy artifact commit: `01842189382c6be52d02c05cce0649dff8cfbb8e`.
Tests / validation actually performed: No production tests were run because FFH-003 is policy/documentation-only and changed no production code. Validation performed was repository inspection, cross-check against canonical Phase 5A/5B boundaries, residual-accounting review, branch-staleness/concurrency checks, and deterministic scenario analysis. No runtime/test pass claim is made by this role.
Files updated: `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`; `.ai/policy/goals/HANDOFF.md`.
Open findings: Manager must arbitrate four policy questions during synthesis: (1) whether any extraordinary essential-goal exception can ever penetrate the Phase 5A protected retirement floor; (2) whether the narrow Important + Preservation + Fixed/Limited + High/Critical case should remain true co-priority or stay retirement-junior; (3) whether materially ambiguous essential-core competition should temporarily leave contested capacity unallocated or use an explicit retirement-first uncertainty fallback; and (4) whether `behind` schedule state should be an approved lower-order goal-to-goal tie-break or explanation-only.
Blocking issues: Phase 5C production implementation remains blocked on Manager synthesis of FFH-003 with the independent FFH-004 Retirement Policy analysis and FFH-005 Regulatory Research. FFH-003 intentionally did not read/adopt FFH-004's recommendation before completing its independent conclusion.
Unverified items: Any current statutory retirement/HSA limit or tax rule; FFH-003 makes no statutory claims. Final retirement-side protected-floor/account-routing semantics remain Manager/FFH-004/FFH-005 territory. No Phase 5C policy is canonical until Manager approves the synthesis.
Recommended next role: Manager / Architect.
Exact next action: Manager reads `FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`, compares it with the independent FFH-004 and FFH-005 artifacts, resolves the four cross-domain questions, records the approved Phase 5C durable policy/acceptance criteria, and only then authorizes Engineering.
Checkpoint / SHA: `01842189382c6be52d02c05cce0649dff8cfbb8e` (verified FFH-003 policy-artifact commit; this HANDOFF update is a subsequent role-owned documentation commit).

Key policy recommendation:
- Compete by goal funding tranche, not whole-goal label.
- Existing balance and one-time deployments satisfy core need first for priority analysis.
- Only confirmed core tranches may outrank/share priority with additional retirement.
- Essential core + material urgency + material harm may outrank additional retirement.
- Essential core with material but lesser urgency/harm may share priority.
- Narrow Important preservation cases may share priority.
- Optional goals and all desired-solution excess remain below additional retirement regardless of fixed preference dates or expensive financing.
- True co-priority scarcity uses equal fulfillment ratio across tied requests, with stable ID only for final-cent reconciliation.
- Missing information blocks only the contested decision that depends on it.
- One-time cash, scheduled future funding, recurring capacity, current balance, and residual need remain distinct.
