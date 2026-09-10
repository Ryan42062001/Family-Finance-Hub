# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative for task state; this file is a compact view and may lag briefly between Manager refreshes.

Last refreshed: 2026-09-09

| Task | Owner | State | Production checkpoint | Validation | Dependency / next gate |
|---|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | Manager synthesized as FFH-D006 | Complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | Foundation CI #300 SUCCESS | Live Supabase parity still required before Phase 5 merge-ready |
| FFH-011 | App/Data | REMEDIATION | `f85f7779a6bebac87d433289212f8671b46d8212` candidate | Foundation CI #309 FAILURE; attribution must distinguish inherited FFH-012 failures | Reach green/defensible validation and READY_FOR_MANAGER |
| FFH-012 | Core Engine | REMEDIATION | latest isolated observed Core checkpoint `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546` | Foundation CI #308 FAILURE at calculation-test stage | Remediate HSA implementation and reach READY_FOR_MANAGER |
| FFH-013 | Core Engine | QUEUED | Not yet established | Not yet run | Hard/serialization dependency on FFH-012 acceptance unless Manager explicitly reorders |
| FFH-014 | Manager | CLOSED | Documentation/workflow only | No production validation required | Workflow V2 / FFH-D007 adopted |
| Narrow R1 Core remediation | Core Engine | BLOCKED | Not yet established | Not yet run | Blocked on FFH-011 Manager acceptance and collision-safe scheduling |
| FFH-010 live Supabase parity | App/Data | QUEUED | Repository migration already exists | Live application/PostgREST/RLS/browser parity unverified | Required before Phase 5 merge-ready |
| Phase 5C implementation | Core Engine | QUEUED | Not yet established | Not yet run | Policy approved; wait for retirement-capacity blockers to stabilize |

## Active-chat target

Default operating target is 2–4 active chats, not all available roles. Current desired active set:
- Manager / Architect — event-driven orchestration/status/integration
- Application, Data & Integration Engineer — FFH-011 remediation
- Core Financial Engine Engineer — FFH-012 remediation

All other permanent roles remain IDLE unless a real dependency/event activates them.

## Integration queue

No task is currently `READY_FOR_MANAGER` for integration.

When a task reaches `READY_FOR_MANAGER`, Manager records its accepted production/validation checkpoints, integrates it in dependency order, verifies integration CI, and updates this dashboard.
