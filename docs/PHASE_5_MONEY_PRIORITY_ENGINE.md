# Phase 5 — Money Priority Engine V2

## Objective
Answer the household question: **What should I do with my money next?**

Phase 5 turns the household's saved financial profile into an explainable, deterministic plan for both:
- existing deployable cash, and
- future monthly cash flow.

The engine is FOO-inspired but not a static nine-step checklist. The researched V2 model uses four operating states:

1. **Stabilize** — fix negative cash flow and immediate financial exposure.
2. **Secure** — capture employer benefits, eliminate harmful debt, and establish liquidity.
3. **Build** — keep retirement and necessary future expenses on a sustainable trajectory.
4. **Optimize** — allocate excess capacity across tax-advantaged investing, low-interest debt, taxable investing, major goals, and lifestyle preferences.

The engine must never automatically move money or modify live household records.

## Product principles
- Recommendations must be explainable in plain language.
- Same normalized household state + same policy version + same tax year + same preferences = same recommendation.
- AI may explain recommendations later but may never determine ranking or allocation.
- Solvency, required obligations, insurance exposure, liquidity, and employer benefits outrank wealth optimization.
- Do not require every tax-advantaged account to be maxed before funding legitimate life goals.
- Treat retirement as a trajectory, not a binary `maxed / not maxed` state.
- Known future expenses should become today's sinking funds instead of tomorrow's emergencies.
- When two good priorities conflict, show the funding conflict and recommend an allocation rather than pretending both can be fully funded.
- User preferences may influence gray-zone decisions but must not rewrite hard financial guardrails.
- Preserve a distinction between **Recommended Plan** and **Your Plan** when users override recommendations.
- Missing data blocks only the decisions that depend on it.
- Current tax-law limits and planning assumptions must live in versioned policy rather than scattered magic numbers.

---

# Engine State 1 — Stabilize

## Priority 0 — Required obligations and cash-flow sanity

Normalize monthly cash flow before optimization.

```ts
monthlyRequiredOutflow =
  monthlyEssentialExpenses
  + monthlyCommittedExpenses
  + monthlyMinimumDebtPayments;

monthlyPlanCapacity =
  monthlyTakeHomeIncome
  - monthlyRequiredOutflow
  - monthlyPlannedDiscretionarySpending;
```

Discretionary spending is not automatically treated as available money. The engine respects the current household lifestyle unless that lifestyle prevents higher-priority needs from being met.

If take-home income is below required obligations, the engine enters **Stabilize** mode.

The engine should:
- quantify the recurring deficit,
- identify reasonable discretionary reductions,
- identify goals or contributions above protected floors that can flex,
- avoid eliminating employer-match contributions as the first solution,
- state when spending cuts alone cannot solve the problem.

The engine should not recommend extra debt payments, additional retirement investing, taxable investing, or accelerated optional goals while required cash flow is negative.

### Plan feasibility
Before allocating discretionary capacity, calculate the monthly pace required by protected priorities.

```ts
planFundingGap =
  protectedMonthlyFundingNeed
  - availableMonthlyCapacity;
```

Expose a user-facing state such as:
- `Feasible`
- `Tight`
- `Funding gap: $X/month`

When the plan is infeasible, the engine may recommend changing the plan itself: target amount, timeline, discretionary spending, contribution level above a protected floor, purchase scope, or income assumptions.

---

## Priority 1 — Immediate deductible reserve

The starter reserve follows the FOO-style deductible concept rather than the previous one-month-expense rule.

### V2 rule

```ts
starterReserveTarget = max(relevantImmediateInsuranceDeductibles);
```

Relevant exposures may include:
- health insurance deductible,
- auto deductible,
- homeowners/renters deductible,
- other genuine insurance deductibles.

Normalize percentage-based deductibles to dollar amounts where possible.

The health-plan out-of-pocket maximum should be tracked as additional risk context but does not automatically become the Stage 1 target.

Only genuinely liquid, unencumbered cash counts toward this reserve. Retirement balances, home equity, and long-term investments do not.

