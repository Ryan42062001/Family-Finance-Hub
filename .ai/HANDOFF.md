# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-14 — Claude Code took P07 ownership at phase head `b3c0dc3`; design proposed.

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
- **Design:** `docs/FFH-P07_DESIGN.md`, **approved by Ryan as recommended** (2026-11-14). Builder clarification for
  Ryan to confirm: C6 "not available" uses the dashboard's exact rule (needs active income AND at least one expense).
- **Built (branch `claude/ffh-p07-ownership-handoff-6ky7io`, draft PR #151):** migration
  `20261114100000_ffh_p07_goals_and_check_ins.sql` (3 tables, snapshot trigger, 2 invoker RPCs), RLS matrix
  1208 assertions (+3 families, +43 P07 probes), `lib/calculations/goal-tracker.ts` (engine-parity tested),
  `lib/calculations/check-in-snapshot.ts`, `/goals`, `/goals/check-in`, `/goals/check-in/[id]`, QA rows Q27–Q31,
  `/goals` added to the e2e isolation pages. CI green at `9571ac7` (run 43559892101: `fast` pass, `rls-matrix`
  1208/1208, parity MATCH with the new fingerprint in `scripts/rls-local/parity.expected.txt`).
- **Hosted migration APPLIED (Ryan, 2026-11-14):** `20261114100000` applied, CRLF fixed, hosted parity **9/9**
  (migrations 20). Procedure and result: `docs/workflow/FFH-P07_HOSTED_MIGRATION.md`. Preview domain pointed at the
  P07 phase branch by Ryan.
- **Next:** `e2e-isolation` re-run on the phase head; Work mode QA Q27–Q31 + regressions; then the independent
  different-model HIGH-risk review at the frozen head. Open Owner question: C6 availability rule (dashboard rule built).
- **CI at `b3c0dc3` (run 43557846653):** `fast` and `rls-matrix` passed; `e2e-isolation` BLOCKED (exit 3): the fixed
  Preview domain does not serve the P07 branch. Ryan: point the Preview domain at `phase/ffh-p07-goals-and-check-ins`
  and redeploy, then re-run the job.
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
