# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-14

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | AUDIT_READY | production `8d9cbc62...`; integration `4b7ed998...` | Fresh Technical + Policy audits on `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_4b7ed998.md` |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | CLOSED | production `378f1872...`; integration `01d9c225...` | Policy PASS; Technical PASS WITH NON-BLOCKING FINDINGS; R1 CLOSED |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013 final dual-audit closure and Manager activation |
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
- PR #25 — `FFH-013: remediate final R01 R02 R03 audit findings` — is Manager accepted and merged.
- Accepted production candidate: `8d9cbc62e47c651ad8e6564f325c20ffd67a439b`.
- Candidate Foundation CI: run `34911857129`, job `104200881078` — SUCCESS through AI-state validation, dependency audit, calculations, security contract, typecheck, lint, and build.
- Final worker/handoff head: `d5aa88d8b26aac5ca0c857ff949c031aec8a2559`.
- Final-head Foundation CI: run `34912465644`, job `104202768407` — SUCCESS through the same required gates.
- `8d9cbc62... -> d5aa88d8...` changes only `.ai/tasks/FFH-013.md` and `.ai/engineering/engine/HANDOFF.md` after the production candidate.
- Exact integration/frozen implementation target: `4b7ed99894e396beadc02a537dad45963f5db1d5`.
- Compare `d5aa88d8b26aac5ca0c857ff949c031aec8a2559..4b7ed99894e396beadc02a537dad45963f5db1d5` contains zero changed files.
- New frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_4b7ed998.md`.
- R01 Manager pin: missing aggregate spouse IRA YTD now fails the affected unequal-compensation shared relationship closed when the unknown can change post-YTD legal room; known-zero remains distinct; equal-comp/no-shared-feasible-set behavior remains owner-local.
- R02 Manager pin: the neutral `remainingContributionMonths(asOfDate, taxYear)` helper is now used by retirement accounts, retirement floor, Secure, engine current-year pacing, and user-plan current-year pacing; prior duplicate local calendar logic was removed.
- R03/P03 Manager pin: impossible ISO-looking dates use the accepted 12-month fallback; valid January/September/December and leap-year semantics are preserved.
- T1, A01–A05, M01, M02, valid-date P03, multiple-account nonmultiplication, staged Existing Cash/Secure/Build/Windfall conservation, Roth/Traditional separation, SIMPLE, HSA, and workplace-retirement behavior remain protected for fresh audit.
- FFH-013 is `AUDIT_READY`; both fresh independent audit lanes are the only active FFH-013 work.
- FFH-017 remains QUEUED until Manager reconciles both final verdicts and closes FFH-013.
- FFH-020 remains separately BLOCKED before any live write.
- Phase 5 / PR #5 remains NOT MERGE READY.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-013 audit of exact target `4b7ed99894e396beadc02a537dad45963f5db1d5`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-013 audit of the same exact target.

## IDLE / BLOCKED
- Core Financial Engine Engineer: IDLE after Manager acceptance/integration; do not begin FFH-017.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Current near-term gate is the fresh dual re-audit of FFH-013 frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5`. FFH-017 cannot activate until FFH-013 closes.