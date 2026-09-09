# FFH-005 — 2026 Regulatory Research Revalidation Addendum

Date: 2026-09-08
Role: Regulatory & Financial Research Analyst
Classification: EXTERNAL-FACT REVALIDATION ONLY — NO FFH POLICY DECISION

## Canonical context

This addendum revalidates completed FFH-005 research against the live Phase 5 repository and current authoritative government guidance. At the start of this revalidation, `phase-5-money-priority-engine` was `f6a138e78083afe6bdf83bc42117c705bda9ca09`. During research, Manager advanced the shared branch to the FFH-PW-002 assignment state. Current canonical Manager state marks FFH-005 COMPLETE and Regulatory Research IDLE; this addendum therefore records factual verification and routes any newly identified issue back to Manager rather than creating policy or production work.

No 2027 amount is treated as a current 2026 rule.

## Source hierarchy

Primary authority used:

1. IRS Notice 2025-67 / Internal Revenue Bulletin 2025-49 — 2026 retirement/IRA/SIMPLE COLA limits and Roth catch-up wage threshold
   - https://www.irs.gov/irb/2025-49_IRB
2. IRS Retirement Topics — Catch-up Contributions
   - https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions
3. IRS Retirement Topics — 401(k) and Profit-Sharing Plan Contribution Limits
   - https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits
4. IRS Retirement Topics — 403(b) Contribution Limits
   - https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-403b-contribution-limits
5. IRS IRC 457(b) Deferred Compensation Plans
   - https://www.irs.gov/retirement-plans/irc-457b-deferred-compensation-plans
6. IRS — How Much Salary Can You Defer if Eligible for More Than One Retirement Plan?
   - https://www.irs.gov/retirement-plans/how-much-salary-can-you-defer-if-youre-eligible-for-more-than-one-retirement-plan
7. IRS Retirement Topics — IRA Contribution Limits
   - https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-ira-contribution-limits
8. IRS Publication 590-A — IRA compensation and Kay Bailey Hutchison spousal IRA rules
   - https://www.irs.gov/publications/p590a
9. IRS Rev. Proc. 2025-19 / Internal Revenue Bulletin 2025-21 — 2026 HSA inflation-adjusted limits
   - https://www.irs.gov/irb/2025-21_IRB
10. IRS Publication 969 — HSA eligibility, married-family allocation, employer contributions, Medicare and catch-up rules
    - https://www.irs.gov/publications/p969
11. IRS Publication 15-B (2026) — employer HSA contribution/eligibility context
    - https://www.irs.gov/publications/p15b
12. Treasury Decision 10033 / Internal Revenue Bulletin 2025-40 — final catch-up regulations and applicability dates
    - https://www.irs.gov/irb/2025-40_IRB
13. Federal Retirement Thrift Investment Board / Federal Register materials confirming TSP is subject to IRC sections 402(g) and 415(c)
    - https://www.govinfo.gov/content/pkg/FR-2020-11-16/pdf/2020-24502.pdf

## Effective-year discipline

### CURRENT VERIFIED RULE — tax/calendar year 2026

The retirement and IRA dollar limits below apply for 2026. Notice 2025-67 supplies the indexed amounts used for the 2026 tax/calendar year.

The Roth catch-up wage threshold uses prior-calendar-year sponsor FICA wages: the indexed threshold for 2025 wages used to determine 2026 Roth catch-up treatment is $150,000. The statutory Roth catch-up requirement operates beginning in 2026. T.D. 10033 is effective November 17, 2025, but its catch-up regulations generally apply to contributions in taxable years beginning after December 31, 2026; before their general regulatory applicability date, Treasury/IRS state that a reasonable, good-faith interpretation standard applies to the statutory provisions. Do not misstate the general regulatory applicability date as the source of a 2026 deferral from the statutory requirement.

Rev. Proc. 2025-19 is expressly effective for HSAs for calendar year 2026.

## Verified statutory / regulatory facts

### A. 401(k), 403(b), TSP, and governmental 457(b) ordinary limits — CURRENT VERIFIED RULE

- 2026 ordinary employee elective-deferral limit: **$24,500**.
- 2026 general age-50+ catch-up: **$8,000**, if permitted/applicable.
- For a participant who attains age 60, 61, 62, or 63 during 2026: **$11,250** catch-up **instead of** the ordinary $8,000 catch-up.
- Catch-up contribution room is also limited by the participant's compensation relative to non-catch-up elective deferrals.
- Governmental 457(b) keeps a separate statutory deferral structure from the shared 401(k)/403(b)-type elective-deferral grouping; the similar 2026 dollar amount does not make the groups one shared bucket.

