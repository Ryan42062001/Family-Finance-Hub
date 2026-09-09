# Retirement & Tax-Advantaged Policy Analyst Handoff

HANDOFF

Task ID: FFH-004

Role: Retirement & Tax-Advantaged Policy Analyst

Status: COMPLETE — READY FOR MANAGER SYNTHESIS

Verified starting state: This continuation refreshed canonical state on `phase-5-money-priority-engine` at `f6a138e78083afe6bdf83bc42117c705bda9ca09`. Repository comparison verified that since the prior FFH-004 checkpoint the branch advanced through `main` freshness reconciliation plus role-owned FFH-003/FFH-005 documentation; no Phase 5A/5B production calculation file was changed by that delta. Canonical PROJECT_STATE/ROADMAP/DECISIONS/WORKFLOW, Manager ACTIVE_ASSIGNMENTS, this role's prior handoff/policy artifact, the current Phase 5A retirement-floor documentation/source, the current Phase 5B Goal Intelligence documentation/source, and FFH-005 Regulatory Research were refreshed.

Assigned objective: Independently define the retirement side of Phase 5C goal-versus-retirement competition, including protected retirement dollars, employer match, Phase 5A floor behavior, BEHIND / ON_TRACK / AHEAD implications, legally routable versus desirable saving, legitimate goal competition, retirement flexibility, tax-advantaged opportunity cost, uncertainty, user preferences, determinism, and scenario acceptance cases. Do not write production code or resolve Goals Policy outside this domain.

Work completed:
- Revalidated the existing independent FFH-004 policy in `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md` against current Phase 5A/5B repository state.
- Confirmed the core retirement-side conclusion remains unchanged: Secure employer match and the Phase 5A protected retirement floor are non-contestable inside ordinary Build goal competition; only above-floor retirement is contestable.
- Added `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md` to incorporate FFH-005's verified 2026 regulatory findings into Phase 5C uncertainty and tax-advantaged opportunity-cost policy.
- Refined policy so only verified, legally routable remaining tax-advantaged room may strengthen additional-retirement opportunity cost.
- Added explicit treatment for FFH-005 mismatch/model-gap candidates affecting SIMPLE catch-up room, governmental 457(b) Roth catch-up routing, HSA month-sensitive eligibility, and HSA YTD ordinary/catch-up attribution classification.
- Added user-preference boundaries, deterministic policy requirements, four new worked regulatory-edge scenarios, and fifteen future Engineering acceptance scenarios.
- Did not use FFH-003's Goals Policy conclusion as a policy input. A repository comparison exposed that FFH-003 artifacts now exist, but cross-policy reconciliation remains Manager-owned.

Evidence produced:
- Existing independent policy artifact: `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`.
- FFH-005-informed refresh artifact: `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`.
- Refresh artifact commit: `aa1bd21c67162e239fbe73c0cc85d80236ca990f`.
- Repository source evidence from `docs/PHASE_5_MONEY_PRIORITY_ENGINE.md`, `lib/calculations/money-priority-retirement-floor.ts`, `lib/calculations/money-priority-goal-intelligence.ts`, and `.ai/research/regulatory/HANDOFF.md`.

Tests / validation actually performed: No production tests were run because FFH-004 is policy/documentation-only and changed no production code. Validation consisted of canonical-state refresh, branch/delta inspection, direct Phase 5A/5B specification/source review, prior FFH-004 policy revalidation, FFH-005 evidence classification, and deterministic scenario analysis. No runtime or test-pass claim is made by this role.

