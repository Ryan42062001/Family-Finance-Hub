# Family Finance Hub — Durable Decisions

Last refreshed: 2026-09-08

This file records durable product, architecture, workflow, and financial-policy decisions future employees must know. Repository/runtime/test evidence outranks summaries.

## FFH-D001 — Repository-first AI operating model

Date: 2026-09-08
Related Task: FFH-001
Status: APPROVED

Decision:
Family Finance Hub uses the repository-persisted `.ai` workflow as canonical team state. Actual repository/runtime/test/branch evidence outranks conversation summaries and assumptions. Specialist chats must refresh repository state before continuing work.

Consequences:
- Manager owns `.ai/shared/*`.
- active work is tracked with FFH Task IDs and role handoffs.
- unpersisted designs remain non-canonical until reviewed and approved.

## FFH-D002 — Preserve policy / regulatory / engineering / audit separation

Date: 2026-09-08
Related Task: FFH-001
Status: APPROVED

Decision:
Regulatory Research determines current external rules; Policy specialists determine desired behavior within those constraints; Manager approves durable product policy; Engineering implements approved behavior; Technical and Policy Auditors independently validate completed work. Engineering must not invent financial policy and Regulatory Research must not define product preference.

Consequences:
- high-impact financial changes require explicit policy/research evidence before implementation;
- passing tests do not substitute for independent audit;
- dual audit remains a Phase 5 merge gate.

## FFH-D003 — Phase 5C requires repository-backed approval

Date: 2026-09-08
Related Task: FFH-PW-001
Status: SUPERSEDED BY FFH-D004 FOR PHASE 5C

Decision:
Chat-only Phase 5C+ ideas were non-canonical until current specialist analyses were persisted and Manager approved them. Phase 5C is now governed by FFH-D004. Phase 5D+ remains unapproved unless separately reviewed.

## FFH-D004 — Phase 5C recurring goal-versus-retirement competition

Date: 2026-09-08
Related Tasks: FFH-003, FFH-004, FFH-005
Status: APPROVED POLICY — IMPLEMENTATION STILL REQUIRES EXPLICIT ENGINEERING TASK

Decision:
Phase 5C governs recurring Build capacity only and competes only with additional retirement opportunity above the Phase 5A protected retirement floor. Secure protections and the protected retirement floor are non-contestable inside ordinary goal competition.

Approved rules:
1. Employer-match capture and authoritative Secure protections remain outside Phase 5C.
2. Ordinary goals may not reduce the Phase 5A protected retirement floor. A goal/floor conflict is exposed as a constraint; no silent Secure reclassification or floor raid.
3. Goal competition is tranche-based: remaining core need is distinct from desired-solution excess. Existing balance and eligible one-time deployment reduce residual core need exactly once.
4. Optional/lifestyle dollars and desired-solution excess remain below additional retirement regardless of self-imposed deadlines or expensive financing.
5. Each nonzero recurring tranche is `OUTRANKS_ADDITIONAL_RETIREMENT`, `CO_PRIORITY_WITH_ADDITIONAL_RETIREMENT`, `BELOW_ADDITIONAL_RETIREMENT`, or `MORE_INFORMATION_NEEDED`.
6. OUTRANK requires confirmed Essential core need, known core amount, usable recurring pace, material urgency (Fixed deadline or Critical consequence), and material harm (High/Critical consequence or High debt exposure).
7. Essential core tranches not meeting OUTRANK are CO_PRIORITY when confirmed and at least one of Limited deadline, Moderate/High/Critical consequence, or Moderate/High debt exposure applies.
8. Important core tranches remain below additional retirement for BEHIND households. For ON_TRACK/AHEAD, an Important core tranche may be CO_PRIORITY only when confirmed, core amount known, nature Preservation/Mixed, deadline Fixed/Limited, and consequence High/Critical. Important never OUTRANKS in V1.
9. AHEAD status changes the protected floor through Phase 5A; it does not promote weak/Optional/excess goals.
10. True CO_PRIORITY scarcity uses one equal-fulfillment ratio across the actionable additional-retirement request and every co-priority goal-core request. Stable ID may resolve only final-cent remainder.
11. Multiple OUTRANK goal tranches use deterministic lexicographic financial ordering, then lower-order user priority only after financial factors tie, then stable ID. Array order/display name never decide substantive allocation.
12. User priority cannot change necessity, core amount, deadline flexibility, consequence, debt exposure, pace, cross-domain disposition, Secure/floor boundaries, or co-priority proportional shares.
13. `behind` is explanation/schedule evidence only for Phase 5C ranking. Funded requests are zero; past-due/invalid pace returns targeted decision/information-needed rather than fabricated catch-up.
14. Missing evidence blocks only the contested tradeoff that depends on it; contested capacity remains explicitly unresolved rather than silently assigned to retirement or goals.
15. No generic tax-timing tie-break is added in Phase 5C V1. Account routing/legal capacity remains a separate authoritative step.
16. One-time cash, recurring capacity, scheduled contributions, YTD contributions, statutory room, residual need, protected-floor demand, and additional-retirement opportunity remain distinct; no dollar is consumed twice.
17. Prior recommendations/planned future contributions are not execution. Only authoritative later financial facts reduce principal. Actual funding satisfies remaining core need before desired excess for future priority analysis.