Repository consistency: the core $24,500 / $8,000 / $11,250 amounts match `money-priority-tax-policy.ts`, and the age-60–63 amount is modeled as replacement rather than stacking.

### B. Roth catch-up high-wage treatment — CURRENT VERIFIED RULE

For 2026, if prior-year wages from the plan sponsor **exceeded $150,000** in 2025, applicable age-based catch-up contributions are subject to Roth treatment. The measure is sponsor FICA wages under section 3121(a), not household MAGI or household income.

Current IRS governmental 457(b) guidance expressly applies the Roth catch-up requirement to governmental 457(b) age-based catch-up contributions and states that, for a participant subject to the requirement, a 457(b) plan without a Roth option can eliminate the age-based catch-up opportunity. The special 457(b)(3) last-three-years catch-up remains distinct.

Repository consistency: the threshold constant and strict `> $150,000` boundary are correct for 2026. The current evaluator applies the sponsor-wage/Roth-support test to 401(k), 403(b), and TSP but not governmental 457(b). This reaffirms prior **R2** as a high-confidence implementation mismatch candidate.

### C. Defined-contribution annual additions — CURRENT VERIFIED RULE

For 2026 the section 415(c) annual-additions limit is generally the lesser of:

- **100% of participant compensation**, or
- **$72,000**.

Ordinary employee elective deferrals, employer matching/nonelective contributions, and forfeiture allocations count toward annual additions. Age-based catch-up contributions are excluded from ordinary annual additions.

The 2026 section 401(a)(17) annual compensation limitation is **$360,000**, subject to statutory exceptions and the governing plan's compensation definition. This is distinct from the $72,000 annual-additions ceiling and from household cash-flow capacity.

TSP is also subject to IRC section 415(c); federal plan materials describe traditional, Roth, tax-exempt, matching, and automatic contributions as subject to that overall limit, with catch-up treatment separate.

Repository consistency: the $72,000 annual-additions constant and employee+employer aggregation are supported. The repository appropriately demands plan-specific compensation for its 401(k)/403(b)/TSP annual-additions path rather than substituting household income. Any use of plan compensation must still reflect the correct plan/statutory compensation definition.

### D. 403(b) 15-year service catch-up — CURRENT VERIFIED RULE / VERIFIED DEFERRED BOUNDARY

A qualifying 403(b) plan may permit a 15-years-of-service special catch-up. It depends on eligible employer/service status, plan permission, prior use, and prior deferrals, and has its own ordered calculation.

PROJECT MODEL / BOUNDARY: FFH currently does not grant the special 15-year catch-up because the required service, plan-permission, prior-use, and historical-deferral facts are not modeled. That conservative boundary is supported. It must be described as an unmodeled optional/special rule, not statutory ineligibility.

### E. Governmental 457(b) special last-three-years catch-up — CURRENT VERIFIED RULE / VERIFIED DEFERRED BOUNDARY

A governmental 457(b) plan may permit the special last-three-years catch-up during the three taxable years before normal retirement age, based on the statutory formula using the ordinary limit and qualifying unused prior-year deferral room. If both the governmental age-based catch-up and special 457(b)(3) catch-up are available, the participant uses the permitted alternative that yields the larger contribution limit rather than stacking both.

PROJECT MODEL / BOUNDARY: FFH's current decision not to grant this special catch-up without plan normal-retirement-age and prior-year utilization data is supportable and should remain classified as a missing-data/modeling boundary.

### F. SIMPLE 2026 limits — CURRENT VERIFIED RULE

- Ordinary SIMPLE salary-reduction limit: **$17,000**.
- Higher limit for certain applicable SIMPLE plans: **$18,100**.
- General age-50+ SIMPLE catch-up: **$4,000**.
- Distinct age-50+ catch-up for certain applicable higher-limit SIMPLE plans: **$3,850**.
- SIMPLE age-60-through-63 catch-up: **$5,250**.

Repository consistency: `simpleHigherLimitEligible` selects the $18,100 base but the current helper adds the general $4,000 catch-up for age 50+ outside the 60–63 band. Assuming the field represents the statutory higher-applicable-SIMPLE category, current capacity is overstated by **$150** for affected ages 50–59 and 64+. This reaffirms prior **R1**. Field semantics should be confirmed before Engineering changes logic, exactly as Manager assigned in FFH-006.

### G. IRA contribution limits and compensation — CURRENT VERIFIED RULE

For 2026, combined traditional + Roth IRA contributions for an individual cannot exceed the lesser of:

- **$7,500** (**$8,600** if age 50 or older), or
- the applicable taxable-compensation amount for the year.

There is no general upper-age prohibition when contribution requirements are otherwise met.

