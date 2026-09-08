# Regulatory & Financial Research Analyst Handoff

HANDOFF

Task ID: FFH-005
Role: Regulatory & Financial Research Analyst
Status: COMPLETE — VERIFIED FINDINGS RECORDED; MANAGER SYNTHESIS REQUIRED

Verified starting state: Initial research refresh verified `phase-5-money-priority-engine` at `711b7e895dc9cd29283af9c981cfcbe15cb4db63`. During research the shared branch advanced to `d4c23cdeb7e579196c330ffa112b0330420aa6e2`; inspection verified that the newest commit changed only `.ai/engineering/engine/HANDOFF.md` for FFH-002, so it did not overlap this role-owned artifact or alter the statutory constants/engine behavior reviewed for FFH-005.

Assigned objective: Verify current 2026 statutory/account rules materially relevant to the existing Phase 5 retirement/HSA engine and Phase 5C policy synthesis, using authoritative sources; separate external law from FFH policy; identify repository constants/documentation/behavior that is inconsistent, unsupported, or materially incomplete. No production-code or financial-policy changes.

## QUESTION

What are the current authoritative 2026 retirement-account and HSA limits/rules assigned by Manager for FFH-005, and where does the current Phase 5 repository diverge from or incompletely represent those external facts?

## WHY IT MATTERS TO FFH

Phase 5C policy synthesis must not treat remembered values, repository constants, or conservative implementation choices as statutory truth. Retirement/HSA capacity can be overstated or unnecessarily blocked if catch-up limits, shared limits, compensation rules, Roth catch-up treatment, or HSA married-family mechanics are misclassified.

## TAX YEAR / EFFECTIVE DATE

- Retirement COLA findings below are for tax/calendar year 2026. Notice 2025-67 states the 2026 adjusted amounts; the principal 2026 limits are effective January 1, 2026.
- The Roth catch-up wage threshold uses 2025 FICA wages from the plan sponsor to determine whether 2026 catch-up contributions must be Roth.
- HSA inflation-adjusted amounts in Rev. Proc. 2025-19 are effective for HSAs for calendar year 2026.
- No 2027 announced amount is used as a current 2026 rule in this handoff.

## AUTHORITATIVE FINDINGS

### 1. 401(k), 403(b), TSP, and governmental 457(b) elective deferrals — CURRENT VERIFIED RULE

For 2026 the ordinary elective-deferral limit is **$24,500** for 401(k), 403(b), the federal Thrift Savings Plan, and governmental 457(b) plans.

Age-based catch-up, if the plan permits it:
- age 50+ generally: **$8,000** additional for 2026;
- individuals who attain age 60, 61, 62, or 63 during 2026: **$11,250** instead of the ordinary $8,000 catch-up.

The age-60-through-63 amount replaces, rather than stacks on top of, the ordinary age-50 catch-up.

A catch-up contribution is also constrained by compensation: IRS guidance describes the catch-up as the lesser of the applicable catch-up dollar limit or the excess of participant compensation over non-catch-up elective deferrals.

### 2. 2026 Roth catch-up high-wage rule — CURRENT VERIFIED RULE

Beginning in 2026, an applicable-plan participant whose **prior-year wages from the plan sponsor exceeded $150,000** for the 2025 measurement year must make applicable age-based catch-up contributions as designated Roth contributions. The relevant threshold is sponsor FICA wages under section 3121(a), not household income or general AGI.

This rule applies to governmental 457(b) age-based catch-up contributions as well as applicable 401(k)/403(b)-type catch-ups. Current IRS 457(b) guidance states that if a 457(b) plan does not offer a Roth option, a participant subject to this requirement is prohibited from making the age-based catch-up; the special 457(b)(3) pre-retirement catch-up may still be pre-tax.

### 3. Governmental 457(b) special last-three-years catch-up — CURRENT VERIFIED RULE / VERIFIED MODEL BOUNDARY

