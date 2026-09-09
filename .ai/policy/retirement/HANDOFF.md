# Retirement & Tax-Advantaged Policy Analyst Handoff

HANDOFF

Task ID: FFH-009

Role: Retirement & Tax-Advantaged Policy Analyst

Status: COMPLETE — READY FOR MANAGER SYNTHESIS

Verified starting state: Session refresh verified `phase-5-money-priority-engine` at `7dd306e5d4a4e7d254bccbc9613159fe78d7ed1c`. Canonical `.ai/shared/PROJECT_STATE.md`, `.ai/shared/DECISIONS.md`, Manager `ACTIVE_ASSIGNMENTS.md`, prior Retirement handoff, FFH-005 revalidation/R6 research, current IRA capacity implementation, and IRA tests were read before policy writes. Canonical Manager state explicitly assigns FFH-009 as ACTIVE under FFH-PW-003 and limits it to R6 without production code.

Assigned objective: Resolve FFH-005 R6 only. Define implementation-ready MFJ spousal-IRA scarce-compensation legal-capacity semantics; distinguish statutory feasible set from deterministic routing; handle actual YTD, multiple IRAs, missing facts, one-time/Build/Windfall/Your Plan consumers, deterministic behavior, and acceptance scenarios; do not write production code.

Work completed:
- Created `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`.
- Defined scarce-compensation MFJ IRA capacity as a legal feasible set plus shared joint-compensation ledger rather than a fixed owner-room split.
- Preserved the higher-compensation spouse's own-compensation ceiling while allowing the lower-compensation spouse's spousal-IRA capacity to use combined compensation remaining after the other spouse's actual contributions.
- Defined equal-compensation behavior without inventing a lower/higher spouse.
- Defined exact YTD consumption semantics and formulas for shared remaining compensation, owner conditional maximum additional room, and household maximum additional IRA compensation capacity.
- Required conditional owner maxima to be labeled/handled as jointly constrained rather than summed as independent room.
- Preserved one combined Traditional + Roth annual limit per owner and separate Roth direct-eligibility / Traditional deductibility logic.
- Defined a shared planning ledger consumed/reserved across actual YTD, authoritative schedules, one-time routing, Build, Windfall, Your Plan, and hypothetical reruns without double counting.
- Defined recommendation-vs-execution behavior: actual YTD consumes statutory room; active schedules reserve current-plan room; stale recommendations alone do not.
- Defined order-invariant deterministic routing. Existing approved financial/account routing factors apply first; if spouse IRA routes remain genuinely equivalent, scarce shared capacity is split by equal fulfillment ratio, with stable ID only for unavoidable final-cent remainder.
- Defined missing-information behavior: do not infer unknown compensation as zero; do not infer spouse YTD = zero solely from absence of an IRA account when shared compensation matters.
- Defined possible-excess behavior where authoritative YTD already violates individual/shared supported ceilings: no additional room, high-severity warning, no invented correction/tax advice.
- Preserved the boundary that current compensation fields must not silently be claimed to cover every statutory IRA-compensation category beyond their documented product meaning.
- Evaluated 20 scenario acceptance cases.
- No production code, schema, tests, HSA behavior, SIMPLE behavior, or Phase 5C behavior was changed.

Evidence produced:
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`.
- Policy artifact commit: `6e6680a968246d53f068809b323b41c944ac6107`.
- Repository evidence inspected: `.ai/manager/ACTIVE_ASSIGNMENTS.md`, `.ai/shared/PROJECT_STATE.md`, `.ai/shared/DECISIONS.md`, `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`, `lib/calculations/money-priority-retirement-accounts.ts`, and `lib/calculations/money-priority-retirement-accounts.test.ts`.
- Authoritative external evidence relied upon through FFH-005 and rechecked in current IRS Publication 590-A / IRS 2026 IRA-limit guidance: 2026 IRA $7,500 base limit, $8,600 age-50+ limit, per-person Traditional+Roth combined limit, own-compensation general rule, and Kay Bailey Hutchison spousal-IRA formula based on combined compensation reduced by the other spouse's actual IRA contributions.

Tests / validation actually performed: No production tests were run because FFH-009 is policy/documentation-only. Validation consisted of canonical repository refresh, direct current IRA source/test inspection, formula/ledger analysis, 20 scenario acceptance cases, order-invariance review, and current IRS source cross-checking. No code-test, CI, runtime, or audit pass is claimed for the documentation commits.

Files updated:
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md` — created.
- `.ai/policy/retirement/HANDOFF.md` — updated to this FFH-009 handoff.