For married filing jointly, only one spouse needs compensation for the spousal-IRA rules to permit both spouses to contribute to separate IRAs. However, the statutory formula does not create one pooled IRA account or prescribe a fixed owner-ID allocation of scarce joint compensation. Publication 590-A describes the lower-compensation spouse's limit as the lesser of that spouse's individual dollar limit or joint compensation reduced by the other spouse's actual traditional and Roth IRA contributions.

Repository consistency: the total household compensation guard in the current MFJ IRA path prevents total modeled contributions from exceeding represented joint compensation. But when joint compensation is scarce, the current implementation allocates legal room sequentially by sorted owner ID (for example, $7,500 then $2,500 from $10,000 of joint compensation). That deterministic split is **PROJECT MODELING**, not a statutory fixed owner-specific capacity allocation. It can understate the second spouse's legally possible room when the first spouse actually contributes less. See new finding **R6** below.

Important IRA compensation definition: IRA compensation can include categories beyond a naive taxable-wage field, including self-employment income and specified items such as nontaxable combat pay and military differential pay. FFH's `estimated_taxable_compensation_annual` should therefore not be assumed externally equivalent to every statutory IRA-compensation case unless its data semantics explicitly capture the needed categories.

### H. HSA 2026 base limits and employer treatment — CURRENT VERIFIED RULE

For calendar year 2026:

- self-only HDHP HSA contribution limit: **$4,400**;
- family HDHP HSA contribution limit: **$8,750**.

Employer and employee/other-person contributions consume the same statutory contribution ceiling. Excludable employer contributions, including cafeteria-plan employer contributions, reduce the remaining amount that the individual or others may contribute.

Repository consistency: the $4,400/$8,750 constants and employee+employer YTD aggregation are supported.

### I. HSA age-55 catch-up and married-family mechanics — CURRENT VERIFIED RULE

A qualified HSA-eligible individual age 55 or older receives an additional **$1,000** contribution limit. Each qualifying spouse needs a separate HSA for that spouse's catch-up contribution.

When both spouses are eligible individuals and the married-family rule applies, there is one ordinary family-base limit rather than two family limits. The family limit is split equally absent a different agreement between the spouses. Each qualifying spouse's $1,000 catch-up remains spouse-specific and must go to that spouse's own HSA.

Employer contributions remain part of the same annual ceiling.

### J. HSA eligibility is month-sensitive — CURRENT VERIFIED RULE

HSA eligibility and coverage can be month-specific. Employer guidance states qualified-individual status is determined monthly. Medicare enrollment makes an individual's HSA contribution limit zero beginning with the first enrolled month, including retroactive Medicare coverage. The last-month rule can permit full-year treatment in qualifying circumstances but brings a testing-period requirement.

Repository consistency: current persistence provides an annual nullable `hsa_eligible` boolean and coverage type on HSA account records, and the evaluator grants the full annual base/catch-up when those fields are affirmative. Unless `hsa_eligible=true` is explicitly a verified full-year/valid-last-month-rule fact, the current model can overstate capacity for partial-year eligibility, coverage changes, or Medicare-transition cases. This reaffirms prior **R3** as a high-confidence data/model gap.

### K. HSA ordinary-vs-catch-up YTD attribution — STATUTORY FACT VS PROJECT POLICY

STATUTORY / REGULATORY FACT: the married-family ordinary base is allocated between spouses, and each qualifying spouse has a separate owner-specific $1,000 catch-up. IRS guidance reviewed does not impose a separate legal requirement that each historical HSA deposit be tagged as an "ordinary" versus "catch-up" dollar.

PROJECT POLICY / MODELING: the current FFH evaluator blocks additional married-family HSA room whenever a catch-up-eligible spouse has positive YTD contributions unless ordinary-versus-catch-up attribution is separately confirmed. That may be a deliberately conservative modeling rule, but it is not established by the reviewed IRS guidance as a statutory labeling requirement. This reaffirms prior **R4**.

## Repository findings after revalidation

### R1 — REAFFIRMED — HIGH CONFIDENCE
Certain higher-applicable-SIMPLE age-50 catch-up is $3,850, not $4,000. Current higher-base helper appears to overstate affected capacity by $150 if `simpleHigherLimitEligible` maps to that statutory category.

Classification: CURRENT VERIFIED RULE + implementation mismatch candidate.

### R2 — REAFFIRMED — HIGH CONFIDENCE
Governmental 457(b) age-based catch-up is subject to the 2026 high-wage Roth rule. Current evaluator does not apply its sponsor-wage/Roth-support test to 457(b).

Classification: CURRENT VERIFIED RULE + implementation mismatch candidate.

### R3 — REAFFIRMED — HIGH CONFIDENCE
Full-year HSA capacity cannot be established in every case from an annual boolean and annual coverage type because eligibility/coverage/Medicare timing can be month-sensitive.

