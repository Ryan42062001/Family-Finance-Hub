# FFH-007 — HSA Legal-Capacity Policy Semantics

Date: 2026-09-08
Role: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE POLICY RECOMMENDATION — READY FOR MANAGER SYNTHESIS WITH FFH-008

## QUESTION

What HSA eligibility, coverage, married-family allocation, age-55 catch-up, YTD-contribution, and legacy-record semantics should Family Finance Hub use so that annual HSA contribution capacity is legally supportable and deterministic without treating current account-level booleans as stronger facts than they are?

## CURRENT CANONICAL POLICY / REPOSITORY STATE

Classification: ESTABLISHED FFH PROJECT POLICY / VERIFIED REPOSITORY STATE.

1. Current HSA inputs live on `retirement_accounts`, including nullable `hsa_eligible` and `hsa_coverage_type`.
2. The normalized Money Priority snapshot preserves those as account-level `hsaEligible` and `hsaCoverageType` facts.
3. Current HSA capacity logic aggregates employee + employer YTD contributions across HSAs owned by the same person.
4. Current married-family logic attempts to identify two eligible spouses, uses one shared family ordinary limit, keeps age-55 catch-up owner-specific, and blocks when spouse facts are unresolved.
5. Current logic grants a full annual self-only/family base (plus applicable age-55 catch-up) when `hsa_eligible=true` and coverage is known. It does not model month-by-month eligibility, coverage changes, Medicare timing, or last-month-rule reliance.
6. Current married-family logic blocks additional room when a catch-up-eligible spouse has positive HSA YTD contributions because those deposits are not labeled ordinary-family versus catch-up.
7. Manager classifies FFH-005 R3 as a merge-blocking HSA modeling/data-contract issue and R4 as a policy/modeling issue requiring explicit Retirement Policy resolution.

## POLICY GAP / UNCERTAINTY

Classification: VERIFIED CURRENT EXTERNAL FACT + PROJECT POLICY GAP.

FFH-005 established that HSA eligibility and coverage can be month-sensitive; Medicare can reduce eligible months including through retroactive enrollment; and the last-month rule can change the annual limit while creating a testing-period risk. Therefore an annual account-level boolean cannot safely prove a full-year contribution limit in every household.

FFH-005 also established that married eligible spouses share one ordinary family base, split equally absent another agreement, while each qualifying spouse's age-55 catch-up is owner-specific. IRS guidance reviewed does not require historical deposits to be labeled as ordinary versus catch-up dollars. Therefore the current blanket R4 attribution blocker is conservative project modeling, not a statutory necessity.

## PROPOSED POLICY

Unless explicitly labeled otherwise, this section is PROPOSED FFH PROJECT POLICY pending Manager approval.

### 1. HSA legal eligibility is a person-and-tax-year fact, not an HSA-account fact

The authoritative HSA legal-capacity model should derive eligibility and coverage from the person/tax-year context. HSA accounts are destinations and YTD ledgers; merely having or not having an HSA account must not establish whether the person was HSA-eligible in a month.

A spouse without a recorded HSA can still affect married-family legal structure when that spouse is an eligible individual. A spouse-specific age-55 catch-up cannot be routed until that spouse has an HSA destination, but absence of an account must not be interpreted as statutory ineligibility.

Classification: PROPOSED FFH PROJECT POLICY / PRODUCT-DATA SEMANTICS.

### 2. Existing `hsa_eligible` must not silently become a full-year certification

Preferred semantics:

- existing/future `hsa_eligible` remains a current/as-of eligibility fact or legacy hint;
- `true` does not by itself mean eligible for every month of the tax year;
- `false` does not by itself prove zero annual tax-year capacity, because prior eligible months may exist;
- current `hsa_coverage_type` likewise cannot, by itself, prove one unchanged coverage type for all twelve months.

Annual capacity requires a separate tax-year eligibility/coverage basis: month-granular facts or an explicit annual basis that is semantically equivalent and auditable.

