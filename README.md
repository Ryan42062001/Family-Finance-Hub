# Family Finance Hub

Family Finance Hub is a private-first household financial planning application designed to help a household understand where it stands and decide what to do with the next dollar.

## Current status

`main` contains the completed Phases 1–6 product baseline: secure household foundation, financial profile, dashboard, planning tools, Money Priority Engine, and Scenario Lab. **FFH-P01 — Release Blocker Integration & Production Readiness — is currently PREVIEW_READY on `phase/ffh-p01-release-readiness`. Production acceptance and Private Beta are not authorized.**

The stable application currently includes:

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
- Net worth with asset and liability detail
- Monthly cash-flow bridge and savings rate
- Expense category plus essential/discretionary breakdowns
- Debt balance, APR, and minimum-payment overview
- Retirement balances and monthly contribution pace
- Goal progress tracking
- Financial profile completeness guidance
- Conservative Financial Health Summary that withholds scoring when core data is incomplete
- Paycheck planning
- Emergency-fund planning
- Debt payoff planning
- Mortgage extra-payment planning
- Savings-goal projections
- Retirement contribution pacing
- Pure calculation helpers with automated tests in CI
- Responsive dashboard and planning states for empty or partial profiles
- Repository-enforced household scoping and RLS contract tests; deployed two-household negative verification remains a separate production-authorization gate

## Privacy model

Every sensitive financial record belongs to a `household_id`. Access is enforced in Postgres Row Level Security, not merely hidden in the frontend. Server actions derive the current household from the authenticated session and constrain mutations by both record ID and household ID. Dashboard and planning reads remain explicitly constrained to the server-derived authenticated household.

Sharing a generic Family Finance Hub link creates a separate private account/workspace by default. Household sharing will only occur through an explicit invitation flow added later.

## Development stack

- Next.js 16
- React 19
- TypeScript
- Supabase Auth + Postgres + Row Level Security
- GitHub Actions CI
- Vercel deployment platform

## Local setup

1. Install Node.js 22 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL, publishable key, and canonical `NEXT_PUBLIC_SITE_URL` origin to `.env.local`.
5. Start development with `npm run dev`.

Never commit `.env.local`, service-role keys, secret API keys, banking credentials, account numbers, SSNs, or real test financial data.

Verification:

```bash
npm test
npm run test:security
npm run typecheck
npm run lint
npm run build
```

## Documentation

- `docs/PRODUCT_ROADMAP.md`
- `docs/DATABASE_DESIGN.md`
- `docs/SECURITY_MODEL.md`
- `docs/SECURITY_TESTS.md`
- `docs/FFH-P01_RELEASE_READINESS.md`
- `docs/PHASE_3_DASHBOARD.md`
- `docs/PHASE_4_PLANNING_TOOLS.md`
- `docs/PRIORITY_ENGINE.md`

## Active milestone

FFH-P01 revalidates the integrated release blockers and assembles privacy-safe production-readiness evidence. The current deployed application URL is <https://family-finance-hub-ten-brown.vercel.app/>, but its existence is not production acceptance, deployment authorization, or Private Beta authorization. Current gate status and the rollback plan are recorded in `docs/FFH-P01_RELEASE_READINESS.md`.