A 457(b) plan may permit the special catch-up during the last three taxable years ending before normal retirement age. The maximum is based on the lesser of twice the applicable annual limit or the applicable annual limit plus qualifying unused prior-year deferral room. Where both the governmental age-50 catch-up and the special 457(b)(3) catch-up are available, the participant may use the one producing the larger permitted deferral, not both in the same year.

FFH's current decision not to grant this special catch-up without plan normal-retirement-age and prior-year utilization data is consistent with the fact that those facts are required to calculate it.

### 4. Defined-contribution annual additions and compensation — CURRENT VERIFIED RULE

For 2026, the section 415(c) defined-contribution annual-additions limit is the lesser of:
- **100% of participant compensation**, or
- **$72,000**.

Annual additions include ordinary employee elective deferrals, employer matching/nonelective contributions, and forfeiture allocations; age-based catch-up contributions are excluded from the ordinary annual-additions cap.

The 2026 section 401(a)(17) annual compensation limitation is **$360,000** for qualified-plan compensation purposes, subject to specific statutory exceptions. This compensation cap is a separate concept from the $72,000 section 415(c) annual-additions cap and must not be treated as household cash-flow capacity.

The current Phase 5 documentation's statement that the ordinary annual-additions ceiling is the lesser of $72,000 or the plan-specific compensation amount is consistent with the section 415(c) rule if `plan_eligible_compensation_annual` represents the correct statutory plan compensation input.

### 5. 403(b) 15-year-service catch-up — CURRENT VERIFIED RULE / VERIFIED MODEL BOUNDARY

A qualifying 403(b) plan may allow a separate 15-years-of-service special catch-up subject to employer type, plan permission, service, prior usage, and ordering rules. The current FFH boundary that does not grant this special catch-up without the required facts is supportable and should remain classified as an explicit modeling boundary, not as statutory ineligibility.

### 6. SIMPLE 2026 limits — CURRENT VERIFIED RULE

For 2026:
- ordinary SIMPLE employee salary-reduction limit: **$17,000**;
- higher limit for certain applicable SIMPLE plans: **$18,100**;
- ordinary age-50+ SIMPLE catch-up: **$4,000**;
- distinct age-50+ catch-up for certain applicable higher-limit SIMPLE plans: **$3,850**;
- SIMPLE age-60-through-63 catch-up: **$5,250**.

The $3,850 rule is materially important because the higher $18,100 base does not pair with the ordinary $4,000 catch-up for the affected age-50+ category.

### 7. Traditional and Roth IRA contribution limits — CURRENT VERIFIED RULE

For 2026 the combined traditional-plus-Roth IRA contribution limit for one individual is **$7,500**. For an individual age 50 or older, the IRA catch-up is **$1,100**, producing a maximum statutory dollar limit of **$8,600**, subject to compensation and Roth-income eligibility constraints.

There is no general upper age prohibition on making an IRA contribution when the compensation/eligibility requirements are met.

Ordinary IRA contribution capacity is limited by taxable compensation. For a married couple filing jointly, only one spouse needs compensation for the spousal-IRA rules to permit contributions for both spouses, but each spouse must have a separate IRA and the combined use of compensation is constrained by the statutory spousal-IRA formula. The existence of household compensation does not create one pooled IRA account limit; the dollar limit remains per individual.

For 2026 Roth IRA direct-contribution phase-outs:
- single / head of household (and MFS treated as single because spouses did not live together): **$153,000–$168,000**;
- married filing jointly / qualifying surviving spouse: **$242,000–$252,000**;
- married filing separately while living with spouse: **$0–$10,000**.

For 2026 traditional IRA deduction phase-outs when the contributor is covered by a workplace plan:
- single / head of household: **$81,000–$91,000**;
- married filing jointly: **$129,000–$149,000**;
- married filing separately: **$0–$10,000**.

