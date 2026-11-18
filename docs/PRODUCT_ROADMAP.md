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

State: CLOSED. Risk: HIGH. Released to Production via PR #121 at `4f66d7e` (2026-11-13), with Ryan's explicit
authorization; Production smoke test 12/12 after release. Playwright isolation suite and CI job (`e2e-isolation`)
on every phase push, with a locked-down browser, exact-build verification and fixed-sentence output; passed the
independent review after five rounds.

## FFH-P05 — Simple mode with guided setup

State: CLOSED. Risk: HIGH. Released to Production via PR #136 at `1bd1b59` (2026-11-13), with Ryan's explicit
authorization; Production smoke test 12/12 after release. Per-user Simple view, an atomic guided setup for every new
household (savings saved only with a chosen purpose), and home-screen install. Two hosted migrations were applied
with authorization (parity 9/9). Passed the independent review after three rounds.

## FFH-P06 — Household invitations

State: CLOSED. Risk: HIGH. Released to Production via PR #143 at `8d1a6aa` (2026-11-14), with Ryan's explicit
authorization; Production smoke test 12/12 after release. Owners share single-use, 7-day invite links; owner-only
role changes and removal; one household per account, enforced by the database. RLS matrix 970 plus a two-session
concurrency test. Hosted migrations applied with authorization (parity 9/9). Passed the independent review after one
remediation round.

## FFH-P07 — Goals and monthly check-in

State: CLOSED. Risk: HIGH. Released to Production via PR #155 at `1c4753d` (2026-11-15), with Ryan's explicit
authorization; Production smoke test 12/12 after release. Four hosted migrations applied with authorization (parity
9/9, 23 migrations). Passed the independent review after three remediation rounds (F01–F05, F02, N01–N02).
Scope: named savings goals with targets, saved balances, deadlines and calculated monthly requirements; a
separate tracker **not integrated into the Money Priority Engine**; monthly manual-balance and yes/no
plan-followed check-ins with historical net-worth/cash-flow snapshots. **Owner/member edit; viewer read-only**.
Released design and confirmed financial conventions: `docs/FFH-P07_DESIGN.md`. Release evidence and
open LOW findings are retained in `.ai/DECISIONS.md`.

Deferred to later phases: Can We Afford It, irregular-cost monthly set-asides, per-paycheck view, and
30-day in-app balance reminders.

## FFH-P08 — Account settings and security

State: CLOSED. Risk: HIGH. Released to Production via PR #176 at `2a62022` (2026-11-18), with Ryan's explicit
authorization; Production smoke test 12/12. Two hosted migrations (parity 9/9, 25 migrations). Independent audit FAIL
(F01 HIGH) → fixed → re-review PASS.
Risk: HIGH (auth, account deletion, identity-provider settings, household RLS). Phase branch:
`phase/ffh-p08-account-security`. P08 builds password change, authenticator-app two-factor sign-in and account
deletion/test-account cleanup (`docs/FFH-P08_PROPOSAL.md`); **email change is deferred** to the email-deliverability
item (R1).
No hosted SQL, Supabase Auth, Vercel, real-data or Production change is approved. Production
deployment remains a separate Owner authorization.

## FFH-P09 — Bills, due dates & exports

State: BUILDING. Risk: HIGH (money input representation, financial-table schema, household RLS, data export).
Phase branch: `phase/ffh-p09-bills-exports`, PR #178. Binding spec: GitHub issue #170 (recurring expenses with an
exact-cent monthly equivalent rounded up, anchored due dates, per-bill household reminders, `/bills`, print/PDF and
CSV of the current plan). No hosted SQL, Vercel, real-data or Production change is approved; Production deployment
remains a separate Owner authorization.

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
3. **Simple mode (a per-user switch; Ryan, 2026-11-13) with a guided setup offered to every new household.** About five questions (take-home pay, fixed bills,
   other spending, debts, savings), then straight to the money plan. Simple mode hides Scenario Lab, the HSA/SIMPLE
   IRA pages, chart details and most planning tools. Off by default; each person turns their own view on or off. Also:
   **install on the phone home screen** (web app manifest and icons).
4. Household invitations (spouse joins the household; uses the existing owner/member/viewer roles).
5. **FFH-P07 — approved 2026-11-14:** a separate savings-goals tracker (name, target amount, saved
   so far, target date, calculated monthly amount required), plus monthly check-ins (manually entered balances,
   yes/no plan-followed and net-worth/cash-flow snapshot history). Goal amounts are **not** added to the
   Money Priority Engine; owners/members may edit and viewers are read-only. **Defer to later phases:**
   - **"Can we afford it?"**: a big-purchase affordability check;
   - **irregular costs** (yearly/quarterly) with monthly set-asides;
   - a **per-paycheck view** of the plan;
   - an in-app **30-day balance update reminder** (email still deferred for deliverability).
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
