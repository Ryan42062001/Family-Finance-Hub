# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-13

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | REMEDIATION | failed frozen target `0a8c2f2a...` | Dual audit FAIL; close A01–A05 while preserving independently closed M01 |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013 remediation + fresh dual re-audit closure |
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
- Workflow V3.1 remains canonical with `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md` binding for applicable money-routing work.
- FFH-013 frozen audit target was `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`.
- Technical & Mathematical Auditor verdict: FAIL — REMEDIATION REQUIRED. FFH-013-M01 remains independently CLOSED. Open HIGH findings: annual tied-spouse shared-cap/equal-fulfillment defect (A01), missing active-schedule reservation (A02), and post-YTD shared-materiality/group defect (A03).
- Financial Policy & Scenario Auditor verdict: FAIL — REMEDIATION REQUIRED. FFH-013-M01 remains independently CLOSED. Open findings: HIGH owner-only supported-excess fail-closed defect (A04) and MEDIUM conditional-maxima/shared-capacity explanation defect (A05).
- No auditor found an FFH-013 regression in accepted HSA, SIMPLE, Roth direct-eligibility, Traditional deductibility, or unrelated workplace-retirement behavior.
- Prior green Foundation CI does not clear A01–A05 because those scenarios were not exercised.
- FFH-013 is REMEDIATION. A fresh dual re-audit will be required after a Manager-accepted remediation integration checkpoint.
- FFH-017 remains QUEUED behind FFH-013 closure.
- FFH-020 remains separately BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Core Financial Engine Engineer — execute bounded FFH-013 audit remediation A01–A05 on `ffh/ffh-013-audit-remediation` in `WORK_MODE_PREFERRED`; preserve M01 exactly and return READY_FOR_MANAGER with full green CI.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after FFH-013 FAIL verdict; wait for a new frozen remediation target.
- Financial Policy & Scenario Auditor: IDLE after FFH-013 FAIL verdict; wait for a new frozen remediation target.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is the bounded FFH-013 audit remediation, followed by a fresh dual re-audit. FFH-017 cannot activate until FFH-013 closes. FFH-020 remains a separate blocked database-recovery track.