# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | READY_FOR_MANAGER | candidate `c32942f1...`; PR #13 merged into milestone lineage | Manager acceptance/reconciliation pending; owned security gate PASS; inherited typecheck debt tracked separately |
| FFH-012 | Core / recovery | REMEDIATION | audited integration `1487b192...` | Dual re-audit FAIL; Finding A OPEN, B/C CLOSED; wait for Manager acceptance of FFH-025 before re-audit |
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
| FFH-025 | Work Helper | READY_FOR_MANAGER | production `f537b7b...`; integrated through milestone `ffde8440...` | Manager acceptance verification, then frozen dual FFH-012 re-audit |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance; establish stable URL and add GitHub About link |
| FFH-027 | Manager | ACTIVE | control-plane only | Implement/validate Workflow V3.1 determinism upgrade; no financial behavior change |

## Current verified state
- Milestone `phase-5-money-priority-engine` is at `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`, the FFH-025 integration merge.
- Both post-FFH-023 auditors returned `FAIL — REMEDIATION REQUIRED` on `1487b192491a704ca3500b42d22a50289ee1551b` for the same HIGH compound authority/eligibility/coverage materiality defect.
- Prior Finding B odd-cent conservation is CLOSED by both auditors.
- Prior Finding C Build/account reconciliation is CLOSED by both auditors.
- Prior Finding A remains OPEN pending Manager acceptance of the integrated FFH-025 remediation and a fresh dual independent audit.
- FFH-022 supplies sufficient authority; no new Policy or R&D decision is currently needed for FFH-025.
- FFH-011 task evidence is `READY_FOR_MANAGER`; PR #13 is already merged into the milestone lineage. Manager acceptance remains distinct from merge state.
- FFH-025 is normalized to canonical `READY_FOR_MANAGER`; PR #15 is already merged into milestone `ffde8440...`. Manager acceptance remains distinct from merge state.
- Foundation CI run `34669630244`, job `103488407900`, on the FFH-025 integration passes install, production dependency audit, calculations, and security, then fails at Type check. The inherited test TypeScript failure family is tracked as `CI-001` in `.ai/manager/KNOWN_CI_DEBT.md`.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.
- FFH-027 is a control-plane-only workflow upgrade and does not change FFH-012 acceptance or activate later phases.

## ACTIVATE NOW
- Manager / Architect — FFH-027 control-plane upgrade and subsequent FFH-011/FFH-025 acceptance verification.

## IDLE / BLOCKED
- Work Helper: IDLE; FFH-025 worker work is complete and awaiting Manager disposition.
- Implementation Engineer: IDLE; FFH-011 worker work is complete and awaiting Manager disposition.
- Auditor/QA: IDLE until Manager accepts the FFH-025 integrated target, then launch two fresh independent FFH-012 audits from one frozen packet.
- Financial Policy: IDLE; current HSA authority is sufficient.
- R&D: IDLE.
- FFH-020 execution: BLOCKED on secure CLI/auth/backup capability.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.
- Core Engineering: IDLE pending FFH-012 disposition.

Phase 5 / PR #5 remains NOT MERGE READY.
