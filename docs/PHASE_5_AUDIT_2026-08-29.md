# Phase 5 Money Priority Engine — Detailed Audit

Date: 2026-08-29
Branch: `phase-5-money-priority-engine`

## Executive result

The Phase 5 engine has a strong deterministic core across Stabilize, Secure, Build, and Optimize, but it is **not yet feature-complete against the full V2 design**.

This audit found and corrected material correctness/architecture issues and the subsequent retirement pass closed two of the largest planning gaps:

1. **Cross-stage over-allocation risk** — capacity now flows Secure -> Build -> Optimize and a whole-engine invariant verifies total monthly allocations never exceed plan capacity.
2. **Policy-version inconsistency** — engine-supplied policy now propagates through implemented stages; debt and mortgage thresholds are versioned.
3. **Shared-reserve double counting** — deductible-reserve allocations now reduce the remaining full-emergency-fund need in the same monthly plan.
4. **Projection-based retirement guidance** — when age, retirement age, desired spending, spending basis and sufficient planning inputs are present, projection guidance becomes primary over the generic savings-rate benchmark.
5. **Versioned 2026 tax policy and account opportunities** — the engine now models known contribution room for supported workplace plans and HSAs, including age-based catch-ups, while refusing to fabricate IRA eligibility/deductibility when tax-profile inputs are missing.

## Severity summary

### Fixed in this audit / follow-up
- Critical: cross-stage monthly allocation could exceed capacity.
- High: Secure/Optimize did not consistently honor the engine-supplied policy.
- High: deductible and full-emergency allocations could double-fund the same shared reserve need.
- Medium: debt-context and mortgage Optimize thresholds were hard-coded outside versioned policy.
- Medium: retirement guidance was benchmark-only even when projection inputs existed.
- Medium: contribution limits/account room had no separately versioned tax-year policy.

### Remaining gaps before full Phase 5 V2 completion
- Full Roth IRA eligibility and Traditional IRA deductibility decisions once filing-status/MAGI/workplace-coverage tax inputs exist.
- More detailed account-quality/tax-diversification allocation beyond contribution-room visibility.
- Dedicated student-loan policy beyond the existing forgiveness/special-case signal.
- Specialized home-purchase affordability.
- Specialized vehicle total-cost affordability.
- Existing unallocated-cash deployment.
- Windfall planning.
- Recommended Plan vs Your Plan override modeling.
- Persisted material-change/recommendation-refresh behavior.
- Full need-vs-upgrade use of `coreNeedAmount` in goal allocation.

## Original 40-scenario coverage matrix

