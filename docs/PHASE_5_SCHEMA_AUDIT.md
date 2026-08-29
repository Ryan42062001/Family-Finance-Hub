# Phase 5 — Schema Audit

## Purpose
Audit the current live Supabase schema and the existing financial-profile code against the expanded Phase 5 Money Priority Engine requirements.

## Executive conclusion
The existing household financial model is strong enough to support most of Phase 5 without redesigning the core schema. Income, expenses, debts, goals, cash accounts, household isolation, and monthly contribution fields are already usable.

The main gaps are concentrated in retirement/HSA planning metadata and household-level planning preferences. The recommended migration should therefore be additive and small rather than introducing a parallel planning schema.

## Existing data that is already sufficient

### Income
`income_sources.monthly_amount` is already stored as monthly take-home income. This is sufficient for the V1 cash-flow gate.

No Phase 5 schema change required.

### Expenses
`expenses.monthly_amount` and `expenses.is_essential` already allow the engine to calculate:
- total monthly expenses
- essential monthly expenses
- discretionary monthly expenses
- starter/full emergency-fund targets

No Phase 5 schema change required.

### Debts
The existing debt model already provides:
- stable ID
- debt type
- current balance
- APR
- minimum payment

This is sufficient for high-interest, moderate-interest, mortgage, and low-interest debt classification in V1.

No Phase 5 schema change required.

### Goals
The existing goal model already provides:
- target amount
- current amount
- target date
- user priority

This is sufficient to calculate goal gap, months remaining, and required monthly pace.

`planned_monthly_contribution` would improve later recommendations, but is not required for the first engine implementation because the engine can calculate the required pace from target/current/date.

Recommendation: defer `planned_monthly_contribution` unless the UI later needs to distinguish required pace from already-planned pace.

### Cash / liquid accounts
The existing accounts model distinguishes checking, savings, cash, brokerage, and other assets.

This is enough for V1 if the normalized snapshot counts only checking/savings/cash toward liquid emergency reserves by default and excludes brokerage/other assets.

No Phase 5 schema change required for V1.

## Retirement-account audit
The current `retirement_accounts` table contains:
- `id`
- `household_id`
- `name`
- `account_type`
- `balance`
- `monthly_employee_contribution`
- `monthly_employer_contribution`

The current account-type list supports:
- 401(k)
- 403(b)
- 457
- Traditional IRA
- Roth IRA
- HSA
- pension
- other

This is a good base, but it is not enough for account-aware priority recommendations.

## Required Phase 5 retirement additions

### 1. `tax_treatment`
Suggested values:
- `traditional`
- `roth`
- `mixed`
- `not_applicable`
- `unknown`

Why it matters:
A workplace account type alone does not tell the engine whether current employee contributions are pre-tax, Roth, or mixed.

Recommended for Phase 5 V1: yes.

### 2. `employee_contributed_ytd`
Numeric, nullable.

Why it matters:
The engine cannot calculate remaining annual retirement contribution capacity or pacing from monthly contribution alone.

Recommended for Phase 5 V1: yes.

### 3. `employer_contributed_ytd`
Numeric, nullable.

Why it matters:
Required for HSA contribution-limit accounting and useful for employer-plan explanations.

Recommended for Phase 5 V1: yes.

### 4. `annual_contribution_target`
Numeric, nullable.

Why it matters:
Phase 5 should recommend toward the household's explicit goal, not automatically assume every user wants to hit the statutory maximum.

Recommended for Phase 5 V1: yes.

### 5. `full_match_employee_contribution_monthly`
Numeric, nullable.

Why it matters:
This gives the engine a deterministic monthly employee contribution amount needed to capture the full employer match without forcing V1 to implement every employer match formula.

Recommended for Phase 5 V1: yes.

### 6. `match_status`
Suggested values:
- `not_offered`
- `unknown`
- `not_fully_captured`
- `fully_captured`

Why it matters:
A nullable boolean cannot distinguish "there is no match" from "we do not know whether a match exists." That distinction matters for confidence and missing-data handling.

Recommended for Phase 5 V1: yes.

## Retirement account-type normalization
The existing schema uses `457`; the Phase 5 design used `457b`.

Recommendation: preserve existing stored value `457` for backward compatibility in the database and normalize it to the engine's canonical `457b` type in the snapshot builder.

Do not perform a destructive rename solely for engine aesthetics.

Additional account types that may be added safely to the allowed list:
- `tsp`
- `simple_ira`
- `sep_ira`

These are useful but not required to make the initial engine work for current data.

Recommendation: include them in the Phase 5 migration because expanding the check constraint is low-risk and avoids another near-term migration.

