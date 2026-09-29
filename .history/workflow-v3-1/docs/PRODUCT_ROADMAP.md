# Family Finance Hub — Product Roadmap

## Product vision
Family Finance Hub is a private-first household financial planning application that helps people understand their current finances and decide what to do with their next dollar.

The product is not intended to be only a transaction tracker. Its long-term differentiators are the Money Priority Engine, Household Financial Roadmap, Paycheck Planner, and Scenario Lab.

## Current status
- Phase 1 — Secure Foundation ✅ Complete
- Phase 2 — Household Financial Profile ✅ Complete
- Phase 3 — Dashboard ✅ Complete
- Phase 4 — Planning Tools ✅ Complete
- Phase 5 — Money Priority Engine 🚧 Active
- Phase 6 — Scenario Lab
- Phase 7 — Deployment & Release Readiness
- Phase 8 — Private Beta

## Phase 1 — Secure Foundation ✅
- Next.js + TypeScript application
- Authentication foundation
- Household-based tenancy model
- Supabase database and Row Level Security
- Responsive application shell
- Environment and secret handling
- Security regression tests

## Phase 2 — Household Financial Profile ✅
- Household onboarding
- Income sources
- Cash and savings accounts
- Investment and retirement accounts
- Debts and mortgages
- Recurring expenses
- Financial goals

## Phase 3 — Dashboard ✅
- Net worth and asset/liability breakdown
- Monthly cash flow
- Savings rate
- Debt overview
- Goal progress
- Retirement balances and contribution pace
- Expense category and essential/discretionary breakdowns
- Financial profile completion guidance
- Financial health summary
- Safe empty and incomplete-data states
- Tested dashboard calculation helpers

## Phase 4 — Planning Tools ✅
- Paycheck planner
- Emergency-fund calculator
- Debt payoff calculator
- Mortgage extra-payment calculator
- Savings-goal projections
- Retirement contribution pacing

Phase 4 calculators reuse pure calculation modules, explain assumptions, handle incomplete data safely, and avoid modifying live household records unless a user explicitly applies a result in a later feature.

## Phase 5 — Money Priority Engine 🚧
- Evaluate employer match
- Evaluate emergency reserves
- Evaluate high-interest debt
- Evaluate HSA / IRA / workplace retirement contribution pacing
- Evaluate short-term household goals
- Evaluate extra debt payments
- Explain recommendations and tradeoffs

Phase 5 is the active milestone. It remains isolated on `phase-5-money-priority-engine` until its correctness, audit, migration, and integration gates are satisfied and PR #5 is ready to merge.

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

## Phase 7 — Deployment & Release Readiness
Before Private Beta, establish a production-ready deployment and a stable public application URL.

Required release-readiness work:
- Create and verify the Vercel production project and production environment.
- Configure production environment variables and secrets without committing sensitive values.
- Verify production Supabase project linkage, authentication callbacks, and required database migrations.
- Run production smoke tests for sign-up/sign-in, protected routes, household onboarding, dashboard, planning tools, and critical Money Priority Engine flows.
- Verify Row Level Security and cross-household isolation remain intact in the deployed environment.
- Establish a stable production URL and decide whether a custom domain is needed before Private Beta.
- Add the production website URL to the GitHub repository About section and README once it is stable.
- Maintain a release checklist and rollback path for failed production deployments or migrations.

Private Beta must not begin until the deployed application has a verified stable URL and the release-readiness checks above are satisfied.

## Phase 8 — Private Beta
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
