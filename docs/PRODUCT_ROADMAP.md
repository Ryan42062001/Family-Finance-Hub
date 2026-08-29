# Family Finance Hub — Product Roadmap

## Product vision
Family Finance Hub is a private-first household financial planning application that helps people understand their current finances and decide what to do with their next dollar.

The product is not intended to be only a transaction tracker. Its long-term differentiators are the Money Priority Engine, Household Financial Roadmap, Paycheck Planner, and Scenario Lab.

## Phase 1 — Secure Foundation
- Next.js + TypeScript application
- Authentication foundation
- Household-based tenancy model
- Supabase database and Row Level Security
- Responsive application shell
- Environment and secret handling
- Security regression tests

## Phase 2 — Household Financial Profile
- Household onboarding
- Income sources
- Cash and savings accounts
- Investment and retirement accounts
- Debts and mortgages
- Recurring expenses
- Financial goals

## Phase 3 — Dashboard
- Net worth
- Monthly cash flow
- Savings rate
- Debt totals
- Goal progress
- Retirement contribution progress
- Financial health summary

## Phase 4 — Planning Tools
- Paycheck planner
- Emergency-fund calculator
- Debt payoff calculator
- Mortgage extra-payment calculator
- Savings-goal projections
- Retirement contribution pacing

## Phase 5 — Money Priority Engine
- Evaluate employer match
- Evaluate emergency reserves
- Evaluate high-interest debt
- Evaluate HSA / IRA / workplace retirement contribution pacing
- Evaluate short-term household goals
- Evaluate extra debt payments
- Explain recommendations and tradeoffs

## Phase 6 — Scenario Lab
Examples:
- Increase retirement contribution rate
- Max an HSA
- Make extra mortgage payments
- Buy a vehicle
- Lose one income temporarily
- Receive a raise
- Change monthly savings

Scenarios must never modify live household data unless the user explicitly applies them.

## Phase 7 — Private Beta
- Invite friends and family to create independent households
- Account recovery
- Security review
- Accessibility and mobile polish
- Feedback collection

## Future considerations
- Bank and investment account syncing
- Automated recurring transaction detection
- Shared household access
- Read-only advisor/family access
- AI-generated financial explanations
- Export and annual review reports

## Product principles
1. Household privacy is enforced at the database layer.
2. Recommendations explain why, not just what.
3. Simple Mode should be approachable for non-finance users.
4. Advanced Mode should expose assumptions and projections.
5. No sensitive banking credentials, SSNs, or tax documents are required for the MVP.
6. Security regressions block releases.