If Engineering/App/Data instead wants to redefine `hsa_eligible` as a full-tax-year certification, that is not a backward-compatible interpretation. It requires explicit migration/reconfirmation and a separate basis field distinguishing ordinary full-year treatment from last-month-rule treatment. Legacy `true` values may not be auto-promoted.

Classification: PROPOSED FFH PROJECT POLICY.

### 3. Required annual-capacity basis

FFH should be able to determine, for every relevant month of the tax year and HSA participant:

- eligible / ineligible / unknown;
- applicable coverage type: self-only / family / none / unknown;
- Medicare enrollment effective month when applicable;
- whether a future-month value is actual or an explicit planning assumption;
- whether last-month-rule treatment is being used;
- age-55 catch-up eligibility from the person's age and legally eligible period;
- married-family allocation choice where the shared family rule applies.

Storage shape is owned by FFH-008/Manager; these are policy semantics, not a mandated schema.

Classification: PROPOSED FFH PROJECT POLICY / PRODUCT-DATA CHOICE.

### 4. Partial-year eligibility and coverage changes use period-aware capacity

STATUTORY / REGULATORY REQUIREMENT, as verified by FFH-005 and IRS Publication 969/Form 8889 guidance: HSA contribution limits depend on month-specific eligibility/coverage unless a valid last-month-rule treatment supplies the alternative annual limit.

PROPOSED FFH PROJECT POLICY:

- calculate ordinary base capacity from the applicable month-by-month legal limits when the person was not eligible for the entire year or coverage changed;
- apply the same eligibility-period discipline to any age-55 additional contribution rather than assuming the full annual catch-up from a current age/status flag alone;
- future months may be represented as explicit planning assumptions, but the result must identify that projected basis so Recommendation Refresh can invalidate it when coverage/eligibility changes;
- unknown material months produce targeted `more_information_needed`, not zero room and not optimistic full-year room.

### 5. Medicare treatment

STATUTORY / REGULATORY REQUIREMENT: beginning with the first month of Medicare enrollment, the contribution limit for that month is zero; retroactive Medicare coverage can make prior HSA contributions excess.

PROPOSED FFH PROJECT POLICY:

- a known Medicare effective month sets HSA eligibility to ineligible beginning that month for capacity calculation;
- an uncertain/pending Medicare effective date that could change the tax-year limit produces `more_information_needed` for affected HSA room;
- when later data records retroactive Medicare coverage, FFH recomputes the legal limit from the corrected effective month;
- if aggregate YTD then exceeds the recomputed legal maximum, expose no additional room and a high-severity `possible_excess_hsa_contribution` planning warning; do not automatically invent a corrective distribution/tax action.

### 6. Last-month rule is explicit conditional treatment, never inferred

STATUTORY / REGULATORY REQUIREMENT: the last-month rule can treat an eligible individual on the first day of the last month as eligible for the full year, but it carries a testing-period requirement and potential income/additional-tax consequences if the testing period is failed.

PROPOSED FFH PROJECT POLICY:

- FFH must never auto-apply the last-month rule merely because the person is eligible in December;
- default recommended capacity uses the ordinary month-based rule unless the household explicitly chooses to rely on last-month-rule treatment;
- the choice to rely on the rule is USER-CONFIGURABLE within statutory constraints; it cannot make an otherwise ineligible person eligible;
- when used, capacity must be labeled `conditional_last_month_rule` (exact engineering name is not mandated) and accompanied by a testing-period warning;
- if December eligibility/coverage needed for the rule is unknown, the dependent capacity is `more_information_needed`;
- later evidence of testing-period failure invalidates the prior conditional planning basis and triggers recalculation/warning rather than silently preserving the old room.

### 7. Married-family ordinary base: use the statutory equal default unless an explicit different agreement exists

STATUTORY / REGULATORY REQUIREMENT: when both spouses are eligible and the married-family rule applies, the ordinary family contribution limit is one shared base. It is divided equally absent a different agreement. Each qualifying spouse's age-55 catch-up is separate and owner-specific.

