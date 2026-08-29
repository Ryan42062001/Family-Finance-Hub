# Phase 5 Money Priority Engine — Detailed Audit

Date: 2026-08-29
Branch: `phase-5-money-priority-engine`

## Executive result

The Phase 5 engine has a strong deterministic core across Stabilize, Secure, Build, and Optimize, but it is **not yet feature-complete against the full V2 design**.

This audit found and corrected two material correctness/architecture issues:

1. **Cross-stage over-allocation risk** — Secure monthly priorities could be displayed as allocations while Build independently consumed the full monthly plan capacity. The orchestrator now allocates capacity in stage order: Secure -> Build -> Optimize, and a new whole-engine invariant verifies total monthly allocations never exceed actual monthly plan capacity.
2. **Policy-version inconsistency** — the orchestrator could report a custom policy version while Secure and Optimize still used default thresholds. Policy is now threaded through all implemented stages, and debt/Optimize thresholds that were scattered magic numbers have been moved into versioned policy.

The audit also confirms several remaining product-scope gaps described below. These are not treated as test failures because the required calculation/data-model capability has not yet been implemented.

## Severity summary

### Fixed in this audit
- Critical: cross-stage monthly allocation could exceed capacity.
- High: Secure/Optimize did not consistently honor the engine-supplied policy.
- Medium: debt-context and mortgage Optimize thresholds were hard-coded outside versioned policy.

### Remaining gaps before full Phase 5 V2 completion
- Retirement projection-based guidance.
- Account-specific retirement allocation and current-year tax/eligibility policy.
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
| 3 | Deductible gap | Implemented | Reserve gap is prioritized and now consumes monthly capacity before downstream stages. |
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
| 15 | Benchmark retirement | Implemented | Healthy-lower benchmark and gap are calculated from gross income. |
| 16 | Projection-based retirement | Not implemented | Desired spending, guaranteed income, age and retirement age are normalized but not yet used in a projection engine. |
| 17 | Employer vs personal retirement rate | Implemented | Both employee-only and total including employer are exposed. |
| 18 | HSA unknown | Not implemented | HSA eligibility is normalized but account-specific allocation/limit logic is not built. |
| 19 | Roth eligibility unknown | Not implemented | Current-year eligibility policy not built. |
| 20 | IRA ownership unknown | Partial | Missing owner warning exists; person-level limits/eligibility are not enforced. |
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
| 37 | Missing data blocks dependent decision only | Implemented for current core | Gross income, goal date, deductible, APR and match examples isolate missing-data impact; broader tax/account allocation remains outstanding. |
| 38 | Allocation <= capacity | Implemented and hardened | Whole-engine audit invariant now covers Secure + Build + Optimize combined. |
| 39 | No cash double-count | Implemented for current cash purposes | Protected and debt-backed pools are separated; existing-cash deployment still needs its own invariants. |
| 40 | Determinism | Implemented | Same snapshot + `asOfDate` + policy produces stable output. |

## Additional implementation findings

### Goal ranking is deterministic but still score-based
Build currently creates an internal numerical priority from necessity, class, deadline, consequence and user priority. It is not exposed to users, but the V2 design prefers a transparent two-pass/lexicographic conflict model over an opaque weighted score. This should be refactored before the final user-facing explanation layer is considered complete.

### `monthlyCommittedExpenses` is not represented separately
The V2 design distinguishes essential, committed, and discretionary outflow. The current snapshot has essential vs non-essential only. A committed-expense concept will require a schema/snapshot extension rather than a calculation-only patch.

### Current-year tax policy is intentionally absent
The engine should not hard-code IRS limits or eligibility into general planning policy. Before Phase 5 account-specific allocation is implemented, add a separately versioned tax-year policy sourced from authoritative IRS guidance.

### Existing cash and future cash flow remain separate workstreams
The current allocator now correctly sequences **future monthly cash flow**. Existing `unallocatedCash` is not yet automatically deployed. When that layer is added, protected, earmarked, operating and debt-backed cash must remain non-deployable except for their explicit purposes.

## Readiness recommendation

### Ready now
- Continue backend calculation development.
- Use the engine for internal/dev inspection of recommendation ordering and monthly allocation.
- Begin designing the dashboard presentation contract around the existing recommendation type.

### Do not call Phase 5 fully complete yet
Before describing V2 as feature-complete, implement at minimum:
1. retirement projection guidance;
2. account-specific/tax-year retirement allocation;
3. existing unallocated-cash deployment;
4. specialized home and vehicle affordability;
5. Recommended Plan vs Your Plan override separation.

Windfalls and material-change persistence can follow if the initial dashboard release is explicitly scoped without them.
