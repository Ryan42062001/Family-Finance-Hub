# Family Finance Hub — Product Roadmap

## Completed product foundation

Phases 1–6 established the secure household foundation, financial profile, dashboard, planning tools, Money Priority
Engine and the Scenario Lab baseline.

## FFH-P01 — Release Blocker Integration & Production Readiness

State: CLOSED. Risk: HIGH. Merged via PR #81 at `ec75d98` (2026-11-11).

Prove auth and two-household isolation, finish the owner-preview punch list, keep docs current and prepare a rollback
plan. Current gate status: `docs/FFH-P01_RELEASE_READINESS.md`; open work: `.ai/CURRENT_PHASE.md`.

Production deployment, Private Beta and paid domain/configuration are separate Ryan decisions, not authorized by this
phase.

## FFH-P02 — Modern UI refresh and dark mode

State: BUILDING. Risk: LOW. Branch `phase/ffh-p02-modern-ui`. Presentation only; no data, auth or calculation changes.
Production deployment is a separate Ryan decision and is not authorized by this phase.

## Planned after FFH-P02 (owner-approved order, revised 2026-11-12)

1. **Your money plan as the home screen.** Surface the existing Money Priority Engine as a plain, ordered list of
   steps (amount, destination, one-line reason, status: Recommended / Worth considering / Needs more information).
   The current dashboard numbers move under it. No new financial policy: every step comes from the engine. HIGH risk
   (money recommendations), so the independent review is a different model.
2. **Simple mode (a per-household switch) with a guided setup.** About five questions (take-home pay, fixed bills,
   other spending, debts, savings), then straight to the money plan. Simple mode hides Scenario Lab, the HSA/SIMPLE
   IRA pages, chart details and most planning tools. Off by default; any household can turn it on or off.
3. Household invitations (spouse joins the household; uses the existing owner/member/viewer roles).
4. Goals with target dates and the monthly amount needed; a monthly check-in ("did you do this month's plan?") with
   history of net worth and cash flow.
5. Account settings: change password and email, delete account (also enables test-account cleanup).
6. Bills and due dates with optional reminders, then export of the plan (PDF/CSV).

Changes alongside: Scenario Lab becomes a "What if?" action on the money plan; overlapping planning calculators fold
into the plan, the rest sit under "Tools"; HSA and SIMPLE IRA pages move under "Advanced"; long explanatory text is
shortened.

Dropped for now: CSV import of bank transactions (complexity, works against Simple mode). Deferred: monthly email
summary (until email deliverability is fixed).

## Before any Production release or Private Beta

A comprehensive independent audit with fixes, working Vercel automatic deploys, a rollback exercise, test-account
cleanup and email deliverability. Each is a separate Ryan decision.