Files updated:
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md` — created.
- `.ai/policy/retirement/HANDOFF.md` — refreshed.

Open findings:
1. Manager must define the exact Goal Intelligence evidence threshold that may outrank/co-prioritize with additional retirement for BEHIND / ON_TRACK / AHEAD households.
2. Manager must define deterministic tie/co-priority behavior.
3. Manager must decide whether any explicitly verified account-timing rule becomes a Phase 5C tie-break; FFH-004 does not invent contribution-deadline/carryforward rules.
4. Manager must decide whether a truly essential goal unable to coexist with the protected floor remains explicit Build infeasibility or is classified through another required/Secure path.
5. FFH-005 R1/R2/R3 require Manager disposition before affected SIMPLE/457(b)/HSA capacity is treated as fully verified Phase 5C opportunity.
6. FFH-005 R4 shows HSA ordinary-versus-catch-up YTD attribution is a product/modeling choice rather than a verified statutory labeling requirement; Manager must decide whether to retain or revise the conservative block.

Blocking issues: None for Manager synthesis. Phase 5C remains blocked from Engineering until Manager synthesizes FFH-003, FFH-004, and FFH-005, records approved durable policy, and disposes of material legal-capacity findings that affect implementation requirements.

Unverified items:
- Household-specific retirement plan terms and actual account feature availability.
- Any contribution timing/carryforward rule not explicitly verified in FFH-005.
- Final Manager-approved cross-domain goal-versus-retirement relationship mapping.
- Whether current persisted `hsa_eligible` semantics intentionally mean full-year/last-month-rule-qualified eligibility; FFH-005 found the schema does not establish that by itself.

Recommended next role: Manager / Architect.

Exact next action: Manager reads `PHASE_5C_RETIREMENT_POLICY.md`, `FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`, the independent FFH-003 Goals Policy artifact, and FFH-005 Regulatory Research; resolves the cross-domain/open regulatory-model questions; records the approved Phase 5C durable policy and acceptance criteria; then authorizes only the necessary Engineering/remediation tasks.

Checkpoint / SHA: Refresh artifact commit `aa1bd21c67162e239fbe73c0cc85d80236ca990f`; this HANDOFF update creates a later documentation-only commit that must be verified after write.

Policy classification:
- Employer match remains Secure/non-contestable: ESTABLISHED FFH PROJECT POLICY.
- Existing Phase 5A normal/AHEAD/corrective/employee-guardrail structure: ESTABLISHED FFH PROJECT POLICY.
- Protected retirement floor cannot be reduced by ordinary goal competition: PROPOSED FFH PROJECT POLICY.
- Only retirement above the floor is contestable: PROPOSED FFH PROJECT POLICY.
- Tax-advantaged room is secondary opportunity-cost evidence, not mandatory maxing: PROPOSED FFH PROJECT POLICY.
- FFH-005 SIMPLE / governmental 457(b) / HSA findings relied upon in the refresh: VERIFIED CURRENT EXTERNAL FACTS as recorded by Regulatory Research.
- Conservative exclusion of affected unverified/mismodeled capacity from confident Phase 5C opportunity: PROPOSED FFH PROJECT POLICY.
- User preferences can alter contestable retirement but cannot rewrite Secure match or the protected floor in the Recommended Plan: PROPOSED FFH PROJECT POLICY.

Retirement invariants established:
- employer match cannot be reduced by ordinary goal competition;
- protected retirement floor cannot be reduced by ordinary goal competition;
- additional retirement cannot exceed verified routable legal room or remaining recurring Build capacity;
- legal room is not household cash-flow capacity;
- scheduled/YTD contributions cannot consume capacity twice;
- projection shortfall cannot manufacture legal room;
- unknown or mismatch-candidate capacity cannot become false zero room or false positive room;
- one-time cash and recurring capacity remain distinct;
- structural retirement shortfall remains visible;
- satisfied protected need stops consuming protected allocation;
- user preference cannot rewrite the authoritative Recommended Plan's match/floor safeguards;
- equivalent normalized inputs must remain deterministic and order-invariant.

Scenarios evaluated: Original 10 FFH-004 scenarios plus 4 new FFH-005-informed scenarios covering mismatch-candidate SIMPLE room, governmental 457(b) Roth catch-up routing uncertainty, HSA annual/full-year eligibility ambiguity, and HSA YTD attribution modeling uncertainty.

External facts relied upon: FFH-005 Regulatory Research's verified current 2026 findings and primary-source classifications. No new statutory figure was independently asserted by FFH-004.

External facts still required: Any account-specific timing/carryforward rule Manager wants to use as a Phase 5C tie-break, household-specific plan feature/limit documentation, and any additional legal fact needed to resolve affected capacity cases.

Implementation readiness: READY FOR MANAGER SYNTHESIS. NOT READY FOR ENGINEERING until Manager approval and required regulatory-model dispositions.
