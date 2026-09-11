# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-11

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | REMEDIATION | accepted source `a89e9ae...`; current security debt independently re-proven | Narrow semantic security-test remediation may activate now; FFH-020 is blocked |
| FFH-012 | Core / recovery | AUDIT_READY | remediation integration `1487b192...` | Foundation CI #404 calculations PASS; dual fresh re-audits required |
| FFH-013 | Core Engine | QUEUED | Not established | Wait for FFH-012 re-audit disposition |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not established | Wait for FFH-011 validation stability and Core slot |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for Phase-5 blockers |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-observability after current recovery wave |
| FFH-019 | Manager | CLOSED | `11c757141fb17c00c5b37bc702cbd0ed55c38a5c` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | Stage A pre-write checkpoint only | Secure Supabase CLI/auth/protected-backup execution environment required; no repair or DDL write occurred |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e531309e10cb7d1127fb022362d4d5f942b` | Legal-marriage authority implemented by FFH-023 |
| FFH-023 | Work Helper | ACCEPTED | production `9140d19c...`; integration `1487b192...` | Integrated remediation accepted; parent FFH-012 re-audit is the next gate |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Recovery plan accepted; FFH-020 blocked only by secure CLI/auth/backup capability |

## Current verified recovery state
- PR #11 is merged at FFH-012 remediation integration SHA `1487b192491a704ca3500b42d22a50289ee1551b`.
- Foundation CI #404 / run `34624938204` / job `103347645465` on that exact SHA passes `Test calculations`, then fails `Test security policy contract`; typecheck/lint/build are skipped and are not claimed green.
- Manager independently re-proved that the remaining security mismatch is FFH-011-owned stale textual validation debt: the security-test blob is identical at accepted FFH-011 and current integration checkpoints, PR #11 does not modify that test or the SIMPLE normalization block, and the regex requires a source shape absent from the accepted implementation.
- FFH-023 is accepted as the remediation task. FFH-012 is AUDIT_READY, not CLOSED.
- FFH-020 remains BLOCKED before any migration-history or live DDL write because the required secure CLI/auth/backup environment is unavailable.
- FFH-016 remains BLOCKED behind FFH-020.

## ACTIVATE NOW
- Auditor/QA — Technical & Mathematical Auditor — FFH-012 fresh re-audit of exact integration `1487b192...`.
- Auditor/QA — Financial Policy & Scenario Auditor — FFH-012 fresh independent re-audit of the same exact integration in a separate conversation.

## Available independent remediation
- Implementation Engineer / App-Data may now execute the narrow FFH-011 security-contract remediation because FFH-020 is blocked and no longer occupies the role. This work is independent of the FFH-012 re-audits.

## Idle / blocked departments
- FFH-020 Implementation execution: BLOCKED pending secure Supabase CLI/auth/backup capability.
- Financial Policy: IDLE after FFH-022 acceptance.
- R&D: IDLE after FFH-024 acceptance.
- Core Engineering: IDLE pending FFH-012 re-audit disposition.
- Manager: event-driven after this routing event.

## Integration/readiness disposition
- FFH-012: AUDIT_READY.
- FFH-023: ACCEPTED.
- FFH-011: REMEDIATION.
- FFH-020: BLOCKED before first history repair.
- FFH-016: BLOCKED.
- Phase 5 / PR #5 remains NOT MERGE READY.