If deductible data is missing, return targeted `data_needed` guidance rather than inventing a target.

---

# Engine State 2 — Secure

## Priority 2 — Capture 100% of available employer match

Employer match remains a protected priority even when high-interest debt exists.

Each person's workplace plan is evaluated independently.

V1 may support the simple input:

```ts
fullMatchEmployeeContributionMonthly
```

The engine should also be designed to grow into detailed match modeling using:
- salary / eligible compensation,
- employee contribution percentage,
- employer match formula,
- pay frequency,
- YTD employee contributions,
- YTD employer contributions,
- true-up status,
- annual statutory limits.

Do not infer a match formula from observed employer contributions.

If the match requirement is unknown, surface `data_needed` for the match-dependent decision while continuing unrelated recommendations.

---

## Priority 3 — High-interest and gray-zone debt

Ordinary non-mortgage consumer debt uses four researched V2 bands.

| APR | Default treatment |
| ---: | --- |
| **>= 10%** | Hard high-interest priority |
| **6.00–9.99%** | Payoff-favored judgment zone |
| **4.00–5.99%** | True gray zone |
| **< 4%** | Usually later wealth optimization |

### Hard high-interest debt
Debt at or above 10% APR remains a hard recommended priority after the deductible reserve and employer match.

User preference cannot make discretionary investing outrank this debt in the Recommended Plan. Users may still override the plan.

Within the hard band, rank primarily by APR, then deterministic tie-breakers such as smaller balance and stable ID.

### Judgment-zone debt
Do not use a hidden black-box score.

Use deterministic starting positions plus bounded modifiers.

Suggested starting treatment:

| APR | Starting treatment |
| ---: | --- |
| 8.00–9.99% | Accelerate payoff |
| 6.00–7.99% | Split / payoff favored |
| 4.00–5.99% | Scheduled payments / context dependent |

Strong modifiers toward faster payoff include:
- <= 10 years until planned retirement,
- meaningful variable-rate/reset risk,
- severe required debt-payment burden on take-home cash flow.

Moderate modifiers include:
- near-term payoff would release meaningful monthly cash flow,
- debt-focused preference,
- >= 25-year investment horizon in the opposite direction,
- growth-focused preference in the opposite direction.

A strong modifier may move the starting recommendation one level. Generally two aligned moderate modifiers are required to move one level. A yellow/gray debt may move at most one level from its starting treatment.

Retirement trajectory should be considered in the final allocation but should not be a direct debt-risk modifier by itself.

### Income measures
Use both:
- take-home income for monthly cash-flow pressure,
- gross income for standardized savings and affordability metrics.

### Special debt policies
The following should bypass the ordinary APR bands and use dedicated policy logic:
- mortgage debt,
- 0% promotional balances,
- student loans,
- tax debt,
- collections/delinquent obligations,
- debts with legal or essential-service consequences.

A promotional balance should be treated as a deadline liability when a high reset APR is approaching.

```ts
promoRequiredMonthlyPaydown =
  remainingPromoBalance / monthsUntilPromoExpiration;
```

Student-loan acceleration must account for repayment-plan and forgiveness considerations before treating APR alone as decisive.

---

## Priority 4 — Full emergency reserve

Use a personalized liquidity-risk tier rather than a universal fixed target.

| Household liquidity risk | Recommended reserve |
| --- | ---: |
| Low | 3 months |
| Moderate | 4 months |
| Elevated | 5 months |
| High | 6 months |
| Extended / temporary exceptional risk | > 6 months when justified |

Risk factors include:
- income concentration,
- income volatility,
- job replacement difficulty,
- dependents,
- known income disruption,
- unusual insurance or medical exposure,
- major life-event liquidity needs.

Use essential required outflow rather than total lifestyle spending.

```ts
emergencyFundMonthlyBase =
  monthlyEssentialExpenses
  + monthlyMinimumDebtPayments;

fullEmergencyTarget =
  recommendedEmergencyMonths
  * emergencyFundMonthlyBase;
```

The deductible reserve counts toward the full emergency reserve when it is held in the same genuinely liquid emergency cash pool. Do not double-count the same dollars.