When the contributor is not covered but a spouse is covered, the 2026 MFJ deduction phase-out is **$242,000–$252,000**. These are deduction/tax-treatment rules, not rules prohibiting a nondeductible traditional IRA contribution when ordinary contribution eligibility exists.

### 8. HSA base limits — CURRENT VERIFIED RULE

For calendar year 2026:
- self-only HDHP HSA contribution limit: **$4,400**;
- family HDHP HSA contribution limit: **$8,750**.

These are total contribution limits, not separate employee and employer buckets. Excludable employer contributions, including cafeteria-plan employer contributions, reduce the amount that the individual or others may otherwise contribute.

### 9. HSA age-55 catch-up — CURRENT VERIFIED RULE

An eligible individual age 55 or older by the end of the tax year can receive an additional **$1,000** HSA contribution limit. In a married couple, each spouse who qualifies for a catch-up must make that spouse's additional contribution to that spouse's own HSA; HSAs are individual accounts, not joint accounts.

Medicare enrollment matters: beginning with the first month an individual is enrolled in Medicare, that individual's HSA contribution limit for that month is zero, including when Medicare coverage is retroactive.

### 10. Married-family HSA allocation — CURRENT VERIFIED RULE

When both spouses are eligible individuals and either spouse has family HDHP coverage, the family contribution limit is shared rather than doubled. The ordinary family limit is divided equally between the spouses unless they agree on a different division. Age-55 catch-ups are added separately to the eligible spouse's own limit and must be contributed to that spouse's own HSA.

The IRS rule is therefore:
- one shared ordinary family-base limit for the eligible married pair when the family rule applies;
- spouse-specific catch-up additions;
- ordinary family-base allocation by agreement (equal by default absent a different agreement).

IRS guidance reviewed does **not** impose a requirement to label each previously deposited HSA dollar as an "ordinary" versus "catch-up" dollar. What matters is whether each spouse's total contributions fit within that spouse's allocated ordinary-family amount plus that spouse's own available catch-up, while the couple remains within the shared ordinary family limit.

### 11. HSA eligibility is monthly / last-month rule exists — CURRENT VERIFIED RULE

HSA contribution capacity depends on the months in which a person is an eligible individual and the coverage type for those months. Eligibility is generally determined on the first day of each month. A taxpayer who is eligible on the first day of the last month of the tax year may use the last-month rule to be treated as eligible for the full year, but that creates a testing-period requirement and potential income/additional-tax consequences if eligibility is not maintained.

A single annual boolean saying a person "is HSA eligible" is therefore not enough by itself to establish full-year statutory capacity for every household unless FFH explicitly defines that boolean as a verified full-year/last-month-rule-qualified fact.

## PRIMARY SOURCES

1. IRS Notice 2025-67 / Internal Revenue Bulletin 2025-49 — 2026 retirement and IRA COLA amounts, Roth catch-up threshold, SIMPLE distinctions, annual compensation limit:
   https://www.irs.gov/irb/2025-49_IRB
2. IRS Retirement Topics — Catch-up Contributions — current 2026 age-based limits and Roth catch-up rule:
   https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions
3. IRS Retirement Topics — 401(k) and Profit-Sharing Plan Contribution Limits — annual additions and treatment:
   https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits
4. IRS Retirement Topics — 403(b) Contribution Limits — 2026 limits and special 15-year catch-up:
   https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-403b-contribution-limits
5. IRS IRC 457(b) Deferred Compensation Plans — 2026 governmental 457(b) age-based catch-ups and Roth rule:
   https://www.irs.gov/retirement-plans/irc-457b-deferred-compensation-plans
6. IRS — How Much Salary Can You Defer if Eligible for More Than One Retirement Plan? — separate 457(b) treatment and special-catch-up coordination:
   https://www.irs.gov/retirement-plans/how-much-salary-can-you-defer-if-youre-eligible-for-more-than-one-retirement-plan
