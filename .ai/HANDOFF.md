# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-20 — FFH-P12 Per-Paycheck Financial Planning BUILDING (Ryan's activation 2026-11-20).

- **Now:** FFH-P12 on `phase/ffh-p12-per-paycheck-planning` (from Production `8842f60` + P11 close-out #202, carried
  forward, not merged alone). Spec: issue #203. Scope and status: `.ai/CURRENT_PHASE.md`. Not authorized: hosted SQL,
  Preview domain move, Vercel/secrets, real data, any merge into `main`, P13.

## FFH-P11 close-out (carried forward)

Updated: 2026-11-20 — FFH-P11 released and closed.

- **Production:** FFH-P11 Irregular Expense Set-Asides, merged as `8842f607432db2b07705e19c53542d0006b5df82` from
  candidate `d8bd83804c43c9099efb55ad53dd6aebc11283a9` (PR #194, Ryan's explicit authorization 2026-11-20). Production
  `/api/build-info` = `8842f60`; Production smoke **12/12**; signed-out `/bills`, `/plan`, `/what-if`, `/account` →
  Sign in; post-merge Production CI run 44652290057 success. P11 **CLOSED**. (P10's close-out, draft #193, shipped inside this release.)
- **P11 shipped:** on `/bills`, an optional per-bill tracker for scheduled quarterly/yearly expenses: the amount the
  household *reports* as set aside, still needed, surplus, exact-cent catch-up (rounded up, only when meaningful), honest
  due-now / cycle-confirmation states, explicit next-cycle confirmation with typed carryover, forecast notes. Advisory
  only (plan, snapshot, engine and exports never read it). Spec: issue #172. Code: `lib/bills/set-aside*.ts`,
  `lib/supabase/set-asides.ts`, `app/bills/SetAsides.tsx`, `app/bills/set-aside-actions.ts`.
- **Hosted Supabase:** 28 migrations (P11 added `20261119100000` and `20261120100000`, both applied by Ryan, 17/17 PASS
  each). No new environment variables.
- **Also fixed:** pre-existing P07 defect (invited member with a saved check-in could not delete their account).
- **Evidence:** audit receipt `docs/workflow/FFH-P11_AUDIT.md` (PASS with 3 MEDIUM at `694df32` → fixed → re-check PASS
  at `005f312`); QA and release evidence on PR #194; decisions in `.ai/DECISIONS.md`.
- **Backlog:** none open from P11. Carried: P10 LOW (canonical evaluators emit plan-impact risks when no post-purchase
  engine ran); P08 F04 LOW, N01; picomatch audit exception review by 2027-01-18.
- **Lessons learned (P11) — APPROVED by Ryan (2026-11-20), to implement in the next phase's normal development branch**
  (not a separate docs PR; only once that phase is authorized): the database-boundary contract for a new
  household-scoped table. Requirements are in `.ai/DECISIONS.md` ("Ryan approved the FFH-P11 lessons-learned
  improvement"). Keep the `docs/WORKFLOW.md` change to one short line.
- **Next phase:** not started; needs Ryan's separate approval. Start it in a fresh chat on the cloud environment
  **Family-Finance-Hub**; rules in `AGENTS.md`. The Preview domain still points at
  `phase/ffh-p11-irregular-expense-set-asides`; move it when the next phase branch starts.
- **Repository bookkeeping:** this close-out is carried forward to the next authorized release (draft PR into `main`,
  not merged alone, which would deploy Production).