## HSA-specific audit
The current product stores HSA as a retirement-account type. That is acceptable for V1 and avoids creating a separate HSA table.

However, the engine needs metadata that does not naturally belong only to an account row:
- HSA eligibility
- coverage type: self-only/family/unknown

Recommended design: add household-level planning settings rather than duplicating these fields on every HSA account.

## Household planning preferences
Create one household-scoped settings table, for example `household_financial_preferences`, with one row per household.

Recommended Phase 5 V1 fields:
- `household_id` primary key / FK
- `emergency_fund_months` nullable numeric or smallint
- `debt_vs_investing` text: `debt_focused | balanced | growth_focused | unspecified`
- `roth_vs_traditional` text: `roth | traditional | balanced | unspecified`
- `hsa_eligible` nullable boolean
- `hsa_coverage_type` text: `self_only | family | unknown`
- timestamps

Why use a dedicated table instead of columns on `households`:
- keeps identity/tenancy data separate from financial-planning settings
- makes future preference additions cleaner
- can use the same household-scoped RLS model as financial tables

## Fields deliberately deferred
The following are useful but should not block the first engine:

### Owner/person linkage for retirement accounts
The current schema is household-level and does not yet have a first-class household-person model beyond authenticated members.

IRA limits are person-specific, so robust multi-person retirement-limit enforcement will eventually need account ownership. For V1, avoid pretending to enforce a household-wide IRA limit when multiple spouses may each have separate limits.

Recommended V1 behavior:
- allow account-specific targets/YTD values
- do not aggregate two people's IRA accounts into one statutory limit unless ownership is known
- surface a tax-rule warning when ownership matters

Future schema: introduce an explicit financial-profile person/owner model rather than overloading auth membership.

### Filing status and modified AGI
Do not require tax-sensitive personal data simply to make Phase 5 work.

V1 should allow Roth eligibility / Traditional IRA deductibility to remain unknown and explain that limitation.

Future versions may add optional tax-profile inputs after a separate privacy/product review.

### Exact employer-match formula
Do not store a complex formula DSL in V1.

Use `full_match_employee_contribution_monthly` plus `match_status`. This is enough to answer whether the current monthly contribution captures the match.

A richer match model can be added later if automatic payroll-percentage calculation becomes a product requirement.

### Goal planned monthly contribution
Useful but not required for V1.

## Minimal recommended migration

### Alter `retirement_accounts`
Add nullable columns:
- `tax_treatment text`
- `employee_contributed_ytd numeric(14,2)`
- `employer_contributed_ytd numeric(14,2)`
- `annual_contribution_target numeric(14,2)`
- `full_match_employee_contribution_monthly numeric(14,2)`
- `match_status text not null default 'unknown'`

Add appropriate non-negative checks to numeric fields.

Expand the `account_type` check constraint to include `tsp`, `simple_ira`, and `sep_ira` while preserving existing values.

Add a check constraint for `tax_treatment` and `match_status`.

### Create `household_financial_preferences`
Suggested V1 columns:
- `household_id uuid primary key references households(id) on delete cascade`
- `emergency_fund_months numeric(3,1)` nullable, constrained to a reasonable range such as 1–12
- `debt_vs_investing text not null default 'unspecified'`
- `roth_vs_traditional text not null default 'unspecified'`
- `hsa_eligible boolean` nullable
- `hsa_coverage_type text not null default 'unknown'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Enable RLS and apply the existing `private.is_household_member(household_id)` pattern for select/insert/update/delete.

## Security impact
The proposed changes do not require service-role access, new SECURITY DEFINER functions, views, or cross-household joins.

The new preferences table should follow the existing household-scoped RLS pattern. The retirement columns inherit the current `retirement_accounts` RLS policies.

All application reads and mutations should continue to include explicit `household_id` filters in addition to RLS.

## Migration-risk assessment
Risk is low because the migration is additive:
- no existing financial rows need to be rewritten
- new planning metadata can remain null/unknown until users enter it
- existing Phase 2/3/4 pages continue to work if their selects remain explicit
- engine logic can treat null fields as missing data rather than inventing values

The one existing constraint that must be changed carefully is `retirement_accounts.account_type` if the allowed type list is expanded.

## Final audit result
### No schema change required
- accounts
- income_sources
- expenses
- debts
- goals

### Additive changes required
- retirement_accounts planning metadata
- household financial preferences / HSA eligibility

### Deferred by design
- tax filing status / MAGI
- retirement-account person ownership
- exact employer match formula DSL
- goal planned monthly contribution

This is the smallest schema expansion that supports the detailed Phase 5 engine without turning the financial profile into a tax-return data model.