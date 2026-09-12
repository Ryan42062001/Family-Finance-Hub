# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | Manager accepted; owned calculations/security gates PASS; inherited typecheck debt remains `CI-001` |
| FFH-012 | Core / recovery | REMEDIATION | frozen audited target `ffde8440...` | Fresh Policy PASS WITH NON-BLOCKING FINDINGS; fresh Technical FAIL on new HIGH Finding D; FFH-028 active |
| FFH-013 | Core Engine | QUEUED | Not established | Wait for FFH-012 closure/reassessment |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not established | FFH-011 acceptance satisfied; wait for Core slot / FFH-012 disposition as Manager routes |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for Phase-5 blockers |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-output observability after current correctness recovery wave |
| FFH-019 | Manager | CLOSED | `11c75714...` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | Stage A pre-write checkpoint | Secure Supabase CLI/auth/protected-backup environment required; no history or DDL write occurred |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e53...` | Legal-marriage authority remains sufficient; no new authority gap |
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | Historical B/C correction accepted; superseded by later FFH-025/028 audit wave |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Supabase recovery plan accepted; FFH-020 blocked only by execution capability |
| FFH-025 | Work Helper | ACCEPTED | production `f537b7b...`; integration `ffde8440...` | Fresh dual audit closes A/B/C; new technical Finding D routed separately |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance; establish stable URL and add GitHub About link |
| FFH-027 | Manager | CLOSED | PR #16; integration `789ae68d...` | Workflow V3.1 canonical; state validator/CI debt/audit packet/task schema adopted |
| FFH-028 | Work Helper | ACTIVE | Not yet established | Remediate HIGH HSA candidate-pair cardinality bypass, then Manager acceptance + fresh FFH-012 dual re-audit |

## Current verified state
- Workflow V3.1 is canonical. `npm run ai:validate-state` checks canonical task states/task-index consistency and CI tracks inherited failures through `.ai/manager/KNOWN_CI_DEBT.md`.
- FFH-011 is Manager-ACCEPTED. PR #13 merged at `19bc304008959a3df46ff77256afb94f13712782`.
- FFH-025 is Manager-ACCEPTED. PR #15 merged at `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`; its integration CI passes install, production dependency audit, calculations, and security before inherited `CI-001` Type Check debt.
- The fresh Financial Policy & Scenario re-audit of frozen target `ffde8440...` returned `PASS WITH NON-BLOCKING FINDINGS`. Findings A/B/C are CLOSED. Report commit: `9fe947601140b683922ffb13e091fbf49006853f`; handoff commit lineage: `5d941d2c8f90984b749a98af9aedbe1e4bf90ba1`.
- The fresh Technical & Mathematical re-audit of the same target returned `FAIL — REMEDIATION REQUIRED`. Findings A/B/C are CLOSED, but new Finding D is HIGH/BLOCKING: three or more active nondependent `self`/`spouse_partner` candidates can erase pair identity and allow a valid pair/year authority row to be ignored, exposing independent family limits. Audit artifact commit: `68bc0a793a5c6f479b8bd6baef973526f5f55643`.
- Manager independently verified Finding D against the frozen evaluator and persistence contract: candidate pairing requires exactly two candidates, while `household_people` permits multiple active `self`/`spouse_partner` rows with no maximum-two cardinality constraint. The overstatement path is therefore reachable.
- FFH-012 is back in `REMEDIATION`. FFH-028 is ACTIVE and owns only the bounded candidate-pair cardinality safety remediation.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Work Helper / Super Troubleshooter — execute FFH-028 from `.ai/tasks/FFH-028.md`. Use a Work credit for this one.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after fresh FAIL verdict; re-activate only after Manager accepts/integrates FFH-028 and freezes a new target.
- Financial Policy & Scenario Auditor: IDLE after fresh PASS WITH NON-BLOCKING FINDINGS; must independently re-audit the changed target after FFH-028.
- Implementation Engineer / App-Data: IDLE for FFH-011; accepted. FFH-020 remains separately BLOCKED.
- Financial Policy Analyst: IDLE; FFH-022 authority remains sufficient.
- R&D: IDLE.
- Core Engineering: IDLE unless Manager explicitly reassigns implementation ownership.
- FFH-020 execution: BLOCKED on secure CLI/auth/backup capability.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

Phase 5 / PR #5 remains NOT MERGE READY until FFH-028 is accepted/integrated and FFH-012 clears another fresh dual independent audit.