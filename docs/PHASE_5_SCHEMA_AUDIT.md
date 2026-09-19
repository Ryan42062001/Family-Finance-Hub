# Phase 5 — Schema Audit V2

## Purpose
Audit the live Supabase schema against the researched Phase 5 Money Priority Engine V2 design and identify the smallest additive schema expansion needed before implementation.

## Executive conclusion
The existing schema remains a strong foundation for Phase 5, but the V2 engine now requires more planning context than the original audit anticipated.

The core tables should **not** be redesigned. Household isolation, expenses, basic debts, balances, goals, and retirement balances already exist and can remain intact.

However, V2 introduces several requirements that are now first-class rather than optional:

1. explicit financial-profile people separate from authenticated household members
2. owner linkage for income and retirement accounts
3. gross-income data in addition to take-home income
4. purpose classification for cash accounts
5. insurance deductible / immediate-risk inputs
6. richer debt metadata for promotional, variable-rate, delinquent, and program-specific debt
7. richer goal metadata for necessity, flexibility, consequences, and need-vs-upgrade analysis
8. household planning/risk preferences
9. retirement projection inputs at the person/household level

The recommended approach is still additive and incremental. No destructive migration is required.

---

## Live schema verified
The live public schema currently contains:
- `households`
- `household_members`
- `accounts`
- `income_sources`
- `expenses`
- `debts`
- `retirement_accounts`
- `goals`
- `profiles`

RLS is enabled on all financial tables.

Existing financial-table policies consistently use:

`private.is_household_member(household_id)`

for SELECT/INSERT/UPDATE/DELETE authorization.

That tenancy pattern should be preserved for every new Phase 5 table.

---

# Existing data that remains sufficient

## Expenses
Current fields already support:
- monthly essential spending
- monthly discretionary spending
- emergency-fund expense base
- plan-feasibility calculations

Existing fields:
- `monthly_amount`
- `category`
- `is_essential`

No required Phase 5 V2 schema change.

A future version may distinguish fixed vs variable essential spending, but this is not necessary for the first V2 engine.

## Basic account balances
`accounts.balance` and `account_type` already provide the balance layer needed for net worth and cash totals.

The table should be extended rather than replaced.

## Basic debt math
`debts` already stores:
- type
- balance
- APR
- minimum payment

Those fields remain sufficient for ordinary fixed-rate debt payoff math.

The table needs additive metadata for V2 exceptions, described below.

## Basic goal math
`goals` already stores:
- target amount
- current amount
- target date
- user priority

Those remain the source for:

`required monthly pace = remaining amount / months remaining`

The table needs additional planning metadata rather than replacement.

---

# Required V2 schema additions

# 1. Financial-profile people

## Why this is now required
The authenticated `household_members` table is an access-control model, not a financial ownership model.

A spouse or dependent may need to exist in the financial plan even if that person does not have a login. Conversely, an authenticated household member should not automatically be treated as the owner of every retirement account.

V2 requires person-level handling for:
- IRA contribution limits
- employer retirement plans
- employer matching
- gross income
- retirement age
- Social Security assumptions
- person-specific tax-advantaged accounts

## Recommended new table: `household_people`

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `household_id uuid not null references households(id) on delete cascade`
- `display_name text not null`
- `linked_user_id uuid null references auth.users(id) on delete set null`
- `relationship text not null default 'other'`
- `birth_date date null`
- `planned_retirement_age smallint null`
- `is_dependent boolean not null default false`
- `is_active boolean not null default true`
- timestamps

Suggested relationship values:
- `self`
- `spouse_partner`
- `child`
- `dependent_adult`
- `other`

Important distinction:
`linked_user_id` is optional. Financial people must not depend on every person having a ChatGPT/app login.

RLS: household-member pattern via `household_id`.

---

# 2. Income ownership and gross income

## Existing limitation
`income_sources.monthly_amount` currently represents the monthly amount used by the product, but V2 needs both:
- take-home income for cash-flow stress
- gross income for retirement savings rates and broader planning metrics