The engine recommends a target and explains the risk tier. Users may override the target, but the Recommended Plan continues to show the policy recommendation.

---

# Engine State 3 — Build

## Priority 5 — Establish a sustainable retirement trajectory

Retirement success is not defined by maxing every account.

The engine uses a progressive model.

### Benchmark-based guidance
When retirement-profile information is limited, use general references rather than false precision.

Initial product references:
- approximately 12–15% total retirement funding as a healthy baseline reference,
- approximately 20–25% as a strong wealth-building reference.

These are benchmarks, not universal requirements.

Always distinguish:

```ts
personalRetirementContributionRate
```

from:

```ts
totalRetirementFundingRateIncludingEmployer
```

### Projection-based guidance
When enough information exists, projection-based guidance becomes the primary retirement measure.

Potential inputs:
- current age,
- desired retirement age,
- current retirement assets,
- gross income,
- employee contributions,
- employer contributions,
- desired retirement spending,
- estimated Social Security,
- pensions / guaranteed income,
- tax assumptions,
- inflation assumption,
- investment-return assumption,
- planning withdrawal-rate assumption.

A simple planning relationship is:

```ts
annualRetirementSpendingGap =
  desiredAnnualRetirementSpending
  - estimatedAnnualGuaranteedRetirementIncome;

portfolioNeeded =
  annualRetirementSpendingGap
  / planningWithdrawalRate;
```

The withdrawal rate and all projection assumptions must be versioned planning assumptions, not permanent truths.

Do not describe long-range projections as guarantees.

---

## Priority 6 — Account-specific retirement allocation

Employer match is already handled earlier. Additional retirement funding should be personalized across individual account owners.

The engine may evaluate:
- HSA eligibility and strategy,
- Roth IRA eligibility,
- Traditional IRA deductibility,
- current vs expected future tax situation,
- Roth / Traditional diversification,
- workplace-plan quality and fees,
- investment options,
- contribution limits,
- YTD contributions,
- explicit user targets.

Do not impose a universal `HSA > Roth IRA > 401(k)` sequence.

Example output may be an allocation rather than a single account:

```text
$300/month -> HSA
$200/month -> Roth IRA
$150/month -> Traditional 401(k)
```

Tax eligibility/deductibility uncertainty must appear as an assumption or `data_needed` item rather than being fabricated.

---

## Priority 7 — Known future expenses and sinking funds

There is no arbitrary 24- or 36-month goal horizon.

Any real goal with a target amount and target date can begin affecting today's plan.

```ts
requiredGoalMonthlyPace =
  max(0, targetAmount - dedicatedCurrentAmount)
  / monthsRemaining;
```

Goal time horizon should also influence liquidity/investment-risk guidance.

Suggested V1 planning guidance:
- <= 3 years: cash / very low-risk funding,
- 3–10 years: moderate risk may be appropriate,
- > 10 years: greater growth exposure may be considered.

The Priority Engine should not choose specific securities in V1.

---

## Goal classification

### Necessary / Protective
Examples:
- required replacement transportation,
- critical home repair,
- known medical expense,
- required relocation.

These may compete with retirement before an ideal retirement target is reached.

### Major Life Goal
Examples:
- home purchase,
- education,
- starting a business,
- wedding.

Important but often more flexible.

### Lifestyle / Optional
Examples:
- vacation,
- luxury upgrade,
- recreational purchase.

These should not normally undermine core financial security.

---

## Need versus upgrade
For expensive goals, distinguish the financially reasonable core need from an optional upgrade component where the product has enough information to make that distinction.

Do not silently change the user's target.

Example:

```text
Vehicle target: $60,000
Core transportation need: ~$28,000
Lifestyle upgrade component: ~$32,000
```

The user's full target remains visible, but only the core need automatically receives protective priority.

The user can override the classification when legitimate context is missing.

---

## Competing goal allocation
Do not immediately use an opaque weighted score.

Use a two-pass model.

### Pass 1 — Required pace
Calculate each goal's pace from target, dedicated savings, and deadline.

