# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | Manager accepted; SIMPLE persisted-field contract available to FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | QUEUED | Not established | FFH-012 dependency satisfied; serialized behind active FFH-015 |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | ACTIVE | approved base `61ad63ea...` | Narrow SIMPLE Core remediation; return READY_FOR_MANAGER with full green CI |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-015 then FFH-013 retirement-capacity baseline and Manager activation |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-output observability after current correctness recovery wave |
| FFH-019 | Manager | CLOSED | `11c75714...` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | Stage A pre-write checkpoint | Secure Supabase CLI/auth/protected-backup environment required; no history or DDL write occurred |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e53...` | Legal-marriage authority remains sufficient; no new authority gap |
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | Historical remediation accepted; superseded by later FFH-025/028 closure wave |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Supabase recovery plan accepted; FFH-020 blocked only by execution capability |
| FFH-025 | Work Helper | ACCEPTED | production `f537b7b...`; integration `ffde8440...` | Final FFH-012 audit confirms Finding A remains closed |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance; establish stable URL and add GitHub About link |
| FFH-027 | Manager | CLOSED | PR #16; integration `789ae68d...` | Workflow V3.1 canonical; state validator/CI debt/audit packet/task schema adopted |
| FFH-028 | Work Helper | ACCEPTED | production `f266c112...`; integration `51c3cd59...` | Final FFH-012 dual audit closes candidate-cardinality Finding D |
| FFH-029 | Work Helper | ACCEPTED | implementation `5b06448a...`; integration `61ad63ea...` | PR #18 merged; CI-001 CLOSED; Type Check/lint/build observable and green |

## Current verified state
- Workflow V3.1 is canonical. `npm run ai:validate-state` checks canonical task states/task-index consistency and Manager tracks inherited failures through `.ai/manager/KNOWN_CI_DEBT.md`.
- FFH-012 is CLOSED. Final frozen financial-behavior target `51c3cd5978837b892f0323617b49986347c7d938` received `PASS WITH NON-BLOCKING FINDINGS` from both fresh independent auditors; Findings A/B/C/D are CLOSED.
- FFH-028 remains Manager ACCEPTED and integrated at `51c3cd5978837b892f0323617b49986347c7d938`.
- FFH-029 is Manager ACCEPTED. PR #18 merged at `61ad63ea1f41002e47708887505bf2b3365ea077`. Exact implementation CI run `34708768213`, job `103593557184`, and final PR-head CI run `34709128169`, job `103594530450`, both pass AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.
- Manager-owned `CI-001` is CLOSED. There is no currently registered inherited CI failure.
- FFH-015 is ACTIVE as the only Core implementation task from clean base `61ad63ea1f41002e47708887505bf2b3365ea077`. Manager selected the narrow SIMPLE remediation before the broader FFH-013 shared-compensation ledger to minimize retirement-engine collision risk.
- FFH-013 remains QUEUED behind FFH-015. Its FFH-012 dependency is satisfied.
- FFH-017 remains QUEUED behind the stable FFH-015/013 retirement-capacity baseline.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Core Financial Engine Engineer — execute FFH-015 from `.ai/tasks/FFH-015.md` in STANDARD_CHAT from approved integration base `61ad63ea1f41002e47708887505bf2b3365ea077`.

## IDLE / BLOCKED
- Work Helper / Super Troubleshooter: IDLE after Manager acceptance of FFH-029.
- Technical & Mathematical Auditor: IDLE after final passing FFH-012 re-audit.
- Financial Policy & Scenario Auditor: IDLE after final passing FFH-012 re-audit.
- Financial Policy Analyst: IDLE; FFH-022 authority remains sufficient.
- Core Engineering: only FFH-015 ACTIVE; FFH-013 and FFH-017 remain QUEUED.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

Phase 5 / PR #5 remains NOT MERGE READY. The CI baseline is now clean; remaining near-term Phase-5 work is the serialized Core sequence FFH-015 -> FFH-013 -> FFH-017, with FFH-020 separately blocked on secure Supabase execution capability.