## Recommended changes to `income_sources`
Add:
- `owner_person_id uuid null references household_people(id) on delete set null`
- `monthly_gross_amount numeric(14,2) null`
- `income_type text not null default 'employment'`
- `is_variable boolean not null default false`

Preserve existing `monthly_amount` as the current take-home/net planning amount to avoid breaking existing pages.

Suggested income types:
- `employment`
- `self_employment`
- `commission`
- `pension`
- `social_security`
- `rental`
- `other`

Do not rename `monthly_amount` in this migration; the application layer can normalize it to `monthlyTakeHomeAmount`.

---

# 3. Cash-purpose classification

## Existing limitation
V2 distinguishes money already owned by purpose:
- protected reserve
- earmarked/sinking fund
- debt-backed reserve
- unallocated cash

Counting every checking/savings dollar as deployable would create incorrect recommendations.

## Recommended changes to `accounts`
Add:
- `cash_purpose text not null default 'unallocated'`
- `related_goal_id uuid null references goals(id) on delete set null`
- `related_debt_id uuid null references debts(id) on delete set null`

Suggested cash-purpose values:
- `unallocated`
- `protected_reserve`
- `earmarked_goal`
- `debt_backed_reserve`
- `operating_cash`
- `not_applicable`

Application rule:
- checking/savings/cash may use these classifications
- brokerage/other assets normally use `not_applicable`

V1 engine should only auto-deploy `unallocated` cash.

`operating_cash` is intentionally separate from protected emergency reserves so ordinary bill-paying cash is not accidentally swept into optimization.

---

# 4. Insurance and immediate-risk exposure

## Why a dedicated table is better
Stage 1 now uses the household's largest relevant insurance deductible, while Stage 4 may use broader risk factors.

These fields do not fit cleanly into expenses or accounts.

## Recommended new table: `insurance_exposures`

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `household_id uuid not null references households(id) on delete cascade`
- `person_id uuid null references household_people(id) on delete set null`
- `name text not null`
- `insurance_type text not null`
- `deductible_amount numeric(14,2) null`
- `family_deductible_amount numeric(14,2) null`
- `out_of_pocket_max numeric(14,2) null`
- `percentage_deductible numeric(7,4) null`
- `insured_value numeric(14,2) null`
- `is_relevant_to_reserve boolean not null default true`
- timestamps

Suggested insurance types:
- `health`
- `auto`
- `homeowners`
- `renters`
- `umbrella`
- `pet`
- `other`

For percentage property deductibles, the snapshot builder can calculate:

`percentage_deductible × insured_value`

Do not automatically treat out-of-pocket maximum as Stage 1 target. Track it as additional exposure.

---

# 5. Debt metadata

## Existing limitation
APR + balance + minimum payment does not capture V2 special cases.

## Recommended additions to `debts`
Add nullable/defaulted fields:
- `rate_type text not null default 'fixed'`
- `promo_rate_expires_on date null`
- `post_promo_interest_rate numeric(7,4) null`
- `is_past_due boolean not null default false`
- `is_in_collections boolean not null default false`
- `has_legal_or_tax_priority boolean not null default false`
- `forgiveness_or_repayment_program text null`
- `scheduled_payoff_date date null`

Suggested `rate_type` values:
- `fixed`
- `variable`
- `promotional`
- `unknown`

Why these matter:
- promotional debt becomes a deadline liability
- variable rates influence yellow-zone risk
- delinquent/legal/tax obligations may become Priority 0
- student loans may need program-specific handling

Avoid building a large lender-specific schema in Phase 5.

---

# 6. Goal planning metadata

## Existing limitation
V2 no longer ranks goals primarily from `priority` and proximity.

The engine must understand whether missing a goal has real consequences and whether the target is flexible.

## Recommended additions to `goals`
Add:
- `goal_class text not null default 'major_life_goal'`
- `necessity text not null default 'important'`
- `deadline_flexibility text not null default 'flexible'`
- `consequence_level text not null default 'moderate'`
- `planned_monthly_contribution numeric(14,2) null`
- `core_need_amount numeric(14,2) null`

