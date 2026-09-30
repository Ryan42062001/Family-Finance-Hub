# Regulatory & Financial Research Analyst Handoff

HANDOFF

Task ID: FFH-005 — REVALIDATION ADDENDUM
Role: Regulatory & Financial Research Analyst
Status: REVALIDATION COMPLETE — ORIGINAL FFH-005 REMAINS COMPLETE; MANAGER REVIEW OF NEW R6 REQUIRED

Verified starting state: The revalidation initially refreshed `phase-5-money-priority-engine` at `f6a138e78083afe6bdf83bc42117c705bda9ca09`, the original FFH-005 research checkpoint. During research, Manager advanced canonical state through FFH-PW-002 assignment; current Manager state marks FFH-005 COMPLETE and Regulatory Research IDLE, with FFH-006/007/008 active. Concurrency comparison showed no intervening edit to `.ai/research/regulatory/HANDOFF.md` or production retirement/tax-policy files before this addendum was persisted.

Assigned objective: At the project owner's explicit request, re-read current canonical state, the prior Regulatory Research handoff, and relevant Phase 5 retirement/tax-policy files; independently re-verify current authoritative 2026 external rules materially constraining Phase 5C and the existing retirement-capacity model; persist factual sources/effective dates/uncertainties/conflicts; do not create FFH financial policy or production code.

Work completed: Revalidated the current 2026 federal retirement/HSA facts against primary IRS/Treasury guidance and official federal TSP material. Re-inspected `money-priority-tax-policy.ts`, `money-priority-retirement-accounts.ts`, retirement limit tests, Phase 5 documentation, and HSA/retirement persistence fields. Persisted detailed source/effective-date/fact analysis in `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`. Reaffirmed prior R1–R4 and identified one new factual/modeling distinction, R6, concerning the Kay Bailey Hutchison spousal-IRA compensation formula versus FFH's deterministic sorted-owner compensation allocation.

Evidence produced:
- `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`
- primary IRS Notice 2025-67 / IRB 2025-49;
- IRS current catch-up, 401(k), 403(b), governmental 457(b), IRA, Publication 590-A, Publication 969 and 2026 Publication 15-B guidance;
- Rev. Proc. 2025-19 / IRB 2025-21 for 2026 HSA amounts;
- T.D. 10033 / IRB 2025-40 for catch-up regulation effective/applicability discipline;
- official federal TSP materials confirming IRC 402(g)/415(c) treatment.

Authoritative 2026 facts reaffirmed:
- 401(k)/403(b)/TSP ordinary elective deferral: $24,500.
- Governmental 457(b) ordinary limit: $24,500 under its separate statutory limit structure.
- General age-50+ catch-up: $8,000.
- Age 60–63 catch-up: $11,250 instead of the ordinary $8,000 catch-up.
- 2025 sponsor FICA wage threshold used for 2026 Roth catch-up treatment: wages exceeding $150,000.
- Defined-contribution annual additions: lesser of 100% of applicable compensation or $72,000; age catch-up excluded from ordinary annual additions.
- 2026 qualified-plan annual compensation limit: $360,000, subject to statutory/plan exceptions.
- IRA combined traditional+Roth limit per individual: $7,500; age-50+ IRA catch-up: $1,100; contribution eligibility also constrained by applicable compensation and Roth-income rules.
- HSA self-only: $4,400; HSA family: $8,750; age-55 catch-up: $1,000 per qualifying individual in that person's own HSA.
- Excludable employer HSA contributions consume the same statutory HSA contribution limit.
- 403(b) 15-year service catch-up and governmental 457(b) last-three-years catch-up remain real special rules whose current FFH deferral is supportable because required facts are not modeled.

Statutory/regulatory fact versus project policy:
- The verified amounts/rules above are external legal constraints.
- Phase 5C goal-versus-retirement priority, protected retirement floor, account preference, and allocation competition remain FFH policy; this role did not alter them.
- The current married-HSA ordinary-vs-catch-up YTD attribution blocker remains a conservative PROJECT MODELING/POLICY choice rather than a verified IRS requirement to label historical deposits.
- A deterministic per-spouse allocation of scarce joint IRA compensation by sorted owner ID is PROJECT MODELING; IRS spousal-IRA capacity depends on joint compensation and the other spouse's actual IRA contributions rather than a statutory first-owner/second-owner split.

Open findings:
- R1 REAFFIRMED — certain higher-applicable-SIMPLE plans use the 2026 $3,850 age-50+ catch-up, not the general $4,000 amount; current helper can overstate affected room by $150 if `simpleHigherLimitEligible` maps to that statutory category.
- R2 REAFFIRMED — governmental 457(b) age-based catch-up is subject to the 2026 high-wage Roth rule; current evaluator's sponsor-wage/Roth-support check excludes 457(b).
- R3 REAFFIRMED — HSA legal capacity is month-sensitive; current annual `hsa_eligible`/coverage facts cannot establish full-year room in every partial-year/Medicare/coverage-change case unless their semantics are explicitly stronger than currently documented.
- R4 REAFFIRMED — historical HSA ordinary-vs-catch-up labeling is not established by reviewed IRS guidance as a statutory prerequisite; current blocker is project modeling unless retained by approved policy.
- R6 NEW — MFJ IRA compensation is currently allocated sequentially by sorted owner ID. The IRS spousal-IRA formula is contribution-dependent, so current logic is conservative in aggregate but can understate one spouse's legally possible room and should not be represented as a statutory fixed per-owner split.

Tests / validation actually performed: No production code was changed and no production test suite was executed by this role. Validation consisted of live repository refresh/concurrency comparison, file/schema/test inspection, and independent primary-source revalidation. No CI or audit verdict is claimed from this documentation-only work.

Files updated:
- `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md` — created.
- `.ai/research/regulatory/HANDOFF.md` — refreshed by this handoff commit.

Blocking issues: Original FFH-005 is already complete under canonical Manager state. Manager has already classified R1/R2/R3 as blockers and R4 as a policy/data-model issue in FFH-PW-002. R6 is newly surfaced and requires Manager triage before any Engineering task is inferred. Regulatory Research does not authorize implementation.

Unverified items: Household-specific plan documents/permissions; actual Roth feature availability for a particular employer plan; actual HSA eligibility months/coverage changes/last-month-rule qualification; exact intended statutory semantics of `simpleHigherLimitEligible`; whether current IRA compensation persistence fully captures all special statutory compensation categories.

Recommended next role: Manager / Architect. Manager should read the revalidation addendum, preserve the already active FFH-006/007/008 scope unless deliberately changed, and decide whether R6 warrants a separate remediation/clarification task. Core Engineering must not silently expand FFH-006 to R6 without Manager authorization.

Exact next action: Manager reviews `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`, classifies R6, and updates canonical assignments only if action is required. Regulatory Research returns to IDLE unless a new factual uncertainty is routed back.

Checkpoint / SHA: `4569bb850f02dba5523fa5b99c012b1d1ab40912` is the FFH-005 revalidation-addendum commit. This HANDOFF update creates a subsequent documentation-only commit whose exact SHA must be read after write.

Confidence: HIGH for the revalidated 2026 federal limits and R1/R2/R3/R4/R6 factual classifications. Product remediation choices remain outside Regulatory Research authority.
