# Phase 5 — Money Priority Engine

## Objective
Answer the household question: **What should I do with my next available dollar?**

Phase 5 turns the household's saved financial profile into a ranked, explainable, deterministic money plan. The engine should identify the next best use of available cash, explain why it outranks alternatives, identify missing information that would materially change the recommendation, and never automatically move money or modify household records.

The goal is not to pretend there is one universal financial order for every household. The goal is to make a strong default decision framework explicit, auditable, configurable, and honest about tradeoffs.

## Product principles
- Recommendations must be explainable in plain language.
- Safety, solvency, required obligations, and liquidity outrank optimization.
- Use-it-or-lose-it employer benefits should be recognized explicitly.
- Retirement accounts are not interchangeable; account type, employer match, tax treatment, eligibility, annual limits, and user preferences matter.
- High-cost debt should usually outrank discretionary investing after minimum protections are in place.
- The engine should distinguish between required actions, strong recommendations, target-building actions, and optional optimization.
- Users should be able to see which inputs, policies, and assumptions caused each recommendation.
- The engine should state when the recommendation is conditional on missing data.
- Current tax-law limits must be versioned by tax year and sourced from official guidance rather than scattered as magic numbers through the codebase.
- The engine should avoid presenting tax eligibility or deductibility as certain when the profile lacks enough information.
- No recommendation should automatically write back to live household data.

## V1 decision framework
The first version uses a deterministic waterfall with conditional branches rather than a black-box score. The engine can produce multiple ranked recommendations, but the first recommendation should always represent the highest-priority use of the next available dollar under the selected policy.

### Priority 0 — Required obligations and data sanity
Before optimization, verify that the household has enough information to calculate a meaningful surplus and that required debt minimums and recurring essential expenses are represented.

If the profile is materially incomplete, return targeted `data_needed` recommendations. Missing data should reduce confidence rather than cause the engine to invent defaults.

Examples:
- missing take-home income
- missing essential-expense classification
- debt balance present but minimum payment missing
- retirement account present but account type unknown
- workplace plan present but employer-match rule unknown

### Priority 1 — Eliminate negative monthly cash flow
If monthly take-home income is below essential expenses, discretionary expenses, and required debt minimums, the first recommendation is to close the recurring deficit.

The engine should not recommend extra debt payments, additional retirement saving, taxable investing, or accelerated goals while the normalized monthly budget is negative.

The explanation should identify the estimated monthly deficit and the categories contributing to it.

### Priority 2 — Capture employer retirement match
Employer match is a separate priority category from general retirement investing.

Supported workplace account families should include at least:
- 401(k)
- 403(b)
- governmental 457(b)
- SIMPLE IRA
- TSP
- other employer-sponsored plan

The engine should recommend the employee contribution needed to capture the full known employer match before most discretionary financial goals.

V1 must not infer a match formula from employer contributions alone. The account model should support explicit match information such as:
- match exists
- employee contribution percentage required for full match
- employer match percentage/formula
- monthly or annual employee amount required for full match
- whether the full match is currently captured

If the match rule is unknown, return a `data_needed` recommendation instead of pretending the current employer contribution proves the match is complete.

### Priority 3 — Build a starter emergency reserve
Before aggressive debt payoff or long-term discretionary investing, target a starter reserve.

Initial V1 default: **1 month of essential expenses**.

This target belongs in centralized policy. The engine should calculate:
- starter reserve target
- current eligible liquid savings
- reserve gap
- suggested monthly allocation from available surplus

Only genuinely liquid emergency savings should count. Retirement balances, home equity, and illiquid investments should not count toward the reserve by default.

### Priority 4 — Pay very high-interest non-mortgage debt
After cash-flow stability, employer match capture, and the starter reserve, prioritize very high-interest non-mortgage debt.

Initial V1 threshold: **10% APR**.

Debt should be ranked primarily by APR within this priority band, with deterministic tie-breakers such as smaller balance and then stable ID ordering.

Mortgage debt is excluded from consumer-debt classification by default and handled later as an optimization choice unless policy explicitly says otherwise.