7. IRS Publication 590-A — IRA compensation, spousal IRA structure, Roth contribution mechanics, and the publication's "What's New for 2026" limits:
   https://www.irs.gov/publications/p590a
8. IRS Rev. Proc. 2025-19 / Internal Revenue Bulletin 2025-21 — official 2026 HSA inflation-adjusted limits and effective date:
   https://www.irs.gov/irb/2025-21_IRB
9. IRS Publication 969 — HSA eligibility, monthly/last-month rules, age-55 catch-up, married-family split, employer contributions, Medicare effects:
   https://www.irs.gov/publications/p969
10. IRS Publication 15-B (2026) — 2026 HSA employer-contribution and eligibility context:
   https://www.irs.gov/publications/p15b

## SUPPORTING SOURCES

- IRS 2026 retirement COLA overview/table:
  https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions
- IRS News Release IR-2025-111 summary of 2026 401(k)/IRA/SIMPLE changes:
  https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
- IRS 457(b) catch-up issue snapshot for special-catch-up mechanics and recordkeeping:
  https://www.irs.gov/retirement-plans/issue-snapshot-section-457b-plan-of-governmental-and-tax-exempt-employers-catch-up-contributions

## EXACT CONSTRAINT / LIMIT SUMMARY

| Item | 2026 verified amount/rule |
| --- | --- |
| 401(k)/403(b)/TSP ordinary employee deferral | $24,500 |
| Governmental 457(b) ordinary limit | $24,500, separate 457(b) limit structure |
| General age-50+ catch-up | $8,000 |
| Age 60–63 catch-up | $11,250 instead of $8,000 |
| Roth catch-up wage threshold used for 2026 | Prior-year 2025 sponsor FICA wages > $150,000 |
| Defined-contribution annual additions | Lesser of 100% compensation or $72,000; catch-up excluded |
| Qualified-plan annual compensation limit | $360,000 under §401(a)(17), subject to statutory exceptions |
| SIMPLE ordinary deferral | $17,000 |
| Certain applicable SIMPLE higher deferral | $18,100 |
| SIMPLE general age-50+ catch-up | $4,000 |
| Certain applicable SIMPLE age-50+ catch-up | $3,850 |
| SIMPLE age 60–63 catch-up | $5,250 |
| IRA traditional + Roth combined limit per person | $7,500 |
| IRA age-50+ catch-up | $1,100 |
| HSA self-only | $4,400 |
| HSA family | $8,750 |
| HSA age-55+ catch-up | $1,000 per qualifying spouse, own HSA |

## IMPORTANT DEFINITIONS

- **Elective-deferral limit**: employee salary-deferral ceiling; not the same as total annual additions.
- **Annual additions**: ordinary employee contributions plus employer contributions and specified allocations under the defined-contribution plan; age-based catch-up contributions are outside the ordinary §415(c) annual-additions cap.
- **Roth catch-up wage threshold**: prior-calendar-year section 3121(a) wages from the sponsoring employer, not household MAGI.
- **Taxable compensation for IRA purposes**: compensation recognized under IRA rules; an individual's IRA contribution cannot simply be inferred from household cash flow.
- **HSA eligible individual**: eligibility is determined under §223 and is generally month-specific; Medicare enrollment and disqualifying coverage matter.
- **HSA family base allocation**: one shared ordinary family contribution limit for qualifying married spouses when the married-family rule applies, allocated between spouses by agreement (equal absent a different agreement), with separate owner-only age-55 catch-ups.

## EMPLOYEE / EMPLOYER TREATMENT

- 401(k)/403(b)-type employee elective deferrals consume the employee deferral limit and ordinary non-catch-up deferrals also count toward annual additions.
- Employer match/nonelective contributions do not consume the employee elective-deferral limit but do count toward ordinary annual additions where §415(c) applies.
- Age-based catch-up contributions are not ordinary annual additions.
- Governmental 457(b) follows its own annual deferral/contribution limit structure and should not be folded into the 401(k)/403(b)/TSP shared §402(g) group merely because the dollar amount is also $24,500.
- HSA employee and employer contributions share the same annual statutory contribution ceiling; excludable employer contributions reduce remaining employee/other-person room.