PROPOSED FFH PROJECT POLICY:

- after period-aware calculation determines the shared ordinary married-family base applicable to the tax year, FFH uses an equal allocation by default;
- the household may explicitly choose a different ordinary-base allocation; that is a USER-CONFIGURABLE PREFERENCE constrained so allocations remain nonnegative and sum to no more than the legally available shared ordinary base;
- account ordering, account existence, owner ID, income, current balance, or user retirement priority may not invent a different spouse allocation;
- if existing YTD contributions are incompatible with the equal default but remain compatible with some legal alternate spouse allocation, return targeted `more_information_needed` asking whether the spouses agreed to a different division; do not automatically declare an excess and do not silently infer a new split;
- if no possible legal allocation can accommodate aggregate YTD contributions, show no additional capacity and an excess-contribution risk.

### 8. Replace R4's ordinary-vs-catch-up deposit-label blocker with owner ceilings

Classification: PROPOSED FFH PROJECT POLICY, grounded in FFH-005's VERIFIED CURRENT EXTERNAL FACT that IRS guidance reviewed does not require historical deposits to be tagged ordinary versus catch-up.

Once the spouse ordinary-base allocation is known (equal default or explicit alternate allocation), define for each spouse:

`owner HSA annual ceiling = owner ordinary-base allocation + owner-specific age-55 catch-up capacity`

Then:

`owner remaining HSA room = max(0, owner annual ceiling - aggregate employee/employer HSA YTD for that owner)`

All HSA accounts owned by the same person share that owner ceiling. This model does not require identifying which historical dollar was "ordinary" versus "catch-up".

The couple-wide ordinary base is partitioned by the approved spouse allocation. Catch-up capacity is not transferable. Therefore the engine must enforce both owner ceilings and the total couple legal maximum; one spouse cannot consume the other's catch-up.

If the allocation itself is unresolved, owner room remains unresolved. But positive YTD for a catch-up-eligible spouse alone is no longer a reason to block capacity.

### 9. Employer and employee contributions share the same capacity

Classification: STATUTORY / REGULATORY REQUIREMENT.

Employee, employer, cafeteria-plan employer, and other includable contributions that count toward the statutory HSA ceiling must reduce the same remaining legal capacity. FFH must not expose separate employee and employer contribution buckets that multiply room.

### 10. Multiple HSA accounts do not multiply capacity

Classification: STATUTORY / REGULATORY REQUIREMENT + EXISTING FFH INVARIANT.

YTD contributions must aggregate across every HSA owned by the same person. Remaining owner room is shared across that person's HSA destinations. A second HSA is a second destination, not a second annual limit.

### 11. Missing-information behavior

PROPOSED FFH PROJECT POLICY, consistent with canonical missing-data principles.

Use `more_information_needed` only for the decision dependent on the missing HSA fact. Examples:

- unknown tax-year eligibility month(s);
- unknown coverage type for a material month;
- unknown Medicare effective date that could reduce the annual limit;
- ambiguous last-month-rule use;
- unresolved married-family allocation when existing YTD cannot fit the equal default;
- missing spouse/person eligibility facts that can change whether the family-sharing rule applies;
- incomplete employee/employer YTD totals across an owner's HSA accounts.

Do not convert unknown capacity to zero. Do not fabricate full-year room. Other retirement accounts and unrelated household decisions may continue when their facts are independently sufficient.

If HSA scheduled contributions or long-term HSA saving are material to the Phase 5A retirement floor, unresolved HSA legal capacity keeps those HSA dollars from being treated as verified sustainable retirement saving until resolved.

### 12. Legacy/backward-compatibility policy

PROPOSED FFH PROJECT POLICY.

