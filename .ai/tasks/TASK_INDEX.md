# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative for task state; this file is a compact view and may lag briefly between Manager refreshes.

Last refreshed: 2026-09-10

| Task | Owner | State | Production checkpoint | Validation | Dependency / next gate |
|---|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | Manager synthesized as FFH-D006 | Complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | Foundation CI #300 SUCCESS | FFH-016 live Supabase parity still required before Phase 5 merge-ready |
| FFH-011 | App/Data | ACCEPTED | `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a` | CI #348 remains globally red only with 54 Manager-attributed FFH-012 failures; FFH-011 incremental SIMPLE regression removed | Live SIMPLE parity transfers to FFH-016; Core formula consumption remains FFH-015 |
| FFH-012 | Core Engine | REMEDIATION | `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546` isolated Core candidate | CI #308 FAILURE: 54 task-owned HSA-related calculation failures | Focused D005 remediation, validate, reach READY_FOR_MANAGER |
| FFH-013 | Core Engine | QUEUED | Not yet established | Not yet run | Hard/serialization dependency on FFH-012 acceptance unless Manager explicitly reorders |
| FFH-014 | Manager | CLOSED | Documentation/workflow only | No production validation required | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not yet established | Not yet run | FFH-011 dependency satisfied; wait for collision-safe Core slot while FFH-012 is active |
| FFH-016 | App/Data | ACTIVE | N/A — VERIFICATION-ONLY | Live HSA + SIMPLE migration, PostgREST, RLS, persistence/reload/runtime parity not yet verified | Execute live verification and reach READY_FOR_MANAGER |
| FFH-017 | Core Engine | QUEUED | Not yet established | Not yet run | Phase 5C; wait for retirement-capacity blockers to stabilize |
| FFH-018 | Product R&D | QUEUED | Discovery first | Not yet run | Design docs-only CI efficiency hardening after current red remediation stabilizes |
| FFH-019 | Manager | CLOSED | N/A — documentation/workflow only | Manager control-plane review complete | Workflow V3 merged at `11c757141fb17c00c5b37bc702cbd0ed55c38a5c` and adopted |

## Current branch-level CI attribution

At exact FFH-011 accepted production checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`, Foundation CI #348 is red with 54 calculation failures. This matches the Manager-isolated FFH-012 baseline from #308 after removal of the single incremental FFH-011 SIMPLE regression previously observed at #309.

CI #348 did not reach security policy-contract tests, typecheck, lint, or production build because calculation failure is fail-fast. Those downstream checks remain unverified at this checkpoint and must not be reported as passing.

No production task is currently `READY_FOR_MANAGER`. FFH-019 is closed after Manager acceptance and workflow integration.

## Active-chat target

Current smallest useful execution set:
- Engineering / Application, Data & Integration Engineer — FFH-016 live Supabase/runtime parity verification
- Engineering / Core Financial Engine Engineer — FFH-012 remediation
- Management / Manager — event-driven only for acceptance, blockers, escalation, dependency transitions, and explicit user coordination

All other specialist capabilities remain IDLE. Troubleshooting & Build remains IDLE because FFH-012 has not yet documented two failed same-root owner remediation iterations.

Under Workflow V3, roles are durable, chats are disposable, tasks are the unit of work, and repository state is memory. Work mode is an accelerator rather than a dependency.

## Integration / readiness queue

- FFH-019 is CLOSED after control-plane integration; Workflow V3 is canonical for workforce/chat/execution-mode routing while Workflow V2 safeguards remain authoritative underneath.
- FFH-011 is Manager-accepted in place under the grandfathered shared-branch exception.
- FFH-012 remains the active calculation blocker.
- FFH-016 is active as the independent verification-only pre-merge runtime gate.
- FFH-013 and FFH-015 both wait for a collision-safe Core slot after the FFH-012 Manager event.

When a task reaches `READY_FOR_MANAGER`, Manager independently verifies its evidence, records acceptance/rejection, integrates accepted production work in dependency order where applicable, verifies integration CI, and updates this dashboard.
