# Family Finance Hub — Durable Decisions

Last refreshed: 2026-09-08

This file records durable product/architecture/policy decisions future employees must know. Routine implementation trivia does not belong here.

## FFH-D001 — Repository-first AI operating model

Date: 2026-09-08
Related Task: FFH-001
Status: APPROVED

Decision:
Family Finance Hub uses the repository-persisted `.ai` workflow as canonical team state. Actual repository/runtime/test/branch evidence outranks conversation summaries and assumptions. Specialist chats must refresh repository state before continuing work.

Rationale:
The project spans long-running branches, many implementation checkpoints, multiple AI employees, and evolving financial policy. Chat-only continuity is too easy to stale or contradict.

Evidence:
- Shared Team Operating Contract supplied by the project owner.
- Manager bootstrap found that the canonical `.ai` workflow did not yet exist.

Rejected alternatives:
- continue carrying large context blocks manually between chats;
- treat conversation memory as equivalent to repository state.

Consequences:
- Manager owns `.ai/shared/*`.
- active work is tracked with FFH Task IDs and role handoffs.
- unpersisted designs remain non-canonical until reviewed and approved.

Revisit condition:
Only if the project adopts a stronger durable source-of-truth mechanism that preserves the same or better auditability and role separation.

## FFH-D002 — Preserve policy / regulatory / engineering / audit separation

Date: 2026-09-08
Related Task: FFH-001
Status: APPROVED

Decision:
Regulatory Research determines current external rules; Policy specialists determine recommended behavior within those constraints; Manager approves durable product policy; Engineering implements approved behavior; Technical and Policy Auditors independently validate completed work. Engineering must not invent financial policy, and Regulatory Research must not define product preference.

Rationale:
Financial correctness requires clear separation between statutory truth, product policy, implementation, and independent verification.

Evidence:
- Shared Team Operating Contract and Manager role specification.

Rejected alternatives:
- letting Builders choose policy during implementation;
- treating passing tests as proof of financial-policy correctness;
- treating plausible financial output as proof of code correctness.

Consequences:
- high-impact Phase 5C policy is routed through independent Policy analyses plus Regulatory Research before implementation.
- dual audit remains a merge gate where required.

Revisit condition:
Only if the permanent team structure itself is deliberately redesigned.

## FFH-D003 — Phase 5C requires current repository-backed policy approval

Date: 2026-09-08
Related Task: FFH-PW-001
Status: SUPERSEDED BY FFH-D004 FOR PHASE 5C

Decision:
Phase 5C and later refinements discussed outside the repository were classified as PROPOSED / NOT APPROVED for production implementation until current specialist analyses were persisted, reconciled, and approved by Manager.

Rationale:
The verified Phase 5 repository documented Phase 5A Hybrid Retirement Floor and Phase 5B Goal Intelligence, but did not contain a current approved Phase 5C specification at bootstrap.

Evidence:
- `docs/PHASE_5_MONEY_PRIORITY_ENGINE.md`.
- FFH-001 repository inspection.

Consequences:
- FFH-003, FFH-004, and FFH-005 were completed before Manager synthesis.
- Phase 5D+ remains unapproved unless separately reviewed and approved.

Revisit condition:
Phase 5C approval occurred through FFH-D004. Later refinements still require explicit approval.

## FFH-D004 — Phase 5C recurring goal-versus-retirement competition

Date: 2026-09-08
Related Tasks: FFH-003, FFH-004, FFH-005
Status: APPROVED POLICY — IMPLEMENTATION NOT YET AUTHORIZED WHILE KNOWN PHASE 5 REGULATORY BLOCKERS REMAIN

Decision:
Phase 5C governs **recurring Build capacity only** and may compete only with **additional retirement opportunity above the Phase 5A protected retirement floor**. Secure-stage protections and the protected retirement floor remain non-contestable inside ordinary goal competition.

Approved rules:

1. **Protected floor boundary**
   - Employer-match capture and other authoritative Secure protections remain outside Phase 5C competition.
   - Ordinary goals may not reduce the Phase 5A protected retirement floor.
   - If a materially urgent essential goal cannot coexist with the protected floor, FFH must expose the constraint/infeasibility; it must not silently raid the floor or silently reclassify the goal as Secure. Any future required-obligation/Secure reclassification requires its own approved policy task.

2. **Tranche-based competition**
   - Goal competition is based on the remaining **core-need tranche**, not the whole desired target.
   - Existing balance and prior eligible one-time deployment reduce residual core need exactly once.
   - Desired-solution excess above a confirmed core need remains below additional retirement.
   - Optional/lifestyle goal dollars remain below additional retirement regardless of a self-imposed deadline or expensive financing.