- preserve existing HSA balances, account ownership, employee YTD, employer YTD, and current/legacy eligibility/coverage values;
- do not backfill twelve months of eligibility or coverage from one legacy boolean/current coverage field;
- new period/basis fields for legacy rows default to unknown/null, not affirmative full-year eligibility;
- legacy records require targeted reconfirmation before FFH exposes new affirmative HSA legal room under the remediated model;
- a legacy `hsa_eligible=false` also must not erase known earlier eligible months if later period data is supplied;
- stale recommendations based on the old annual-boolean interpretation must not override recomputed legal capacity after the new model is available.

### 13. User preference boundaries

USER-CONFIGURABLE PREFERENCE is allowed only where law permits choice:

- choose an alternate married-family ordinary-base division;
- choose whether to rely on last-month-rule treatment after required facts/warnings are available;
- supply/update expected future eligibility/coverage assumptions for planning;
- separately choose HSA long-term-saving intent/expected medical spending under existing retirement-planning policy.

User preference may not:

- override Medicare ineligibility;
- create eligibility for an ineligible month;
- exceed statutory family/self-only/catch-up capacity;
- transfer one spouse's age-55 catch-up to the other spouse;
- treat employer contributions as outside the limit;
- turn an unknown factual state into verified legal capacity.

### 14. Determinism and routing

PROPOSED FFH PROJECT POLICY.

Same tax year + tax-policy version + person eligibility/coverage periods + Medicare facts + last-month-rule choice + married-family allocation + age + YTD contributions + account ownership must produce the same legal-capacity result.

Source array order, display names, account creation time, or stable-ID sort order may not alter legal capacity. Stable IDs may be used only to make otherwise equivalent routing deterministic after legal capacity is established.

Legal-capacity determination precedes account routing. Routing cannot create or expand room.

## POLICY CLASSIFICATION SUMMARY

- 2026 HSA self-only $4,400 / family $8,750 limits: VERIFIED CURRENT EXTERNAL FACT / STATUTORY.
- Age-55 $1,000 catch-up, own HSA: VERIFIED CURRENT EXTERNAL FACT / STATUTORY.
- Employee + employer contributions consume one HSA ceiling: VERIFIED CURRENT EXTERNAL FACT / STATUTORY.
- Month-sensitive eligibility/coverage and Medicare zero-limit months: VERIFIED CURRENT EXTERNAL FACT / STATUTORY.
- Last-month rule and testing-period consequence: VERIFIED CURRENT EXTERNAL FACT / STATUTORY.
- Married-family ordinary base is shared and equal absent different agreement: VERIFIED CURRENT EXTERNAL FACT / STATUTORY.
- Historical ordinary-vs-catch-up labeling is not a verified statutory prerequisite: VERIFIED CURRENT EXTERNAL FACT.
- Person/tax-year period model, legacy handling, explicit last-month-rule opt-in, R4 owner-ceiling replacement, and targeted uncertainty behavior: PROPOSED FFH PROJECT POLICY.
- Alternate spouse ordinary-base allocation and last-month-rule reliance: USER-CONFIGURABLE PREFERENCE within statutory constraints.
- Exact storage schema/UI: PRODUCT/DATA DESIGN CHOICE owned by Manager + FFH-008/Engineering after synthesis.

## RATIONALE

1. The current account-level annual boolean can overstate room when eligibility or coverage changes during the year.
2. Treating a current `false` as zero annual room can also be wrong if the person had eligible months earlier in the tax year.
3. Person/tax-year period facts match the legal structure better than attaching eligibility truth to account existence.
4. The statutory married-family default already provides a deterministic fallback: equal allocation absent another agreement.
5. R4's blanket deposit-label blocker is unnecessarily restrictive once ordinary-base allocation and owner-specific catch-up ceilings are represented explicitly.
6. Conservative uncertainty should block only the affected HSA decision, not the entire retirement engine.
7. Legacy values must not silently acquire stronger legal meaning through a migration.

## EXTERNAL FACTS RELIED UPON

FFH-005 / authoritative IRS evidence:

