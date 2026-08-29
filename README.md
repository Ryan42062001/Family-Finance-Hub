# Family Finance Hub

A private-first household financial planning app focused on helping families understand their finances and decide what to do with their next dollar.

## Current status
**v0.1 — Secure Foundation**

The project is currently establishing its application shell, household tenancy model, database security rules, and development roadmap before real financial data is introduced.

## Planned stack
- Next.js 16
- React 19
- TypeScript
- Supabase Auth + Postgres + Row Level Security
- Vercel deployment

## Core product areas
- Household dashboard
- Budget and cash-flow planning
- Financial goals
- Retirement contribution tracking
- Debt and mortgage planning
- Paycheck Planner
- Money Priority Engine
- Scenario Lab

## Privacy model
Each user belongs to one or more explicitly authorized households. Every financial record will belong to a `household_id`, and PostgreSQL Row Level Security will enforce access at the database layer.

A friend or parent creating their own household will not be able to see another household's financial information unless an explicit sharing feature grants access.

## Local development
Requirements:
- Node.js 22+
- npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase variables can remain blank until a Supabase project is connected. Never commit `.env.local` or privileged service-role credentials.

## Documentation
- [`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md)
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md)
- [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md)
- [`docs/PRIORITY_ENGINE.md`](docs/PRIORITY_ENGINE.md)

## Security rule
A frontend filter is not a security boundary. Household isolation must be enforced with database Row Level Security, and cross-household isolation tests will be release blockers before private beta.
