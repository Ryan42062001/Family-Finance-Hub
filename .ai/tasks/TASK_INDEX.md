# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-15

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | CLOSED | production `8d9cbc62...`; final frozen target `4b7ed998...` | Final Technical PASS + Policy PASS; zero findings; R01/R02/R03/T1/A01-A05/M01/M02 and reconciliation gate clear |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted historically; Workflow V3.1 is current |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | AUDIT_READY | production `1393ea92...`; integration/frozen target `9d3a880e...` | PR #26 accepted/merged; Technical + Policy auditors ACTIVE on exact frozen target |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-output observability after current correctness wave |
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
- Workflow V3.1 and `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md` remain canonical.
- FFH-013 remains CLOSED on final frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5` after clean dual PASS.
- FFH-017 is **AUDIT_READY** after Manager acceptance and PR #26 integration.
- FFH-017 production checkpoint: `1393ea928eb5756f16a6af063a68360892200bd6`.
- FFH-017 validated pre-handoff head `545d3b12710086b0fefb44be9b7823309f30da0e` passed Foundation CI run `34999388253`, job `104483637634`.
- FFH-017 handoff commit `c7882907854579488eb82f4d9f18799b51522550` passed Foundation CI run `35000961119`, job `104488944773`.
- Accepted final PR head: `0e7c139b374716ad0e701d0f3c8ae05f9fac1692`.
- Integration/frozen target: `9d3a880e02365b4445b8070344c72c928ca34511`.
- Manager verified accepted PR head -> integration has zero changed files.
- Frozen packet: `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_9d3a880e.md`.
- Repository-scoped self-hosted Windows runner `FFH-Windows-Runner` keeps hosted Actions spend at `$0`; no Windows PowerShell execution-policy weakening was used.
- Core Financial Engine Engineer and Work Helper are IDLE pending audit results.
- Technical & Mathematical Auditor: ACTIVE on exact FFH-017 frozen target `9d3a880e...`.
- Financial Policy & Scenario Auditor: ACTIVE independently on the same exact frozen target.
- FFH-020 remains separately BLOCKED before any live database write.
- FFH-016 remains blocked behind FFH-020.
- FFH-018 and FFH-026 remain QUEUED.
- Phase 5 / PR #5 remains NOT MERGE READY until FFH-017 audit closure and remaining Phase 5 gates are satisfied.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-017 audit of exact frozen target `9d3a880e02365b4445b8070344c72c928ca34511`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-017 policy/scenario audit of the same exact frozen target.

## IDLE / BLOCKED
- Core Financial Engine Engineer: IDLE pending audit results.
- Work Helper / Super Troubleshooter: IDLE pending audit results.
- Financial Policy Analyst roles: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Current near-term gate is dual independent FFH-017 audit reconciliation. FFH-017 remains open until both audit lanes clear or Manager routes bounded remediation.
