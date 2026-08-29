# Family Finance Hub

Family Finance Hub is a private-first household financial planning application designed to help a household understand where it stands and decide what to do with the next dollar.

## Current milestone: v0.1 Secure Foundation

The Phase 1 foundation now includes:

- Next.js + TypeScript application structure
- Supabase cookie-based authentication foundation
- Sign-up, sign-in, confirmation callback, sign-out, and protected dashboard routes
- Household-based multi-tenant database design
- Row Level Security for profiles, households, and household membership
- Verified cross-household isolation in the Supabase development project
- Product, database, security, and Money Priority Engine documentation

## Privacy model

Every sensitive financial record will belong to a `household_id`. Access is enforced in Postgres Row Level Security, not merely hidden in the frontend. A user can only retrieve household records for households in which they have an authorized membership.

Sharing a generic Family Finance Hub link creates a separate private account/workspace by default. Household sharing will only occur through an explicit invitation flow added later.

## Development stack

- Next.js
- React
- TypeScript
- Supabase Auth + Postgres + Row Level Security
- Vercel planned for deployment

## Local setup

1. Install Node.js 22 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and publishable key to `.env.local`.
5. Start development with `npm run dev`.

Never commit `.env.local`, service-role keys, secret API keys, banking credentials, account numbers, SSNs, or real test financial data.

## Documentation

- `docs/PRODUCT_ROADMAP.md`
- `docs/DATABASE_DESIGN.md`
- `docs/SECURITY_MODEL.md`
- `docs/SECURITY_TESTS.md`
- `docs/PRIORITY_ENGINE.md`

## Next milestone

After the secure foundation is merged, Phase 2 will build household onboarding and the first financial profile: household creation, income, accounts, debts, retirement accounts, and goals.
