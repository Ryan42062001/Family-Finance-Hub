# FFH-P01 #83 — Automatic Test Cleanup security handoff

**Role:** SAME Primary Builder. **PR:** #84 DRAFT/OPEN/UNMERGED. **Branch:** feature/ffh-p01-automatic-test-cleanup. **Source GO:** Issue #83 comment 6552557643; PR #84 comment 6552559497. **Risk:** HIGH. Source and mock tests do not certify safe owner-host Docker deletion.

## Implementation inventory

- scripts/rls-local/automatic-cleanup.ps1 — cryptographic 96-bit run token, 39-character project ID ffhp1_<sha8>_<token24>, direct-child Windows fixed-drive profile root, exclusive lifecycle lock, outside-root durable JSON journal, unique host port pair, pinned local Docker metadata, dual labels, redacted evidence.
- scripts/rls-local/cleanup-executor.ps1 — precreation namespace and FFH-RLS-Test baseline verification, exact resource ID/mount/attachment validation, read-only SQL idle attestation, bounded exact native Docker Job Object actions, post-action absence proof, bounded nonrecursive temporary root removal, fail-closed manual review.
- scripts/rls-local/source-provenance.ps1 — hashes new helper source and keeps strict immutable checkout/migration receipts, adds unique project ID and dynamic port support.
- scripts/rls-local/prepare-fresh-owner.ps1 — Gate A uses a new token/journal/root, isolated startup, observed resource ledger, immutable source application. PASS preserves DB for Gate B; safe FAIL requests exact cleanup.
- scripts/rls-local/run-owner.ps1 — separately approved Gate B uses preserved same-SHA/token/root/config/port receipt. PASS/FAIL recorded separately from cleanup result; requests staged cleanup if safe.
- scripts/rls-local/automatic-cleanup-policy.mjs — pure decision policy, updated for 39-character ID and dual labels; not a mutation adapter.

## Source research vs unverified local metadata

Supabase CLI v2.122.0 tagged source: docker-ids.ts limits sanitized project IDs to 40 chars. container-lifecycle.ts attaches both com.supabase.cli.project and com.docker.compose.project to created containers and passes these to named volume creation. start-database.ts passes both labels to network creation. Historical FFH owner-host evidence observed the Compose label. This is not a substitute for installed CLI v2.122.0 metadata inspection per container/volume/network kind. Names alone do not prove ownership; source code allows reuse of an existing named network.

## Invariants and failure behavior

1. No remote Docker endpoint or hosted Supabase configuration. Immutable full SHA, clean checkout, explicit Gate A vs Gate B authorization and source manifests preserved.
2. Prior to first resource creation, exclusive lock, no stale journals/roots, no old named/labeled resource, verified local Docker daemon and protected FFH-RLS-Test inventory; persist precreation journal on local fixed disk outside disposable root.
3. Full SHA and whole cryptographically random 96-bit token are recorded. Project ID is 39 characters. Port pair is separately checked; race must fail without touching a preexisting listener. Actual Postgres mapping is pinned loopback-only.
4. Gate A PASS preserves DB and application receipt; Gate B is separately authorized on exactly the same run, SHA, ports, root and source hashes. Neither gate treats cleanup success as test PASS.
5. Save redacted evidence outside root before cleanup. If child/SQL/daemon/labels/journal/attachment/filesystem status cannot be proven, set CLEANUP_BLOCKED_MANUAL_REVIEW and stop.
6. Fresh inventory before each action. Graceful stop without force; exact owned container removal, unattached volume removal, isolated network removal, then bounded leaf-first root retirement; verify absence and protected baseline. Never prune, wildcard delete, Compose down, blindly retry, or remove FFH-RLS-Test.
7. Power/OS crash may interrupt finally. Stale-resource discovery must only block future runs for manual reconciliation; no guaranteed cleanup claim.

## Future owner-host procedures (not run in CI)

Gate A entrypoint:
powershell.exe -NoProfile -File scripts/rls-local/prepare-fresh-owner.ps1 -ExpectedHead <IMMUTABLE_SHA> -ExplicitAuthorization FFH-P01-FRESH-LOCAL-GO

Gate A prints RUN_TOKEN=<24hex>. FreshRoot is the current user profile direct child FFH-P01-RLS-Fresh-<sha12>-<token>. After successful Gate A, use separate authorization:

powershell.exe -NoProfile -File scripts/rls-local/run-owner.ps1 -ExpectedHead <SAME_SHA> -FreshRoot <SAME_FRESH_ROOT> -ExplicitAuthorization FFH-P01-RLS-EXECUTION-GO

Do not use these before a fresh independent security audit, true owner-host metadata confirmation and bounded authorized disposable dry run. Existing FFH-RLS-Test, historical source checkout, production data and unrelated resources are out of scope.

## Adversarial matrix (planned/covered by policy and WinPS mock source tests; see CI for actual outcomes)

AC-01 unique random token; AC-02 existing project/root; AC-03 occupied host port; AC-04 port bind race; AC-05 journal write failure; AC-06 partial network; AC-07 partial volume/container; AC-08 changed daemon; AC-09 missing/forged dual labels; AC-10 shared volume; AC-11 foreign network endpoint; AC-12 active SQL; AC-13 timeout/descendants; AC-14 failed graceful stop; AC-15 interrupted evidence writer; AC-16 wrong evidence destination; AC-17 ACL/reparse/path race; AC-18 crash during mutation; AC-19 Gate A PASS preservation; AC-20 Gate B FAIL remains FAIL after cleanup; AC-21 FFH-RLS-Test drift; AC-22 final exact absence.

**Security audit handoff:** Fresh independent read-only Auditor must freeze and review new immutable feature HEAD, exact source/AST/WinPS tests, process/SQL state, 15 migration source manifest, 913 matrix integrity, resource label per kind, port/network/FS races, crash recovery and protected baseline. FAST success alone is not security approval. No audit is claimed by Builder.

**Release hold:** PR #84 remains DRAFT/OPEN/UNMERGED. No automatic merge, protected-main or parent release mutation, production deploy, hosted SQL, spending or Private Beta. Formal release Gate A #6/B still require their own release evidence and authorization.