- Rev. Proc. 2025-19 / IRB 2025-21 — 2026 HSA base limits.
- IRS Publication 969 — monthly eligibility/coverage, last-month rule/testing period, Medicare effects, married-family allocation, catch-up ownership, employer contribution treatment.
- 2026 Publication 15-B — qualified-individual status determined monthly and 2026 employer HSA context.
- Current Form 8889 instructions/worksheet mechanics as referenced by Publication 969 for month-based limits.

## EXTERNAL FACTS STILL REQUIRED

None to make this FFH-007 policy recommendation. If FFH-008/Engineering uncovers a statutory case not resolved by the FFH-005 record, route that exact fact back to Regulatory Research rather than guessing.

## ASSUMPTIONS

- FFH continues to use a tax-year versioned HSA limit policy.
- HSA account ownership and employee/employer YTD values remain available and trustworthy when non-null.
- Manager will synthesize this policy with FFH-008 before authorizing production schema/runtime changes.
- FFH-009 spousal-IRA semantics remain out of scope and are intentionally not addressed here.

## FINANCIAL INVARIANTS

1. One ordinary married-family HSA base cannot be counted twice.
2. One spouse's age-55 catch-up cannot be transferred to the other spouse.
3. Multiple HSAs owned by one person cannot multiply annual room.
4. Employee and employer contributions consume the same legal capacity.
5. YTD contributions are deducted exactly once.
6. Unknown month/coverage/Medicare facts cannot create optimistic room.
7. Current account existence cannot establish person eligibility.
8. Legacy boolean values cannot be silently upgraded to full-year facts.
9. Legal capacity is distinct from HSA desirability, retirement need, cash-flow capacity, and HSA long-term intent.
10. Negative remaining capacity clamps to zero and never creates allocation demand.
11. Equivalent household facts in different array/account order produce identical legal capacity.
12. Recommendation Refresh must not let stale pre-remediation HSA room override newer legal inputs.

## SCENARIOS ANALYZED / ACCEPTANCE SCENARIOS

All dollar values below use verified 2026 limits only where explicitly stated.

### A1 — Full-year self-only, under age 55
Person is verified eligible for all relevant months with self-only coverage throughout 2026; employee+employer YTD = $1,400.
Expected: annual ceiling $4,400; remaining room $3,000; calculated/available.
Wrong: add employer room separately or require an age catch-up.

### A2 — Partial-year eligibility
Person is eligible for only part of the year and does not use the last-month rule.
Expected: annual ordinary capacity follows the authoritative month-based limit for eligible months; full $4,400/$8,750 is not automatically granted.
Wrong: `hsa_eligible=true` today creates full-year room.

### A3 — Coverage change
Person has verified self-only coverage for some eligible months and family coverage for later eligible months.
Expected: capacity uses the applicable monthly coverage limits, then annualizes under the statutory worksheet method.
Wrong: use only the current/final coverage type for every month without last-month-rule treatment.

### A4 — Known Medicare enrollment
Medicare effective August 1; otherwise eligible earlier months are known.
Expected: August and later months provide zero HSA contribution limit; capacity is recomputed from eligible pre-Medicare months.
Wrong: full-year HSA limit remains available because the account still exists.

### A5 — Retroactive Medicare
Later snapshot changes Medicare effective month backward and recomputed legal maximum falls below YTD contributions.
Expected: remaining room = $0; high-severity possible-excess warning; no automatic corrective-distribution instruction.
Wrong: preserve stale room from prior recommendation.

### A6 — Last-month rule not selected
Person becomes eligible late in the year and is eligible December 1.
Expected: default Recommended Plan uses ordinary month-based capacity; do not infer full-year treatment.
Wrong: automatically grant full-year room merely from December eligibility.

### A7 — Last-month rule explicitly selected
December eligibility and coverage are known; household explicitly chooses to rely on last-month rule.
Expected: conditional full-year capacity may be calculated under authoritative rules with testing-period warning and distinct conditional basis.
Wrong: label it unconditional ordinary full-year eligibility.

