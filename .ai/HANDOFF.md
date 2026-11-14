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
- **Design:** `docs/FFH-P07_DESIGN.md`, **approved by Ryan as recommended** (2026-11-14); C6 then confirmed with
  its original wording (not available only with no active income AND no expenses).
- **Built (branch `claude/ffh-p07-ownership-handoff-6ky7io`, draft PR #151):** migration
  `20261114100000_ffh_p07_goals_and_check_ins.sql` (3 tables, snapshot trigger, 2 invoker RPCs), RLS matrix
  1208 assertions (+3 families, +43 P07 probes), `lib/calculations/goal-tracker.ts` (engine-parity tested),
  `lib/calculations/check-in-snapshot.ts`, `/goals`, `/goals/check-in`, `/goals/check-in/[id]`, QA rows Q27–Q31,
  `/goals` added to the e2e isolation pages. CI green at `9571ac7` (run 43559892101: `fast` pass, `rls-matrix`
  1208/1208, parity MATCH with the new fingerprint in `scripts/rls-local/parity.expected.txt`).
- **Hosted migration APPLIED (Ryan, 2026-11-14):** `20261114100000` applied, CRLF fixed, hosted parity **9/9**
  (migrations 20). Procedure and result: `docs/workflow/FFH-P07_HOSTED_MIGRATION.md`. Preview domain pointed at the
  P07 phase branch by Ryan.
- **Preview QA PASS (ChatGPT Work mode, 2026-11-14):** Q1–Q8, Q23–Q25, Q27–Q31 all PASS, no `qa-finding` issues, at
  Preview commit `b361463`. Accepted for the head `6370380`: the only user-visible change after `b361463` is the
  "Not available" wording on a check-in (shown only with no income and no expenses, not TestA's case); the C6 rule
  itself is covered by 9 RLS matrix probes, and `e2e-isolation` passed at `6370380` (run 43564007082).
- **Next:** independent different-model HIGH-risk review at the frozen phase head (draft phase PR into `main`, not
  to be merged without Ryan's release authorization).
- **Waiting on Ryan:** run the independent review (prompt and SHA in the Builder's message); later, the separate
  Production release decision for the phase PR into `main`.
- **Backlog:** N01 raw onboarding error message, moderate npm advisories, and items in `.ai/DECISIONS.md`.
- **Repository bookkeeping:** `main`'s P06-era `.ai/CURRENT_PHASE.md` remains a historical/stale snapshot
  until an Owner-approved production release (merging docs to `main` would also deploy Production). The
  active P07 branch is the current phase source of truth. Do not merge directly to `main` for bookkeeping.