### Priority 5 — Build the full emergency reserve
Once very high-interest debt is controlled, build the full emergency reserve.

Initial V1 base target: **3 months of essential expenses**.

The policy should support a target range and household-specific adjustments. Future versions may increase the recommended reserve for households with higher income volatility, a single income, dependents, unstable employment, large deductibles, or other risk factors.

V1 should distinguish:
- policy minimum reserve target
- household-selected reserve target, if present
- current reserve months
- reserve dollar gap

### Priority 6 — Pay moderate-interest non-mortgage debt
After the full reserve is established, prioritize moderate-interest non-mortgage debt.

Initial V1 threshold: **6% APR**.

This threshold is a policy default, not a universal law. The engine should make the threshold visible in explanations.

Debt below the moderate-interest threshold should usually fall into a later tradeoff stage rather than being labeled urgent.

## Retirement and tax-advantaged account hierarchy
Retirement should not be a single category. The engine should model account-specific actions.

### Workplace match bucket
This is handled earlier in Priority 2 because unclaimed employer match is qualitatively different from unmatched retirement saving.

### HSA bucket
If the household is HSA-eligible and has an HSA, the engine should be able to recommend HSA contributions separately from retirement accounts.

The model should track:
- HSA eligibility known/unknown
- self-only vs family coverage
- employee contributions YTD
- employer contributions YTD
- annual household HSA target
- official tax-year contribution limit

For tax year 2026, official IRS guidance sets the HSA contribution limit at $4,400 for self-only coverage and $8,750 for family coverage. These values must live in versioned tax-year policy rather than being embedded throughout the engine.

The engine should not assume that maxing the HSA always outranks every other retirement action. It should compare the household's selected policy, remaining high/moderate debt, reserve position, and whether the user treats the HSA primarily as a medical-spending account or long-term tax-advantaged savings vehicle.

### Roth IRA bucket
The engine should treat Roth IRA funding as a separate recommendation type.

The model should track:
- account exists
- owner/person
- contributed YTD
- annual household or person-level target
- tax year
- Roth eligibility status: known eligible / known ineligible / unknown
- modified AGI inputs if the product later supports eligibility calculation

For tax year 2026, the combined Traditional IRA + Roth IRA contribution limit is $7,500 for someone under 50, with a higher catch-up amount for age 50+. Roth IRA eligibility also phases out by modified AGI. The engine should not recommend a direct Roth IRA contribution as definitely eligible when required income/filing-status data is unavailable.

### Traditional IRA bucket
Traditional IRA should be separate from Roth IRA because deductibility may depend on workplace-plan coverage, modified AGI, filing status, and spouse coverage.

The engine should distinguish:
- contribution eligibility
- deductibility known/unknown
- user-selected tax strategy

If deductibility is unknown, the engine can still surface the account as an option but should avoid tax-benefit claims.

### Unmatched workplace retirement bucket
Additional 401(k), 403(b), governmental 457(b), TSP, SIMPLE IRA, or similar contributions above the amount required for full employer match belong here.

The engine should track:
- employee contributions YTD
- annual employee deferral target
- official tax-year deferral limit when applicable
- Roth vs traditional contribution type if known
- whether the user's selected target has already been met

For 2026, the IRS employee elective-deferral limit for 401(k), 403(b), governmental 457 plans, and TSP is $24,500 before applicable catch-up rules. This should be stored in tax-year policy, not hard-coded into UI logic.

### Retirement priority order after reserves/debt
V1 should not impose a universal hard-coded `HSA > Roth IRA > 401(k)` order for every household. Instead it should support a default policy plus user preference.

Recommended V1 default after Priority 6:
1. HSA toward explicit annual target when eligible.
2. Roth IRA toward explicit annual target when eligibility is known or user-confirmed.
3. Traditional IRA when explicitly selected and contribution/deductibility assumptions are known enough.
4. Additional unmatched workplace retirement contributions toward the household's annual retirement target.

This order should be configurable because plan quality, tax strategy, fees, income, age, filing status, and household preferences can change the optimal choice.

