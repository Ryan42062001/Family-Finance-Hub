# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | Manager accepted; owned calculations/security gates PASS; inherited typecheck debt routed to FFH-029 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | QUEUED | Not established | FFH-012 dependency satisfied; wait for clean CI baseline / Manager activation |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not established | FFH-011 dependency satisfied; wait for FFH-029 clean baseline / collision-safe Core slot |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for FFH-013/015 retirement-capacity baseline and Manager activation |
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
| FFH-029 | Work Helper | ACTIVE | baseline `d472f8d8...` | Reproduce and remove registered CI-001 test-only TypeScript debt; restore full CI observability |

## Current verified state
- Workflow V3.1 is canonical. `npm run ai:validate-state` checks canonical task states/task-index consistency and Manager tracks inherited failures through `.ai/manager/KNOWN_CI_DEBT.md`.
- FFH-012 is CLOSED. Final frozen financial-behavior target `51c3cd5978837b892f0323617b49986347c7d938` received `PASS WITH NON-BLOCKING FINDINGS` from both fresh independent auditors.
- Final Policy report commit: `7916d2d915ba16a482bcbb505fff7db4c1566e9d`; Policy handoff commit: `72bfc06f086e22946603990f4d517c60de8f6853`.
- Final Technical handoff commit: `91fc01bedb044f32f61cf22fe9fdc34a2e2dfac6`, integrated into the milestone before Manager closure.
- Findings A, B, C, and D are CLOSED. Remaining Technical Finding E and the two Policy observations are LOW / NON-BLOCKING and do not prevent FFH-012 closure.
- FFH-028 remains Manager ACCEPTED and integrated at `51c3cd5978837b892f0323617b49986347c7d938`.
- Registered inherited TypeScript debt `CI-001` still prevents exact Foundation CI from reaching lint/build. Manager has assigned it to FFH-029 as a bounded test/type-debt cleanup before the next Core implementation wave.
- FFH-013's FFH-012 dependency is now satisfied, but FFH-013 remains QUEUED until FFH-029 restores a clean observable baseline and Manager chooses collision-safe Core sequencing.
- FFH-015's FFH-011 dependency remains satisfied and it also remains QUEUED until the FFH-029 baseline cleanup is accepted.
- FFH-017 remains QUEUED behind the stable retirement-capacity baseline.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Work Helper / Super Troubleshooter — execute FFH-029 from `.ai/tasks/FFH-029.md` in STANDARD_CHAT. No Work credit is needed for this bounded test/type cleanup.

## IDLE / BLOCKED
- Technical & Mathematical Auditor: IDLE after final passing FFH-012 re-audit.
- Financial Policy & Scenario Auditor: IDLE after final passing FFH-012 re-audit.
- Financial Policy Analyst: IDLE; FFH-022 authority remains sufficient.
- Core Engineering: IDLE pending FFH-029 clean baseline, then Manager will sequence FFH-015 / FFH-013 before FFH-017.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

Phase 5 / PR #5 remains NOT MERGE READY. FFH-012 is no longer a blocker; current near-term control-plane blocker is CI-001/FFH-029 plus the remaining queued Phase-5 Core work.