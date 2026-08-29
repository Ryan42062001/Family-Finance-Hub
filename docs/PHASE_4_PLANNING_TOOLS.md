# Phase 4 — Planning Tools

## Objective
Turn the household financial profile into practical calculators that answer focused planning questions without changing live household data.

## Status
All six planned calculators are implemented:
1. Emergency-fund calculator
2. Mortgage extra-payment calculator
3. Savings-goal projection
4. Retirement contribution pacing
5. Debt payoff calculator
6. Paycheck planner

Phase 4 is in cleanup, security review, and final verification before merge.

## Architecture
- Authenticated server pages read household-scoped defaults from Supabase.
- Interactive calculator assumptions live in client-local React state and are not placed in query strings.
- Pure calculation modules live under `lib/calculations/` with automated tests.
- Calculator assumptions never write back to household records automatically.
- Dedicated client components live under `components/planning/`.

## Privacy and security
- Pages verify identity with `supabase.auth.getClaims()` before reading household data.
- Every financial-data query is explicitly filtered by the resolved household ID in addition to database RLS.
- No service-role or privileged database access is used by planning tools.
- No new sensitive-data fields are required for Phase 4.
- Scenario values remain ephemeral unless a future explicit save feature is designed with household scoping and RLS.
- Financial assumptions must not be placed in URL query parameters, browser history, or referrer data.

## Calculation assumptions
- Mortgage projections use principal + interest only and exclude escrow, taxes, insurance, and fees.
- Debt strategies use fixed APRs and fixed minimum payments; mortgage debt is excluded from avalanche/snowball comparison because it has a dedicated tool.
- Savings and emergency-fund projections exclude investment growth and changing expenses.
- Retirement pacing does not determine tax-law eligibility or legal contribution limits.
- Paycheck projections depend on the selected pay frequency and do not model bonuses or irregular checks.

## Verification before merge
- Automated tests cover each planning calculation and important edge cases.
- Lint passes.
- Production build passes.
- Calculators render safely with empty/partial household profiles.
- Results state assumptions clearly.
- Existing household-isolation model remains unchanged.
- Supabase security/RLS review is completed.

## Out of scope
- Money Priority Engine recommendations
- Saved scenarios
- Applying calculator results directly to live financial records
- Bank syncing
- Transaction-level budgeting
- Tax-return preparation or tax advice
