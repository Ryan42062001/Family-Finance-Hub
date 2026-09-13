# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | Manager accepted; SIMPLE persisted-field contract consumed by FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | QUEUED | Not established | FFH-012 dependency satisfied; wait for FFH-015 dual audit closure |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | AUDIT_READY | production `378f1872...`; integration `01d9c225...` | PR #19 merged/Manager accepted; frozen fresh dual audit required |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-015 audit closure then FFH-013 retirement-capacity baseline |
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
- FFH-012 is CLOSED and Findings A/B/C/D remain closed.
- FFH-029 is ACCEPTED; CI-001 is CLOSED and no inherited CI debt is currently registered.
- FFH-015 implementation is Manager ACCEPTED and integrated at `01d9c22522d331ca560895e1ad59e6fab9827e8b` after exact candidate Foundation CI run `34729503423`, job `103649562344`, passed AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.
- FFH-015 now sits at `AUDIT_READY` because it changes production statutory retirement-capacity behavior. Frozen packet: `.ai/audit/FFH-015_FROZEN_AUDIT_PACKET_01d9c225.md`.
- FFH-013 remains QUEUED until both fresh FFH-015 auditors clear the exact frozen integration target.
- FFH-017 remains QUEUED behind FFH-015 and FFH-013.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-015 audit of exact target `01d9c22522d331ca560895e1ad59e6fab9827e8b` using `.ai/audit/FFH-015_FROZEN_AUDIT_PACKET_01d9c225.md`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-015 audit of the same exact target and packet.

## IDLE / BLOCKED
- Core Financial Engine Engineer: IDLE after FFH-015 Manager integration; FFH-013 is not yet activated.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is the FFH-015 fresh dual audit, then Manager may activate FFH-013.