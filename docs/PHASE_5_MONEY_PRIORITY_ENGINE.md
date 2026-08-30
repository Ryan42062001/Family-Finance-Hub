# Phase 5 — Money Priority Engine V2

## Objective
Answer the household question: **What should I do with my money next?**

Phase 5 turns the household's saved financial profile into an explainable, deterministic plan for both existing deployable cash and future monthly cash flow. The engine uses four operating states: **Stabilize**, **Secure**, **Build**, and **Optimize**.

The engine must never automatically move money or modify live household records.

## Product principles
- Recommendations must be explainable in plain language.
- Same normalized household state + same policy version + same tax year + same preferences + same explicit as-of date = same recommendation.
- AI may explain recommendations later but may never determine ranking or allocation.
- Solvency, required obligations, insurance exposure, liquidity, and employer benefits outrank wealth optimization.
- Do not require every tax-advantaged account to be maxed before funding legitimate life goals.
- Treat retirement as a trajectory, not a binary maxed/not-maxed state.
- Known future expenses should become sinking funds instead of future emergencies.
- Preserve a distinction between **Recommended Plan** and **Your Plan** when users override recommendations.
- Missing data blocks only decisions that depend on it.
- Current tax-law limits and planning assumptions live in versioned policy rather than scattered magic numbers.

## Authoritative calculation flow

```text
normalized household snapshot
→ provisional Secure / Build / Optimize
→ existing-cash deployment
→ residual-needs snapshot
→ authoritative Secure
→ Build
→ feasibility
→ Optimize
→ normalized recommendations
```

Existing cash and recurring cash flow are separate funding resources. One-time cash deployment cannot silently become recurring capacity. Residual needs prevent the same requirement from being funded twice.

## Required outflow and committed expenses

```text
monthlyRequiredOutflow
=
monthlyEssentialExpenses
+ monthlyCommittedNonEssentialExpenses
+ monthlyMinimumDebtPayments
```

Essential expenses participate in both required cash flow and the ordinary emergency-reserve base. Nonessential expenses explicitly marked required participate in required cash flow but do not inflate the full emergency-reserve base. Discretionary expenses participate in neither. Goal and retirement contributions are not reclassified as committed expenses.

## Secure
Secure handles immediate deductible exposure, employer-match protection, high-priority debt, dedicated student-loan policy, and the authoritative emergency reserve. The deductible reserve and emergency reserve share the same protected cash pool where appropriate so dollars are not double-counted.

Ordinary emergency targets are 3–6 months according to household liquidity risk. A known, dated income disruption can create a temporary exceptional reserve above six months under the versioned exceptional-reserve policy. Household preference may raise the effective target, but cannot reduce a concrete exceptional target below the policy requirement.

Student loans use ordinary debt policy only when no material repayment-plan, forgiveness, tax, or employer-benefit consideration changes the acceleration decision. Special-strategy student loans remain separately inspectable and are not silently treated like ordinary consumer debt.

## Build
Build uses an explicit two-pass allocation order:

```text
protected required/protective goals
→ remaining required/protective goal pace
→ additional retirement
→ important goals
→ optional/lifestyle goals
```

Goal ranking is lexicographic: economic class, deadline type, consequence, months remaining, user priority, then stable ID. A lower-order preference cannot overpower a higher-order protective factor.

Retirement separates three concepts:

```text
legal contribution capacity
≠ tax eligibility / treatment
≠ engine-recommended contribution amount
```

Employer match remains exclusively a Secure concern. Additional retirement routing respects account ownership, annual capacity, shared statutory limits, tax eligibility, and supported account mechanics. Missing legal or tax facts produce targeted information-needed states rather than fabricated capacity.

## Optimize
Optimize receives only capacity remaining after Secure and Build. It handles genuine low-interest-debt/investing tradeoffs and later wealth-building choices. User preferences may influence gray zones but cannot rewrite hard guardrails.

## Existing Cash and Windfall Mode
Existing cash is reconciled before recurring allocation. Protected, earmarked, debt-backed, and operating cash remain distinct from truly unallocated cash. A minimum unallocated liquidity floor applies only after required/high Secure balance needs are covered.

