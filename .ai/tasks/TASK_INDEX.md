# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-14

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6...` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | ACCEPTED | production `c32942f1...`; integration `19bc3040...` | SIMPLE persisted-field contract consumed by closed FFH-015 |
| FFH-012 | Core / recovery | CLOSED | final frozen target `51c3cd59...` | Final Technical + Policy re-audits both PASS WITH NON-BLOCKING FINDINGS; A/B/C/D closed |
| FFH-013 | Core Engine | AUDIT_READY | production `0a4d46ed...`; integration `115f947e...` | Final fresh Technical + Policy audits on `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_115f947e.md` |
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
- FFH-013 PR #24 is Manager accepted and merged.
- FFH-013 accepted production candidate: `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`.
- Candidate Foundation CI: run `34882801756`, job `104105952541` — SUCCESS.
- Final worker/handoff head: `23c1caa75cd4d66021161f0b540e2b00ec12e074`.
- Final-head Foundation CI: run `34883153453`, job `104107126587` — SUCCESS through AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.
- FFH-013 exact integration/frozen behavior target: `115f947e28cfae831a550f239c58dd0b59ca5798`.
- Compare `23c1caa75cd4d66021161f0b540e2b00ec12e074..115f947e28cfae831a550f239c58dd0b59ca5798` contains zero file differences.
- New frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_115f947e.md`.
- Manager verification closes Technical T1 and Policy P03 pending fresh independent audit.
- T1 pin: non-scarce unequal compensation `$100,000/$50,000`, YTD `$8,000/$0` => `$0/$7,500`, owner-local excess warning, no false zero MFJ shared group.
- P03 pin: one shared `remainingContributionMonths(asOfDate, taxYear)` authority is used by retirement-account planning and hybrid retirement-floor current-year reservation; September `$500/month` with `$7,000` YTD reserves supported `$500`, while December reserves one month only.
- A01/A03/A04/A05/M01/M02 remain protected and must be re-verified on the new frozen target.
- A02 schedule-reservation architecture remains distinct from YTD and is included in final re-audit scope.
- No inherited CI debt exists; CI-001 remains CLOSED.
- FFH-013 is `AUDIT_READY`; both fresh independent audit lanes are the only active FFH-013 work.
- FFH-017 remains QUEUED until Manager reconciles both final verdicts and closes FFH-013.
- FFH-020 remains separately BLOCKED before any live write.
- FFH-026 remains QUEUED until Phase 5 and Phase 6 are accepted and a production release candidate exists.

## ACTIVATE NOW
- Technical & Mathematical Auditor — fresh independent FFH-013 audit of exact target `115f947e28cfae831a550f239c58dd0b59ca5798`.
- Financial Policy & Scenario Auditor — separate fresh independent FFH-013 audit of the same exact target.

## IDLE / BLOCKED
- Core Financial Engine Engineer: IDLE after Manager acceptance/integration; do not begin FFH-017.
- Work Helper / Super Troubleshooter: IDLE.
- Financial Policy Analyst: IDLE.
- Implementation Engineer / App-Data: FFH-020 remains BLOCKED on secure Supabase execution capability.
- R&D: IDLE.
- FFH-026 deployment: QUEUED.

Phase 5 / PR #5 remains NOT MERGE READY. Current near-term gate is the final fresh dual re-audit of FFH-013 frozen target `115f947e28cfae831a550f239c58dd0b59ca5798`. FFH-017 cannot activate until FFH-013 closes. FFH-020 remains a separate blocked database-recovery track.