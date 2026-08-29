# Money Priority Engine

## Purpose
The Money Priority Engine should answer: **What is the best next use of this household's available money?**

It is a planning and education feature, not individualized fiduciary, tax, or legal advice.

## Initial decision layers
The engine should eventually evaluate, in configurable order:

1. Maintain required monthly bills and minimum debt payments.
2. Capture available employer retirement match.
3. Establish a minimum emergency reserve.
4. Address very high-interest debt.
5. Improve emergency reserves toward the household target.
6. Keep tax-advantaged savings goals on pace (HSA, IRA, workplace retirement accounts where applicable).
7. Fund time-sensitive household goals.
8. Evaluate additional investing versus extra debt/mortgage payoff.

## Recommendation output
Each recommendation should contain:
- Priority rank
- Recommended action
- Suggested amount or range when possible
- Reason
- Key assumption(s)
- Tradeoff
- Confidence / completeness indicator based on available household data

## Example
```text
Priority 1 — Capture employer match
Suggested action: Increase workplace retirement contribution to the match threshold.
Why: Uncaptured employer match is part of compensation being left unused.
Assumption: The employer-match data entered by the household is current.
```

## Important design constraints
- Recommendations must be deterministic and testable before adding AI-generated wording.
- AI may explain a recommendation later, but it must not be the source of the underlying financial calculation.
- Users must be able to inspect and change assumptions.
- The engine must never modify accounts or contribution settings automatically.
- Tax limits and rules must be versioned by calendar year rather than hard-coded forever.
- The engine must support different priorities and risk preferences instead of pretending one ordering fits everyone.

## Future inputs
- Household income stability
- Emergency-fund target months
- Employer match details
- Debt APRs
- Tax-advantaged account eligibility and annual limits
- Goal deadlines
- Mortgage APR
- Expected investment return assumptions
- User preference for liquidity vs. debt reduction vs. investing