## EDGE CASES

- Age 60–63 catch-up replaces the ordinary age-50 catch-up; do not stack both.
- Governmental 457(b) special last-three-years catch-up cannot be combined with the age-50 catch-up in the same year; use the permitted alternative that yields the larger limit.
- High-wage 2026 governmental 457(b) age-based catch-up requires Roth treatment; lack of plan Roth support can eliminate that catch-up opportunity.
- 403(b) 15-year-service catch-up requires facts FFH does not currently model.
- Roth IRA income phase-out changes contribution eligibility; traditional IRA income phase-out generally changes deductibility, not the underlying right to make a nondeductible contribution when ordinary contribution requirements are met.
- HSA Medicare enrollment and partial-year eligibility can prorate capacity; last-month-rule use creates a testing period.
- Married HSA spouses can agree to a non-50/50 division of the ordinary family base. Each qualifying spouse's $1,000 catch-up remains owner-specific.

## REPOSITORY CONSISTENCY / FINDINGS

### Finding R1 — SIMPLE higher-limit age-50 catch-up appears overstated — HIGH CONFIDENCE

Repository evidence: `money-priority-tax-policy.ts` correctly contains the 2026 $18,100 higher SIMPLE base and also contains the ordinary $4,000 SIMPLE age-50 catch-up, but does not contain the separate **$3,850** age-50 catch-up for certain applicable higher-limit SIMPLE plans. `money-priority-retirement-accounts.ts` adds $4,000 for an age-50+ SIMPLE participant even when `simpleHigherLimitEligible` selects the $18,100 higher base (except age 60–63, where it uses $5,250).

External fact: Notice 2025-67 explicitly distinguishes the $3,850 catch-up for certain applicable SIMPLE plans from the ordinary $4,000 SIMPLE catch-up.

Implication: If `simpleHigherLimitEligible` is intended to represent the same statutory "certain applicable SIMPLE" category—and the repository naming strongly indicates that it is—the engine can overstate 2026 age-50+ SIMPLE capacity by **$150** for ages outside the 60–63 super-catch-up band.

Classification: CURRENT VERIFIED RULE + repository implementation mismatch candidate. Engineering remediation requires Manager authorization; this role does not change code.

### Finding R2 — governmental 457(b) Roth catch-up requirement is not applied by current evaluator — HIGH CONFIDENCE

Repository evidence: the Roth high-wage check in `money-priority-retirement-accounts.ts` is gated to the shared workplace set containing 401(k), 403(b), and TSP; governmental 457(b) is handled separately and therefore does not receive that check.

External fact: current IRS 457(b) guidance expressly subjects applicable governmental 457(b) age-based catch-ups to the Roth high-wage rule and explains the no-Roth-option consequence.

Implication: An age-eligible 457(b) participant with 2025 sponsor wages above $150,000 can currently be shown age-based 2026 catch-up room without the required Roth-support constraint.

Classification: CURRENT VERIFIED RULE + repository implementation mismatch candidate.

### Finding R3 — HSA full-year capacity cannot be established from the current annual boolean in all cases — HIGH CONFIDENCE MODELING GAP

Repository evidence: persisted HSA fields include `hsa_eligible` as a nullable boolean and `hsa_coverage_type`; no month-level HSA eligibility/coverage facts or explicit last-month-rule qualification are persisted in the reviewed schema. The retirement capacity evaluator applies full annual base/catch-up values when the HSA is marked eligible.

External fact: HSA capacity is generally month-sensitive; Medicare enrollment, eligibility start/stop dates, coverage changes, and the last-month rule can change the annual limit.

Implication: Unless product semantics guarantee that `hsa_eligible=true` means a verified full-year or valid last-month-rule annual eligibility state, FFH can overstate legal HSA room for partial-year eligibility or Medicare-transition cases.