### Pass 2 — Protected funding level
Establish a protected funding expectation based on goal class and flexibility.

Initial policy direction:
- necessary + fixed deadline: attempt 100% of required pace,
- necessary + flexible deadline: protect a large portion of required pace,
- major life goal: fund according to capacity and priority,
- lifestyle goal: generally receives residual capacity.

If protected needs exceed available cash flow, surface the structural funding gap before applying any conflict allocation.

Only then allocate scarce dollars according to transparent factors:
- necessity,
- deadline pressure,
- consequence of failure,
- current funding status,
- flexibility,
- retirement trajectory.

Avoid exposing a fake precision score such as `Goal score: 78`.

---

## Retirement versus necessary goals
Necessary, deadline-driven goals may temporarily keep retirement below the ideal trajectory, but should generally not reduce workplace contributions below the employer-match floor.

The engine may recommend a temporary allocation plan and future redirect.

Example:

```text
Maintain retirement at 15% temporarily.
Save $650/month for the required vehicle replacement.
When the vehicle goal completes, redirect the freed $650/month toward retirement.
```

This should be explicitly labeled as a planned temporary deviation rather than a new permanent target.

---

## Education funding
Parents' retirement security generally outranks fully funding education, but education funding is not automatically zero until retirement is perfect.

Protect:
- employer match,
- minimum healthy retirement trajectory.

Then evaluate education using:
- years until education,
- existing dedicated savings,
- requested education amount,
- parents' retirement trajectory,
- available capacity.

---

## Home purchase planning
A home goal requires specialized analysis rather than treating only the down payment as the target.

Model:
- down payment,
- closing costs,
- initial post-close reserves,
- principal + interest,
- property taxes,
- homeowners insurance,
- HOA,
- reasonable maintenance allowance.

Do not use a lender qualification threshold such as a universal 43% DTI as proof that a home is affordable.

Instead test whether the projected housing cost fits while preserving:
- emergency reserves,
- retirement trajectory,
- necessary goals,
- reasonable discretionary margin.

If the target is not feasible, suggest changing purchase price, timeline, down payment, income capacity, or a combination.

---

## Vehicle affordability
Do not judge affordability from payment alone.

```ts
trueMonthlyVehicleCost =
  loanPayment
  + insuranceDelta
  + fuelEstimate
  + maintenanceReserve;
```

Also model taxes, fees, financing cost, and purchase price.

The engine should evaluate the purchase itself before deciding whether cash or financing is preferable.

---

# Engine State 4 — Optimize

## Priority 8 — Low-interest debt versus investing
Once the financial foundation and Build-stage protected needs are healthy, low-interest debt becomes an optimization problem.

Evaluate:
- guaranteed return from debt payoff,
- expected long-term investment opportunity,
- taxes where legitimately relevant,
- liquidity impact,
- years until retirement,
- retirement trajectory,
- household preference for debt freedom versus growth.

Potential outputs:
- pay debt,
- invest,
- split.

Debt-focused / balanced / growth-focused preferences may influence this zone.

Mortgage debt is normally handled here rather than in consumer-debt Stage 3.

---

## Priority 9 — Additional tax-advantaged wealth building
Once the household's retirement trajectory and necessary sinking funds are sustainable, additional tax-advantaged contributions may compete with major goals, taxable investing, and low-interest debt.

Maxing every account is an optimization technique, not a gate that prevents all other life goals.

---

## Priority 10 — Taxable investing, optional goals, and accelerated financial independence
Remaining capacity can be allocated across:
- taxable brokerage investing,
- additional retirement contributions,
- extra mortgage principal,
- long-term flexible goals,
- additional cash reserves,
- lifestyle goals,
- accelerated financial-independence objectives.

This layer is preference-sensitive and should acknowledge that multiple choices may be financially reasonable.

---

# Existing cash allocation

Track existing cash by purpose.

```ts
type CashPurpose =
  | "protected_reserve"
  | "earmarked_goal"
  | "debt_backed_reserve"
  | "unallocated";
```

Only `unallocated` cash is automatically eligible for redeployment.

