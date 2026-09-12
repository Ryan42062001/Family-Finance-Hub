# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-12

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | Manager accepted; owned calculations/security gates PASS; inherited typecheck debt remains `CI-001` |
| FFH-012 | Core / recovery | AUDIT_READY | frozen target `51c3cd59...` | Activate fresh Technical + Policy auditors against post-FFH-028 frozen packet; A/B/C preserved, D must be independently rechecked |
| FFH-013 | Core Engine | QUEUED | Not established | Wait for FFH-012 closure/reassessment |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not established | FFH-011 acceptance satisfied; wait for Core slot / FFH-012 disposition as Manager routes |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for Phase-5 blockers |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-output observability after current correctness recovery wave |
| FFH-019 | Manager | CLOSED | `11c75714...` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | Stage A pre-write checkpoint | Secure Supabase CLI/auth/protected-backup environment required; no history or DDL write occurred |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e53...` | Legal-marriage authority remains sufficient; no new authority gap |
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | Historical B/C correction accepted; superseded by later FFH-025/028 audit waves |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Supabase recovery plan accepted; FFH-020 blocked only by execution capability |
| FFH-025 | Work Helper | ACCEPTED | production `f537b7b...`; integration `ffde8440...` | Prior fresh dual audit closed A/B/C; technical Finding D was routed separately |
| FFH-026 | App/Data | QUEUED | Not established | Phase 7 production deployment/release readiness after Phase 5 + Phase 6 acceptance; establish stable URL and add GitHub About link |
| FFH-027 | Manager | CLOSED | PR #16; integration `789ae68d...` | Workflow V3.1 canonical; state validator/CI debt/audit packet/task schema adopted |
| FFH-028 | Work Helper | ACCEPTED | production `f266c112...`; integration `51c3cd59...` | Manager accepted bounded candidate-pair safety fix; parent FFH-012 fresh dual independent re-audit required |

## Current verified state
- Workflow V3.1 is canonical. `npm run ai:validate-state` checks canonical task states/task-index consistency and CI tracks inherited failures through `.ai/manager/KNOWN_CI_DEBT.md`.
- FFH-011 remains Manager ACCEPTED.
- FFH-025 remains Manager ACCEPTED. The prior frozen audit at `ffde8440...` closed Findings A/B/C but discovered new Technical Finding D.
- FFH-028 is Manager ACCEPTED and merged through PR #17 at exact integration `51c3cd5978837b892f0323617b49986347c7d938`.
- FFH-028 exact production SHA is `f266c112abff752e268c48dd097d7d562ac58169`; validation SHA `d13c412851c8a35d1d7cc4a85054d3dcf8bae94f` is tree-identical to production and exists only to request exact candidate CI.
- Foundation CI run `34698588257`, job `103566232253`, passes AI-state validation, dependency install/audit, calculations 818/818, and security 21/21 before Type Check fails on registered inherited `CI-001`; lint/build are skipped by fail-fast.
- Manager independently reviewed the FFH-028 diff. The financial behavior change is bounded to multi-candidate HSA ambiguity: materially ambiguous 3+ candidate states become targeted `more_information_needed` rather than silently exposing independent family limits. No legal pair is inferred from relationship labels, filing status, allocations, account ownership, ordering, prior-year state, or a lone authority row.
- All-known self-only locality and unrelated IRA/workplace opportunities have dedicated FFH-028 regressions; Findings A/B/C remain regression-protected.
- FFH-012 is now `AUDIT_READY` on exact frozen target `51c3cd5978837b892f0323617b49986347c7d938` using `.ai/audit/FFH-012_FROZEN_AUDIT_PACKET_51c3cd59.md`.
- Later Manager documentation/control-plane commits after `51c3cd59...` do not redefine the financial-behavior target.
- FFH-020 remains BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-012 re-audit at frozen target `51c3cd5978837b892f0323617b49986347c7d938` using `.ai/audit/FFH-012_FROZEN_AUDIT_PACKET_51c3cd59.md`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-012 re-audit at the same exact target and packet.

## IDLE / BLOCKED
- Work Helper: IDLE; FFH-028 accepted/integrated.
- Implementation Engineer / App-Data: IDLE for FFH-011; accepted. FFH-020 remains separately BLOCKED.
- Financial Policy Analyst: IDLE; FFH-022 authority remains sufficient.
- R&D: IDLE.
- Core Engineering: IDLE unless a fresh audit returns a blocking implementation finding.
- FFH-020 execution: BLOCKED on secure CLI/auth/backup capability.
- FFH-026 deployment: QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

Phase 5 / PR #5 remains NOT MERGE READY until FFH-012 clears this fresh dual independent re-audit and remaining milestone gates are satisfied.