Classification: CURRENT VERIFIED RULE + UNRESOLVED / MODELING GAP. Manager/Application/Data/Policy must decide how FFH will represent the required facts before Engineering changes behavior.

### Finding R4 — HSA "ordinary vs catch-up YTD attribution" is not verified as a statutory requirement — HIGH CONFIDENCE POLICY/MODELING DISTINCTION

Repository documentation currently states that positive YTD contributions for a catch-up-eligible spouse make ordinary-versus-catch-up attribution information-needed before capacity can be restored.

External fact: IRS guidance frames the married rule as allocation of the ordinary family limit between spouses, plus each qualifying spouse's separate $1,000 catch-up in that spouse's own HSA. The reviewed IRS guidance does not require prior deposits to be separately labeled as ordinary versus catch-up dollars.

Implication: FFH may choose a conservative information-needed state, but that block should be classified as a **PROJECT DESIGN / CONSERVATIVE MODELING CHOICE**, not as an externally verified statutory requirement. A statutory calculation needs the couple's family-base allocation and each spouse's total HSA contributions/catch-up eligibility; it does not inherently require tagging historical deposits into two legal buckets.

Classification: CURRENT VERIFIED RULE + product-policy question for Manager/Retirement Policy.

### Finding R5 — core 2026 constants otherwise match the assigned primary-source checks — VERIFIED

The reviewed repository constants match the primary IRS amounts for:
- $24,500 ordinary workplace deferral;
- $8,000 general age-50 catch-up;
- $11,250 age-60–63 catch-up;
- $72,000 defined-contribution annual additions;
- $7,500 IRA limit and $1,100 IRA catch-up;
- Roth IRA and traditional-deduction 2026 phase-out ranges reviewed;
- HSA $4,400 self-only / $8,750 family / $1,000 age-55 catch-up;
- $150,000 2025 sponsor-wage threshold used for 2026 Roth catch-up.

The 2026 $360,000 annual compensation limit is externally verified but is not represented as a standalone constant in the reviewed tax-policy object. That absence is not by itself proven to create a current numerical error in the specific §415(c) min($72,000, compensation) path, but any FFH calculation that separately uses §401(a)(17)-limited compensation must treat $360,000 as the 2026 statutory cap unless a specific exception applies.

## UNCERTAINTIES

1. `simpleHigherLimitEligible` has no schema comment defining its statutory source. Repository names strongly map it to the same "certain applicable SIMPLE" higher-limit category, but Manager/Engineering should confirm field semantics before remediation.
2. `hsa_eligible` is not documented in the reviewed schema as "eligible for every month of the tax year" or "qualifies for full-year limit under the last-month rule." Therefore full-year capacity semantics remain unresolved.
3. Plan documents can impose limits below statutory maxima or omit optional catch-ups. This handoff establishes federal maxima/rules, not any household's plan-specific permission.
4. This research did not attempt to determine household-specific tax eligibility or plan terms; those are data inputs, not general external facts.

## IMPLICATION FOR FFH

- Manager should treat R1 and R2 as high-confidence statutory mismatches requiring explicit remediation scope before Phase 5C implementation is approved.
- Manager/Policy should treat R3 as a data-model/legal-capacity boundary: FFH needs an explicit position on full-year versus month-level HSA eligibility and last-month-rule handling.
- Manager/Retirement Policy should treat R4 as a policy/modeling choice, not as a law-driven requirement.
- Existing 403(b) special-catch-up and 457(b) special-catch-up conservative boundaries are supported by missing required facts and should not be silently converted into assumed eligibility.
- Statutory room remains distinct from recurring cash-flow capacity, employer match policy, and recommended allocation priority.

## POLICY QUESTIONS STILL REQUIRING MANAGER / POLICY DECISION