Classification: CURRENT VERIFIED RULE + data/modeling gap.

### R4 — REAFFIRMED — HIGH CONFIDENCE
IRS guidance does not establish ordinary-vs-catch-up labeling of historical HSA deposits as a statutory prerequisite. The current attribution blocker is an FFH conservative modeling choice unless Manager/Policy deliberately retains it.

Classification: STATUTORY FACT + PROJECT POLICY distinction.

### R6 — NEW REVALIDATION FINDING — HIGH CONFIDENCE
The current MFJ IRA compensation path sequentially allocates scarce joint compensation by sorted owner ID before presenting per-owner annual room. The Kay Bailey Hutchison spousal-IRA rule instead relates the lower-compensation spouse's allowable contribution to joint compensation reduced by the other spouse's **actual IRA contributions**; it does not prescribe a permanent first-owner/second-owner legal-capacity split.

Impact: current logic remains conservative in aggregate and does not by itself create joint IRA room above represented compensation, but it can understate one spouse's legally possible contribution room and can make a deterministic engineering allocation appear like statutory owner-specific capacity. This matters to routing and legal-capacity semantics when joint compensation is below the sum of both individual limits.

Classification: CURRENT VERIFIED RULE + PROJECT MODELING / legal-capacity representation issue. Manager should decide whether this warrants a new remediation task; Regulatory Research does not prescribe the product solution.

## No-conflict / confirmed repository assumptions

- $24,500 ordinary workplace/457 limit: verified.
- $8,000 general age-50 catch-up: verified.
- $11,250 age-60–63 catch-up replacing the ordinary catch-up: verified.
- $72,000 section 415(c) annual-additions dollar ceiling: verified.
- $7,500 IRA limit / $1,100 IRA catch-up: verified.
- $4,400 HSA self-only / $8,750 family / $1,000 age-55 catch-up: verified.
- $150,000 2025 sponsor-wage threshold used for 2026 Roth catch-up treatment: verified.
- 403(b) 15-year special catch-up deferral: supportable as a deliberate missing-data boundary.
- governmental 457(b) last-three-years special catch-up deferral: supportable as a deliberate missing-data boundary.
- employee and employer HSA contributions sharing the same HSA statutory limit: verified.

## Uncertainties / plan-specific limits

1. A particular employer plan can impose lower limits or omit optional catch-up/Roth features. General federal maxima do not prove household-specific plan permission.
2. `simpleHigherLimitEligible` is not documented strongly enough in schema comments to prove its exact statutory mapping; Manager correctly instructed FFH-006 to verify semantics before changing R1.
3. `hsa_eligible` is not documented as full-year or last-month-rule-qualified eligibility; R3 therefore remains unresolved pending FFH-007/008 policy/data-contract work.
4. Married spouses may agree to a family-HSA ordinary-base allocation other than equal. Whether FFH requires explicit agreement, uses the IRS equal default, or models a proposed allocation is a product/policy/data decision, not a new external rule.
5. Household-specific IRA compensation may include statutory compensation categories not obviously represented by the current field name. Exact household eligibility depends on accurate data semantics.

## Implication for Phase 5C

STATUTORY / REGULATORY FACT establishes legal account capacity and tax/plan constraints. It does **not** determine whether FFH should prioritize retirement over a goal, protect a retirement floor, or choose among legally available destinations. Those remain Manager-approved FFH policy.

The Phase 5C competition policy must consume only legally supportable retirement capacity. R1/R2/R3 remain known pre-existing correctness blockers under current Manager state. R4 remains a policy/data-model choice. R6 should be surfaced to Manager because it affects whether current IRA owner-specific capacity is being presented more narrowly than the statutory feasible set.

## Confidence

Overall: HIGH.

- 2026 indexed dollar limits: HIGH.
- governmental 457(b) Roth catch-up application: HIGH.
- SIMPLE $3,850 distinction: HIGH.
- HSA monthly/proration and married mechanics: HIGH.
- R4 classification as project modeling rather than statutory deposit-labeling requirement: HIGH based on reviewed IRS guidance.
- R6 spousal-IRA allocation distinction: HIGH; the statute/publication formula is contribution-dependent rather than a fixed owner-ID allocation. Product remediation, if any, is outside this role.

## What would change these conclusions

- Superseding IRS/Treasury guidance, statutory amendment, or corrected official 2026 guidance.
- Verified repository semantics showing a field represents a narrower fact than its current name/schema/documentation indicates.
- Household/plan-specific documentation imposing lower or different plan terms.
- A later Manager-approved data contract that explicitly encodes full-year HSA eligibility, HSA family allocation agreement, or dynamic spousal-IRA compensation sharing.