Suggested `goal_class`:
- `necessary_protective`
- `major_life_goal`
- `education`
- `home_purchase`
- `lifestyle_optional`
- `other`

Suggested `necessity`:
- `required`
- `important`
- `optional`

Suggested `deadline_flexibility`:
- `fixed`
- `somewhat_flexible`
- `flexible`

Suggested `consequence_level`:
- `high`
- `moderate`
- `low`

`core_need_amount` supports the V2 need-vs-upgrade concept without changing the user's full target amount.

Example:
- `target_amount = 60000`
- `core_need_amount = 28000`

The engine can protect the necessary portion while treating the remainder as lifestyle expansion.

---

# 7. Retirement account ownership and planning metadata

## Required changes to `retirement_accounts`
Add:
- `owner_person_id uuid null references household_people(id) on delete set null`
- `tax_treatment text null`
- `employee_contributed_ytd numeric(14,2) null`
- `employer_contributed_ytd numeric(14,2) null`
- `annual_contribution_target numeric(14,2) null`
- `full_match_employee_contribution_monthly numeric(14,2) null`
- `match_status text not null default 'unknown'`
- `hsa_coverage_type text null`
- `hsa_eligible boolean null`

Recommended `tax_treatment`:
- `traditional`
- `roth`
- `mixed`
- `not_applicable`
- `unknown`

Recommended `match_status`:
- `not_offered`
- `unknown`
- `not_fully_captured`
- `fully_captured`

## Account type normalization
Preserve existing stored `457` for backward compatibility and normalize to engine `457b`.

Expand allowed database values to include:
- `tsp`
- `simple_ira`
- `sep_ira`

Do not destructively rename existing account types.

## Why HSA metadata should live on the account now
The previous audit proposed household-level HSA eligibility. With the V2 person/ownership model, account-level HSA metadata is cleaner because eligibility and coverage can relate to a specific covered person/account and because multiple HSAs may exist in one household.

The snapshot layer can still derive household HSA limits using person/account ownership rules.

---

# 8. Household financial preferences and risk profile

Create one row per household.

## Recommended new table: `household_financial_preferences`