1. Should FFH support the distinct $3,850 higher-applicable-SIMPLE catch-up immediately, or mark those scenarios information-needed until the field semantics and tests are amended?
2. How should FFH represent Roth-support status for governmental 457(b) plans and enforce the high-wage 2026 Roth catch-up rule?
3. Will `hsa_eligible` be redefined/documented as a full-year verified fact, or should the data model gain month-level eligibility/coverage and last-month-rule inputs?
4. For married-family HSAs, what product policy determines the ordinary family-base allocation between spouses when the users have not specified a division? Equal default is the IRS default rule; a different agreed allocation is legally possible.
5. Should the current HSA YTD attribution blocker remain as an intentionally conservative product choice, or should legal room instead be modeled from agreed/default family-base allocation plus owner-specific catch-up capacity?

## CONFIDENCE

Overall: **HIGH**.

- 2026 dollar limits: HIGH — primary IRS Notice/Revenue Procedure/current IRS publications agree.
- Roth governmental 457(b) finding: HIGH — current IRS 457(b) page explicitly addresses it.
- SIMPLE $3,850 distinction: HIGH — Notice 2025-67 explicitly states it.
- HSA monthly/proration modeling gap: HIGH — IRS guidance is explicit and repository schema lacks month-level facts.
- HSA attribution classification: HIGH that the IRS sources reviewed do not require separate ordinary/catch-up labeling; final FFH handling remains a policy/modeling decision.

## WHAT WOULD CHANGE THIS CONCLUSION

- A superseding IRS/Treasury rule, statutory amendment, or corrected official 2026 guidance.
- Evidence that a repository field has a narrower documented semantic meaning than its current schema/name indicates (for example, `hsa_eligible` explicitly representing verified full-year eligibility, or `simpleHigherLimitEligible` representing something other than the statutory higher applicable SIMPLE category).
- Household/plan-specific documentation imposing a lower plan limit or showing an optional feature is unavailable.

Work completed: Refreshed canonical FFH state and active FFH-005 assignment; inspected 2026 tax-policy constants, retirement-account capacity implementation, tests, Phase 5 documentation, and relevant schema; verified the assigned 2026 external facts against primary IRS sources; recorded effective-year discipline, employee/employer treatment, edge cases, repository mismatches, and unresolved model/policy distinctions.

Evidence produced: This handoff plus the primary-source links above. Repository inspection identified R1–R4 and verified the core constants summarized in R5.

Tests / validation actually performed: No production tests were run and no test-pass claim is made. Validation consisted of independent primary-source cross-checking against current repository constants/implementation/documentation and stale-branch overlap verification. Existing tests were inspected only to understand current modeled behavior; no audit verdict is claimed.

Files updated: `.ai/research/regulatory/HANDOFF.md` only.

Open findings: R1 SIMPLE higher-plan catch-up mismatch candidate; R2 governmental 457(b) Roth catch-up mismatch candidate; R3 HSA partial-year/full-year eligibility data-model gap; R4 HSA YTD attribution is a product choice rather than a verified statutory requirement.

Blocking issues: None for completion of FFH-005 research. These findings block treating the affected repository behaviors as fully verified statutory behavior until Manager synthesis/remediation decisions occur.

Unverified items: Household-specific plan terms, actual Roth-feature availability for any particular plan, actual HSA eligibility months/last-month-rule qualification, and exact semantics intended by `simpleHigherLimitEligible`/`hsa_eligible` beyond what repository schema currently documents.

Recommended next role: Manager / Architect for synthesis with FFH-003 and FFH-004. Retirement Policy may consume the verified external findings; Core Engine or Application/Data work should begin only if Manager creates an authorized remediation/implementation assignment.

Exact next action: Manager synthesizes FFH-003/FFH-004/FFH-005, classifies R1–R4 into approved remediation or Phase 5C requirements, and routes only authorized implementation work. Do not begin Phase 5C production code from this research handoff alone.

Checkpoint / SHA: To be verified after this handoff commit is created.
