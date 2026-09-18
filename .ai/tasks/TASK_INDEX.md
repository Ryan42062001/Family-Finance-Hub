# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-17

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
| FFH-017 | Core Engine | REMEDIATION | failed frozen target `90a31c75...` | dual re-audit FAIL on one shared HIGH R01 multi-OUTRANK locality defect; bounded Core remediation ACTIVE |
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
| FFH-031 | Manager | AUDIT_READY | integration/audit target `5c83a504...` | Retroactive independent workflow/control-plane audit ACTIVE |

## Current verified state
- Workflow V3.1 and `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md` remain canonical.
- FFH-031 is AUDIT_READY on exact integration target `5c83a5040cdfc032606feaf96746e6d6131ea15a`; one retroactive independent workflow/control-plane audit is ACTIVE. The routing upgrade remains in force unless audit finds a blocking defect. FFH-017 frozen target/audit lanes are unchanged.
- FFH-013 remains CLOSED on final frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5` after clean dual PASS.
- FFH-017 historical accepted/integrated target `9d3a880e02365b4445b8070344c72c928ca34511` failed both required fresh independent audits and is now historical failed-audit evidence.
- Historical FFH-017 production checkpoint: `1393ea928eb5756f16a6af063a68360892200bd6`.
- Historical pre-handoff head `545d3b12710086b0fefb44be9b7823309f30da0e` passed Foundation CI run `34999388253`, live verify job `104483702758`.
- Historical handoff commit `c7882907854579488eb82f4d9f18799b51522550` passed Foundation CI run `35000961119`, job `104488944773`.
- Financial Policy & Scenario audit: **FAIL — REMEDIATION REQUIRED**. Report commit `873d2be6f707821c0d6e68c5eba95ca785cb9753`; handoff `262413ba764ee85e0af363d9d7f1edab6d291a14`; blocking `FFH-017-P01` MEDIUM missing-fact locality.
- Technical & Mathematical audit: **FAIL — REMEDIATION REQUIRED**. Report commit `662a5301379223dee847a3649f69a723f19cb02d`; handoff `f0e0a95368790811cc76a04b1964d0bcc95c3b6d`; blocking HIGH findings TMA-017-01 locality, TMA-017-02 non-tied annual/monthly reconciliation, TMA-017-03 missing desired/excess BELOW tranche; LOW TMA-017-04 CI-reference hygiene.
- Manager reconciled TMA-017-01 + FFH-017-P01 as one R01 locality root defect and accepted TMA-017-02 as R02 and TMA-017-03 as R03.
- TMA-017-04 is closed at the control-plane level: GitHub confirms run `34999388253` verify job `104483702758`; the historical packet/task/index metadata is corrected without changing the frozen financial target.
- R03 stands despite the Policy auditor's narrower core/excess-separation clear: FFH-D004 requires tranche-based competition, desired excess BELOW retirement, and one disposition per nonzero recurring tranche; frozen production stores excess but does not emit/rout a separate excess pace.
- Remediation branch: `ffh/ffh-017-audit-remediation`.
- Remediation production checkpoint: `0a421f00e42ee1699d51dea7abdb37118bed631f`; exact production/test validation head `a6a8087db007d3012db8fe426e63a2988a0f95a8`; Foundation CI run `35171621516`, job `105044311457` — SUCCESS.
- FFH-017 remediation PR #28 final head `401204a34ec8ddf2305e073a1938f3cfb27a8900` was Manager-accepted and merged; frozen target `90a31c755ea88310e58bb9e06ade60af73e182f5` subsequently FAILED both fresh re-audits on one shared HIGH R01 boundary defect.
- Integration Foundation CI run `35297206526`, job `105452111495` remains SUCCESS on failed frozen target `90a31c755ea88310e58bb9e06ade60af73e182f5`; green CI did not cover the newly identified multi-OUTRANK missing-fact adversary.
- Final Technical re-audit: **FAIL — REMEDIATION REQUIRED**; `TMA-017-05` HIGH; report `11f97eaedc45da8f9f4b82e82590f8481229bfd1`; handoff `97e85fcc6bb884c875610ff6fbe1775de462fd44`.
- Final Policy re-audit: **FAIL — REMEDIATION REQUIRED**; `FFH-017-P02` HIGH; report `b7ef832eadb143e66f85e3669eaf63e14330dbf6`; handoff `077fd7c914194fb7f4c12309e1e16db6e80607be`.
- Manager reconciles both findings as one R04 defect: a materially unresolved Essential peer that can alter scarce OUTRANK ordering must keep the contested Bucket-1 capacity unresolved; R02, R03, reconciliation mechanics, and FFH-013 M01 remain cleared.
- Repository-scoped self-hosted Windows runner `FFH-Windows-Runner` runs Foundation CI at `$0` hosted-runner cost as a Windows service.
- FFH-020 remains separately BLOCKED before any live database write.
- FFH-016 remains blocked behind FFH-020.
- FFH-018 and FFH-026 remain QUEUED.
- Phase 5 / PR #5 remains NOT MERGE READY until FFH-017 remediation and fresh dual re-audit clear.

## ACTIVATE NOW
- Core Financial Engine Engineer — bounded FFH-017 R04 remediation on `ffh/ffh-017-r01-outrank-peer-remediation`; execution mode `STANDARD_CHAT_HIGH`; Fast Refresh; preserve cleared R02/R03/M01 behavior; return READY_FOR_MANAGER unmerged.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE pending a new Manager-frozen remediation target.
- Financial Policy & Scenario Auditor: IDLE pending a new Manager-frozen remediation target.
- Work Helper: IDLE; escalate only if the bounded Core remediation becomes execution-heavy or technically stuck.
- Financial Policy Analyst roles: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Current near-term gate is bounded FFH-017 R04 Core remediation -> exact validation -> Manager acceptance/integration -> new frozen target -> required closure audit. Failed targets `9d3a880e...` and `90a31c75...` must not be reused.