| # | Scenario | Status | Audit note |
|---:|---|---|---|
| 1 | Negative cash flow | Implemented | Stabilize recommendation precedes downstream stages. |
| 2 | Missing deductible | Implemented | Returns more-information-needed without fabricating target. |
| 3 | Deductible gap | Implemented | Reserve gap is prioritized and consumes monthly capacity before downstream stages. |
| 4 | Missing employer match | Implemented | Match-dependent decision is blocked only where data is missing. |
| 5 | Employer match despite high-interest debt | Implemented | Match is ordered before ordinary high-interest debt. |
| 6 | 24% credit card | Implemented | Hard high-interest priority. |
| 7 | 9% debt | Implemented | Starts accelerate under versioned context policy. |
| 8 | 5% gray-zone debt | Implemented | Starts scheduled/context; bounded modifier can move one posture. |
| 9 | Mortgage excluded from Secure ordinary debt | Implemented | Mortgage is routed to Optimize. |
| 10 | Promo reset | Implemented | Deterministic payoff pace using explicit `asOfDate`; debt-backed reserve offsets only linked debt. |
| 11 | Student forgiveness | Partial | A recorded forgiveness/repayment program triggers special handling, but dedicated student-loan policy is not complete. |
| 12 | Low-risk emergency fund | Implemented | Risk-tier target supported. |
| 13 | High-risk emergency fund | Implemented | Risk score supports high tier. |
| 14 | Extended emergency fund | Partial | Explicit household override >6 months works; automatic exceptional-risk extension is not modeled. |
| 15 | Benchmark retirement | Implemented | Healthy-lower benchmark remains available as a fallback when projection inputs are incomplete. |
| 16 | Projection-based retirement | Implemented | Projection uses desired spending, guaranteed-income assumptions, current assets/contributions, retirement horizon, versioned real-return and withdrawal-rate assumptions. |
| 17 | Employer vs personal retirement rate | Implemented | Both employee-only and total including employer are exposed. |
| 18 | HSA unknown | Implemented | HSA eligibility/coverage/YTD gaps return targeted more-information-needed; known 2026 room includes employee+employer contributions and age-55 catch-up. |
| 19 | Roth eligibility unknown | Partial | 2026 Roth phaseouts are versioned, but profile lacks filing-status/MAGI fields, so direct eligibility is intentionally not guessed. |
| 20 | IRA ownership unknown | Partial | Owner and shared IRA room are evaluated; full tax eligibility/deductibility still requires additional profile inputs. |
| 21 | Necessary car in five years | Partial | Generic required/protective goal pacing works; specialized vehicle affordability does not. |
| 22 | Car vs retirement | Implemented at generic-goal level | Required protective goal can outrank retirement in constrained Build allocation. |
| 23 | Multiple necessary goals over capacity | Implemented | Structural funding gap and deterministic constrained allocation supported. |
| 24 | Lifestyle goal receives residual | Implemented | Optional/lifestyle goals receive lower priority/residual capacity. |
| 25 | Home down payment okay but carrying cost not | Not implemented | Specialized home affordability model absent. |
| 26 | Vehicle payment okay but total cost not | Not implemented | Insurance/fuel/maintenance/TCO model absent. |
| 27 | 0% debt plus debt-backed reserve | Implemented | Linked reserve is not reused for emergency/goal purposes. |
| 28 | New debt preserves liquidity | Not implemented | Financing-vs-cash purchase decision model absent. |
| 29 | Earmarked cash untouched | Implemented for current reserve math | Earmarked cash does not satisfy protected reserve; broader existing-cash deployment is not yet built. |
| 30 | Unallocated cash redeployed | Not implemented | `unallocatedCash` is normalized but not deployed by the engine. |
| 31 | Windfall creates no recurring commitments | Not implemented | No windfall input/allocation mode yet. |
| 32 | Guilt-free windfall allocation | Not implemented | No windfall mode yet. |
| 33 | Mortgage debt-focused preference | Implemented | Preference moves Optimize recommendation one posture toward payoff. |
| 34 | Mortgage growth-focused preference | Implemented | Preference moves Optimize recommendation one posture toward investing. |
| 35 | Recommended Plan vs Your Plan | Not implemented | Override/projection separation not built. |
| 36 | Material profile change | Not implemented | No persisted recommendation snapshot/change-trigger layer yet. |
| 37 | Missing data blocks dependent decision only | Implemented for current core | Missing tax/account data now blocks only account-specific decisions while projection/benchmark/other stages continue where possible. |
| 38 | Allocation <= capacity | Implemented and hardened | Whole-engine invariant covers Secure + Build + Optimize combined. |
| 39 | No cash double-count | Implemented for current cash purposes | Protected reserve dollars are shared across deductible/full emergency need; debt-backed pools remain isolated. Existing-cash deployment still needs its own invariants. |
| 40 | Determinism | Implemented | Same snapshot + `asOfDate` + policy produces stable output. |

## Additional implementation findings

### Goal ranking is deterministic but still score-based
Build currently creates an internal numerical priority from necessity, class, deadline, consequence and user priority. It is not exposed to users, but the V2 design prefers a transparent two-pass/lexicographic conflict model over an opaque weighted score. This should be refactored before the final user-facing explanation layer is considered complete.

### `monthlyCommittedExpenses` is not represented separately
The V2 design distinguishes essential, committed, and discretionary outflow. The current snapshot has essential vs non-essential only. A committed-expense concept will require a schema/snapshot extension rather than a calculation-only patch.

### Tax policy is now versioned, but tax profile data is still incomplete
2026 contribution limits and Roth IRA phaseouts now live in a separate tax policy. The calculation layer can evaluate known workplace/HSA contribution room. Filing status, MAGI and workplace-plan coverage still need to be modeled before direct Roth eligibility or Traditional IRA deductibility can be recommended.

### Existing cash and future cash flow remain separate workstreams
The current allocator correctly sequences **future monthly cash flow**. Existing `unallocatedCash` is not yet automatically deployed. When that layer is added, protected, earmarked, operating and debt-backed cash must remain non-deployable except for their explicit purposes.

## Readiness recommendation

### Ready now
- Continue backend calculation development.
- Use the engine for internal/dev inspection of recommendation ordering, retirement projection, account contribution room, and monthly allocation.
- Begin designing the dashboard presentation contract around the existing recommendation type.

### Do not call Phase 5 fully complete yet
Before describing V2 as feature-complete, implement at minimum:
1. tax-profile inputs needed for full IRA eligibility/deductibility and richer account-specific allocation;
2. existing unallocated-cash deployment;
3. specialized home and vehicle affordability;
4. Recommended Plan vs Your Plan override separation.

Windfalls, student-loan specialization, and material-change persistence can follow if the initial dashboard release is explicitly scoped without them.
