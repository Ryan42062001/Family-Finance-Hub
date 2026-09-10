# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative for task state; this file is a compact view and may lag briefly between Manager refreshes.

Last refreshed: 2026-09-09

| Task | Owner | State | Production checkpoint | Validation | Dependency / next gate |
|---|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | Manager synthesized as FFH-D006 | Complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | Foundation CI #300 SUCCESS | FFH-016 live Supabase parity still required before Phase 5 merge-ready |
| FFH-011 | App/Data | REMEDIATION | `f85f7779a6bebac87d433289212f8671b46d8212` candidate | CI #309 FAILURE: 1 isolated FFH-011 SIMPLE failure; 54 inherited FFH-012 failures | Owner fixes only FFH-011 regression, validates, reaches READY_FOR_MANAGER |
| FFH-012 | Core Engine | REMEDIATION | `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546` isolated Core candidate | CI #308 FAILURE: 54 task-owned HSA-related calculation failures | Focused D005 remediation, validate, reach READY_FOR_MANAGER |
| FFH-013 | Core Engine | QUEUED | Not yet established | Not yet run | Hard/serialization dependency on FFH-012 acceptance unless Manager explicitly reorders |
| FFH-014 | Manager | CLOSED | Documentation/workflow only | No production validation required | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | BLOCKED | Not yet established | Not yet run | Narrow R1 remediation; blocked on FFH-011 acceptance and collision-safe Core slot |
| FFH-016 | App/Data | QUEUED | N/A — VERIFICATION-ONLY | Live HSA/SIMPLE migration, PostgREST, RLS, browser/runtime parity unverified | Required pre-merge runtime gate; schedule when App/Data is free |
| FFH-017 | Core Engine | QUEUED | Not yet established | Not yet run | Phase 5C; wait for retirement-capacity blockers to stabilize |
| FFH-018 | Product R&D | QUEUED | Discovery first | Not yet run | Design docs-only CI efficiency hardening after current red remediation stabilizes |

## Current branch-level CI attribution

At Workflow V2 head `540a9972463e7a6ff2ffbc42bc454f320e7dd550`, Foundation CI #334 is red with the same 55 calculation-failure set identified by independent Work-mode analysis:
- 54 failures originate at isolated FFH-012 checkpoint #308;
- 1 incremental SIMPLE failure originates with FFH-011 at #309;
- documentation-only Workflow V2 commits after the production candidates inherited those failures and do not count as owner remediation attempts.

No task is currently `READY_FOR_MANAGER`.

## Active-chat target

Default operating target is 2–4 active chats, not all available roles. Current desired active set:
- Manager / Architect — event-driven orchestration/status/integration
- Application, Data & Integration Engineer — FFH-011 remediation
- Core Financial Engine Engineer — FFH-012 remediation

All other permanent roles remain IDLE unless a real dependency/event activates them. Troubleshooting & Build remains IDLE because no same-root problem has yet survived two actual owner remediation iterations.

## Integration / readiness queue

- No production task is currently `READY_FOR_MANAGER` for integration.
- FFH-016 is a queued non-code pre-merge runtime-verification gate and must be completed before Phase 5 can become merge-ready.

When a task reaches `READY_FOR_MANAGER`, Manager independently verifies its evidence, records acceptance/rejection, integrates accepted production work in dependency order, verifies integration CI, and updates this dashboard.
