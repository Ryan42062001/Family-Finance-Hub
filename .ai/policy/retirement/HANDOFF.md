# Retirement & Tax-Advantaged Policy Analyst Handoff

HANDOFF

Task ID: FFH-007

Role: Retirement & Tax-Advantaged Policy Analyst

Status: COMPLETE — READY FOR MANAGER SYNTHESIS WITH FFH-008

Verified starting state: Session refresh verified `phase-5-money-priority-engine` at `71705039f0abf1945202631109975edeb5632920`. Canonical `.ai/shared/PROJECT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`, `WORKFLOW.md`, Manager `ACTIVE_ASSIGNMENTS.md`, this role's prior handoff, FFH-005 Regulatory Research/revalidation, current HSA capacity implementation, snapshot semantics, HSA tests, and persistence migration were read before policy writes. Manager state explicitly assigns FFH-007 and queues FFH-009 with a hard scheduling dependency on FFH-007.

Assigned objective: Resolve FFH-005 R3/R4 HSA legal-capacity policy/modeling questions without production code: define safe `hsa_eligible` semantics, partial-year/coverage/Medicare/last-month-rule behavior, targeted uncertainty, married-family ordinary allocation, ordinary-vs-catch-up YTD treatment, spouse catch-up ownership, legacy-record expectations, and scenario acceptance cases. Do not begin FFH-009.

Work completed:
- Created `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md` as the implementation-ready Retirement Policy recommendation.
- Defined HSA eligibility/coverage as person-and-tax-year legal facts rather than facts established by account existence.
- Determined that existing `hsa_eligible` / `hsa_coverage_type` must not silently be interpreted as full-year certification; preferred future semantics keep them as current/as-of or legacy hints while annual legal capacity uses period-aware tax-year facts or an explicit equivalent basis.
- Defined month/period-aware handling for partial-year eligibility, coverage changes, Medicare effective/retroactive dates, and unknown material months.
- Defined last-month rule as explicit conditional treatment: never inferred; household may elect to rely on it only within statutory constraints; result must carry testing-period risk rather than masquerading as ordinary full-year eligibility.
- Adopted the statutory equal married-family ordinary-base allocation as FFH's no-agreement default; an explicit alternate spouse allocation is permitted only within the legal shared base.
- Replaced R4's blanket historical ordinary-vs-catch-up deposit-label blocker with an owner-ceiling model once spouse ordinary allocation is known: owner ceiling = allocated ordinary base + owner-specific catch-up; owner YTD employee+employer contributions reduce that combined ceiling exactly once.
- Preserved spouse-specific age-55 catch-up ownership and multiple-HSA/YTD aggregation invariants.
- Defined targeted `more_information_needed` behavior when period facts, Medicare timing, spouse structure/allocation, or YTD inputs do not establish legal room.
- Defined conservative legacy policy: preserve balances/YTD/current fields, but do not backfill twelve months of eligibility/coverage from one legacy boolean/current coverage value; legacy rows require reconfirmation before new affirmative legal room is exposed.
- Defined user-preference boundaries and deterministic behavior.
- Analyzed 16 acceptance scenarios covering full-year, partial-year, coverage changes, Medicare/retroactivity, last-month rule, married-family allocation/catch-ups, alternate allocation, account absence, multiple HSAs, and legacy records.
- Did not start or analyze FFH-009 spousal-IRA policy.

Evidence produced:
- `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md`
- Policy artifact commit: `e0f637fdfa705a2d103bcee23e0f0e2d9bbd2b42`.
- Repository evidence inspected: `lib/calculations/money-priority-retirement-accounts.ts`, `money-priority-snapshot.ts`, `money-priority-retirement-accounts.test.ts`, `supabase/migrations/20260829223642_phase_5_ownership_and_planning_foundation.sql`, FFH-005 handoff/revalidation, and canonical `.ai` state.
- Authoritative evidence relied upon through FFH-005: IRS Rev. Proc. 2025-19, Publication 969, 2026 Publication 15-B, and Form 8889 mechanics. Specific HSA mechanics were also rechecked against current IRS Publication 969 / Rev. Proc. 2025-19 during this session; no contrary external fact was found.

Tests / validation actually performed: No production tests were run because FFH-007 is policy/documentation-only and production code was not changed. Validation consisted of repository-state refresh, direct HSA calculation/snapshot/schema/test inspection, consistency review against FFH-005 authoritative findings, 16 policy acceptance scenarios, and current IRS source cross-checking for month-sensitive eligibility, last-month rule/testing period, Medicare retroactivity, married-family equal default, catch-up ownership, and 2026 limits. No code-test or audit pass claim is made.