Open findings:
- Manager must decide whether current FFH account-inventory semantics are authoritative enough to treat a spouse with no recorded IRA account as having $0 IRA YTD. Retirement Policy recommends **no** unless an explicit completeness guarantee exists; otherwise scarce shared capacity remains `more_information_needed` until spouse YTD is established.
- Exact TypeScript output/ledger field names remain Engineering choices. Semantics must preserve owner conditional maxima plus shared compensation rather than collapse back to a sorted-owner split.
- FFH-005 already notes that statutory IRA compensation includes categories beyond a naive wage-only field. FFH-009 does not widen the current persisted compensation field's meaning; a real data-contract gap discovered during Engineering must be routed rather than guessed.
- FFH-010 may proceed independently; no HSA files or policy were changed by FFH-009.

Blocking issues: None for FFH-009 policy completion. R6 remains a Phase 5 merge blocker until Manager approves this policy and a narrow Core Engine remediation is implemented and later audited. This handoff does not authorize production changes.

Unverified items:
- Whether current product/account-inventory semantics constitute an explicit completeness guarantee for spouse IRA YTD when no account record exists.
- Household-specific IRA compensation categories not represented by the current supported compensation input.
- No post-FFH-009 CI result is claimed because the role changed documentation only.

Recommended next role: Manager / Architect.

Exact next action: Manager reviews `FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`, records the durable R6 decision, resolves the narrow no-recorded-IRA/YTD completeness question, and issues a Core Financial Engine remediation task. That Engineering task should replace the sorted-owner compensation allocation with owner + shared-capacity ledgers, preserve existing Roth/Traditional tax logic, and add adversarial scarcity/order-invariance tests.

Checkpoint / SHA: FFH-009 policy artifact commit `6e6680a968246d53f068809b323b41c944ac6107`; this HANDOFF update creates a subsequent documentation-only commit whose exact SHA must be verified after write.

Policy classification:
- 2026 $7,500 IRA limit / $8,600 age-50+ limit, own-compensation rule, Kay Bailey Hutchison spousal-IRA formula, and no statutory fixed owner-ID split: STATUTORY / VERIFIED CURRENT EXTERNAL FACT through FFH-005 and current IRS evidence.
- Scarce-compensation feasible-set formulas and shared-capacity consequences: MATHEMATICAL CONSEQUENCE.
- Conditional-owner-room representation, shared planning ledger, equal-fulfillment true-tie routing, missing-data behavior, and possible-excess warning boundary: PROPOSED FFH PROJECT POLICY pending Manager approval.
- Existing Roth-vs-Traditional preference: USER-CONFIGURABLE PREFERENCE that may affect routing only inside legal capacity; no new spouse-priority preference is required.
- Exact code/type/UI representation: PRODUCT/ENGINEERING DESIGN CHOICE subject to the approved semantics.

Retirement invariants established:
- no owner-ID statutory priority;
- both spouses' routed IRA contributions remain inside supported joint compensation where spousal treatment applies;
- each spouse remains inside the age-appropriate combined Traditional + Roth individual limit;
- higher-compensation spouse cannot use the spousal rule to exceed own supported compensation;
- equal compensation does not create an invented lower spouse;
- actual YTD is consumed exactly once;
- multiple IRA accounts do not multiply owner room;
- owner conditional maxima are not additive independent room;
- schedules/recommendations remain distinct from actual YTD;
- all current-plan consumers share one owner/shared capacity ledger;
- unknown compensation/YTD cannot create optimistic room;
- negative capacity clamps to zero with explicit warning/state;
- Roth direct eligibility and Traditional deductibility remain separate from compensation capacity;
- person/account array order cannot change substantive legal capacity;
- stable ID is only a final-cent routing tie-break, not a legal-capacity rule.

Scenarios evaluated: 20 acceptance cases in the FFH-009 policy artifact, including non-scarce capacity, one-earner $10k examples, actual contribution sequencing, higher-spouse own-compensation cap, equal compensation, age-different limits, multiple IRAs, Roth destination constraints, absent spouse account/YTD, missing compensation/YTD, prior recommendations, active schedules, one-time then Build, Windfall cloning, equal-fulfillment routing ties, over-joint-compensation YTD, and higher-spouse own-compensation excess.

External facts relied upon: FFH-005 Regulatory Research/revalidation plus current IRS Publication 590-A and IRS 2026 IRA-limit guidance. No new statutory premise was invented by Retirement Policy.

External facts still required: None to complete FFH-009. If Engineering exposes a genuinely unsupported IRA-compensation category or interpretation, route that narrow fact question to Regulatory Research.

Implementation readiness: READY FOR MANAGER SYNTHESIS. AFTER MANAGER APPROVAL, READY FOR A NARROW CORE ENGINE R6 REMEDIATION TASK. NOT PRODUCTION-AUTHORIZED BY THIS HANDOFF ALONE.
