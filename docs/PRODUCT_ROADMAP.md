# Family Finance Hub — Product Roadmap

## Completed product foundation

Phases 1–6 established secure household foundation, profile, dashboard, planning tools, Money Priority Engine, and Scenario Lab product baseline. Historical task/PR acceptance does not automatically integrate unresolved branch work.

## Governance transition

Speed Workflow V2.1 replaces the active Workflow V3/V3.1 control plane. Historical records are archived under `.history/workflow-v3-1/` as evidence only.

## FFH-P01 — Release Blocker Integration & Production Readiness

State: PLANNED. Risk: HIGH. This is one coherent future phase translating unresolved FFH-026, FFH-051, and FFH-052 intent. It is not activated or implemented by this migration.

- Independently reconcile exact accepted source-level remediation before integrating any historical branch commits; do not infer acceptance from PR closure, comments, or old CI.
- Reverify email confirmation, auth redirects, cookies, sessions, and origin behavior as security-sensitive. Production host/origin trust is a release gate.
- Prove deployed two-household RLS negative isolation and that Scenario Lab makes no unauthorized persistence or profile mutation.
- Keep private source/oracle/custody material private; unresolved FFH-026 fixture, oracle, and dependency-host gates remain unresolved until independently proved.
- Do not use live production financial/account data in shared evidence. Maintain rollback evidence before production acceptance.
- Phase activation or merge does not authorize production deployment or Private Beta. Paid custom domain/configuration requires separate Ryan authorization.

## Downstream

Private Beta follows separately authorized production readiness and is not authorized. Historical FFH-038/047-style nonblocking cleanup may be reconsidered as future backlog, without reviving old task lanes.
