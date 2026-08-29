# Phase 3 — Dashboard

## Objective
Turn the household financial profile into a useful at-a-glance dashboard that explains the household's current financial position without weakening the privacy model established in Phases 1–2.

## Scope
Phase 3 will build on the household-scoped data already available for accounts, income, recurring expenses, debts, retirement accounts, and goals.

### Dashboard metrics
- Net worth
- Total assets and liabilities
- Monthly income
- Monthly recurring expenses
- Monthly cash flow
- Savings rate
- Debt balance and required minimum payments
- Retirement balances and monthly contributions
- Goal progress
- Financial profile completion

### Dashboard breakdowns
- Assets by account group
- Debt by debt type
- Expenses by category
- Essential vs discretionary recurring expenses
- Goal funding progress
- Retirement contribution summary

### User experience
- Clear hierarchy from headline metrics to supporting detail
- Useful empty states when a financial section has no records
- Warnings when a metric is incomplete because required profile data is missing
- Responsive layout for desktop and mobile
- Direct navigation back to the financial profile for corrections

## Calculation architecture
Dashboard calculations should remain pure and testable under `lib/calculations` rather than being embedded in React components. New calculations must handle empty arrays and zero-income edge cases explicitly.

## Privacy and security requirements
- Dashboard queries must remain household-scoped.
- Household identity must continue to come from the authenticated server-side context.
- No service-role key or privileged database bypass may be used for dashboard reads.
- No cross-household aggregation or comparison.
- Security regressions remain release blockers.

## Verification
Before Phase 3 merges:
- Calculation tests pass.
- Lint passes.
- Production build passes.
- Dashboard handles an empty or partially completed profile without crashing or presenting misleading metrics.
- Existing household isolation behavior remains unchanged.

## Out of scope
- Bank syncing
- Transaction-level budgeting
- Money Priority Engine recommendations
- Scenario Lab
- Shared household invitations

These remain later roadmap phases.