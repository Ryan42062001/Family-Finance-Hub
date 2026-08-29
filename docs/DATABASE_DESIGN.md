# Database Design

## Core entities

### profiles
Application profile metadata keyed to the Supabase Auth user id.

### households
An isolated financial workspace. A household may eventually contain one person, spouses/partners, or another intentionally shared financial unit.

### household_members
Join table between authenticated users and households. Membership determines access.

## Financial tables planned for later phases
Every financial table must include a required `household_id` foreign key.

- `accounts`
- `income_sources`
- `recurring_expenses`
- `transactions` (future)
- `debts`
- `financial_goals`
- `retirement_accounts`
- `contribution_plans`
- `scenarios`
- `scenario_changes`

## Relationship overview

```text
auth.users
    |
    +--> profiles
    |
    +--> household_members --> households
                                 |
                                 +--> accounts
                                 +--> income_sources
                                 +--> recurring_expenses
                                 +--> debts
                                 +--> financial_goals
                                 +--> retirement_accounts
                                 +--> scenarios
```

## Design rules
1. UUID primary keys.
2. Timestamps stored as `timestamptz`.
3. Monetary values stored as integer cents where practical to avoid floating-point rounding errors.
4. Financial records cannot exist without a household.
5. Foreign keys should use deliberate deletion behavior; do not casually cascade-delete financial history.
6. RLS is enabled on every user-accessible table.
7. Authorization is based on authenticated user membership, never an email address sent by the browser.
8. Scenario data is isolated from live planning data until explicitly applied.

## Household membership roles
- `owner`
- `member`
- `viewer` (future/read-only)

## MVP boundary
Phase 1 creates only the tenancy and identity foundation. Financial tables should be introduced incrementally with matching RLS policies and isolation tests in the same change.
