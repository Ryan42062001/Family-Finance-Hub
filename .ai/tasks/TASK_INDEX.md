# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-18

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
| FFH-017 | Core Engine | CLOSED | final frozen target `c563d011...` | Technical PASS + Policy PASS; zero findings; TMA-017-08/P05 closed; R02-R07/M01/reconciliation/floor/no-reuse preserved |
| FFH-018 | Product R&D / Engineering | CLOSED | discovery/design accepted | Manager accepted fail-closed always-running verify design; implementation split to FFH-034 |
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
| FFH-031 | Manager | CLOSED | integration/audit target `5c83a504...` | Independent workflow/control-plane audit PASS; zero findings |
| FFH-032 | Manager | CLOSED | integration/audit target `30592f8c...` | independent workflow/control-plane audit PASS; zero findings; compact table superseded by FFH-033 full-workforce view |
| FFH-033 | Manager | CLOSED | corrected integration/audit target `b4765818...` | fresh closure re-audit PASS; zero findings; FFH-033-WF-01 CLOSED; full 11-role dashboard canonical |
| FFH-034 | Product R&D / Engineering | REMEDIATION | R01 synchronize-delta locality active after live #713 finding | Preserve predecessor success continuity; re-prove long-running-PR DOCS_ONLY behavior before ruleset/audit |

## Current verified state
- Workflow V3.1 and `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md` remain canonical.
- FFH-031 is CLOSED on exact integration target `5c83a5040cdfc032606feaf96746e6d6131ea15a` after an independent workflow/control-plane audit PASS with zero findings. The Standard Chat High default / evidence-based Work escalation upgrade remains canonical. FFH-017 remediation remains separate.
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
- R04 production/test candidate `23fb87ae8b352e2a3d06aa1836ca2081fbb37544` changes only `money-priority-build-competition.ts` and `ffh-017-audit-remediation.test.ts`.
- Direct R04 tests cover higher-ranked unresolved OUTRANK scarcity, provably non-OUTRANK Essential uncertainty, Important locality, lower-ranked potential OUTRANK locality, and bounded independent capacity.
- Exact candidate Foundation CI run `35302462197`, job `105467760539` — SUCCESS; 909/909 calculations and 21/21 security tests passed.
- R04 branch was synchronized with latest milestone/control-plane head; refreshed validation head `b2c5d46f4f7abe58f6f1530e31107379ea6c037e` passed Foundation CI run `35302662526`, job `105468356418` — SUCCESS.
- FFH-017 R04 PR #31 was Manager-accepted and integrated at `c009a8c22d92715696018c7089eb5ad1a79a3cf1`; accepted PR head -> integration has zero changed files. Exact integration Foundation CI run `35303342028`, job `105470402709` — SUCCESS with 909/909 calculations and 21/21 security tests.
- Repository-scoped self-hosted Windows runner `FFH-Windows-Runner` runs Foundation CI at `$0` hosted-runner cost as a Windows service.
- FFH-020 remains separately BLOCKED before any live database write.
- FFH-016 remains blocked behind FFH-020.
- FFH-018 and FFH-026 remain QUEUED.
- Both fresh closure audits of `c009a8c2...` returned FAIL — REMEDIATION REQUIRED: Technical `TMA-017-06` HIGH (necessity-unknown potential OUTRANK) and Policy `FFH-017-P03` MEDIUM (post-Bucket-1 invariant-allocation freeze).
- R05/R06 production/test candidate `23b6001f62eab6473c4ae812e015fd259c0f9c40` changes only `money-priority-build-competition.ts` and `ffh-017-audit-remediation.test.ts`.
- Direct R05 tests cover confirmed necessity-unknown Fixed/Critical potential OUTRANK and a provably non-OUTRANK necessity-unknown negative control.
- Direct R06 tests cover the $500/$200/$100 invariant-retirement shape, the no-OUTRANK $600/$500/$100 shape, and a scarce possible-CO_PRIORITY fail-closed shape.
- Exact candidate Foundation CI run `35304758354`, job `105474563283` — SUCCESS; 914/914 calculations and 21/21 security tests passed; state validation, dependency audit, typecheck, lint, and build all passed.
- FFH-017 R05/R06 PR #32 is Manager-accepted and integrated at `5c96b99373c7c2593fbbb5766b109347f1588fcd`; final PR head `be34ce35b64d0a0512b8913e2d65fa779d013db7` -> integration has zero changed files. Exact integration Foundation CI run `35305470058`, job `105476660670` — SUCCESS with 914/914 calculations and 21/21 security tests.
- R08 production/test checkpoint `9d092d5a3939c75a229ed0e74568b40ea37dd387` changes only `money-priority-build-competition.ts` and `ffh-017-audit-remediation.test.ts`.
- Direct R08 tests prove senior request-null desired-excess reserve locality and the financially-junior non-blocking control.
- Exact R08 Foundation CI run `35386756540`, job `105735352341` — SUCCESS; 919/919 calculations and 21/21 security tests passed; AI-state validation, dependency audit, typecheck, lint, and build all passed.
- FFH-017 R08 worker lane is READY_FOR_MANAGER on draft PR #36; PR remains open/unmerged.
- Phase 5 / PR #5 remains NOT MERGE READY until FFH-017 remediation and fresh dual re-audit clear.

## ACTIVATE NOW
- No worker-authorized activation. Core Financial Engine Engineer recommends Manager / Architect review of completed FFH-017 R08 on PR #36. Manager must verify live state before downstream activation.

## ACTIVE / IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after completed `5c96b993...` closure audit; reactivate only after a new Manager-frozen target.
- Financial Policy & Scenario Auditor: IDLE after completed `5c96b993...` closure audit; reactivate only after a new Manager-frozen target.
- Work Helper: IDLE; escalate only if the bounded Core remediation becomes execution-heavy or technically stuck.
- Financial Policy Analyst roles: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

FFH-017 is CLOSED on final frozen target `c563d011...`. Remaining real Phase-5 merge blockers are FFH-020 secure live migration deployment/recovery -> Manager acceptance -> FFH-016 live Supabase/runtime parity, followed by the roadmap-required final integrated Phase-5 audit/review and PR #5 status/description refresh. FFH-018 discovery is active in parallel and is not itself a merge blocker; CI workflow implementation remains separately Manager-gated. Failed FFH-017 targets `9d3a880e...`, `90a31c75...`, `c009a8c2...`, `5c96b993...`, and `b236239f...` remain immutable historical evidence.

- FFH-032 compact Next Activation table is CLOSED on exact integration/audit target `30592f8cf130293c5e875b8fd391d3bc8ded92e0` after fresh independent workflow/control-plane audit PASS with zero findings. The table is now canonical.