### A8 — Material month unknown
Eligibility start date or coverage for a month that can change annual capacity is unknown.
Expected: targeted `more_information_needed` for HSA legal room; other independently supported retirement accounts remain evaluable.
Wrong: convert unknown to zero or full-year room.

### A9 — Married family, no alternate agreement
Both spouses are full-year eligible under the married-family rule, under age 55, and no different allocation is recorded.
Expected: 2026 $8,750 ordinary family base defaults equally: $4,375 ordinary allocation per spouse before YTD contributions.
Wrong: give the full $8,750 to each spouse or allocate by owner ID/account order.

### A10 — Married family, one spouse age 55+
Equal default ordinary allocation applies; spouse A qualifies for catch-up, spouse B does not.
Expected: A ceiling = $4,375 ordinary + $1,000 catch-up; B ceiling = $4,375 ordinary. YTD totals reduce each owner's combined ceiling without deposit labels.
Wrong: transfer A's catch-up to B or block merely because A has positive YTD.

### A11 — Married family, both spouses age 55+
Both qualify and have separate HSA destinations.
Expected: each spouse gets equal ordinary allocation plus that spouse's own $1,000 catch-up; aggregate ordinary base remains $8,750.
Wrong: create one pooled $2,000 catch-up usable by either spouse.

### A12 — Equal default incompatible with YTD but alternate split could be legal
Both spouses are under 55; spouse A YTD exceeds $4,375, spouse B is below $4,375, and couple YTD remains below $8,750.
Expected: targeted `more_information_needed` asking whether spouses agreed to a different ordinary-base division. Do not infer a split and do not automatically call the couple over-limit.
Wrong: silently reallocate by observed YTD or account order.

### A13 — Explicit alternate married-family split
Household records a legally valid $6,000 / $2,750 ordinary allocation for 2026.
Expected: owner ceilings use those ordinary amounts plus each owner's separate catch-up if eligible; YTD reduces owner ceilings exactly once.
Wrong: continue using equal $4,375/$4,375 after explicit valid agreement.

### A14 — Spouse has no HSA account
Both spouses are eligible and family-sharing applies, but only spouse A has a recorded HSA.
Expected: spouse B's eligibility still participates in married-family structure. Equal default remains unless a different agreement is recorded. B's age-55 catch-up is not routable without B's own HSA.
Wrong: assume B ineligible or automatically allocate 100% ordinary base to A because only A has an account.

### A15 — Multiple HSAs for one owner
One person has two HSAs with YTD contributions in both.
Expected: employee+employer YTD aggregates across both; both destinations share one owner ceiling.
Wrong: each account receives a separate $4,400/$8,750 limit.

### A16 — Legacy record
Pre-remediation HSA has `hsa_eligible=true`, `hsa_coverage_type='family'`, YTD values, but no tax-year period/basis facts.
Expected: preserve the record and YTD; do not fabricate twelve months of family eligibility; new affirmative legal room remains `more_information_needed` until reconfirmed.
Wrong: migration backfills all months as eligible family coverage.

## EXPECTED OUTPUTS

Implementation should eventually expose or derive equivalents of:

- tax year and tax-policy version;
- HSA capacity state (`calculated`, `more_information_needed`, `limit_reached`, etc.);
- legal-capacity basis (`period_aware`, `conditional_last_month_rule`, etc.);
- owner ordinary-base allocation;
- owner age-55 catch-up capacity;
- aggregate owner YTD contributions;
- owner remaining legal room;
- married-family shared-base status/allocation;
- conditional/testing-period warning when last-month rule is used;
- Medicare/retroactivity or possible-excess warning where applicable;
- missing-data reasons at person/tax-year level;
- clear distinction between legal capacity and account routing.

Exact enum/column names remain Engineering/App/Data design choices after Manager synthesis.

## EXPECTED NON-BEHAVIOR

FFH must not:

