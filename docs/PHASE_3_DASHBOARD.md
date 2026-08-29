# Phase 3 — Dashboard

## Status
Complete and ready for merge once the final CI run passes.

## Objective
Turn the household financial profile into a useful at-a-glance dashboard that explains the household's current financial position without weakening the privacy model established in Phases 1–2.

## Delivered
Phase 3 builds on the household-scoped data already available for accounts, income, recurring expenses, debts, retirement accounts, and goals.

### Dashboard metrics
- Net worth
- Total assets and liabilities
- Monthly income
- Monthly recurring expenses
- Monthly cash flow
- Savings rate
- Debt balance and required minimum payments
- Retirement balances and monthly contribution pace
- Goal progress
- Financial profile completion
- Conservative Financial Health Summary

### Dashboard breakdowns
- Assets and liabilities with record-level detail
- Debt balances with APR and minimum payments
- Expenses by category
- Essential vs discretionary recurring expenses
- Goal funding progress
- Retirement balance and contribution summary

### User experience
- Clear hierarchy from headline metrics to supporting detail
- Useful empty states when a financial section has no records
- Warnings when a metric is incomplete because required profile data is missing
- Financial Health scoring is withheld when core data is insufficient
- Responsive layout for desktop and mobile
- Direct navigation back to the financial profile for corrections

## Calculation architecture
Dashboard calculations remain pure and testable under `lib/calculations` rather than being embedded in React components. The calculation helpers cover category grouping, essential/discretionary spending, goal progress, profile completion, and Financial Health summary behavior, including incomplete-data cases.

## Privacy and security review
- Dashboard queries remain household-scoped with `.eq("household_id", household.id)` on every financial-data read.
- Household identity continues to come from authenticated server-side context.
- No service-role key or privileged database bypass is used for dashboard reads.
- No cross-household aggregation or comparison was added.
- Phase 3 contains no schema, RLS-policy, authentication, or privileged Supabase changes.
- Existing household-isolation controls from Phases 1–2 remain unchanged.

## Verification
Phase 3 merge criteria:
- Calculation tests pass.
- Lint passes.
- Production build passes.
- Dashboard handles an empty or partially completed profile without presenting misleading cash-flow or Financial Health metrics.
- Existing household isolation behavior remains unchanged.

## Out of scope
- Bank syncing
- Transaction-level budgeting
- Money Priority Engine recommendations
- Scenario Lab
- Shared household invitations
- Contribution-limit pacing against annual IRS limits; this belongs with the Phase 4 retirement planning tools.

These remain later roadmap phases.
