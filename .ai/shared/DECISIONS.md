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
1. HSA eligibility and coverage are person/tax-year legal facts; account existence cannot establish eligibility.
2. Each relevant month must be representable as eligible/ineligible/unknown and self-only/family/none-or-unknown, or lossless equivalent.
3. Person-year context carries Medicare timing, last-month-rule reliance/status, confirmation/version metadata, and future-period fact/assumption status.
4. Legacy `hsa_eligible` / `hsa_coverage_type` remain hints, never auto-promoted to full-year truth.
5. New legal facts default NULL/unknown; no optimistic backfill.
6. Partial-year HSA capacity is period-aware; unknown material months produce targeted `more_information_needed`.
7. Medicare timing can invalidate months and trigger recomputation/possible-excess warning; FFH does not invent corrective tax actions.
8. Last-month rule is explicit conditional treatment, never inferred from December eligibility.
9. Married-family ordinary allocation defaults equally absent another agreement; equal default is derived, not redundantly persisted.
10. Alternate married allocation is explicit, tax-year-bound, and constrained to the legal shared base.
11. Age-55 catch-up is owner-specific and nontransferable.
12. R4 uses owner ceilings rather than historical ordinary-vs-catch-up deposit labels once spouse ordinary allocation is known.
13. Employee/employer contributions consume one HSA ceiling; multiple HSA accounts do not multiply room; YTD is deducted once.
14. HSA YTD used in capacity math must be tax-year-bound or proven equivalent.
15. Newly confirmed person-year/month facts are the single authoritative legal source; legacy account hints cannot compete.
16. DB/runtime enums and null semantics must remain in parity through persistence -> loader -> normalized snapshot.
17. Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and Recommendation Refresh consume one normalized HSA contract.
18. Decision-relevant HSA changes trigger refresh/recomputation.
19. App/Data owns schema/persistence/capture/loader/normalized-input contract; Core Engine owns legal-capacity calculation after that contract is stable.
20. A full contribution-event ledger is future optional scope, not required for R3/R4.

Legacy/backward compatibility:
- additive migration only;
- preserve balances, ownership, and existing contribution meaning;
- no optimistic backfill or identity inference;
- no spouse-ineligibility inference from absence of an HSA account;
- no automatic tax-year carryforward;
- legacy rows may require reconfirmation before affirmative room is exposed.

Evidence:
- `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md`
- `.ai/policy/retirement/HANDOFF.md` (FFH-007)
- `.ai/engineering/app/HANDOFF.md` (FFH-008)
- `.ai/research/regulatory/HANDOFF.md`
- `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`

## FFH-D006 — MFJ spousal-IRA scarce-compensation capacity

Date: 2026-09-08
Related Tasks: FFH-005 R6, FFH-009
Status: APPROVED POLICY — IMPLEMENTATION REQUIRES MANAGER-ISSUED CORE ENGINE TASK

Decision:
When married filing jointly and supported IRA compensation is scarce, FFH must represent IRA legal capacity as owner constraints plus one shared joint-compensation feasible set. FFH must not pre-allocate scarce compensation by owner/person/account ID or present a deterministic routing split as statutory owner-specific room.

Approved rules:
1. Each spouse retains one age-appropriate combined Traditional + Roth IRA annual limit and actual YTD aggregated across all represented IRAs.
2. For unequal compensation, the higher-compensation spouse remains limited by that spouse's own supported compensation and individual IRA limit; the lower-compensation spouse may use joint compensation remaining after the other spouse's actual/current-plan IRA consumption, subject to the lower spouse's individual limit.
3. For equal compensation, neither spouse is manufactured as the lower spouse; each remains limited by that spouse's own supported compensation and individual limit.
4. Actual authoritative YTD reduces legal capacity exactly once. Active scheduled/current-plan allocations reserve planning capacity but are not relabeled as already-contributed YTD. Stale recommendations alone do not consume capacity.
5. The evaluator exposes owner **conditional maximum additional room** plus a shared MFJ-compensation remaining ledger/group. Conditional owner maxima are not additive independent household room.
6. One shared current-plan ledger must be consumed across applicable one-time, Build, Windfall, Your Plan, and hypothetical IRA routing so later consumers cannot recreate already-consumed compensation capacity.
7. Multiple Traditional/Roth IRA accounts do not multiply owner or shared capacity.
8. Direct Roth eligibility and Traditional IRA deductibility remain separate constraints; R6 changes compensation-capacity representation, not those tax rules.
9. Legal-capacity evaluation is owner-neutral and order-invariant. Existing approved financial/account routing factors apply first. If spouse IRA routes remain financially equivalent, scarce routed demand uses equal-fulfillment sharing; stable ID is only an unavoidable final-cent tie-break.
10. Unknown material spouse compensation, owner identity, account ownership, or aggregate spouse IRA YTD produces targeted `more_information_needed` for R6-dependent IRA capacity. Unknown is not converted to zero.
11. **No recorded IRA account is not proof of $0 spouse IRA YTD.** Current FFH retirement accounts are manually entered and the repository has no explicit account-inventory completeness certification. Therefore shared/spousal-enhanced room remains unresolved when a missing spouse YTD total could change the feasible set, unless a later authoritative completeness contract establishes zero/total contributions.
12. If authoritative YTD already exceeds supported individual/shared compensation ceilings, expose zero additional room for the affected group plus a high-severity possible-excess warning; do not invent correction mechanics or tax advice.
13. The existing supported IRA-compensation input keeps its documented product meaning. FFH-009 does not silently widen it to every statutory IRA-compensation category; any genuine data-definition gap must be routed separately.

Mathematical representation for unequal compensation (A higher than B):
- `C_joint = C_A + C_B`
- `sharedRemaining = max(0, C_joint - Y_A - Y_B)`
- `higherRemaining = max(0, min(L_A, C_A) - Y_A)`
- `lowerIndividualRemaining = max(0, L_B - Y_B)`
- `conditionalMaxAdditional_A = min(higherRemaining, sharedRemaining)`
- `conditionalMaxAdditional_B = min(lowerIndividualRemaining, sharedRemaining)`
- household maximum additional IRA compensation capacity = `min(sharedRemaining, higherRemaining + lowerIndividualRemaining)`

Evidence:
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`
- `.ai/policy/retirement/HANDOFF.md` (FFH-009)
- `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`
- `app/financial-profile/actions.ts` confirms retirement accounts are manually added/updated and provides no inventory-completeness certification.

Consequences:
- R6 policy ambiguity is resolved; production remediation remains required.
- Core Engine must replace the current sorted-owner compensation allocation with owner + shared-capacity ledger semantics under a narrow future task.
- Because current FFH account inventory is not certified complete, a missing spouse IRA record cannot be used as an authoritative zero-YTD fact.
- R6 remains merge-blocking until implementation and later independent audit.

Rejected alternatives:
- fixed first-owner/second-owner compensation allocation;
- treating conditional owner maxima as independently additive room;
- inferring zero YTD from absence of a manually entered IRA account;
- using ID/order as a legal-capacity rule;
- mixing compensation capacity with Roth eligibility or deductibility;
- treating planned recommendations as already-contributed YTD.

Revisit condition:
Revisit if authoritative law changes, FFH later introduces an explicit complete account/contribution inventory contract, or audit demonstrates that the shared-ledger representation does not preserve the approved feasible set.
