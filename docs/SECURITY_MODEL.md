# Security Model

## Core rule
A signed-in user may only read or modify financial data for households in which that user is an authorized member.

This rule must be enforced by PostgreSQL Row Level Security (RLS). Frontend filtering is never considered a security boundary.

## Tenancy model
- Supabase Auth owns authentication identities.
- `profiles` contains non-sensitive application profile data keyed to the auth user id.
- `households` represents an isolated financial workspace.
- `household_members` maps users to households and stores their role.
- Every financial table must contain a non-null `household_id` foreign key.

## Initial roles
- `owner`: full household administration.
- `member`: normal household financial access.
- `viewer`: reserved for future read-only sharing.

V1 should not expose cross-household administrative access in the product UI.

## Required security properties
1. User A cannot select Household B's financial rows.
2. User A cannot insert rows into Household B.
3. User A cannot update or delete Household B rows.
4. Removing a membership immediately removes household access.
5. Client-provided `household_id` values are never trusted without RLS validation.
6. Service-role credentials are never shipped to the browser.
7. Local environment files and credentials are never committed to Git.
8. Security tests are release blockers.

## Authentication
Use Supabase Auth. Public browser code may use the project's publishable key. Privileged service-role credentials, if ever needed, must remain server-only and outside the repository.

## Data minimization for MVP
Do not collect:
- Bank usernames/passwords
- Full bank account numbers
- Social Security numbers
- Tax return documents
- Credit/debit card numbers

Manual balances, account nicknames, categories, goals, rates, and planning assumptions are sufficient for the MVP.

## Security testing
Before the private beta, automated tests must create at least two independent households and verify denied cross-household SELECT, INSERT, UPDATE, and DELETE operations.

Any failed isolation test blocks deployment.
