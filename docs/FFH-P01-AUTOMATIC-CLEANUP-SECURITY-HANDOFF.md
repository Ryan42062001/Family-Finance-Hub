# FFH-P01 #83 — Automatic Test Cleanup security handoff

**Role:** SAME Primary Builder. **PR:** #84 DRAFT/OPEN/UNMERGED. **Branch:** feature/ffh-p01-automatic-test-cleanup. **Source GO:** Issue #83 comment 6552557643; PR #84 comment 6552559497. **Risk:** HIGH. Source and mock tests do not certify safe owner-host Docker deletion.

## Implementation inventory

- scripts/rls-local/automatic-cleanup.ps1 — cryptographic 96-bit run token, 39-character project ID ffhp1_<sha8>_<token24>, direct-child Windows fixed-drive profile root, exclusive lifecycle lock, outside-root durable JSON journal, unique host port pair, pinned local Docker metadata, dual labels, redacted evidence.
- scripts/rls-local/cleanup-executor.ps1 — precreation namespace and FFH-RLS-Test baseline verification, exact resource ID/mount/attachment validation, read-only SQL idle attestation, bounded exact native Docker Job Object actions, post-action absence proof, explicit ROOT RETAINED / manual review until handle-bound deletion is proven, fail-closed manual review.
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
6. Fresh inventory before each action. Graceful stop without force; exact owned container removal, unattached volume removal, isolated network removal, then **verify the exact disposable root is absent**; if it exists, RETAIN it and return CLEANUP_BLOCKED_MANUAL_REVIEW. No path-based deletion is authorized. Verify protected baseline after Docker actions. Never prune, wildcard delete, Compose down, blindly retry, or remove FFH-RLS-Test.
7. Power/OS crash may interrupt finally. Stale-resource discovery must only block future runs for manual reconciliation; no guaranteed cleanup claim.

## Future owner-host procedures (not run in CI)

Gate A entrypoint:
powershell.exe -NoProfile -File scripts/rls-local/prepare-fresh-owner.ps1 -ExpectedHead <IMMUTABLE_SHA> -ExplicitAuthorization FFH-P01-FRESH-LOCAL-GO

Gate A prints RUN_TOKEN=<24hex>. FreshRoot is the current user profile direct child FFH-P01-RLS-Fresh-<sha12>-<token>. After successful Gate A, use separate authorization:

powershell.exe -NoProfile -File scripts/rls-local/run-owner.ps1 -ExpectedHead <SAME_SHA> -FreshRoot <SAME_FRESH_ROOT> -ExplicitAuthorization FFH-P01-RLS-EXECUTION-GO

Do not use these before a fresh independent security audit, true owner-host metadata confirmation and bounded authorized disposable dry run. Existing FFH-RLS-Test, historical source checkout, production data and unrelated resources are out of scope.

## Adversarial matrix (22 executable synthetic WinPS 5.1 scenarios; exact-head CI required)

AC-01 unique random token; AC-02 existing project/root; AC-03 occupied host port; AC-04 port bind race; AC-05 journal write failure; AC-06 partial network; AC-07 partial volume/container; AC-08 changed daemon; AC-09 missing/forged dual labels; AC-10 shared volume; AC-11 foreign network endpoint; AC-12 active SQL; AC-13 timeout/descendants; AC-14 failed graceful stop; AC-15 interrupted evidence writer; AC-16 wrong evidence destination; AC-17 ACL/reparse/path race; AC-18 crash during mutation; AC-19 Gate A PASS preservation; AC-20 Gate B FAIL remains FAIL after cleanup; AC-21 FFH-RLS-Test drift; AC-22 final exact absence.

**Security audit handoff:** Fresh independent read-only Auditor must freeze and review new immutable feature HEAD, exact source/AST/WinPS tests, process/SQL state, 15 migration source manifest, 913 matrix integrity, resource label per kind, port/network/FS races, crash recovery and protected baseline. FAST success alone is not security approval. No audit is claimed by Builder.

**Release hold:** PR #84 remains DRAFT/OPEN/UNMERGED. No automatic merge, protected-main or parent release mutation, production deploy, hosted SQL, spending or Private Beta. Formal release Gate A #6/B still require their own release evidence and authorization.


## Independent auditor FAIL remediation — binding Manager comment 6567878720

Frozen failed-audit SHA: 5741b950eefc98672272a86738b90441a496b396. Six defects RLS-AC-01..06 and two low findings must be re-audited independently at a NEW immutable feature SHA. No older FAST/Auditor result certifies newer code.

