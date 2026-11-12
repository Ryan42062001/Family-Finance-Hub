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

## Planned after FFH-P02 (owner-approved order, 2026-11-12)

1. Household invitations (spouse joins the household; uses the existing owner/member/viewer roles).
2. Account settings: change password and email, delete account (also enables test-account cleanup).
3. Bills and due dates, with optional email reminders.
4. History and trends: monthly snapshots of net worth and cash flow.
5. Goal upgrades: target dates and the monthly amount needed.
6. CSV import of bank transactions (no bank-login linking).
7. Monthly email summary.
8. Export the plan (PDF/CSV).

## Before any Production release or Private Beta

A comprehensive independent audit with fixes, working Vercel automatic deploys, a rollback exercise, test-account
cleanup and email deliverability. Each is a separate Ryan decision.
