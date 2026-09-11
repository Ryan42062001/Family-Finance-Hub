# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-11

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | REMEDIATION | candidate `c32942f1...` on PR #13 | Owned security gate PASS; worker task/handoff completion still required; inherited typecheck errors remain separately attributable |
| FFH-012 | Core / recovery | REMEDIATION | audited integration `1487b192...` | Dual re-audit FAIL; Finding A OPEN, B/C CLOSED; FFH-025 active |
| FFH-013 | Core Engine | QUEUED | Not established | Wait for FFH-012 closure/reassessment |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not established | Wait for FFH-011 validation stability and Core slot |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for Phase-5 blockers |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-output observability after current correctness recovery wave |
| FFH-019 | Manager | CLOSED | `11c75714...` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | Stage A pre-write checkpoint | Secure Supabase CLI/auth/protected-backup environment required; no history or DDL write occurred |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e53...` | Legal-marriage authority remains sufficient for FFH-025; no new authority gap |
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | B/C and structural authority remediation independently verified; bounded FFH-025 edge remains in parent FFH-012 |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Supabase recovery plan accepted; FFH-020 blocked only by execution capability |
| FFH-025 | Work Helper | ACTIVE | Not established | Narrow compound unknown-authority materiality remediation; then dual re-audit |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance; establish stable URL and add GitHub About link |

## Current verified state
- Both post-FFH-023 auditors returned `FAIL — REMEDIATION REQUIRED` on `1487b192491a704ca3500b42d22a50289ee1551b` for the same HIGH compound authority/eligibility/coverage materiality defect.
- Prior Finding B odd-cent conservation is CLOSED by both auditors.
- Prior Finding C Build/account reconciliation is CLOSED by both auditors.
- Prior Finding A remains OPEN only because unresolved counterparty HSA facts can make unknown spouse authority material even when the current owner is known self-only.
- FFH-022 supplies sufficient authority; no new Policy or R&D decision is needed for FFH-025.
- Technical re-audit evidence is integrated through PR #14; policy re-audit evidence is already on the milestone.
- FFH-011 PR #13 is retargeted to the milestone. Its exact branch CI reaches and PASSES the SIMPLE security gate, then fails on five pre-existing test TypeScript errors. Its worker-owned task/handoff packet is not yet complete, so Manager has not accepted/merged it.
- FFH-020 remains BLOCKED before any live write.
- FFH-018 remains queued; permanent CI detailed test-output artifacts are not yet implemented.
- Human-facing roadmap now marks Phase 4 complete, Phase 5 active, and adds Phase 7 Deployment & Release Readiness before Phase 8 Private Beta.
- FFH-026 is the queued canonical owner for that future production deployment, stable URL, release validation, and GitHub About/README link update.

## ACTIVATE NOW
- Work Helper / Super Troubleshooter — FFH-025.
- Implementation Engineer / App-Data — finish FFH-011 evidence/handoff on existing branch/PR; no new code expected unless new evidence changes the diagnosis.

## IDLE / BLOCKED
- Auditor/QA: IDLE until FFH-025 is integrated, then both independent re-audits run again.
- Financial Policy: IDLE; authority is sufficient.
- R&D: IDLE.
- FFH-020 execution: BLOCKED on secure CLI/auth/backup capability.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.
- Core Engineering: IDLE pending FFH-012 disposition.
- Manager: event-driven after routing.

Phase 5 / PR #5 remains NOT MERGE READY.