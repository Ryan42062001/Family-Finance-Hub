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

## FFH-D003 — Phase 5C is not yet production-approved

Date: 2026-09-08
Related Task: FFH-PW-001
Status: APPROVED

Decision:
Phase 5C and later refinements discussed outside the repository are classified as PROPOSED / NOT APPROVED for production implementation until current specialist analyses are persisted, reconciled, and approved by Manager.

Rationale:
The verified Phase 5 repository documents Phase 5A Hybrid Retirement Floor and Phase 5B Goal Intelligence, and explicitly states that Phase 5C will later consume Goal Intelligence when allocation competition is introduced. The repository does not contain a current approved Phase 5C specification.

Evidence:
- `docs/PHASE_5_MONEY_PRIORITY_ENGINE.md` on `phase-5-money-priority-engine`.
- repository inspection at the FFH-001 bootstrap checkpoint.

Rejected alternatives:
- infer Phase 5C behavior from old chat memory;
- have Engineering reconstruct policy from partial implementation context.

Consequences:
- FFH-003, FFH-004, and FFH-005 must complete before Manager authorizes Phase 5C implementation.

Revisit condition:
When Manager synthesizes the specialist handoffs and records an approved Phase 5C policy decision.