- **RLS-AC-01 (HIGH):** Version 2 journal has separate gateAResult, gateBResult and cleanupResult. Older version 1 journals fail closed on read. Gate B transitions its own result to RUNNING before any Gate B SQL. Gate B PASS/FAIL is durably recorded independent of Gate A PASS, with redacted Gate B receipt before safe cleanup attempts. Gate A PASS is immutable; Gate B error catch cannot silently reuse it. If Gate B evidence/inventory/idle proofs fail, preserve results and set manual review, no unsafe deletion.
- **RLS-AC-02 (MEDIUM):** Gate B exit must pass Assert-FfhGateBSuccessfulExit. It requires both durable Gate B PASS and cleanup VERIFIED. Three native WinPS process-exit fixtures distinguish PASS/PASS (zero), PASS/BLOCKED (nonzero), FAIL/PASS (nonzero). The Gate B caller throws on cleanup uncertainty rather than returning a false success.
- **RLS-AC-03 (MEDIUM):** Assert-FfhExactInventory enforces both directions of complete one-to-one resource ID+name+kind correspondence, per-kind and total counts, dual labels, mounts, shared volumes and peer network endpoints before EVERY exact mutation. Any missing journal resource blocks BEFORE further destruction. No best-effort deletion.
- **RLS-AC-04 (MEDIUM):** Test-FfhVerifiedRootAbsent checks the full source SHA + random token, exact root basename and direct Windows profile parent BEFORE testing absence. A genuine absent root with zero independently verified resources can be CLEANUP_VERIFIED; never call reparse validation on a nonexistent root. Verify absence twice.
- **RLS-AC-05 (MEDIUM, intentional safe fallback):** **Automatic root deletion is DISABLED.** A Windows filesystem root that exists is RETAINED because path-based Get-ChildItem/Remove-Item cannot be certified safe against junction/reparse swaps. Exact Docker deletion can finish, but CLEANUP_RESULT becomes BLOCKED_MANUAL_REVIEW until a separately approved, handle-bound retirement exists. No false CLEANUP_VERIFIED. Owner-host manual retirement remains separately gated.
- **RLS-AC-06 (MEDIUM):** tests/security/fixtures/ffh-p01-integrated-22.ps1 invokes real lifecycle/journal/registration/cleanup/finalizer functions using a fake Docker protocol, fake root identity and an ACL-protected temporary evidence fixture. tests/security/ffh-p01-integrated-22.test.ts requires all 22 distinct AC-01..22 PASS receipts; tests/security/ffh-p01-gate-exit.test.ts checks actual WinPS exit code combinations. These are offline fake-adapter/integration tests only; they do not invoke production owner entrypoints or certify the owner's Docker/SQL metadata.
- **LOW:** Primary allocator rejects values above 59998 so shadow is <=59999; evidence directory and journal/receipt files are required to have the current-user owner, protected DACL and only current-user/SYSTEM/Administrators allowed principals before access.

**Security caveats:** Ordinary Windows test fixtures and source-guard AST checks do not prove real Docker attachment metadata, process tree/SQL idle states, or safe host-bound journal durability. Filesystem retirement remains a specifically documented HIGH-risk operational limitation. Parent FFH-P01 remains HIGH/BLOCKED and no feature activation is authorized.


## Second independent FAIL remediation — Manager comment 6568589297

**Failed audit target:** 811b80974a9300ac426872f4bfbed862f9c39bd0. **Risk:** HIGH. All updates below require a new frozen exact feature SHA, executed Windows FAST and fresh independent review. This section describes proposed behavior present in feature source, not Owner-host certification.

