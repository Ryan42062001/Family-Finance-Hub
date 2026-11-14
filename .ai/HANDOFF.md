# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-14 — Owner FFH-P07 scope decision recorded by ChatGPT Manager (documentation only).

- **Production:** FFH-P06 household invitations CLOSED; PR #143 merged to `main` as
  `8d1a6aaa6e55f9f3369369ddfa1f3cdb3ad62f1c` after Ryan's explicit authorization.
  Production Ready and smoke 12/12 were **reported by Ryan**, not independently run here.
- **Active phase:** FFH-P07 — Goals and monthly check-in, HIGH risk. Branch
  `phase/ffh-p07-goals-and-check-ins`. State: PLANNED / OWNER SCOPE APPROVED,
  implementation NOT STARTED.
- **Owner-approved product scope:** standalone goals tracker (name, target, saved,
  target date, informational monthly requirement; **no change to Money Priority Engine**);
  monthly check-in (manual balances, plan-followed yes/no, historical net worth/cash flow);
  owner/member edits, viewer read-only, household-isolated RLS. Defer large-purchase check,
  irregular-cost set-asides, paycheck view and 30-day reminders.
- **Next Builder action:** Claude Code reads `.ai/CURRENT_PHASE.md` and `.ai/DECISIONS.md`,
  verifies current SHA/open PRs, proposes exact goal month-count/rounding conventions and
  check-in snapshot definitions, then plans migration/RLS probes and UI work. Use one
  Builder per branch and normal scoped PRs; no hosted changes without explicit Ryan approval.
- **Waiting on Ryan:** no further broad P07 scope decision. Only narrow calculation/snapshot
  definition choices if the Builder's design exposes unresolved financial semantics.
- **Production gate:** P07 merge to `main` requires separate explicit exact-SHA
  release authorization. No deployment approval given by this documentation update.
- **Backlog:** FFH-P06 N01 raw onboarding error text; moderate dependency advisories;
  remaining items retained in `.ai/DECISIONS.md`.
