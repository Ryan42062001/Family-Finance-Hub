# Phase 5 — Money Priority Engine

## Objective
Answer the household question: **What should I do with my next available dollar?**

The engine should turn saved household data into a ranked, explainable set of next-money priorities without automatically moving money or changing household records.

## Product principles
- Recommendations must be explainable in plain language.
- The engine should be conservative when required data is missing.
- Safety and liquidity needs outrank optimization.
- Employer match and other use-it-or-lose-it benefits should be recognized explicitly.
- High-cost debt should usually outrank lower-return investing once basic protections are in place.
- The engine should distinguish between required actions, strong recommendations, and optional optimization.
- Users should be able to understand which inputs caused each recommendation.
- The engine must not present tax or legal limits as guarantees unless those limits are sourced and current.
- No recommendation should automatically write back to live household data.

## V1 decision hierarchy
The first version uses a deterministic waterfall with explicit guardrails rather than a black-box score.

### Priority 1 — Cover immediate cash-flow deficits
If monthly take-home income is below recurring expenses plus required debt minimums, the first recommendation is to close the monthly deficit before increasing discretionary saving, investing, or extra debt payments.

### Priority 2 — Capture employer retirement match
If the household has an employer-sponsored retirement account and the saved contribution level is below the amount needed to receive the known employer match, recommend contributing enough to capture the full match.

V1 should not guess match rules. If the profile does not store enough information to determine the match threshold, the engine should return a data-needed recommendation instead of assuming a percentage.

### Priority 3 — Establish a starter emergency reserve
Before aggressive debt payoff or long-term investing, target a minimum starter reserve. V1 default: one month of essential expenses.

This threshold must be configurable in the engine policy rather than hard-coded throughout the UI.

### Priority 4 — Address very high-interest debt
After basic liquidity and match capture, prioritize non-mortgage debt above the configured high-interest threshold.

Initial policy threshold: 10% APR. This is a product policy default, not a universal financial rule, and must be centralized/configurable.

### Priority 5 — Build the full emergency fund
Target the configured full reserve after very high-interest debt is controlled. Initial default: 3–6 months of essential expenses, with V1 using 3 months as the minimum engine target and allowing product policy to raise it later.

### Priority 6 — Address moderate-interest debt
Prioritize remaining non-mortgage debt above the configured moderate-interest threshold.

Initial policy threshold: 6% APR.

### Priority 7 — Tax-advantaged retirement / HSA goals
Once the household has adequate reserves and expensive debt is controlled, recommend additional tax-advantaged contributions toward explicit household targets.

V1 must use user-entered annual targets or stored plan targets rather than hard-coded IRS limits unless current limits are sourced from official guidance.

### Priority 8 — Fund near-term goals
Prioritize saved goals with a target date and an identified monthly shortfall, particularly goals due within the configured near-term horizon.

Initial near-term horizon: 24 months.

### Priority 9 — Low-interest debt vs. additional investing
For low-interest debt, the engine should avoid pretending there is one objectively correct answer. V1 should surface this as an optimization choice and explain the tradeoff between guaranteed debt payoff return and additional investing.

### Priority 10 — Additional flexible goals / investing
When all higher priorities are satisfied, recommend allocating surplus toward lower-priority goals, taxable investing, or accelerated low-interest debt based on household preferences.

## Recommendation model
Each recommendation should include:

```ts
type MoneyPriorityRecommendation = {
  id: string;
  rank: number;
  category:
    | "cash_flow"
    | "employer_match"
    | "emergency_fund"
    | "debt"
    | "retirement"
    | "hsa"
    | "goal"
    | "investing"
    | "data_needed";
  urgency: "required" | "high" | "medium" | "optional";
  title: string;
  explanation: string;
  suggestedMonthlyAmount: number | null;
  targetAmount: number | null;
  currentAmount: number | null;
  gapAmount: number | null;
  sourceInputs: string[];
  assumptions: string[];
};
```

The engine result should also expose a summary:

```ts
type MoneyPriorityResult = {
  recommendations: MoneyPriorityRecommendation[];
  availableMonthlySurplus: number;
  dataQualityWarnings: string[];
  policyVersion: string;
};
```

## Engine inputs
V1 should consume a normalized household snapshot rather than querying Supabase directly from the calculation module.

