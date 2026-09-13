# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-13

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | REMEDIATION | candidate `7b28d7c8...`; PR #21 open | Fix blocking FFH-013-M01 recurring equal-fulfillment cent reconciliation, then return READY_FOR_MANAGER |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for accepted/audited FFH-013 shared-compensation baseline and Manager activation |
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
| FFH-030 | Manager | CLOSED | control-plane workflow hardening | Reconciliation gate + direct Phase-5 PR CI trigger adopted |

## Current verified state
- Workflow V3.1 remains canonical and now includes the Financial Engine Reconciliation Gate in `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`.
- FFH-030 is CLOSED. Manager/Core/Technical Audit role guidance and future task/audit templates now require exact aggregate-to-destination reconciliation for applicable money-routing changes; Foundation CI now targets pull requests to both `main` and `phase-5-money-priority-engine` and supports manual dispatch.
- FFH-012 remains CLOSED and Findings A/B/C/D remain closed.
- FFH-029 remains ACCEPTED; CI-001 is CLOSED and no inherited CI debt is currently registered.
- FFH-015 is CLOSED. Both fresh independent auditors inspected frozen target `01d9c22522d331ca560895e1ad59e6fab9827e8b` and independently closed regulatory Finding R1.
- FFH-013 candidate PR #21 establishes the intended shared MFJ IRA legal-capacity structure and passed Foundation CI run `34731613908`, job `103655304259`, but Manager review found blocking FFH-013-M01: Build's equal-fulfillment spouse-IRA recurring routing can disagree by one cent with the authorized Build retirement request because the planning-capacity prepass and actual tied routing use different rounding paths.
- The concrete FFH-013-M01 boundary is a `$10,000.01` shared pool with `$7,500` conditional owner room each: planning prepass yields `$833.33/month`, while the actual equal split can produce two `$416.67/month` account routes totaling `$833.34/month`. Annual legal capacity remains bounded, but monthly Build/account reconciliation is not exact.
- FFH-013 is therefore REMEDIATION, not accepted or merged. PR #21 stays open on `ffh/ffh-013-spousal-ira-ledger` for the bounded fix and direct Build-level regression.
- FFH-017 remains QUEUED behind FFH-013.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Core Financial Engine Engineer — continue FFH-013 remediation on PR #21; reproduce and close FFH-013-M01 without weakening annual legal-capacity or routing invariants. The new Financial Engine Reconciliation Gate is binding on Manager review of the remediation.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE pending a Manager-accepted FFH-013 integration checkpoint.
- Financial Policy & Scenario Auditor: IDLE pending a Manager-accepted FFH-013 integration checkpoint.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Core Engineering: FFH-013 REMEDIATION; FFH-017 remains QUEUED.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is closing FFH-013-M01, then Manager acceptance/integration and likely fresh high-impact audit of FFH-013 before FFH-017 activation. FFH-020 remains a separate blocked database-recovery track.