- treat account existence as HSA eligibility;
- treat current `hsa_eligible=true` as automatic twelve-month eligibility;
- treat current `hsa_eligible=false` as proof of zero tax-year room without period history;
- apply last-month rule automatically;
- ignore Medicare effective dates or retroactivity;
- double the family base for married eligible spouses;
- transfer catch-up capacity between spouses;
- require ordinary-vs-catch-up labels on historical deposits solely to calculate remaining room after spouse allocation is known;
- infer a non-equal spouse allocation from account order, IDs, balances, or YTD alone;
- double-count employer contributions or multiple HSA accounts;
- backfill legacy unknown months optimistically;
- let HSA legal uncertainty fabricate retirement-floor satisfaction or additional retirement room.

## EDGE CASES

- Person changes self-only/family coverage more than once in the year: use period-aware monthly facts.
- Eligibility toggles more than once: use period-aware monthly facts; do not collapse to final status.
- Medicare effective date predates snapshot due to retroactivity: recompute from effective date and flag excess risk if needed.
- Spouse eligibility is unknown and could change family-sharing treatment: affected spouse HSA legal room is `more_information_needed`.
- Explicit spouse allocation sums below shared base: unused ordinary capacity may remain unallocated; FFH must not auto-transfer unless household changes the allocation.
- Explicit spouse allocation exceeds shared base or is negative: invalid input; do not calculate optimistic room.
- YTD exceeds one owner's allocated ordinary+catch-up ceiling but another owner has unused ordinary allocation: if an alternate ordinary allocation could legally cure it and no agreement is recorded, return targeted allocation `more_information_needed`; otherwise flag possible excess.
- HSA long-term intent is unknown: legal capacity can still be calculated, but Phase 5A must not count HSA contributions optimistically as long-term retirement saving under existing policy.

## TRADEOFFS

Advantages:
- aligns HSA capacity with the actual month-sensitive legal structure;
- eliminates a known optimistic annual-boolean failure mode;
- avoids an unnecessary historical-deposit labeling requirement;
- supports married-family rules deterministically without inventing spouse priority;
- preserves existing missing-data locality and account-capacity invariants.

Costs:
- requires richer tax-year eligibility/coverage data and legacy reconfirmation;
- some existing HSA users will temporarily see `more_information_needed` instead of immediate room after migration;
- last-month-rule support requires explicit conditional-state UX and warnings;
- married-family alternate allocation requires a household-level choice when equal default is not workable.

## CONFIDENCE

HIGH on R3 policy direction: current account-level annual booleans are insufficient for legally supportable annual HSA capacity in all cases.

HIGH on replacing R4's blanket deposit-label blocker once a spouse ordinary-base allocation and owner ceilings are represented.

HIGH on equal allocation as the no-agreement default, owner-specific catch-ups, Medicare/monthly uncertainty, and conservative legacy handling based on FFH-005/IRS evidence.

MEDIUM on exact persistence shape because FFH-008 owns technical mapping and has not yet produced a role-owned handoff at this policy checkpoint.

## OPEN QUESTIONS FOR MANAGER SYNTHESIS

1. Which minimum period representation should be approved from FFH-008: month rows, effective-dated intervals, or another lossless equivalent?
2. Where should the household's alternate married-family ordinary-base allocation be persisted so both runtime and database semantics remain unambiguous?
3. Should the product expose projected future-month HSA capacity separately from confirmed/actual-month capacity in the UI, even if both are available to planning calculations?
4. What migration/reconfirmation UX best preserves legacy HSA records without silently treating old booleans as full-year facts?

These are data/product-integration choices, not unresolved Retirement Policy principles.

## RECOMMENDED NEXT ROLE

Manager / Architect, after FFH-008 completes its persistence/runtime analysis.

Manager should synthesize FFH-007 + FFH-008, record the approved HSA policy/data contract, and issue explicit Engineering implementation work. FFH-009 remains queued and must not begin until this FFH-007 handoff is complete.

Implementation readiness: READY FOR MANAGER SYNTHESIS WITH FFH-008. NOT READY FOR ENGINEERING UNTIL MANAGER APPROVAL.