The engine should separately answer:
1. What should I do with money I already have?
2. What should I do with future monthly cash flow?

Do not raid earmarked or protected cash silently.

---

# Cheap financing and debt-backed reserves

Separate two questions:
1. Can the household afford the purchase?
2. If yes, what is the best way to pay for it?

0% or very-low-rate financing does not make an unaffordable purchase affordable.

If cheap financing is selected while sufficient cash exists, the corresponding cash may be classified as a debt-backed reserve so it is not accidentally treated as spare money elsewhere.

---

# Intentional new debt
New debt may be treated as a controlled tool when the underlying purchase is justified.

Before recommending financing, evaluate:
- purchase necessity/reasonableness,
- APR,
- term,
- payment burden,
- emergency liquidity,
- existing debt,
- alternatives,
- opportunity cost.

`The payment fits` is not sufficient evidence of affordability.

---

# Windfalls
Windfalls follow the same financial priorities but different allocation mechanics because the money is non-recurring.

Appropriate uses may include:
- reserve gaps,
- high-cost debt,
- sinking funds,
- HSA/IRA contributions,
- investing,
- major goals.

Do not use a one-time bonus to create an unsustainable recurring monthly commitment.

When the household's foundation is healthy, the engine may surface an optional personalized guilt-free spending range. This is permission, not a requirement.

---

# Lifestyle spending and graduated shortfall response
Respect the user's actual discretionary budget, but show when it prevents important priorities from staying on pace.

If the funding gap is small, recommend a modest adjustment.

If the gap is serious, recommend stronger changes.

If spending cuts alone cannot solve the plan, say so and suggest changing goals, timelines, contribution targets above protected floors, purchase scope, or income assumptions.

Do not assume every financial problem can be solved by eliminating discretionary spending.

---

# Life events
Do not create dozens of opaque hard-coded modes.

Life events modify underlying risk factors such as:
- income stability,
- liquidity need,
- known expenses,
- deadlines,
- retirement horizon.

Examples:
- parental leave,
- expected job change,
- moving,
- surgery,
- retirement approaching,
- starting a business,
- becoming a single-income household.

When the event ends, the normal deterministic recalculation can reduce the temporary adjustment.

---

# Household optimization with individual ownership
Financial planning is household-level, but retirement accounts and many tax rules are person-level.

Future normalized model should support:

```text
Household
  -> People
      -> Income sources
      -> Retirement accounts
      -> Employer matches
      -> Person-level contribution limits / eligibility
  -> Shared debts
  -> Shared expenses
  -> Shared goals
  -> Shared cash reserves
```

Do not enforce person-level IRA limits at the household level when account ownership is unknown.

---

# Missing data behavior
Never fabricate material financial facts.

Examples:
- unknown match formula -> do not infer full match,
- unknown HSA eligibility -> do not recommend HSA as definitely available,
- unknown Roth eligibility -> do not claim direct Roth eligibility,
- unknown debt APR -> do not invent a debt band,
- unknown goal date -> do not invent a required monthly pace,
- unknown deductible -> Stage 1 remains unverified.

Continue generating independent recommendations that are still supportable.

User-facing states:
- **Recommended**
- **Worth considering**
- **More information needed**

Prefer messages such as `Needs 3 details` over fake numerical confidence percentages.

---

# Recommended Plan versus Your Plan
Users may override recommendations.

An override changes projections for **Your Plan** but does not rewrite the financial recommendation itself.

Example:

```text
Recommended Plan: Pay the 22% credit card first.
Your Plan: Invest $500/month in brokerage.
```

The app may explain the consequence of the override without preventing the user from choosing it.

---

# Automatic recalculation
The engine recalculates when household data materially changes.

Meaningful recommendation changes should be explained.

Example:

```text
Your credit card is now paid off.
The $475/month previously directed there is now recommended as:
$300 -> Roth IRA
$175 -> vehicle fund
```

Do not create noisy alerts for immaterial changes.

---

# Normalized engine input direction
The pure engine must receive a normalized household snapshot and never query Supabase directly.

