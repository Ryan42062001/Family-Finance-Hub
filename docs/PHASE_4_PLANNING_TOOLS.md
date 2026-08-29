# Phase 4 — Planning Tools

## Objective
Turn the household financial profile into practical calculators that answer focused planning questions without changing live household data.

## Scope
Phase 4 will deliver six planning tools:

1. Paycheck planner
2. Emergency-fund calculator
3. Debt payoff calculator
4. Mortgage extra-payment calculator
5. Savings-goal projections
6. Retirement contribution pacing

## Product behavior
Each tool should:
- Reuse household financial data when helpful, while allowing users to adjust assumptions locally.
- Keep calculations pure and testable under `lib/calculations`.
- Clearly display assumptions and results.
- Handle missing or zero-value inputs safely.
- Avoid presenting projections as guarantees.
- Never write scenario/calculator values back to household records automatically.

## Initial implementation order
1. Emergency-fund calculator — simplest useful planning tool and foundation for later Priority Engine logic.
2. Mortgage extra-payment calculator — deterministic amortization logic with strong household value.
3. Savings-goal projection — reusable time-to-goal math.
4. Retirement contribution pacing — annual-limit and remaining-pay-period calculations.
5. Debt payoff calculator — payoff timeline and interest comparisons.
6. Paycheck planner — combines income allocation and planning outputs from prior tools.

## Architecture
- Planning page under `app/planning/`.
- Pure calculation modules under `lib/calculations/`.
- Tests for every calculator and important edge case.
- Presentational components may live under `components/planning/` if the page becomes large.
- Calculators should accept explicit inputs rather than reaching into Supabase from calculation modules.

## Privacy and security
- Household defaults must be read through the existing authenticated, household-scoped server flow.
- No service-role or privileged database access.
- No new sensitive-data fields are required for Phase 4.
- Calculator inputs are ephemeral unless a future explicit save feature is designed with household scoping and RLS.

## Verification before merge
- Automated tests cover each planning calculation.
- Lint passes.
- Production build passes.
- Calculators render safely with empty/partial household profiles.
- Results state their assumptions clearly.
- Existing household-isolation model remains unchanged.

## Out of scope
- Money Priority Engine recommendations
- Saved scenarios
- Applying calculator results directly to live financial records
- Bank syncing
- Transaction-level budgeting
- Tax-return preparation or tax advice