- **RLS-AC-07 HIGH — real SQL runner:** The production Invoke-FfhOwnedLocalPsql in source-provenance.ps1 now requires explicit immutable Identity plus a full 64-hex ContainerId and re-reads the durable version-2 journal. It validates full source SHA, 24-hex run token, canonical 39-character ffhp1 project, exact /supabase_db_ffhp1... container journal record and verified Docker executable/Linux npipe, then invokes Assert-FfhJournaledSqlAdmission both on entry and immediately before native job creation. The bounded Job Object receives docker exec -i <verified-container-ID> rather than a mutable name. Neither preflight.sql nor matrix.sql hashes/markers/rollback requirements were changed.
- **RLS-AC-08 MEDIUM — production owner admission:** Both Gate B preflight and matrix, and the Gate A preflight, explicitly call Assert-FfhJournaledSqlAdmission. The shared read-only guard verifies the actual v2 SHA/token/root/CLI-version journal, Gate phase, 64-hex immutable container ID, exact full resource-kind bijection, both project labels, daemon fingerprint, legacy FFH-RLS-Test baseline, mounts/volume references/network endpoints, Running/healthy state and live Docker inspect 5432/tcp loopback host-port mapping to the preserved journal port. It repeats daemon/baseline checks, and the real runner repeats admission again before launch. Same-name/same-port ID swaps, foreign endpoint/labels and wrong/nonlocal post-bind mappings must generate ZERO native SQL calls.
- **RLS-AC-06 REMAINING:** The original twenty-two synthetic WinPS5.1 adversarial scenarios remain mandatory. Their AC-22 fixture also checks complete stop/container rm/volume rm/network rm vectors and exact resource IDs. New tests/security/fixtures/ffh-p01-native-sql-identity.ps1 invokes the REAL production SQL function with a fake read-only Docker protocol and a stub native Job Object boundary. It verifies exact preflight and matrix command vectors, authorized Gate A, denial of old/foreign/malformed names, wrong token/SHA/ID, substituted same-name ID, wrong Compose label, changed daemon, foreign network, incorrect/nonloopback ports, unhealthy DB and remote binding. The owner scripts' immutable admission call locations are separately source-checked. None of this executes real SQL.
- **RLS-AC-09 LOW — final statuses:** After blocked or interrupted evidence/cleanup paths, owner catch blocks call Get-FfhDurableRunStatus, which reopens the protected version-2 journal and reports actual Gate A, Gate B, cleanup statuses. If the journal is torn/unreadable, it emits explicit UNKNOWN_JOURNAL_UNVERIFIED, not stale cached values. WinPS tests exercise Gate A PASS evidence interruption, Gate B PASS evidence interruption, cleanup blocked and torn journal.
- **FILESYSTEM ROOT SAFE FALLBACK:** Keep path-based auto-deletion disabled. An existing disposable root is retained and CLEANUP_BLOCKED_MANUAL_REVIEW is required; a successful exact Docker cleanup does not imply filesystem cleanup success. This is a material outstanding automation limitation.

### Future separately auditable safe root-retirement path — NOT implemented or authorized

A future Windows-specific retire-only operation should hold a trusted handle to the verified fixed-volume user profile and open each immediate child with CreateFileW + FILE_FLAG_OPEN_REPARSE_POINT / FILE_FLAG_BACKUP_SEMANTICS, verify FileIdInfo/FileBasicInfo, volume serial, owner SID, protected DACL, no reparse/junction type, and the exact journal-bound source SHA/root name. Directory traversal must retain handles and use handle-relative identities, not a path re-resolved between a check and Remove-Item. Removal should use handle-bound Windows file disposition, only after a durable mutation-intent record and complete verified Docker/SQL absence. Crash re-entry must perform independent read-only reconciliation and block ambiguous outcomes. Verify the final directory absence through the trusted parent handle; re-read protected FFH-RLS-Test baseline and outside-root evidence. Require synthetic race/fault injection and independently authorized bounded Owner-host disposable proof before enabling this feature. If these properties cannot be demonstrated on WinPS5.1, retain the root for a separately controlled manual retirement.

**Explicit HOLD:** No owner-host dry run, formal Gate A #6/Gate B 913, real cleanup against either audited FAIL SHA, Docker pruning, parent/main update, production/hosted SQL, merge, spending or Private Beta. Canonical FAST green and a new immutable independent audit are still necessary before any activation.


## Third independent FAIL remediation — RLS-AC-10, AC-08 residual, AC-06 and AC-09

Manager authority: PR #84 comment 6621805888. Failed SHA: 2790ada7614920bf11dbb66be4a1ef120e5d8cab. This section documents source behavior, not Owner-host proof. A new exact feature SHA requires its own FAST and independent audit.

### Per-phase SQL execution boundary

The version-2 journal now durably records sqlBoundary, including full source SHA, 96-bit run token, daemon, precise 64-hex Docker container ID, Gate A/B phase, Preflight/Matrix mode, and status. Normal sequence is NOT_STARTED, PENDING, ADMITTED, EXECUTING, COMPLETE. ADMITTED follows complete journal/ownership/health/localhost-port proof; EXECUTING is recorded by the actual production SQL runner only after its final re-attestation and before the owned native Job Object launches; COMPLETE is recorded only following exact EXIT_ZERO, required marker/rollback/zero-residue checks and safe source/daemon environment.

The real Gate A and Gate B exception paths distinguish admission rejection/uncertainty from a durably completed client and later test failure. Rejected or indeterminate admission must durably become manual review / Gate UNKNOWN / CLEANUP_BLOCKED_MANUAL_REVIEW, exit nonzero, issue zero SQL calls (including pg_stat_activity), and invoke zero destructive Docker commands. A journaled EXECUTING phase without COMPLETE does not prove the client tree or daemon is safe and cannot authorize an idle probe or automatic retirement.