```ts
type MoneyPriorityInput = {
  taxYear: number;
  policyVersion: string;

  household: {
    monthlyGrossIncome: number;
    monthlyTakeHomeIncome: number;
    monthlyEssentialExpenses: number;
    monthlyCommittedExpenses: number;
    monthlyDiscretionaryExpenses: number;
  };

  people: Array<{
    id: string;
    age?: number | null;
    plannedRetirementAge?: number | null;
    grossIncomeMonthly?: number | null;
  }>;

  cashPools: Array<{
    id: string;
    amount: number;
    purpose: "protected_reserve" | "earmarked_goal" | "debt_backed_reserve" | "unallocated";
    relatedGoalId?: string | null;
  }>;

  insuranceExposures: Array<{
    id: string;
    type: string;
    deductibleAmount?: number | null;
    outOfPocketMaximum?: number | null;
  }>;

  debts: Array<{
    id: string;
    ownerId?: string | null;
    name: string;
    type: string;
    balance: number;
    annualInterestRate?: number | null;
    minimumPayment: number;
    rateType?: "fixed" | "variable" | "promotional" | "unknown";
    promoExpirationDate?: string | null;
    promoResetApr?: number | null;
  }>;

  retirementAccounts: Array<{
    id: string;
    ownerId: string | null;
    name: string;
    type: string;
    taxTreatment?: "traditional" | "roth" | "mixed" | "not_applicable" | "unknown";
    balance: number;
    monthlyEmployeeContribution: number;
    monthlyEmployerContribution: number;
    employeeContributedYtd?: number | null;
    employerContributedYtd?: number | null;
    annualContributionTarget?: number | null;
    fullMatchEmployeeContributionMonthly?: number | null;
    matchStatus?: "not_offered" | "unknown" | "not_fully_captured" | "fully_captured";
  }>;

  goals: Array<{
    id: string;
    name: string;
    type?: string | null;
    classification: "necessary" | "major_life" | "lifestyle";
    targetAmount: number;
    currentDedicatedAmount: number;
    targetDate?: string | null;
    deadlineFlexibility?: "fixed" | "somewhat_flexible" | "flexible";
    consequence?: "high" | "medium" | "low";
  }>;

  preferences: {
    emergencyFundMonthsOverride?: number | null;
    debtVsInvesting: "debt_focused" | "balanced" | "growth_focused" | "unspecified";
    rothVsTraditional: "roth" | "traditional" | "balanced" | "unspecified";
  };
};
```

The schema does not need to implement every V2 field before engine work begins; normalized inputs may initially derive from a smaller stored profile and report unsupported/missing data explicitly.

---

# Policy configuration
All thresholds and planning assumptions must be centralized and versioned.

```ts
type MoneyPriorityPolicy = {
  version: string;

  highInterestDebtApr: number;       // initial 0.10
  payoffFavoredDebtApr: number;      // initial 0.06
  grayZoneDebtApr: number;           // initial 0.04

  emergencyReserveMonthsByRisk: {
    low: number;       // 3
    moderate: number;  // 4
    elevated: number;  // 5
    high: number;      // 6
  };

  retirementBenchmark: {
    healthyLower: number;       // 0.12
    healthyUpper: number;       // 0.15
    wealthBuildingLower: number;// 0.20
    wealthBuildingUpper: number;// 0.25
  };

  goalRiskHorizonsMonths: {
    shortTermMax: number; // 36
    mediumTermMax: number;// 120
  };

  planningAssumptionsVersion: string;
};
```

Tax-year policy remains separate from product policy.

For 2026, official IRS limits currently include:
- 401(k), 403(b), governmental 457, and TSP employee elective-deferral limit: $24,500 before applicable catch-up rules,
- combined Traditional + Roth IRA limit: $7,500 before applicable catch-up rules,
- HSA self-only limit: $4,400,
- HSA family limit: $8,750.

These values belong in versioned tax policy and should be verified against official IRS guidance when implemented.

---

# Recommendation model direction
The engine should support both single actions and allocations.