### Priority 7 — Complete account-specific tax-advantaged targets
Once reserves and expensive debt are under control, allocate surplus across unmet tax-advantaged account targets using the retirement policy above.

Recommendations should be specific, for example:
- `Increase HSA contribution by $180/month`
- `Contribute $625/month to Roth IRA for the rest of the year`
- `Increase 401(k) employee deferral to reach your annual target`

Avoid generic `save more for retirement` recommendations when the engine knows the account.

### Priority 8 — Fund time-sensitive near-term goals
Prioritize goals with target dates and a required savings pace, especially goals due within the configured near-term horizon.

Initial V1 near-term horizon: **24 months**.

The engine should calculate:
- amount remaining
- months remaining
- required monthly pace
- current planned monthly contribution if known
- monthly shortfall

Goal priority should consider both urgency and user-assigned importance. A goal with no target date should generally rank below a goal with a clearly defined deadline unless the user explicitly marks it high priority.

### Priority 9 — Low-interest debt vs additional investing
For low-interest debt, including many mortgages, the engine should avoid presenting one objectively correct choice.

Instead, return a tradeoff recommendation describing:
- guaranteed return from debt payoff equal to the avoided interest rate
- liquidity cost of sending cash to debt
- investment uncertainty
- tax considerations when known
- user preference for debt freedom vs expected long-term growth

This stage is ideal for a future preference setting such as `debt_focused`, `balanced`, or `growth_focused`.

### Priority 10 — Taxable investing and flexible long-term goals
When higher-priority obligations, reserves, expensive debt, tax-advantaged targets, and urgent goals are handled, recommend remaining surplus toward:
- taxable brokerage investing
- extra low-interest debt payoff
- long-term flexible goals
- additional cash reserves beyond policy minimums

The engine should rank these according to household preferences rather than declaring universal urgency.

## Recommendation model

```ts
type MoneyPriorityCategory =
  | "cash_flow"
  | "employer_match"
  | "emergency_fund"
  | "debt"
  | "hsa"
  | "roth_ira"
  | "traditional_ira"
  | "workplace_retirement"
  | "goal"
  | "mortgage"
  | "investing"
  | "data_needed";

type RecommendationConfidence = "high" | "medium" | "low";

type MoneyPriorityRecommendation = {
  id: string;
  rank: number;
  category: MoneyPriorityCategory;
  urgency: "required" | "high" | "medium" | "optional";
  confidence: RecommendationConfidence;
  title: string;
  explanation: string;
  whyNow: string[];
  whyNotHigherAlternatives: string[];
  suggestedMonthlyAmount: number | null;
  suggestedAnnualAmount: number | null;
  targetAmount: number | null;
  currentAmount: number | null;
  gapAmount: number | null;
  sourceInputs: string[];
  assumptions: string[];
  missingData: string[];
  relatedEntityId?: string | null;
  relatedEntityType?: "debt" | "retirement_account" | "goal" | "account" | null;
};
```

The result should also expose an auditable summary:

```ts
type MoneyPriorityResult = {
  recommendations: MoneyPriorityRecommendation[];
  availableMonthlySurplus: number;
  monthlyRequiredOutflow: number;
  starterEmergencyTarget: number;
  fullEmergencyTarget: number;
  currentEmergencyMonths: number | null;
  dataQualityWarnings: string[];
  taxRuleWarnings: string[];
  policyVersion: string;
  taxYear: number;
};
```

## Normalized engine input
The pure engine must receive a normalized household snapshot and never query Supabase directly.

