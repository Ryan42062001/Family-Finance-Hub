# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | ACTIVE | approved post-audit base `b5111010...` | Implement spousal-IRA shared MFJ compensation ledger; return READY_FOR_MANAGER with full green CI |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013 shared-compensation baseline and Manager activation |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-output observability after current correctness recovery wave |
| FFH-019 | Manager | CLOSED | `11c75714...` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | Stage A pre-write checkpoint | Secure Supabase CLI/auth/protected-backup environment required; no history or DDL write occurred |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e53...` | Legal-marriage authority remains sufficient; no new authority gap |
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | Historical remediation accepted; superseded by later FFH-025/028 closure wave |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Supabase recovery plan accepted; FFH-020 blocked only by execution capability |
| FFH-025 | Work Helper | ACCEPTED | production `f537b7b...`; integration `ffde8440...` | Final FFH-012 audit confirms Finding A remains closed |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance |
| FFH-027 | Manager | CLOSED | PR #16; integration `789ae68d...` | Workflow V3.1 canonical |
| FFH-028 | Work Helper | ACCEPTED | production `f266c112...`; integration `51c3cd59...` | Final FFH-012 dual audit closes candidate-cardinality Finding D |
| FFH-029 | Work Helper | ACCEPTED | implementation `5b06448a...`; integration `61ad63ea...` | PR #18 merged; CI-001 CLOSED; full pipeline green |

## Current verified state
- Workflow V3.1 remains canonical.
- FFH-012 remains CLOSED and Findings A/B/C/D remain closed.
- FFH-029 remains ACCEPTED; CI-001 is CLOSED and no inherited CI debt is currently registered.
- FFH-015 is CLOSED. Both fresh independent auditors inspected frozen target `01d9c22522d331ca560895e1ad59e6fab9827e8b` and independently closed regulatory Finding R1.
- Financial Policy & Scenario Auditor verdict: PASS, no FFH-015 findings. Report commit `1f81119144644a512360ce507b496c34ab8edba4`; handoff commit `c1d76827ba6d6a22b2b20396f85d0b674b565311`.
- Technical & Mathematical Auditor verdict: PASS WITH NON-BLOCKING FINDINGS. No open CRITICAL/HIGH/MEDIUM finding; retained LOW T1 recommends direct one-cent-boundary and reordered-SIMPLE-account hardening. Technical handoff commit `1f70ccb270a284ffccd7bd51e81c86c2de921664`; evidence integrated via PR #20 at `b5111010ebc1f104709a4b27f8c79daef555f435`.
- Exact FFH-015 frozen-integration Foundation CI run `34729794786`, job `103650352136`, is fully green through AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.
- FFH-013 is now ACTIVE as the only Core implementation task, using the post-FFH-015-audit base `b5111010ebc1f104709a4b27f8c79daef555f435`. Execution mode is WORK_MODE_PREFERRED because the shared-compensation ledger is a multi-file legal-capacity implementation with repeated adversarial validation.
- FFH-017 remains QUEUED behind FFH-013.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Core Financial Engine Engineer — execute FFH-013 from `.ai/tasks/FFH-013.md` in `WORK_MODE_PREFERRED` from approved post-audit production base `b5111010ebc1f104709a4b27f8c79daef555f435`.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after passing FFH-015 frozen audit.
- Financial Policy & Scenario Auditor: IDLE after passing FFH-015 frozen audit.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Core Engineering: only FFH-013 ACTIVE; FFH-017 remains QUEUED.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. The current near-term gate is FFH-013, followed by FFH-017; FFH-020 remains separately blocked on secure Supabase execution capability.