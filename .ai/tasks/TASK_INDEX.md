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
| FFH-017 | Core Engine | READY_FOR_MANAGER | production `1393ea92...`; PR #26; validated pre-handoff head `545d3b12...` | Self-hosted Foundation CI run `34999388253`, job `104483637634` SUCCESS; final documentation-only head awaits exact CI, then Manager acceptance |
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
- FFH-013 is **CLOSED** after the required final fresh dual audit of exact frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5`.
- FFH-013 Technical & Mathematical Auditor verdict: **PASS**, no findings. Report commit `195990332858e2a666b031779491c36207fa600e`; handoff commit `b80b7d253c4350fd980b72131283030a0dddbf96`.
- FFH-013 Financial Policy & Scenario Auditor verdict: **PASS**, no findings. Report commit `3e8e87d442b9ff15d6e5ec5c88adb51a4b79cfad`; handoff commit `acb8fbc8add06bcdacb480098455000fa2267dbd`.
- FFH-013 R01/R02/R03, T1, A01-A05, M01, M02, valid-date P03, multiple-account nonmultiplication, staged Existing Cash/Secure/Build/Windfall conservation, Roth/Traditional separation, SIMPLE/HSA/workplace preservation, and the Financial Engine Reconciliation Gate all clear.
- FFH-013 protected M01 pin remains `$833.33/month -> $416.67 + $416.66`, `$9,999.96` annual legal consumption, `$0.05` shared annual remainder.
- FFH-017 is **READY_FOR_MANAGER** on PR #26.
- Last production-code change: `1393ea928eb5756f16a6af063a68360892200bd6`.
- Pre-handoff validated head `545d3b12710086b0fefb44be9b7823309f30da0e` passed Foundation CI run `34999388253`, job `104483637634` on repository-scoped `FFH-Windows-Runner`.
- The self-hosted runner keeps hosted Actions spend at `$0`; workflow run steps use `cmd.exe` so Windows PowerShell execution policy remains unchanged.
- Final handoff commit: `c7882907854579488eb82f4d9f18799b51522550`.
- Core/Work Helper is idle pending Manager acceptance; no production rewrite is authorized without a concrete defect.
- FFH-020 remains separately BLOCKED before any live database write.
- FFH-016 remains blocked behind FFH-020.
- FFH-018 and FFH-026 remain QUEUED.
- Phase 5 / PR #5 remains NOT MERGE READY.

## ACTIVATE NOW
- Manager acceptance lane — obtain exact Foundation CI on the final documentation-only PR #26 head, verify no production delta after `1393ea92...`, then ACCEPT/integrate/freeze if clean.

## IDLE / BLOCKED
- Core Financial Engine Engineer: IDLE pending Manager review.
- Work Helper / Super Troubleshooter: IDLE pending Manager review.
- Technical & Mathematical Auditor: IDLE pending a Manager-frozen FFH-017 target.
- Financial Policy & Scenario Auditor: IDLE pending a Manager-frozen FFH-017 target.
- Financial Policy Analyst roles: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Current near-term gate is exact final-head self-hosted Foundation CI for PR #26, followed by Manager acceptance, integration, and required independent audit. Phase 5 / PR #5 remains NOT MERGE READY until remaining Phase 5 work is accepted.
