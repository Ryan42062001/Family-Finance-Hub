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
