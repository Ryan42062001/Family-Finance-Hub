# Family Finance Hub

Family Finance Hub is a private-first household financial planning application designed to help a household understand where it stands and decide what to do with the next dollar.

## Current milestone: v0.2 Financial Profile

The application now includes the Phase 1 secure foundation plus the completed Phase 2 financial profile:

- Next.js + TypeScript application structure
- Supabase cookie-based authentication
- Sign-up, sign-in, confirmation callback, sign-out, and protected routes
- Household-based multi-tenant database design
- Automatic first-household owner membership
- Row Level Security across household and financial data
- Household onboarding
- Cash and asset accounts
- Income sources
- Recurring monthly expenses
- Debts
- Retirement accounts
- Financial goals
- Validated create, edit, and delete flows
- Dashboard calculations for net worth, monthly income, expenses, cash flow, debt, retirement, and savings rate
- Profile-completion guidance
- Automated financial-calculation tests in CI
- Verified cross-household read and update isolation

## Privacy model

Every sensitive financial record belongs to a `household_id`. Access is enforced in Postgres Row Level Security, not merely hidden in the frontend. Server actions derive the current household from the authenticated session and constrain mutations by both record ID and household ID.

Sharing a generic Family Finance Hub link creates a separate private account/workspace by default. Household sharing will only occur through an explicit invitation flow added later.

## Development stack

- Next.js 16
- React 19
- TypeScript
- Supabase Auth + Postgres + Row Level Security
- GitHub Actions CI
- Vercel planned for deployment

## Local setup

1. Install Node.js 22 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and publishable key to `.env.local`.
5. Start development with `npm run dev`.

Never commit `.env.local`, service-role keys, secret API keys, banking credentials, account numbers, SSNs, or real test financial data.

Verification:

```bash
npm test
npm run lint
npm run build
```

## Documentation

- `docs/PRODUCT_ROADMAP.md`
- `docs/DATABASE_DESIGN.md`
- `docs/SECURITY_MODEL.md`
- `docs/SECURITY_TESTS.md`
- `docs/PRIORITY_ENGINE.md`

## Next milestone

Phase 3 expands the dashboard experience and builds on the Phase 2 household financial profile with richer financial summaries and planning insights.
