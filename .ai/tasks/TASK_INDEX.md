# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-13

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | REMEDIATION | PR #23 candidate `0dd0a789...`; prior failed integration `0a8c2f2a...` | A01–A05 preliminarily clear; close Manager HIGH M02 equal-comp owner-local excess edge, then re-review and fresh dual audit |
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
- FFH-013's first frozen audit target `0a8c2f2aff85d5745c28e30ccfde23b89750fab7` failed both independent audits. FFH-013-M01 was independently confirmed CLOSED.
- PR #23 on `ffh/ffh-013-audit-remediation` remediates A01–A05. Production candidate `0dd0a7891afa3e6e5f3f7da29497d8afb527938c` passed Foundation CI run `34736781542`, job `103669508891`; final documentation head `0fdb57bebb7f77dd6eaaabd0fb9375432a58355c` passed run `34736949928`, job `103669961880`.
- Manager review preliminarily verified A01 annual shared-cap equal fulfillment, A02 scheduled planning reservations, A03 unequal-compensation post-YTD materiality, A04 unequal-compensation shared-group excess fail-closed behavior, A05 conditional/shared explanation, and protected M01.
- Manager found one new HIGH blocking boundary, FFH-013-M02: PR #23 incorrectly creates a zero shared MFJ group when equal-compensation spouses have an owner-only excess. Accepted FFH-009 says equal compensation has no spousal enhancement/shared group; the unaffected spouse retains independent room.
- M02 reproduction: compensation `$10,000/$10,000`, individual limits `$7,500/$7,500`, YTD `$8,000/$0`. Required: excess owner `$0` additional plus warning; unaffected spouse `$7,500` additional; no shared group created solely from the owner-only excess. PR #23 currently zeros both.
- FFH-013 remains REMEDIATION and PR #23 remains unmerged. Only bounded M02 correction is active; A01–A05 and M01 must be preserved.
- FFH-017 remains QUEUED behind FFH-013 closure.
- FFH-020 remains separately BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Core Financial Engine Engineer — continue PR #23 on `ffh/ffh-013-audit-remediation` in `STANDARD_CHAT`; close only FFH-013-M02, preserve A01–A05/M01, sync current Manager control plane, and return READY_FOR_MANAGER with new exact candidate CI.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE until Manager freezes a new accepted FFH-013 remediation integration target.
- Financial Policy & Scenario Auditor: IDLE until Manager freezes the same new target.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is FFH-013-M02, then Manager re-review/integration and a fresh dual re-audit. FFH-017 cannot activate until FFH-013 closes. FFH-020 remains a separate blocked database-recovery track.