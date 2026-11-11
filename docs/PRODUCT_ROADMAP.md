# Family Finance Hub — Product Roadmap

## Completed product foundation

Phases 1–6 established the secure household foundation, financial profile, dashboard, planning tools, Money Priority
Engine and the Scenario Lab baseline.

## FFH-P01 — Release Blocker Integration & Production Readiness

State: FREEZE_READY. Risk: HIGH. Branch `phase/ffh-p01-release-readiness`, draft PR #81.

Prove auth and two-household isolation, finish the owner-preview punch list, keep docs current and prepare a rollback
plan. Current gate status: `docs/FFH-P01_RELEASE_READINESS.md`; open work: `.ai/CURRENT_PHASE.md`.

Production deployment, Private Beta and paid domain/configuration are separate Ryan decisions, not authorized by this
phase.

## Next

- Continue product features on separate branches under `docs/WORKFLOW.md` while FFH-P01 finishes.
- Before Private Beta: one comprehensive independent audit, then fix and re-check its findings. Also email
  deliverability (custom sending domain) and a safe test-account cleanup plan.
