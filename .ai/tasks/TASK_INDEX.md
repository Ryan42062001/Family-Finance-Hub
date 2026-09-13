# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-13

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | REMEDIATION | failed frozen target `e811ef1f...` | Fresh dual re-audit FAIL: close Technical T1 + Policy P03 only; preserve A01/A03/A04/A05/M01/M02 |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013 final remediation + fresh dual re-audit closure |
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
- Workflow V3.1 and `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md` remain canonical.
- FFH-013 frozen target `e811ef1f1f786196d909391262b19d71fe0f9a71` received two independent **FAIL — REMEDIATION REQUIRED** verdicts.
- Technical re-audit handoff SHA `fa2d327e9dbc7e381aad16037fe48e2a5d0d7442` clears A01–A05, M01, and M02 but opens one HIGH blocker, T1: a non-scarce unequal-compensation owner-only excess incorrectly creates a zero shared MFJ group and suppresses the unaffected spouse's valid room.
- T1 adversary: compensation `$100,000/$50,000`, YTD `$8,000/$0`, individual IRA limits `$7,500/$7,500`; required additional room is `$0/$7,500`, not `$0/$0`.
- Policy re-audit report commit `21fbcbbbb4f7e7f1687d9c91e13c1c0aabd85b45`, handoff `b9e43174b422c86b2d9609427c01cf1a516d9033`, clears A01/A03/A04/A05/M01/M02 but reopens A02 as HIGH P03: active monthly IRA schedule reservation incorrectly infers `monthly × 12 - YTD` rather than the authoritative supported future schedule over the remaining current-year period.
- P03 adversary: around September 2026, `$10,000/$0` compensation, `$7,000/$0` IRA YTD, A active schedule `$500/month`; supported future reservation must consume the remaining `$500` of A owner room and leave at most `$2,500` shared for new recommendations. Current annualization can reserve `$0` and double-use future capacity.
- A01 annual shared-cap equal fulfillment remains cleared.
- A03/A04 scarce unequal-compensation materiality/fail-closed behavior remains cleared and must not be weakened by T1 remediation.
- A05 conditional/non-additive explanation remains cleared.
- M01 exact recurring reconciliation remains closed.
- M02 equal-compensation owner-local excess remains closed.
- No inherited CI debt exists; CI-001 remains CLOSED. The new blockers are semantic/scenario gaps missed by green CI.
- FFH-013 is REMEDIATION. A new Manager-accepted integration target plus one final fresh dual re-audit will be required after T1/P03 closure.
- FFH-017 remains QUEUED behind FFH-013 closure.
- FFH-020 remains separately BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Core Financial Engine Engineer — perform one bounded FFH-013 remediation for Technical T1 + Policy P03 only; preserve A01/A03/A04/A05/M01/M02; use STANDARD_CHAT unless Manager explicitly escalates.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after FAIL verdict; wait for a new frozen remediation target.
- Financial Policy & Scenario Auditor: IDLE after FAIL verdict; wait for the same new frozen target.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is the narrow FFH-013 T1/P03 remediation, followed by Manager review/integration and a final fresh dual re-audit. FFH-017 cannot activate until FFH-013 closes. FFH-020 remains a separate blocked database-recovery track.