```ts
type RetirementAccountType =
  | "401k"
  | "403b"
  | "457b"
  | "tsp"
  | "simple_ira"
  | "roth_ira"
  | "traditional_ira"
  | "sep_ira"
  | "hsa"
  | "other";

type MoneyPriorityInput = {
  taxYear: number;
  filingStatus?: "single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household" | "unknown";
  estimatedModifiedAgi?: number | null;

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
    ownerId?: string | null;
    name: string;
    type: RetirementAccountType;
    taxTreatment?: "traditional" | "roth" | "mixed" | "unknown";
    monthlyEmployeeContribution: number;
    monthlyEmployerContribution: number;
    employeeContributedYtd?: number | null;
    employerContributedYtd?: number | null;
    annualContributionTarget?: number | null;
    fullMatchEmployeeContributionMonthly?: number | null;
    fullMatchCaptured?: boolean | null;
    rothEligibility?: "eligible" | "ineligible" | "unknown" | null;
    traditionalIraDeductibility?: "deductible" | "partial" | "nondeductible" | "unknown" | null;
  }>;

  hsa?: {
    eligible: boolean | null;
    coverageType: "self_only" | "family" | "unknown";
    employeeContributedYtd: number;
    employerContributedYtd: number;
    annualContributionTarget?: number | null;
  } | null;

  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string | null;
    priority: number;
    plannedMonthlyContribution?: number | null;
  }>;

  preferences?: {
    emergencyFundMonths?: number | null;
    retirementOrder?: Array<"hsa" | "roth_ira" | "traditional_ira" | "workplace_retirement">;
    debtVsInvesting?: "debt_focused" | "balanced" | "growth_focused";
    rothVsTraditional?: "roth" | "traditional" | "balanced" | "unspecified";
  };
};
```

## Policy configuration
All decision thresholds and annual tax rules should live in centralized, versioned policy.

```ts
type MoneyPriorityPolicy = {
  version: string;
  starterEmergencyMonths: number;
  defaultFullEmergencyMonths: number;
  minFullEmergencyMonths: number;
  maxFullEmergencyMonths: number;
  highInterestDebtApr: number;
  moderateInterestDebtApr: number;
  nearTermGoalMonths: number;
  defaultRetirementOrder: Array<"hsa" | "roth_ira" | "traditional_ira" | "workplace_retirement">;
};

type TaxYearPolicy = {
  taxYear: number;
  iraContributionLimitUnder50: number;
  iraCatchUpAge50Plus: number;
  workplaceDeferralLimit: number;
  hsaSelfOnlyLimit: number;
  hsaFamilyLimit: number;
  rothIraPhaseOuts: Record<string, { start: number; end: number }>;
  traditionalIraDeductionPhaseOuts: Record<string, { start: number; end: number }>;
  sourceUrls: string[];
};
```

Initial product policy:
- starter emergency reserve: 1 month
- default full emergency reserve: 3 months
- allowed reserve target range: 3–6 months
- high-interest debt: 10% APR
- moderate-interest debt: 6% APR
- near-term goal horizon: 24 months
- default retirement order after debt/reserve gates: HSA -> Roth IRA -> Traditional IRA -> unmatched workplace retirement

The retirement order is a configurable default, not a universal claim.

## 2026 tax-year policy reference
Official IRS guidance for 2026 currently includes:
- IRA combined Traditional + Roth contribution limit: $7,500 under age 50
- IRA catch-up age 50+: $1,100
- 401(k)/403(b)/governmental 457/TSP employee elective-deferral limit: $24,500
- HSA self-only contribution limit: $4,400
- HSA family contribution limit: $8,750
- Roth IRA direct-contribution phase-out ranges vary by filing status and modified AGI
- Traditional IRA deductibility phase-outs depend on filing status and workplace-plan coverage

These values should be represented as tax-year configuration with official source metadata. The engine should never silently apply a current-year rule to a different tax year.

## Allocation mechanics
The engine should reason about the **next available dollar**, but the UI may display monthly allocations.

Recommended V1 allocation process:
1. Calculate normalized monthly surplus after recurring expenses and required debt minimums.
2. Generate every unmet priority condition.
3. Rank conditions by deterministic policy order.
4. Allocate surplus to the highest-ranked recommendation up to its calculable monthly need.
5. If surplus remains, continue to the next recommendation.
6. Return a ranked allocation plan showing where the full available monthly surplus would go.

Example:
- available surplus: $1,000/month
- Roth IRA pace needed: $400/month
- near-term car goal pace needed: $350/month
- remaining flexible surplus: $250/month

The result can recommend all three while still clearly stating that the **next dollar** goes to the Roth IRA.