Windfall Mode is a separate deterministic one-time allocator that consumes the authoritative post-existing-cash engine result. It reserves explicit tax/other liabilities and restrictions first, then follows the established hierarchy. It does not invent tax rates, convert a windfall into recurring income, or assume that a recommended windfall allocation was actually executed. Actual balance/debt/goal/account changes are what later alter the household snapshot.

## Recommended Plan versus Your Plan
The authoritative engine produces the Recommended Plan. User overrides produce a separate Your Plan and may change modeled outcomes, but never rewrite the authoritative recommendation. Overrides use stable allocation IDs and explicit active/superseded/invalid reconciliation. A stale allocation is never silently retargeted to a different recommendation.

## Material Profile Change / Recommendation Refresh V1
Recommendations are valid for the financial basis that produced them. `assessRecommendationRefresh(previous, current, previousOverrides)` is a pure deterministic comparison layer over two authoritative engine results.

The refresh layer distinguishes:

```ts
type RecommendationRefreshState =
  | "current"
  | "refresh_recommended"
  | "materially_changed"
  | "critical_change";
```

- `current`: financially relevant basis and authoritative recommendation remain current.
- `refresh_recommended`: a relevant basis, policy, assumption, tax, or explicit-time input changed, but the authoritative recommendation remains substantially equivalent.
- `materially_changed`: the recalculated authoritative recommendation or allocation meaningfully changed.
- `critical_change`: a narrow high-impact transition means the old recommendation may now be unsafe or actively inappropriate, such as loss of income causing infeasibility, a new required priority, or an active known income disruption.

A data change is not automatically a material recommendation change. The layer first detects financially relevant basis changes, then compares the already-authoritative recalculated outputs.

### Financial-basis fingerprint
The financial-basis fingerprint includes the normalized financial snapshot plus the ordinary Money Priority policy version, planning-assumptions version, tax-policy version, tax year, and explicit `asOfDate`. It is deterministic change-detection metadata, not an authentication or security primitive.

Canonicalization sorts stable-ID entity collections and normalizes money to cents. Display names, notes, titles, explanation prose, and similar presentation metadata do not create false financial staleness. Scoped Windfall policy is not included in the ordinary recommendation basis merely because Windfall Mode exists.

### Recommendation fingerprint and diffs
A separate recommendation fingerprint uses stable authoritative recommendation identity, rank, stage, state, urgency, allocations, and feasibility rather than explanation prose. The assessment exposes inspectable recommendation and allocation diffs so callers can explain what changed without reconstructing engine policy.

### Time and policy changes
Time is always explicit. Refresh logic never calls `Date.now()` or reads a wall clock. A changed `asOfDate` can matter because goal deadlines, promotional debt, disruption duration, retirement horizon, age boundaries, and tax year can change even when stored household values do not.

Relevant Money Priority, tax-policy, and planning-assumption version changes make the prior basis stale even if the household profile itself is unchanged. Scoped feature versions that do not participate in the ordinary engine basis do not create unrelated staleness.

### Override reconciliation
Refresh never mutates the previous or current engine result. Previous Your Plan overrides are reconciled against the new authoritative Recommended Plan through the existing override machinery. Missing or superseded allocation IDs remain explicit; they are never silently redirected.

### V1 boundaries
Recommendation Refresh V1 is calculation-only. It does not add event history, persistence, notifications, background jobs, automatic refresh, UI redesign, bank sync, Scenario Lab, automatic transfers/payments/trades/contributions, or runtime web calls.

## Determinism, privacy, and security
All Phase 5 calculation modules operate on supplied normalized household objects. They do not query another household, use a service-role client, call external services, or mutate live financial records. Recommendation fingerprints are not authorization tokens. The engine remains deterministic and inspectable, and no recommendation causes automatic money movement.

## Phase 5 closure status
The core Phase 5 feature set now includes the authoritative priority engine, existing-cash reconciliation, committed expenses, student-loan policy, goal ranking/two-pass Build allocation, advanced retirement-account cases, exceptional emergency reserves, Recommended Plan versus Your Plan, home and vehicle affordability, Windfall Mode, and Material Profile Change / Recommendation Refresh V1.

Before merge, Phase 5 still requires the cross-engine adversarial regression pass, documentation consistency cleanup, and final security/correctness audit.