Files updated:
- `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md` — created.
- `.ai/policy/retirement/HANDOFF.md` — updated to this FFH-007 handoff.

Open findings:
- FFH-008 has not yet persisted its App/Data analysis in `.ai/engineering/app/` at the FFH-007 completion checkpoint, so exact schema/storage/UI choices remain for Manager synthesis after FFH-008.
- Manager must select the minimum lossless period representation (monthly facts, effective-dated intervals, or equivalent), persistence location for alternate married-family allocation, and legacy reconfirmation UX.
- Manager may decide whether projected future-month HSA capacity should be displayed distinctly from confirmed/actual-period capacity; the Retirement Policy principle is that projected inputs must be explicit and refreshable, not silently treated as historical facts.
- R1/R2 remain FFH-006 scope. R6/FFH-009 remains queued and untouched.

Blocking issues: None for completion of FFH-007. HSA production implementation remains blocked until Manager synthesizes FFH-007 with FFH-008 and issues an explicit Engineering task. Phase 5 remains not merge-ready while R1/R2/R3/R6 remediation is incomplete.

Unverified items:
- Exact future persistence/schema/UI representation because FFH-008 is still outstanding.
- Household-specific HSA plan/coverage facts.
- No post-FFH-007 CI result is claimed; this task changes documentation only.

Recommended next role: Manager / Architect after FFH-008 completes. Manager should synthesize the policy and persistence/runtime contract and authorize HSA implementation. Under the current scheduling rule, FFH-009 may be activated for this Retirement Policy role only after this FFH-007 completion is recognized by Manager/canonical assignment state.

Exact next action: Manager reads `FFH-007_HSA_LEGAL_CAPACITY_POLICY.md` with FFH-008's eventual handoff, records the approved HSA legal-capacity/data-contract decision, and issues implementation work. Do not infer implementation authorization from this policy handoff alone.

Checkpoint / SHA: FFH-007 policy artifact commit `e0f637fdfa705a2d103bcee23e0f0e2d9bbd2b42`; this HANDOFF update creates a subsequent documentation-only commit whose exact SHA must be verified after write.

Policy classification:
- 2026 HSA self-only/family limits, age-55 catch-up ownership, monthly eligibility/coverage, Medicare effects, last-month rule/testing period, employer contribution treatment, married-family equal-default rule: STATUTORY / VERIFIED CURRENT EXTERNAL FACT through FFH-005 authoritative evidence.
- Historical ordinary-vs-catch-up deposit labeling is not a verified statutory prerequisite: VERIFIED CURRENT EXTERNAL FACT / R4 classification.
- Person/tax-year period model, current-field semantics, targeted uncertainty, R4 owner-ceiling replacement, legacy handling, deterministic routing boundary: PROPOSED FFH PROJECT POLICY pending Manager approval.
- Alternate married-family ordinary allocation and explicit last-month-rule reliance: USER-CONFIGURABLE PREFERENCE within statutory constraints.
- Exact schema/field/UI design: PRODUCT/DATA DESIGN CHOICE for Manager + FFH-008/Engineering.

Retirement invariants established:
- HSA account existence cannot create person eligibility.
- Current annual boolean/current coverage cannot silently become twelve-month legal facts.
- One ordinary married-family base cannot be counted twice.
- Spouse age-55 catch-ups are owner-specific and nontransferable.
- Multiple HSAs cannot multiply capacity.
- Employee and employer contributions consume one legal ceiling and YTD is deducted exactly once.
- Unknown material period/Medicare/spouse-allocation facts cannot create optimistic room.
- Legal capacity remains distinct from retirement need, cash-flow capacity, HSA long-term intent, and account routing.
- Legacy unknowns are not backfilled optimistically.
- Equivalent facts in different account/order arrangements produce the same legal capacity.

Scenarios evaluated: 16 acceptance scenarios in the FFH-007 artifact.

External facts relied upon: FFH-005 Regulatory Research/revalidation and its authoritative IRS source set; specific current IRS HSA mechanics were cross-checked in this session.

External facts still required: None for FFH-007 policy completion. Route any newly discovered statutory edge case from FFH-008/Engineering back to Regulatory Research.

Implementation readiness: READY FOR MANAGER SYNTHESIS WITH FFH-008. NOT READY FOR ENGINEERING UNTIL MANAGER APPROVAL.
