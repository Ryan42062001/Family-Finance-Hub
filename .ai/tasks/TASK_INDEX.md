# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | Manager accepted; owned calculations/security gates PASS; inherited typecheck debt remains `CI-001` |
| FFH-012 | Core / recovery | AUDIT_READY | frozen audit target `ffde8440...` | Activate fresh Technical + Policy auditors against one frozen packet; A must be rechecked, B/C preserved |
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
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | B/C and structural authority remediation independently verified; FFH-025 now addresses prior remaining A defect |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Supabase recovery plan accepted; FFH-020 blocked only by execution capability |
| FFH-025 | Work Helper | ACCEPTED | production `f537b7b...`; integration `ffde8440...` | Manager accepted; parent FFH-012 frozen dual re-audit now required |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance; establish stable URL and add GitHub About link |
| FFH-027 | Manager | CLOSED | PR #16; integration `789ae68d...` | Workflow V3.1 canonical; state validator/CI debt/audit packet/task schema adopted |

## Current verified state
- Workflow V3.1 is canonical. Future activation/bootstrap prompts should read `.ai/shared/WORKFLOW_V3_1.md` in addition to Workflow V3 and V2.
- `npm run ai:validate-state` checks canonical task states, task/index consistency, and stronger `FFH_TASK_V1` gates. CI invokes the validator before application validation.
- Known inherited CI failures use `.ai/manager/KNOWN_CI_DEBT.md`; current TypeScript debt is `CI-001` rather than being reassigned to whichever task is newest.
- FFH-011 is Manager-ACCEPTED. PR #13 merged at `19bc304008959a3df46ff77256afb94f13712782`. Its exact candidate `c32942f1ee1dd700b2c8d23d2f6b641f37962fc8` passes calculations and the complete SIMPLE/security gate in Foundation CI run `34628911063`, job `103360669269`; the later typecheck failure is inherited `CI-001`.
- FFH-025 is Manager-ACCEPTED. PR #15 merged at `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`. Exact integration CI run `34669630244`, job `103488407900`, passes install, production dependency audit, calculations, and security; the later typecheck failure is inherited `CI-001`.
- FFH-025 Manager verification found the correction bounded to compound unknown-authority materiality, with no legal-marriage inference from relationship label, filing status, allocation rows, input order, or prior-year state. Fully known all-self-only and known-ineligible locality remains actionable; Findings B/C remain preserved.
- FFH-012 is `AUDIT_READY` against frozen financial-behavior target `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`. The canonical packet is `.ai/audit/FFH-012_FROZEN_AUDIT_PACKET.md`.
- Later milestone commits after `ffde8440...` are Manager workflow/task/audit documentation and do not replace the frozen FFH-012 financial-behavior audit target.
- Prior Finding A was OPEN/HIGH at historical target `1487b192...`; both fresh auditors must independently determine whether it is now closed. Prior Findings B and C were CLOSED and must be regression-checked.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-012 re-audit at frozen target `ffde8440...`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-012 re-audit at the same frozen target `ffde8440...`.

## IDLE / BLOCKED
- Work Helper: IDLE; FFH-025 accepted.
- Implementation Engineer / App-Data: IDLE for FFH-011; accepted. FFH-020 remains separately BLOCKED.
- Financial Policy: IDLE; current HSA authority is sufficient.
- R&D: IDLE.
- Core Engineering: IDLE unless an audit returns a blocking implementation finding.
- FFH-020 execution: BLOCKED on secure CLI/auth/backup capability.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

Phase 5 / PR #5 remains NOT MERGE READY until FFH-012 completes the required dual independent re-audit and remaining milestone gates are satisfied.