# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-18 — FFH-P07 released and closed.

- **Production:** FFH-P07 Goals and monthly check-ins, merged as `1c4753dab2e3a9e38fbfbe34ce82397e92047f43` from
  phase head `ae97e90e7d463be62243b22ece50c7b84b2f7b5a` (PR #155, Ryan's explicit authorization 2026-11-15).
  Production smoke **12/12** (Ryan, 2026-11-18). P07 **CLOSED**.
- **P07 shipped:** separate savings-goals tracker (`/goals`) and monthly check-ins with frozen planned cash-flow
  snapshots; owners/members edit, viewers read-only; check-in writes only through two audited SECURITY DEFINER
  functions. Hosted Supabase has all 4 P07 migrations (parity 9/9, migrations 23;
  `docs/workflow/FFH-P07_HOSTED_MIGRATION.md`). Design and approved rules: `docs/FFH-P07_DESIGN.md`.
- **Next phase:** none open. Roadmap candidates: account settings with two-factor sign-in, then bills and export;
  P07 deferrals (Can We Afford It, irregular set-asides, per-paycheck view, 30-day reminders). Ryan chooses.
- **Preview domain:** still points at `phase/ffh-p07-goals-and-check-ins`; move it to the next phase branch when one
  starts.
- **Backlog:** N01 raw onboarding error message, moderate npm advisories, and items in `.ai/DECISIONS.md`.
- **Repository bookkeeping:** `main`'s P06-era `.ai/CURRENT_PHASE.md` remains a historical/stale snapshot
  until an Owner-approved production release (merging docs to `main` would also deploy Production). The
  active P07 branch is the current phase source of truth. Do not merge directly to `main` for bookkeeping.