Suggested fields:
- `household_id uuid primary key references households(id) on delete cascade`
- `emergency_fund_months_override numeric(3,1) null`
- `debt_vs_investing text not null default 'balanced'`
- `roth_vs_traditional text not null default 'unspecified'`
- `risk_tolerance text not null default 'moderate'`
- `retirement_priority text not null default 'balanced'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested preference values should remain broad and explainable rather than producing false precision.

## Recommended risk inputs
The emergency-fund model also needs observable household facts. Prefer storing those separately from subjective preferences.

Add optional fields to this table or a dedicated risk-profile table:
- `job_replacement_difficulty text default 'unknown'`
- `known_income_disruption boolean default false`
- `known_income_disruption_end_date date null`

Income concentration and variable-income risk should be derived from `income_sources`, not manually duplicated.
Dependents should be derived from `household_people.is_dependent`.

For Phase 5, keeping these few risk fields in `household_financial_preferences` is acceptable and minimizes table count.

---

# 9. Retirement projection inputs

## Person-level inputs
Store on `household_people` where possible:
- birth date
- planned retirement age

## Household-level optional assumptions
Add to `household_financial_preferences`:
- `desired_retirement_monthly_spending numeric(14,2) null`
- `retirement_spending_basis text not null default 'unknown'`
- `planning_social_security_monthly numeric(14,2) null`
- `planning_pension_monthly numeric(14,2) null`

Do not store market-return assumptions in household rows.
Those belong in versioned engine policy so the same household state produces deterministic results under a given policy version.

Social Security values should be clearly marked as user-entered planning estimates unless a future integration supplies authoritative estimates.

---

# 10. Life events

V2 life events affect liquidity, income stability, deadlines, and risk.

Do **not** require a life-events table for the first Phase 5 build.

Most important effects can already be represented through:
- goals
- income activity/variability
- household people/dependents
- known income disruption fields
- emergency-fund override

A dedicated `life_events` table should be deferred until the product has a concrete workflow that needs event history or future event orchestration.

---

# Fields deliberately deferred

## Detailed tax-return profile
Do not require a tax-return-style schema in Phase 5.

Defer:
- complete MAGI construction
- deductions
- tax credits
- detailed filing-status history

The engine may accept user-confirmed Roth eligibility or mark it unknown.

## Exact employer-match formula DSL
V2 should support the progressive model but does not need an arbitrary formula language yet.

Use:
- required contribution for full match
- current contribution
- match status
- YTD values

Add exact payroll match formulas only when a UI/workflow requires them.

## Social Security benefit modeling
Use optional user-entered estimate initially.
Do not recreate SSA benefit calculations inside Phase 5.

## Detailed investment holdings/allocation
Phase 5 is a priority/allocation engine, not portfolio management.
Account balances and contribution destinations are sufficient.

## Actual money movement
Explicitly out of scope.

---

# Recommended migration grouping

The V2 additions are larger than the original audit but should still be delivered as one coherent additive Phase 5 foundation migration or as two tightly sequenced migrations.

## Migration A — ownership and planning foundation
1. Create `household_people`.
2. Add owner/gross/variability fields to `income_sources`.
3. Add owner and planning fields to `retirement_accounts`.
4. Create `household_financial_preferences`.
5. Expand retirement account-type constraint.

## Migration B — priority-engine context
1. Add cash-purpose fields to `accounts`.
2. Create `insurance_exposures`.
3. Add debt special-case metadata.
4. Add goal classification/flexibility fields.

Splitting the work this way makes validation and rollback reasoning easier while remaining fully additive.

---

# RLS and security plan

Every new household-scoped table must:
- have RLS enabled
- target `authenticated`
- use `private.is_household_member(household_id)` for row authorization
- have SELECT policy
- have INSERT `WITH CHECK`
- have UPDATE `USING` and `WITH CHECK`
- have DELETE `USING`

Existing modified tables inherit their current RLS policies.

No new SECURITY DEFINER function is required.
No public view is required.
No service-role browser access is required.

Application reads should continue to filter explicitly by `household_id` even though RLS is the security boundary.

For person-owned rows, security should remain household-based in Phase 5. Do not authorize solely from `owner_person_id` because financial household planning is intentionally shared within an authorized household.

---

# Data migration / backward compatibility

The live database currently has no rows in the audited financial tables, which lowers migration risk, but the design should still remain backward-compatible.

Rules:
- all newly required ownership links should initially be nullable
- existing account and debt type values remain valid
- current `monthly_amount` income semantics remain unchanged
- new preference/risk fields default to neutral/unknown states
- engine treats missing new fields as `More information needed`, not guessed values

When onboarding a household after the migration, the application should create financial-profile people before asking for owner-specific retirement details.

---

# Engine snapshot implications

The database should remain a persistence model, not the decision engine.

A server-side snapshot builder should normalize database rows into canonical engine input:

- household people
- gross and take-home income
- essential/discretionary expenses
- deployable vs protected cash
- insurance deductible target
- debt classifications and special conditions
- retirement ownership/contributions/match state
- goals and required funding pace
- emergency-fund risk inputs
- preferences
- projection inputs

The pure engine must not query Supabase directly.

---

# Final V2 audit result

## No structural redesign required
- `households`
- `household_members`
- `expenses`
- tenancy/RLS architecture

## Existing tables requiring additive columns
- `accounts`
- `income_sources`
- `debts`
- `retirement_accounts`
- `goals`

## New tables required
- `household_people`
- `insurance_exposures`
- `household_financial_preferences`

## Deferred
- detailed tax-profile model
- exact employer match DSL
- dedicated life-events table
- portfolio holdings/allocation model
- Social Security calculation engine
- automatic financial-account integrations or money movement

## Recommendation
Proceed with an additive Phase 5 schema migration before writing the recommendation engine.

The migration should prioritize **data correctness and explainability** over collecting every possible planning field. The engine can provide partial recommendations when optional data is missing, but ownership, cash purpose, immediate deductible exposure, and basic planning preferences are now foundational to V2 and should no longer be deferred.
