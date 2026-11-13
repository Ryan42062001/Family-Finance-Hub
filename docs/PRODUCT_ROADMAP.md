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

## FFH-P02 — Modern redesign and dark mode

State: CLOSED. Risk: LOW. Released to Production via PR #98 at `e639533` (2026-11-12), with Ryan's explicit
authorization; Production smoke test 12/12 after release. Presentation only.

## FFH-P03 — Your money plan (home screen)

State: CLOSED. Risk: HIGH. Released to Production via PR #113 at `6fe7e11` (2026-11-13), with Ryan's explicit
authorization; Production smoke test 12/12 after release. Money plan, example household, profile fields for the
plan's facts, friendlier forms and the signed-in notice.

## FFH-P04 — Automated sign-in and isolation tests

State: BUILDING. Risk: HIGH. Branch `phase/ffh-p04-auto-isolation-tests`. Scope: `.ai/CURRENT_PHASE.md` (item 2
below).

## Planned after FFH-P02 (owner-approved order, revised 2026-11-12)

1. **Your money plan as the home screen.** Surface the existing Money Priority Engine as a plain, ordered list of
   steps (amount, destination, one-line reason, status: Recommended / Worth considering / Needs more information).
   The current dashboard numbers move under it. No new financial policy: every step comes from the engine. HIGH risk
   (money recommendations), so the independent review is a different model. Also in this phase:
   - a read-only **example household** (synthetic numbers) to try the plan before entering data;
   - a **"what's missing" checklist** naming the facts that unlock *Needs more information* steps;
   - headline badges: **debt-free date** and **months of cushion**, from existing calculations.
2. **Automated sign-in and isolation tests (Ryan, 2026-11-13).** A Playwright test in GitHub Actions that runs
   against the Preview after each phase-branch build. It signs in as TestA and as TestB using credentials stored only
   as encrypted GitHub Actions secrets (Ryan adds them in GitHub settings; never in chat, the repository or logs), then
   checks the signed-in identity, that neither account sees the other's records (Q3, Q7, Q8), that the money plan
   loads, and that sign-out clears the session. Read-only apart from signing in; synthetic accounts only. Work mode
   then focuses on look-and-feel and new screens. HIGH risk (auth/isolation and secrets handling).
3. **Simple mode (a per-household switch) with a guided setup.** About five questions (take-home pay, fixed bills,
   other spending, debts, savings), then straight to the money plan. Simple mode hides Scenario Lab, the HSA/SIMPLE
   IRA pages, chart details and most planning tools. Off by default; any household can turn it on or off. Also:
   **install on the phone home screen** (web app manifest and icons).
4. Household invitations (spouse joins the household; uses the existing owner/member/viewer roles).
5. Goals with target dates and the monthly amount needed; a monthly check-in ("did you do this month's plan?") with
   history of net worth and cash flow. Also:
   - **"Can we afford it?"**: a big-purchase check showing how the plan changes (surfaces the existing
     home-affordability calculation and generalises the question);
   - **irregular costs** (yearly or quarterly bills) set aside as a monthly amount;
   - a **per-paycheck view** of the plan, building on the paycheck planner;
   - an in-app **balance update reminder** after 30 days (email reminders wait for email deliverability).
6. Account settings: change password and email, delete account (also enables test-account cleanup), and
   **two-factor sign-in** (authenticator app). HIGH risk (auth).
7. Bills and due dates with optional reminders, then export of the plan (PDF/CSV).

Changes alongside: Scenario Lab becomes a "What if?" action on the money plan; overlapping planning calculators fold
into the plan, the rest sit under "Tools"; HSA and SIMPLE IRA pages move under "Advanced"; long explanatory text is
shortened.

Dropped for now: CSV import of bank transactions (complexity, works against Simple mode). Deferred: monthly email
summary (until email deliverability is fixed).

## Before any Production release or Private Beta

A comprehensive independent audit with fixes, working Vercel automatic deploys, a rollback exercise, test-account
cleanup and email deliverability. Each is a separate Ryan decision.