```ts
type MoneyPriorityInput = {
  monthlyTakeHomeIncome: number;
  monthlyEssentialExpenses: number;
  monthlyDiscretionaryExpenses: number;
  liquidSavings: number;
  debts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    annualInterestRate: number;
    minimumPayment: number;
  }>;
  retirementAccounts: Array<{
    id: string;
    name: string;
    type: string;
    monthlyEmployeeContribution: number;
    monthlyEmployerContribution: number;
    annualContributionTarget?: number | null;
    contributedYearToDate?: number | null;
    employerMatchTargetMonthly?: number | null;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string | null;
    priority: number;
  }>;
};
```

## Policy configuration
All thresholds should live in one policy object.

```ts
type MoneyPriorityPolicy = {
  starterEmergencyMonths: number;
  fullEmergencyMonths: number;
  highInterestDebtApr: number;
  moderateInterestDebtApr: number;
  nearTermGoalMonths: number;
};
```

Initial V1 policy:
- starter emergency reserve: 1 month
- full emergency reserve: 3 months
- high-interest debt: 10% APR
- moderate-interest debt: 6% APR
- near-term goal horizon: 24 months

## Important guardrails
- Mortgage debt is not treated as high-interest consumer debt by default; it should be evaluated separately from credit cards, personal loans, and similar debt.
- Do not recommend extra debt payments when the household has a recurring monthly deficit.
- Do not recommend additional investing before required debt minimums are covered.
- Do not infer employer-match formulas from employer contribution amounts alone.
- If contribution targets, YTD amounts, or match thresholds are unknown, state that the engine lacks enough data rather than manufacturing precision.
- Recommendations must be deterministic for the same normalized input and policy version.
- Every recommendation must identify its source inputs and assumptions.

## V1 regression scenarios
At minimum, automated tests should cover:

1. Monthly deficit -> cash-flow stabilization ranks first.
2. Positive surplus + missing match data -> request match information rather than guessing.
3. Match not fully captured + adequate cash flow -> employer match ranks before emergency-fund expansion.
4. No starter reserve -> starter emergency fund outranks extra debt payoff.
5. Starter reserve funded + 24% credit-card debt -> high-interest debt ranks next.
6. High-interest debt gone + emergency reserve below full target -> full emergency fund ranks next.
7. 8% non-mortgage loan after full reserve -> moderate-interest debt recommendation.
8. Mortgage-only household should not be classified as high-interest consumer debt solely from APR.
9. Retirement target shortfall after reserves/debt thresholds -> retirement pacing recommendation.
10. Near-term goal shortfall -> goal recommendation after higher priorities are satisfied.
11. Duplicate debt names do not affect ranking because IDs are authoritative.
12. Negative / NaN inputs normalize safely.
13. Empty profile returns data-quality guidance instead of confident recommendations.
14. Fully healthy profile returns optional optimization recommendations rather than false urgency.

## Architecture
- `lib/priority-engine/` — pure normalized types, policy, engine, and tests.
- Server page/service — reads authenticated household-scoped data and creates the normalized snapshot.
- `app/priority/` or dashboard integration — presents recommendations and explanations.
- No Supabase calls from the pure engine.
- No automatic writes to financial profile records.

## Security and privacy
- Preserve the existing authenticated household resolution and RLS model.
- Every source query must be filtered by resolved `household_id` in addition to RLS.
- Priority calculations should happen server-side or from a minimal normalized snapshot; avoid placing financial values in URLs.
- No service-role access.
- Recommendations are derived data and should not be persisted in V1 unless a later explicit saved-plan feature is designed.

## Phase 5 implementation order
1. Normalized engine types and centralized V1 policy.
2. Pure deterministic recommendation engine.
3. Regression suite covering the hierarchy and guardrails.
4. Household snapshot builder using existing Phase 2/3 data.
5. Recommendation UI with explanation and missing-data states.
6. Audit recommendation quality against representative household scenarios.
7. Security review, lint, production build, and merge.

## Out of scope for V1
- Bank transaction categorization
- AI-generated financial advice replacing deterministic rules
- Automatic money movement
- Automatic contribution changes
- Tax filing advice
- Monte Carlo investment projections
- Personalized expected market-return assumptions
- Saved recommendation history
