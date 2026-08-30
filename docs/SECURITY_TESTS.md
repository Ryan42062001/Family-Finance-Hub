# Security Verification

## Phase 1 household isolation test

Date: 2026-08-29
Environment: Supabase development project

The tenancy foundation was verified using two temporary test identities and two temporary households.

### Assertions

1. Test User A was a member only of Household A.
2. Test User B was a member only of Household B.
3. With the database executing as the `authenticated` role and User A's JWT subject, selecting households returned only Household A.
4. User A directly queried Household B by its known UUID and received zero rows.
5. With User B's JWT subject, selecting households returned only Household B.
6. User B directly queried Household A by its known UUID and received zero rows.
7. All temporary households and temporary auth users were deleted after verification; cleanup checks returned zero remaining fixtures.
8. Supabase Security Advisor reported no findings after the tenancy migration.

### Release rule

Cross-household isolation is a release blocker. Future financial tables must include `household_id`, enable Row Level Security, and receive equivalent positive-ownership and negative-cross-household tests before release.

### Current limitation

This verification proves the database RLS behavior. Automated CI coverage for these assertions should be added before private beta so regressions fail the build automatically.

## Phase 5 schema security verification

Date: 2026-08-30  
Environment: Supabase development project, hosted Postgres 17

The applied Phase 5 migration history and live schema were reconciled with the `phase-5-money-priority-engine` branch.

### Verified assertions

1. `household_people`, `household_financial_preferences`, and `insurance_exposures` have RLS enabled.
2. Each new table has four household-member policies covering SELECT, INSERT, UPDATE, and DELETE.
3. Each new table has explicit authenticated CRUD grants for Data API compatibility.
4. Income-owner, retirement-owner, insurance-person, account-goal, and account-debt relationships use composite household-aware foreign keys.
5. Phase 5 catalog regression checks execute successfully without exceptions.
6. Supabase Security Advisor reports no findings.
7. Performance Advisor reports only expected unused-index informational notices because the development database currently contains no household financial rows.

### Automated check

Run `supabase/tests/phase_5_schema_security.sql` against the target database after migrations. Any missing RLS setting, policy, grant, or household-aware relationship raises an exception.

### Remaining release test

Before merging Phase 5, repeat the two-identity positive-ownership and negative-cross-household CRUD test for all three new tables. This remains a release blocker even though their policies use the previously verified household-membership function.
