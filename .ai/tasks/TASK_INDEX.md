# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-14

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | REMEDIATION | failed frozen target `115f947e...` | Close Technical R01/R02/R03; fresh audit again on new frozen target |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013 remediation + fresh audit closure and Manager activation |
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
- FFH-013 frozen target `115f947e28cfae831a550f239c58dd0b59ca5798` received two fresh independent **FAIL — REMEDIATION REQUIRED** verdicts.
- Technical report commit `43c48b6cef03c8f01feb9f7e0c16fb6ee4aaeac4`; Technical handoff `8654e938b1eb015f079ef525126ecb610bd96d13`.
- Policy report/handoff commit `ce6ce75783a91090866037548216a2b2cd908384`.
- Technical R01 / TMA-01 HIGH: missing spouse aggregate IRA YTD can expose phantom definite room when the unknown can make the post-YTD MFJ shared feasible set material.
- Technical R02 / TMA-02 MEDIUM: `money-priority-secure.ts` still contains materially equivalent remaining-current-year month logic, so one calendar authority is not actually established.
- Technical R03 / TMA-03 MEDIUM: impossible ISO-looking dates such as `2026-09-31` normalize instead of taking the accepted 12-month fallback.
- Policy independently confirms the R03 malformed-date defect as blocking P03; no additional policy blocker found.
- T1 known-fact non-scarce unequal behavior clears both relevant reviews.
- A01–A05, M01, and M02 remain cleared/protected on their pinned known-fact scenarios, except R01 is a separate missing-material-fact boundary adjacent to A03.
- Valid-date P03 schedule reservation math clears: September four-month horizon, owner/shared capping, YTD/reservation separation, December one-month horizon, and staged consumption remain correct.
- Financial Engine Reconciliation Gate does not clear until R01/R02/R03 are fixed and re-audited.
- FFH-013 is back in `REMEDIATION`; Core Financial Engine Engineer owns one bounded pass for R01 + R02 + R03 only.
- FFH-017 remains QUEUED.
- FFH-020 remains separately BLOCKED before any live write.
- Phase 5 / PR #5 remains NOT MERGE READY.

## ACTIVATE NOW
- Core Financial Engine Engineer — execute FFH-013 R01 + R02 + R03 remediation in STANDARD_CHAT from the current Manager control-plane head; preserve all cleared behavior; return READY_FOR_MANAGER with exact SHA/CI/handoff evidence.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after FAIL verdict; wait for a new Manager-frozen target.
- Financial Policy & Scenario Auditor: IDLE after FAIL verdict; wait for the same new target.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Current near-term gate is bounded FFH-013 R01/R02/R03 remediation, Manager acceptance/integration, and a fresh final audit of the new exact target. FFH-017 cannot activate until FFH-013 closes.
