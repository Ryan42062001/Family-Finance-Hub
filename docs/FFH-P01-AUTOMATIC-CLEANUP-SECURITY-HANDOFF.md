# FFH-P01 / Issue #83 — Automatic test cleanup: security handoff (source-only)

## Binding checkpoint

- Parent Manager contract: #83.
- Release branch: phase/ffh-p01-release-readiness.
- Immutable base verified before branch creation: 344c4c7ac1f46d8b1fd2d81b2b4a391cbd136983.
- Feature branch: feature/ffh-p01-automatic-test-cleanup.
- Parent release PR #81 is DRAFT / OPEN; protected main is untouched.
- **Status: INCOMPLETE / BLOCKED FOR ACTIVATION.** The policy and mocked decisions exist. No executable cleanup adapter, owner-host integration, or activation is authorized.

## Delivered pure policy (cannot mutate a host)

The policy in scripts/rls-local/automatic-cleanup-policy.mjs exports:
1. expectedIdentity: SHA + per-run 96-bit token yields a unique project/container/root identity.
2. assertManifest: guards Windows profile child root, outside-root evidence directory, nonlegacy names, nondefault noncolliding ports, exact per-run resource ledger and daemon fingerprint.
3. nextDecision: a **single-step** decision for Gate A failure or Gate B success/failure. Requires fresh exact engine and run-labelled Docker inventories, exact IDs, labels, ownership and attachments; refuses shared mounts, unknown SQL/child state, changed legacy fingerprint and missing sanitized evidence. Returns only graceful-stop, exact remove of container/volume/network, then verified root removal. Unknown state returns CLEANUP_BLOCKED_MANUAL_REVIEW, never a delete.
4. nextRunGate: read-only crash/stale-journal block; a retained successful Gate A database blocks an unrelated new run.

Gate A success returns PRESERVED_FOR_SEPARATE_GATE_B instead of cleanup. TEST_RESULT is never overwritten by CLEANUP_RESULT. A policy result is **not** an observed Docker action or proof of absence.

## Offline source test matrix

File: tests/security/ffh-p01-automatic-cleanup-policy.test.ts, Node 22 built-in node:test, in-memory fake inventory only.

| Fixture | Expected policy decision |
| --- | --- |
| Unique SHA/token identifier and strict manifest | ALLOW validated identity |
| Gate A success | PRESERVE database |
| Gate A failure staged graceful stop -> container -> volume -> network -> root | Exact one-action stages |
| Gate B PASS and FAIL | Retire without changing TEST_RESULT |
| Unknown child tree, SQL status, evidence capture | BLOCK |
| Active SQL session | BLOCK |
| Changed daemon ID/endpoint, incomplete inventory | BLOCK |
| Forged label, unrecorded object, duplicate resource | BLOCK |
| Shared volume/network, foreign attachment | BLOCK |
| Legacy fingerprint drift, wrong root, reparse, open handle | BLOCK |
| Missing ledger, conflicting fixed port, remote daemon | BLOCK |
| Crashed/unknown journal, preserved previous Gate A, unlabeled stale inventory | BLOCK |

## Unimplemented work — explicitly prevents approval

- **Entrypoints have not been modified:** prepare-fresh-owner.ps1 and run-owner.ps1 still use the old source-SHA fixed root, project, 54332/54333 ports and their existing receipt contract. Do not execute Gate A #6 or Gate B on the basis of this branch.
- No Windows PowerShell 5.1 cleanup adapter, one-time idempotent bounded finally worker, actual inventory collection, direct exact-ID Docker commands, timeouts, graceful stop, cross-process journal locking, Windows reparse/ACL check for recursive root removal or post-delete absence verification.
- No trustworthy owner-host runtime discovery yet for Supabase CLI 2.122.0 container/volume/network labels and mounts. **Do not weaken the label checks or assume sample fake metadata matches reality.**
- No cryptographically unique token/port allocation entrypoint with an OS-checked reservation; no stored *precreation* crash journal/immutable receipt; no independently rechecked legacy fingerprint strategy; no outside-root privacy-safe evidence writer. The pure policy accepts already-verified immutable facts; it cannot establish those facts.
- No automatic Gate A/Gate B outcome handling, timeout/unknown-session recovery or test-vs-cleanup exit-code surfacing.
- No new Windows 5.1 fake-Docker **adapter** tests. Existing Windows AST, provenance, CLI, and SQL owner-procedure tests remain unchanged and are still mandatory.
- No claimed local test execution, independent audit, exact-head FAST, owner-host inventory, dry run, real SQL run or real Docker deletion in this handoff.

## Required next implementation/audit sequence

1. Have the Manager approve the exact snapshot and guarded adapter design, including Docker labels and platform-specific Windows verification mechanics. Treat any unsupported metadata as a hard STOP, not a guessed resource ID.
2. Implement per-run allocation and an immutable outside-root lifecycle journal **before** the first possible Docker creation. Use exact source provenance without relaxing branch/SHA and authorization gates. Port collision/reservation checks are mandatory.
3. Implement an exact-ID PowerShell 5.1 adapter with repeated daemon, identity, label, attachments, legacy and filesystem checks **before each mutation**, only graceful stop, no force, no broad prune/sweep. Verify absence and journal transition after each stage. A lost child/SQL state must preserve BLOCKED status.
4. Integrate Gate A failure / Gate B finally paths and separately authorized Gate A success preservation, with sanitized evidence captured outside the root first. Retain TEST_RESULT separate from CLEANUP_RESULT.
5. Add adversarial Windows PowerShell fake-Docker fault tests for partial startup, return codes, timeouts, reparse races, journal crashes and untrusted commands. Execute canonical Windows FAST and fresh independent source/procedure security audit against immutable head.
6. Only after audit PASS, exact-head CI and a separately authorized one-time owner-host dry run with two independent inventories may Manager consider **separately authorizing** Gate A #6. Gate B requires its own approval.

## Safety hold

No Docker, Supabase CLI, local SQL, hosted SQL, secret retrieval, network mutation, production/Private Beta, Gate A #6, Gate B/913, branch merge, deployment or protected-main change was authorized by this document. This document is **not an implementation-complete receipt** and must not be cited to release the parent PR.