## Confidence model
Every recommendation should include confidence.

### High confidence
Required inputs are present and the recommendation follows a direct deterministic rule.

Example: 24% credit card debt with starter reserve already funded.

### Medium confidence
The ranking is reasonable but one or more preference/tax inputs could change the optimal account choice.

Example: Roth IRA vs unmatched traditional 401(k) when tax preference is unspecified.

### Low confidence
Critical information is missing. Prefer a `data_needed` action over a precise dollar recommendation.

Example: workplace account has employer contributions, but the match formula is unknown.

## Important guardrails
- Mortgage debt is not automatically treated as high-interest consumer debt.
- Do not recommend extra debt payments while recurring monthly cash flow is negative.
- Do not recommend discretionary investing before required debt minimums are covered.
- Do not infer employer-match formulas from employer contribution amounts alone.
- Do not count retirement balances as emergency savings.
- Do not claim Roth IRA eligibility without sufficient income/filing information or explicit user confirmation.
- Do not claim Traditional IRA deductibility without sufficient plan-coverage/income/filing information.
- IRA limits are shared across Traditional and Roth IRAs and must be evaluated at person level when the product supports multiple household members.
- HSA employer and employee contributions both count toward the applicable annual HSA contribution limit.
- Workplace employee deferral limits and total-plan limits are different concepts; V1 should only enforce limits it explicitly models.
- If contribution targets, YTD amounts, or match thresholds are unknown, state that the engine lacks enough data rather than manufacturing precision.
- Recommendations must be deterministic for the same normalized input, preferences, policy version, and tax-year policy.
- Every recommendation must identify source inputs, assumptions, missing data, and policy thresholds.
- No AI-generated prose may change the underlying deterministic ranking. AI can later explain a result, but the engine output remains authoritative.

## V1 regression scenarios
Automated tests should include at least:

1. Monthly deficit -> cash-flow stabilization ranks first.
2. Positive surplus + missing employer-match data -> request match information rather than guessing.
3. Match not fully captured + adequate cash flow -> employer match ranks before starter reserve expansion.
4. No starter reserve -> starter emergency fund outranks extra high-interest debt payment.
5. Starter reserve funded + 24% credit-card debt -> high-interest debt ranks next.
6. High-interest debt gone + reserve below full target -> full emergency fund ranks next.
7. Full reserve + 8% personal loan -> moderate-interest debt ranks next.
8. Mortgage-only household is not classified as urgent consumer debt solely from APR.
9. HSA eligible + explicit HSA target + higher priorities satisfied -> HSA recommendation.
10. Roth IRA eligible + explicit target + higher priorities satisfied -> Roth IRA recommendation.
11. Roth eligibility unknown -> recommendation identifies eligibility uncertainty instead of claiming direct Roth contribution is valid.
12. Roth IRA and Traditional IRA share one person-level annual IRA limit.
13. Traditional IRA deductibility unknown -> no guaranteed deduction claim.
14. Workplace match captured -> unmatched 401(k) contribution remains a later retirement bucket.
15. Multiple retirement accounts -> engine follows configured retirement order deterministically.
16. User preference overrides default HSA/Roth/workplace order where allowed by policy.
17. HSA employer contribution reduces remaining annual HSA contribution capacity.
18. 2026 family HSA policy uses the correct versioned tax-year limit.
19. Near-term goal shortfall -> goal recommendation after higher priorities are satisfied.
20. Goal past due -> surface data-quality/goal-maintenance warning rather than negative months calculation.
21. Low-interest mortgage + healthy profile -> tradeoff/optional optimization, not high urgency.
22. Duplicate debt names do not affect ranking because IDs are authoritative.
23. Negative / NaN inputs normalize safely.
24. Empty profile returns targeted data-quality guidance instead of confident recommendations.
25. Fully healthy profile returns optional optimization recommendations rather than false urgency.
26. Same normalized input + policy version returns byte-equivalent ranked engine decisions where serialization order is defined.
27. Total recommended monthly allocations never exceed available monthly surplus.
28. A recommendation with unknown required data never gets a fabricated exact target amount.