```ts
type RecommendationState =
  | "recommended"
  | "worth_considering"
  | "more_information_needed";

type MoneyPriorityAllocation = {
  category: string;
  relatedEntityId?: string | null;
  monthlyAmount: number;
  annualAmount?: number | null;
  rationale: string[];
};

type MoneyPriorityRecommendation = {
  id: string;
  rank: number;
  state: RecommendationState;
  urgency: "required" | "high" | "medium" | "optional";
  title: string;
  explanation: string;
  allocations: MoneyPriorityAllocation[];
  whyNow: string[];
  tradeoffs: string[];
  sourceInputs: string[];
  assumptions: string[];
  missingData: string[];
};
```

Result summary should expose at least:
- current engine state (`stabilize`, `secure`, `build`, `optimize`),
- available monthly capacity,
- plan feasibility / monthly funding gap,
- starter deductible reserve target,
- full emergency reserve target and months,
- highest harmful debt state,
- employer-match status,
- retirement guidance mode (`benchmark` or `projection`),
- retirement trajectory state,
- necessary-goal funding gaps,
- data-quality warnings,
- tax-rule warnings,
- policy version,
- tax year.

---

# Deterministic allocation flow

1. Normalize household data and validate material missing inputs.
2. Calculate required monthly outflow and available monthly capacity.
3. Classify existing cash by purpose and calculate deployable unallocated cash.
4. Calculate plan feasibility.
5. Run Stabilize gates.
6. Calculate deductible reserve gap.
7. Calculate uncaptured employer-match requirements.
8. Classify debt using common bands plus special debt policy modules.
9. Calculate personalized emergency-reserve target.
10. Determine retirement guidance mode and trajectory.
11. Calculate goal required paces and protected goal funding.
12. If protected needs exceed capacity, surface the structural funding gap and apply conflict rules.
13. Allocate remaining capacity across Build-stage priorities.
14. Run Optimize-stage debt/investing/goal tradeoffs.
15. Return ranked recommendations and allocations with explicit reasons, assumptions, and missing data.

---

# Regression requirements
The existing regression suite should be expanded to cover V2 behavior, including at minimum:

1. negative recurring cash flow,
2. missing deductible data,
3. deductible reserve gap,
4. missing employer match,
5. uncaptured employer match despite high-interest debt,
6. 24% credit card,
7. 9% payoff-favored debt,
8. 5% gray-zone debt,
9. mortgage excluded from consumer-debt red band,
10. promotional 0% balance approaching reset,
11. student loan with forgiveness consideration,
12. 3-month low-risk emergency reserve,
13. 6-month high-risk reserve,
14. temporary extended reserve from life event,
15. benchmark-based retirement guidance,
16. projection-based retirement guidance,
17. employer contributions tracked separately from personal savings rate,
18. HSA eligibility unknown,
19. Roth eligibility unknown,
20. person-level IRA ownership uncertainty,
21. necessary car goal five years away,
22. necessary car goal competing with retirement,
23. multiple necessary goals exceeding capacity,
24. lifestyle goal receiving residual funding,
25. house goal with affordable down payment but unaffordable carrying cost,
26. vehicle with affordable payment but unaffordable total ownership cost,
27. 0% financing with debt-backed reserve,
28. reasonable use of new debt to preserve emergency liquidity,
29. existing earmarked cash not redeployed,
30. unallocated cash redeployed,
31. windfall allocation without creating recurring obligation,
32. guilt-free windfall range for healthy household,
33. low-interest mortgage debt-focused preference,
34. low-interest mortgage growth-focused preference,
35. Recommended Plan vs Your Plan override,
36. material profile change produces deterministic recommendation change,
37. missing data blocks only dependent decisions,
38. allocations never exceed available monthly capacity,
39. allocations never double-count the same cash,
40. same input + policy + tax year produces identical ordered output.

Every permanent engine rule introduced in implementation should have a matching regression case.

---

# Architecture
Recommended implementation remains pure and testable:

- `lib/priority-engine/types.ts`
- `lib/priority-engine/policy.ts`
- `lib/priority-engine/tax-policy.ts`
- `lib/priority-engine/planning-assumptions.ts`
- `lib/priority-engine/normalize.ts`
- `lib/priority-engine/debt-policy.ts`
- `lib/priority-engine/retirement.ts`
- `lib/priority-engine/goals.ts`
- `lib/priority-engine/allocation.ts`
- `lib/priority-engine/engine.ts`
- `lib/priority-engine/*.test.ts`

Server-side household snapshot builder supplies normalized input. Supabase access must remain outside the pure engine.

---

# Deliberately deferred precision
Do not hard-code false precision before validating it.

The following require research/versioned policy and representative-household testing before production formulas are frozen:
- long-term return and inflation assumptions,
- retirement withdrawal-rate assumptions,
- Social Security modeling,
- exact retirement contribution-rate solver,
- detailed employer-match formula DSL,
- exact household liquidity-risk classifier,
- exact gray-zone debt burden thresholds,
- exact need-versus-upgrade affordability formulas,
- exact conflict-allocation weights,
- education-cost assumptions,
- detailed tax optimization.

The V2 architecture defines what the engine must consider without pretending uncertain planning assumptions are facts.

---

# Source-informed design notes
The V2 decisions were validated against current public guidance from the Money Guy Financial Order of Operations, Fidelity, Vanguard, CFPB, Morningstar, and official IRS tax guidance.

Key research-informed changes from the earlier Phase 5 draft:
- starter reserve changed from one month of expenses to the highest relevant insurance deductible,
- full emergency reserve remains 3–6 months but becomes risk-tiered,
- debt framework expanded from a simple 10% / 6% waterfall to hard, payoff-favored, gray, and low-interest zones,
- fixed 24-month goal horizon removed,
- retirement changed from account-maxing gate to progressive trajectory guidance,
- goals and retirement may coexist through deterministic allocation,
- home and vehicle affordability use household cash-flow analysis rather than payment-only or universal DTI shortcuts,
- plan feasibility becomes an explicit calculation before optimization.

---

# Phase 5 implementation order

1. Review and approve this V2 decision specification.
2. Update the Phase 5 schema audit against V2 requirements.
3. Design the smallest additive schema migration required for V2.
4. Apply and verify migration with RLS/security checks.
5. Add product policy, tax policy, and planning-assumption version files.
6. Implement normalized engine types and validation.
7. Implement Stabilize and Secure gates.
8. Implement retirement benchmark/projection interface.
9. Implement goal pace and feasibility calculations.
10. Implement deterministic Build allocation.
11. Implement Optimize tradeoff rules.
12. Build the expanded regression suite.
13. Add server-side household snapshot builder.
14. Build Priority Engine UI with Recommended Plan / Your Plan distinction.
15. Test representative households and adversarial edge cases.
16. Run CI, security review, and merge only after regression behavior is accepted.


---

## Dedicated Student-Loan Policy V1

Student loans are assessed per debt before ordinary APR-based acceleration. Private loans and federal loans with a known ordinary repayment plan, no forgiveness strategy, and no material employer benefit continue through the existing debt policy. The word `student` alone does not suppress high-interest treatment.

Household-reported PSLF and sufficiently described IDR-forgiveness strategies suppress extra acceleration while preserving the recorded required payment in monthly obligations. Other forgiveness programs receive focused review, and missing strategy inputs block only that loan's acceleration decision. Family Finance Hub does not certify forgiveness eligibility, reproduce federal payment formulas, forecast legislation, or fabricate future tax liabilities.

Known employer direct loan assistance and explicitly reported qualified-student-loan-payment retirement matching are treated as material benefits that ordinary acceleration must not destroy. Preserved-strategy loans do not receive one-time cash payoff deployments. Recommended Plan exposes zero recommended extra payment for these loans, while Your Plan may model an extra payment and receives a strategy-conflict tradeoff.

The policy facts are versioned under `MoneyPriorityPolicy.studentLoan`. V1 records the post-July-1-2026 framework boundary, disallows SAVE as a modeled long-term assumption, and records the end of the broad IDR federal tax exclusion after December 31, 2025. No live web dependency or database migration is introduced.