Get-FfhSqlIdleAttestation now obtains a fresh complete version-2 journal, exact resource-kind bijection, dual project labels, immutable container ID, preserved daemon, network peers, mounts/volume attachments, current DB health and localhost port and FFH-RLS-Test baseline before sending any SQL. Every permitted pg_stat_activity query executes through docker exec -i using the verified full 64-hex ID, never the mutable name. It repeats ownership admission just before the query and before each individually verified deletion. Following journal-confirmed exact container deletion during CLEANUP_RUNNING, fresh absence and resource-inventory proof can permit isolated volume/network retirement with no further SQL. Unexpectedly missing containers at any earlier stage remain blocking.

Get-FfhDurableRunStatus can report explicit OUTCOME_UNKNOWN / TERMINAL_STATE_PERSISTENCE_FAILED if the MANUAL_REVIEW journal write fails after evidence interruption or after an earlier durable PASS. The previous readable preservation receipt is never presented as a successful terminal result; actual committed results are not falsely overwritten.

### Executed offline controls and residual limits

The original 22-case Windows PowerShell synthetic fixture is preserved and extended with exact stop/container rm/volume rm/network rm vectors and read-only immutable-ID SQL-idle vector assertions. A new WinPS owner-admission-catch fixture executes actual Gate A and Gate B admission/catch source under seven fault classes at Gate A preflight and both Gate B preflight/matrix boundaries: changing host port, non-loopback publishing, unhealthy DB, substituted container ID, bad dual label, daemon drift and protected-baseline drift. It asserts no SQL after rejected admission, no cleanup-idle queries, no Docker deletion, independent Gate statuses, and failure-to-persist terminal status with an older readable journal. The original production SQL validator fixture also executes with a fake native Job Object and Docker metadata without real SQL.

AC-05 root-retention safety fallback remains unchanged: an existing disposable Windows root is NEVER removed by unverified path-based deletion, and the result stays CLEANUP_BLOCKED_MANUAL_REVIEW. This means complete hands-free filesystem cleanup is NOT implemented. Handle-bound Windows identity/ACL/reparse-safe retirement requires a separately auditable future implementation and bounded Owner-host validation.

The source/test fixtures are offline synthetic only. They do not verify the actual Owner-host Supabase CLI 2.122.0 Docker metadata, real PostgreSQL sessions, or filesystem races. No formal Gate A #6, Gate B/913, FULL PHASE, Owner-host destructive run, PR merge, parent/main mutation, production/hosted SQL, spending, Private Beta or deletion of FFH-RLS-Test is authorized. New immutable SHA, exact-head FAST and fresh independent audit are mandatory before any activation.


## New bounded root-retirement candidate — independent re-audit requested

After the Manager 2026-11-03 GO (PR #84 comment 6622575068), the original manual-folder-retirement limitation is addressed in source by `ffh-owned-root-retire.cs` (Win32 handle-held, OPEN_REPARSE_POINT, file-ID, same-volume, strict ACL and hard-link checks), `Initialize-FfhOwnedRoot`, `Assert-FfhOwnedRootPreflight`, and post-Docker `Invoke-FfhOwnedRootRetirement`. Marker binds full source SHA, full 96-bit token and 39-character project; immutable root filesystem identity and an IN_FLIGHT/ABSENT_VERIFIED receipt live outside the disposable folder. A crash in deletion intentionally blocks retries. A completed run is admitted again only if its exact prior root is absent.

Windows CI must confirm parser, 28 mock lifecycle receipts, and 6 native ephemeral-root filesystem receipts. This source-only validation is not Owner-host activation. Independent auditor: freeze the current exact PR #84 head **at audit time**, inspect changed cleanup/root code and the focused Windows receipts, and decide PASS/FAIL for source safety. In particular scrutinize Win32 sharing/disposition semantics, root ACL inheritance, race protection and irrecoverable root replacement. Do not re-open previously passed unrelated source controls unless this diff impacts them. Pending actual Owner-host dry run, all runtime claims remain UNVERIFIED.

Read-only future metadata procedure: `docs/FFH-P01-OWNER-HOST-METADATA-VERIFICATION.md` and `scripts/rls-local/owner-host-metadata-inventory.ps1`. Neither may be run on the Owner host without its own GO. No merge, main/parent mutation, formal Gate A #6/Gate B/913, hosted SQL, destructive dry run, spend, or Private Beta authorized.