3. **Cross-domain dispositions**
   Each nonzero recurring goal tranche is classified as one of:
   - `OUTRANKS_ADDITIONAL_RETIREMENT`
   - `CO_PRIORITY_WITH_ADDITIONAL_RETIREMENT`
   - `BELOW_ADDITIONAL_RETIREMENT`
   - `MORE_INFORMATION_NEEDED`

4. **Outrank rule — all retirement statuses**
   Only a confirmed Essential core tranche with known core amount and usable recurring pace may outrank additional retirement, and only when both are present:
   - material urgency: Fixed deadline **or** Critical consequence; and
   - material harm: High/Critical consequence **or** High debt exposure.

5. **Co-priority rule for Essential core tranches**
   If an Essential core tranche does not satisfy the outrank test, it is co-priority when the evidence is confirmed, the core amount and recurring pace are usable, and at least one is present:
   - Limited deadline;
   - Moderate/High/Critical consequence; or
   - Moderate/High debt exposure.

6. **Important core tranches are status-sensitive**
   - For `BEHIND` households, Important goal tranches remain below additional retirement. This preserves the strongest above-floor retirement opportunity-cost preference while the household still has a projected shortfall.
   - For `ON_TRACK` and `AHEAD` households, an Important core tranche may be co-priority only when all are true: confirmed evidence, known core amount, Preservation or Mixed nature, Fixed or Limited deadline, and High or Critical consequence.
   - Important goal tranches never outrank additional retirement under Phase 5C V1.

7. **AHEAD does not erase guardrails**
   AHEAD status lowers the protected floor through existing Phase 5A policy and therefore naturally frees more contestable capacity. It does not promote Optional goals, desired-solution excess, or weakly evidenced goals above retirement.

8. **Co-priority scarcity**
   True co-priority requests share scarce recurring capacity by an equal fulfillment ratio across the approved additional-retirement request and each tied goal-core request. Stable ID may resolve only an unavoidable final-cent remainder. Array order and display names may not determine substantive allocation.

9. **Missing information**
   Materially missing evidence blocks only the contested tradeoff that depends on it. Contested capacity remains explicitly unresolved rather than being silently assigned to either the goal or additional retirement. Independently known Secure/protected-floor/unrelated allocations continue.

10. **Schedule state**
    - funded: request $0;
    - on-track/behind: use recalculated required pace;
    - `behind` is explanation/schedule evidence in Phase 5C V1 and does not itself promote a tranche across the retirement boundary;
    - past-due/invalid pace: do not divide by zero or fabricate a one-month catch-up; return targeted decision/information-needed state.

11. **No generic tax-timing tie-break in Phase 5C V1**
    Regulatory Research verified account-specific timing/rule differences, not one universal timing rule appropriate for all retirement accounts. Phase 5C V1 therefore does not add a generic tax-advantaged deadline tie-break. Existing authoritative account routing and legal-capacity logic remain separate from competition amount.

12. **Resource separation and reconciliation**
    One-time cash, recurring Build capacity, scheduled contributions, YTD contributions, statutory room, residual goal need, protected-floor demand, and additional retirement opportunity remain distinct. No dollar may be consumed twice, and allocations plus residual capacity must reconcile to the cent.

Rationale:
FFH-003 and FFH-004 independently agreed that ordinary goal competition must not erase Phase 5A’s protected retirement floor and that only above-floor retirement is contestable. Goals Policy provided tranche-based necessity/core evidence and proportional tie semantics; Retirement Policy required stronger opportunity-cost protection for BEHIND households. The approved status-sensitive Important-goal rule resolves that tension without introducing a magic score. The design preserves FFH’s product principle that legitimate life goals need not wait until every tax-advantaged account is maxed while still protecting retirement trajectory and Secure safeguards.

Evidence:
- `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`
- `.ai/policy/goals/HANDOFF.md`
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`
- `.ai/policy/retirement/HANDOFF.md`
- `.ai/research/regulatory/HANDOFF.md`
- existing Phase 5A/5B repository behavior and invariants.

Rejected alternatives:
- allow essential goal records to penetrate the protected retirement floor inside ordinary Build;
- treat every fixed deadline as sufficient to beat retirement;
- let Optional or desired-solution excess inherit Essential-core priority;
- use winner-take-all or array-order behavior for true ties;
- use `behind` schedule state alone to upgrade cross-domain priority;
- assign uncertain contested capacity automatically to retirement or goals;
- introduce a generic tax-year deadline tie-break unsupported across all account types.

Consequences:
- Phase 5C policy is now canonical and may be used by future Engineering once Manager clears known pre-existing regulatory correctness blockers and explicitly issues an implementation task.
- Existing retirement-account routing remains authoritative; Phase 5C decides recurring competition amount, not statutory capacity or destination.
- Phase 5D+ remains unapproved.

Revisit condition:
Revisit only if audits expose policy incoherence, regulatory changes materially alter the tradeoff, user evidence shows unacceptable behavior, or a future approved milestone intentionally redesigns the retirement/goal competition model.
