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
| FFH-027 | Manager | CLOSED | PR #16; integration `789ae68d...` | Workflow V3.1 canonical; state validator/CI debt/audit packet/task schema adopted |

## Current verified state
- FFH-027 PR #16 merged into `phase-5-money-priority-engine` at `789ae68d2b2e84f4d687aba9db36bcbf512e6fd3`; follow-up Manager documentation commits mark Workflow V3.1 canonical and close the task.
- Workflow V3.1 is canonical. Future activation/bootstrap prompts should read `.ai/shared/WORKFLOW_V3_1.md` in addition to Workflow V3 and V2.
- `npm run ai:validate-state` now checks canonical task states, task/index consistency, and stronger `FFH_TASK_V1` gates. CI invokes the validator before application validation.
- Known inherited CI failures now use `.ai/manager/KNOWN_CI_DEBT.md`; current TypeScript debt is `CI-001` rather than being reassigned to whichever task is newest.
- High-impact independent audits now use the frozen packet contract in `.ai/audit/AUDIT_PACKET_TEMPLATE.md`.
- Both post-FFH-023 auditors returned `FAIL — REMEDIATION REQUIRED` on `1487b192491a704ca3500b42d22a50289ee1551b` for the same HIGH compound authority/eligibility/coverage materiality defect.
- Prior Finding B odd-cent conservation is CLOSED by both auditors.
- Prior Finding C Build/account reconciliation is CLOSED by both auditors.
- Prior Finding A remains OPEN pending Manager acceptance of the integrated FFH-025 remediation and a fresh dual independent audit.
- FFH-011 task evidence is `READY_FOR_MANAGER`; PR #13 is already merged into the milestone lineage. Manager acceptance remains distinct from merge state.
- FFH-025 is normalized to canonical `READY_FOR_MANAGER`; PR #15 is already merged into the milestone lineage. Manager acceptance remains distinct from merge state.
- Foundation CI run `34669630244`, job `103488407900`, on the FFH-025 integration passes install, production dependency audit, calculations, and security, then fails at Type check; the inherited failure family is tracked as `CI-001`.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Manager / Architect — verify/accept FFH-011 and FFH-025 from actual integrated evidence. If FFH-025 passes the Manager gate, instantiate one frozen FFH-012 audit packet and activate two fresh independent Auditor/QA chats against the same exact target.

## IDLE / BLOCKED
- Work Helper: IDLE; FFH-025 worker work is complete and awaiting Manager disposition.
- Implementation Engineer: IDLE; FFH-011 worker work is complete and awaiting Manager disposition.
- Auditor/QA: IDLE until Manager accepts the FFH-025 integrated target.
- Financial Policy: IDLE; current HSA authority is sufficient.
- R&D: IDLE.
- FFH-020 execution: BLOCKED on secure CLI/auth/backup capability.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.
- Core Engineering: IDLE pending FFH-012 disposition.

Phase 5 / PR #5 remains NOT MERGE READY.
