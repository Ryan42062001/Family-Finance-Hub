# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-13

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | AUDIT_READY | production `5e3f21ca...`; integration `e811ef1f...` | Manager accepted PR #23; A01–A05 + M02 remediated, M01 preserved; fresh dual re-audit required |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013 fresh dual re-audit closure |
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
- FFH-013's first frozen audit target `0a8c2f2aff85d5745c28e30ccfde23b89750fab7` failed both independent audits; FFH-013-M01 was independently confirmed CLOSED.
- Remediation PR #23 merged after Manager verification. A01–A05 were accepted, M01 remained exact, and Manager HIGH M02 was closed by bounded equal-compensation owner-local excess remediation.
- Exact M02 production/test candidate: `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`; Foundation CI run `34737929168`, job `103672520594` — SUCCESS through AI state, dependency audit, calculations, security, Type Check, lint, and build.
- Final worker/handoff head: `c298ac4bfe0d63f248c2a7ec993f0d8031c7377d`; Foundation CI run `34738110144`, job `103673023089` — SUCCESS through the same gates.
- PR #23 integration SHA: `e811ef1f1f786196d909391262b19d71fe0f9a71`. Compare from the fully-green final head to the integration SHA contains zero file changes.
- New frozen audit packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_e811ef1f.md` with packet ID `FFH-013-e811ef1f-2026-09-13`.
- FFH-013 is AUDIT_READY. Both fresh auditors must independently assess only the exact frozen target `e811ef1f1f786196d909391262b19d71fe0f9a71`, including A01–A05, protected M01, and Manager M02.
- FFH-017 remains QUEUED until Manager reconciles both fresh FFH-013 audit verdicts and closes FFH-013.
- FFH-020 remains separately BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-013 re-audit of exact target `e811ef1f1f786196d909391262b19d71fe0f9a71` using `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_e811ef1f.md`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-013 re-audit of the same exact target and packet.

## IDLE / BLOCKED
- Core Financial Engine Engineer: IDLE after Manager-accepted FFH-013 remediation integration; FFH-017 not yet activated.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is the fresh FFH-013 dual re-audit. If both audits clear the frozen target, Manager can close FFH-013 and activate FFH-017. FFH-020 remains a separate blocked database-recovery track.