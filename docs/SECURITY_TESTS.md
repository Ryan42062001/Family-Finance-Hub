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

## Phase 5 role-aware remediation verification

The Phase 5 adversarial audit found that generic membership policies allowed the `viewer` role to write. The additive remediation migration establishes this contract:

- owner: household read, financial writes, and household metadata updates;
- member: household read and financial writes, but no owner-only metadata operation;
- viewer: read only;
- non-member: no household access.

`households.created_by` is immutable. Financial UPDATE policies apply the writer predicate in both `USING` and `WITH CHECK`, preventing destination-household reassignment.

Foundation CI runs `npm run test:security`, which verifies the complete migration policy contract for every household financial table. This deterministic test catches policy omissions and accidental fallback to generic membership writes.

### CI limitation and live release check

CI does not have a disposable Supabase project or privileged test credentials, so its contract test does not execute PostgreSQL RLS. The release check must additionally run a rollback-only live transaction covering owner, member, viewer, non-member, and a second household; creator immutability; cross-household references; and household-ID reassignment. Security Advisor and live policy definitions must also be inspected after migration application.
