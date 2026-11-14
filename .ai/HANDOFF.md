# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-14 — Owner-approved P07 scope documentation sync.

- **Production:** FFH-P06 Household Invitations, merged as `8d1a6aaa6e55f9f3369369ddfa1f3cdb3ad62f1c`
  from phase head `543e61fe43aba6157ada8a357df2a7866348f0d5` (PR #143). Ryan reports Production
  deployment Ready and smoke **12/12**. P06 **CLOSED**.
- **Active phase:** FFH-P07 — Goals and monthly check-in, **PLANNED / OWNER SCOPE APPROVED / HIGH risk**.
  Phase branch: `phase/ffh-p07-goals-and-check-ins`. Approved requirements are in `.ai/CURRENT_PHASE.md`
  and `.ai/DECISIONS.md`.
- **Includes:** separate goals tracker (name, target, saved-to-date, deadline, monthly required);
  manual monthly balances, yes/no plan-followed check-in and historical net-worth/cash-flow snapshots.
  Owner/member can edit; viewer read-only.
- **Defers:** Can We Afford It, irregular-cost set-asides, per-paycheck view and 30-day balance reminders.
- **Next for Claude Code Builder:** verify latest branch/head, read active project workflow and approved phase scope,
  propose any missing financial arithmetic/date/snapshot definitions for Owner approval, then implement schema +
  household RLS matrix and app UI in the normal phase workflow. Do not change Money Priority Engine policy.
- **Waiting on Ryan:** only **specific new financial-policy details if the Builder cannot ground them in existing
  canonical code**; P07 feature scope and role permissions are approved. Hosted database, Vercel and Production
  permissions are still separate approvals.
- **Backlog:** N01 raw onboarding error message, moderate npm advisories, and items in `.ai/DECISIONS.md`.
- **Repository bookkeeping:** `main`'s P06-era `.ai/CURRENT_PHASE.md` remains a historical/stale snapshot
  until an Owner-approved production release (merging docs to `main` would also deploy Production). The
  active P07 branch is the current phase source of truth. Do not merge directly to `main` for bookkeeping.