## Architecture
- `lib/priority-engine/types.ts` — normalized engine and recommendation types.
- `lib/priority-engine/policy.ts` — product policy and decision thresholds.
- `lib/priority-engine/tax-policy.ts` — versioned official annual contribution limits and phase-out metadata.
- `lib/priority-engine/normalize.ts` — defensive normalization and derived household metrics.
- `lib/priority-engine/engine.ts` — pure deterministic ranking/allocation engine.
- `lib/priority-engine/*.test.ts` — hierarchy, account-specific, tax-policy, and edge-case tests.
- Server-side household snapshot builder — reads authenticated household-scoped Supabase data and maps it into the normalized engine input.
- `app/priority/` or dashboard integration — recommendation presentation, explanations, missing-data prompts, and preference controls.
- No Supabase calls from the pure engine.
- No automatic writes to financial profile records.

## Likely profile/schema enhancements
The current financial profile does not contain enough structured information for every Phase 5 decision. Phase 5 should add only the fields required to make recommendations materially better.

Likely additions:
- retirement account subtype/account type normalization
- person/owner association for retirement accounts
- employee contribution YTD
- employer contribution YTD
- annual contribution target
- employer-match rule or explicit full-match employee contribution target
- Roth eligibility override/status
- HSA eligibility and coverage type
- optional household emergency-fund target months
- optional debt-vs-investing preference
- optional Roth-vs-traditional preference

Any schema migration must preserve RLS, household ownership, and minimal-data principles. Do not add SSNs, banking credentials, account numbers, tax documents, or other unnecessary sensitive data.

## Security and privacy
- Preserve authenticated household resolution and existing RLS model.
- Every source query must be filtered by resolved `household_id` in addition to RLS.
- Person-level retirement records must remain scoped through household membership.
- Priority calculations should happen server-side or from a minimal normalized snapshot; avoid financial values in URLs.
- No service-role access in application code.
- Recommendations are derived data and should remain ephemeral in V1 unless a later explicit saved-plan feature is designed.
- Preference updates must be explicit writes, never implicit changes caused by running the engine.
- Any new RLS or schema work must receive a live Supabase security-advisor review before merge.

## UI requirements
The Priority Engine UI should not just show a numbered list. Each recommendation card should answer:
- What should I do?
- How much should I direct there?
- Why is this ranked here?
- What higher priorities are already satisfied?
- What information is missing?
- Which account/debt/goal does this refer to?
- Which policy threshold or annual rule is being used?

The top of the page should clearly show:
- estimated monthly surplus
- top next-dollar action
- confidence
- current emergency-fund months
- highest non-mortgage APR
- employer-match status
- tax-advantaged target progress when known

## Phase 5 implementation order
1. Expand/normalize retirement account types and identify the minimum schema additions needed.
2. Add versioned product policy and 2026 tax-year policy using official IRS rules.
3. Implement normalized engine types and defensive normalization.
4. Implement cash-flow, employer-match, emergency-fund, and debt decision gates.
5. Implement account-specific HSA, Roth IRA, Traditional IRA, and unmatched workplace retirement decisions.
6. Implement goal urgency and low-interest debt/investing tradeoff decisions.
7. Implement deterministic surplus allocation across ranked recommendations.
8. Build the full regression suite before UI integration.
9. Build authenticated household snapshot builder using existing Phase 2/3 data plus any Phase 5 schema additions.
10. Build recommendation UI with explanations, confidence, missing-data states, and preference controls.
11. Audit recommendation quality against representative household scenarios.
12. Run security review, Supabase advisors for any schema/RLS changes, lint, tests, production build, and final merge review.

## Out of scope for V1
- Bank transaction categorization
- Automatic money movement
- Automatic payroll contribution changes
- Tax-return preparation
- Personalized tax filing advice
- Backdoor Roth workflows
- Mega backdoor Roth workflows
- Detailed pension optimization
- Social Security claiming strategies
- Medicare planning
- Monte Carlo portfolio projections
- Personalized expected market-return assumptions
- AI-generated financial advice replacing deterministic rules
- Saved recommendation history