Evidence:
- `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`
- `.ai/policy/goals/FFH-003_REVALIDATION_ADDENDUM.md`
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`
- `.ai/research/regulatory/HANDOFF.md`

## FFH-D005 — HSA legal-capacity policy and data contract

Date: 2026-09-08
Related Tasks: FFH-005 R3/R4, FFH-007, FFH-008
Status: APPROVED — IMPLEMENTATION AUTHORIZED ONLY THROUGH MANAGER-ISSUED TASKS

Decision:
Family Finance Hub will replace the current account-level annual-boolean interpretation with a tax-year-bound, person-level, period-aware HSA legal-capacity model. The approved minimum-complete architecture is a person + tax-year profile plus month-level HSA eligibility/coverage facts (or an implementation proven lossless-equivalent representation). `retirement_accounts` remain HSA destinations/YTD sources, not the canonical home of person legal eligibility.

Approved policy/data rules:
1. **Person/tax-year authority.** HSA eligibility and coverage are legal facts about a person for a tax year/period. HSA account existence or absence cannot establish eligibility.
2. **Month-level basis.** The authoritative model must represent each relevant tax-year month as eligible/ineligible/unknown and self-only/family/none-or-unknown coverage, or an equivalent representation that reconstructs those facts without loss.
3. **Tax-year profile.** Person-year context must represent Medicare effective timing where relevant, last-month-rule reliance/status, confirmation/version metadata, and whether future-period values are confirmed facts or explicit planning assumptions.
4. **Legacy account fields.** Existing `hsa_eligible` and `hsa_coverage_type` remain legacy/current hints. Legacy `true` is not full-year certification; legacy `false` is not proof of zero tax-year capacity. They may not be auto-promoted into twelve affirmative months.
5. **Unknown defaults.** New legal-fact fields/rows default to NULL/unknown. No migration/backfill may silently create full-year eligibility, family coverage, Medicare absence, or last-month-rule qualification.
6. **Partial-year calculation.** Ordinary recommended HSA capacity uses period-aware eligibility/coverage. Unknown material months produce targeted `more_information_needed`, not optimistic room and not fabricated zero.
7. **Medicare.** Known Medicare effective timing makes affected months ineligible; material uncertainty produces targeted information-needed. Retroactive Medicare triggers recomputation; if YTD exceeds the corrected legal ceiling, expose no additional room and a high-severity possible-excess warning, not invented tax remediation.
8. **Last-month rule.** Never infer it from December eligibility. Default planning uses ordinary month-based capacity. The household may explicitly elect conditional last-month-rule treatment only when statutory prerequisites are represented; the output must carry testing-period risk and refresh when facts change.
9. **Married-family ordinary base.** Use the statutory equal spouse allocation by default absent another agreement. The equal default is derived, not duplicated across account rows.
10. **Alternate married allocation.** A household may explicitly record a different tax-year-bound spouse ordinary-base allocation within the legal shared base. Never infer the alternate split from account order, IDs, balances, income, or YTD. If equal-default allocation is incompatible with YTD but some legal alternate could fit, ask for the spouses' agreement instead of silently reallocating or declaring excess.
11. **Age-55 catch-up.** Catch-up remains owner-specific and nontransferable. A spouse without an HSA can affect family structure, but owner catch-up cannot be routed until an HSA destination exists.
12. **R4 owner-ceiling model.** Historical deposits do not need ordinary-vs-catch-up labels solely for capacity math. Once spouse ordinary allocation is known: `owner annual ceiling = allocated ordinary base + owner-specific catch-up`; `owner remaining room = max(0, owner annual ceiling - aggregate employee/employer HSA YTD for that owner)`. Enforce both owner ceilings and the couple-wide legal maximum.
13. **Employee/employer sharing.** Employee and employer HSA contributions consume the same statutory ceiling; multiple HSA accounts do not multiply room. YTD is deducted exactly once.
14. **YTD tax-year binding.** Implementation must explicitly bind the HSA YTD values used for legal-capacity math to the same tax year as the person-period basis, or prove an equivalent current-year contract. Stale/unbound YTD cannot be treated as verified current-year legal consumption.
15. **Single source of truth.** Newly confirmed person-year/month data becomes authoritative. Legacy account eligibility/coverage may remain visible for transition but cannot compete as an independent legal source.
16. **Runtime/database parity.** DB constraints/enums and runtime unions must agree; null/unknown must survive persistence -> loader -> normalized snapshot; same persisted facts must reload to the same capacity basis.
17. **Downstream parity.** Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and Recommendation Refresh must consume one normalized HSA contract, not duplicate legal logic in the application layer.
18. **Recommendation refresh.** Changes to decision-relevant HSA person-year/month facts, Medicare timing, last-month-rule choice, married allocation, or verified YTD basis must invalidate/recompute affected recommendations.
19. **Role boundary.** Application/Data owns additive schema, persistence, capture UX/actions, Supabase loader, reload/RLS parity, and the normalized snapshot input contract. Core Engine owns HSA legal-capacity calculation/routing behavior against that approved contract. The shared snapshot contract must be established before Core Engine HSA implementation begins.
20. **No contribution-event overbuild.** A full contribution-event ledger is a possible future improvement but is not required to resolve R3/R4 now.

Approved architecture direction:
- canonical person/tax-year profile (conceptually `person_hsa_tax_year_profile`);
- canonical month records (conceptually `person_hsa_month_status`, max 12 per person/tax year);
- tax-year-bound explicit alternate married-family allocation only when the household chooses one;
- existing HSA accounts retain destination, owner, balance, schedule, and contribution/YTD roles;
- derived legal ceilings/remaining room remain runtime outputs, not persisted competing truth.

Legacy/backward-compatibility requirements:
- additive migration only;
- preserve account balances, ownership, and existing contribution values;
- no optimistic backfill;
- no owner inference from authenticated user/creator/account name/sole adult;
- no spouse-ineligibility inference from absence of an HSA account;
- no automatic carryforward of person/month HSA status into a later tax year;
- legacy rows may temporarily require targeted reconfirmation before new affirmative HSA room is exposed.

Evidence:
- `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md`
- `.ai/policy/retirement/HANDOFF.md` (FFH-007)
- `.ai/engineering/app/HANDOFF.md` (FFH-008)
- `.ai/research/regulatory/HANDOFF.md` and `FFH-005_REVALIDATION_ADDENDUM.md`

Rejected alternatives:
- silently reinterpret legacy `hsa_eligible=true` as full-year eligibility;
- keep eligibility authority duplicated independently on each HSA account;
- auto-apply the last-month rule;
- infer married allocation from IDs/YTD/account order;
- require historical ordinary-vs-catch-up deposit labels when owner ceilings suffice;
- persist a derived legal-room value as a competing source of truth;
- implement a richer contribution-event ledger solely to unblock R3/R4.

Consequences:
- R3/R4 policy/data ambiguity is resolved; production remediation remains required.
- Application/Data must establish the new persistence + normalized input contract before Core Engine implements the new HSA capacity calculation.
- FFH-009 may now begin because FFH-007 is complete.
- Phase 5 remains not merge-ready until HSA implementation is completed and independently audited with the other retirement-capacity remediations.

Revisit condition:
Revisit if authoritative HSA law changes, implementation shows the monthly representation cannot preserve required semantics, or audit discovers a material inconsistency. Implementation may choose equivalent table/field names but may not weaken these semantics without Manager approval.
