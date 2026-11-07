# FFH-P01 #83 — consolidated native Preflight forensic delta

**Boundary:** isolated source/real Windows GitHub-hosted synthetic CI only; NO owner-host Plan retry, no Docker/SQL, no native Retire on owner host, no Stage 2/3, no Gate A/B/913, no merge. Owner approval for the one Stage 1 Plan at `9fc9859c75ab5b4870b1bb509aa771ff3273f43a` is CONSUMED.

## Source-backed defect; unconfirmed host diagnosis

The frozen C# `Preflight` calls `Execute(..., false)`, but `Scan` formerly called `OpenPath(child, true, false)` for *every* child. `OpenPath` requests Win32 `READ | DELETE` for `delete=true` and `FILE_SHARE_READ` only. This causes a read-only Preflight to demand DELETE access on each child. A legitimate read-only existing reader that does not share DELETE may therefore reject `CreateFileW` with Win32 32; an allow-only ACL withholding DELETE may reject with Win32 5. These are source-backed hypotheses for the real owner-host generic NATIVE_PREFLIGHT failure, NOT a proven host root cause.

The scanner now receives the operation mode from `Execute`. Only `Preflight` opens children READ-only. Destructive `Retire` still requests DELETE on the root and every manifest-approved child before any disposition. Both retain `FILE_SHARE_READ` (deny concurrent WRITERS/DELETERS), `FILE_FLAG_BACKUP_SEMANTICS|OPEN_REPARSE_POINT`, full held-handle object ID and volume checks, ACL allowed-principal/owner protection, reparse/hardlink exclusion, strict canonical manifest, exactly 15 SHA-pinned migrations, cache kind/length/digest and extra-child rejection. Neither production `Inspect` nor `Preflight` invokes `DisposeExact`.

## Controlled Windows matrix

- FS-01..28 remain intact, including destructive positive synthetic retirement, foreign file/dir protection, ACL, reparse, hardlink, wrong/missing hash, missing entry, all 15 canonical migrations, exact recovery-only notifier cache, 128-MiB cache cap, cache change between preflight and retirement.
- FS-29: concurrent existing READ/ShareRead handle, read-only `Preflight=PREFLIGHT_OK`; `Retire=BLOCKED_ROOT_OPEN_32`, disposition count zero.
- FS-30: READ/ShareReadWrite (no DELETE share), same read-only success/destructive refusal.
- FS-31: held WRITE handle with ShareReadWriteDelete is rejected by read-only preflight: `OPEN_32`, zero dispositions.
- FS-32: exclusive held READ handle still blocks preflight: `OPEN_32`, zero dispositions.
- FS-33: protected, allow-only owner READ/EXECUTE ACL on parent + config (neither grants DELETE/DELETE_CHILD) permits read-only preflight; destructive Retire refuses `OPEN_5`, zero dispositions; exact original ACLs restored in test-owned fixture.
- FS-34: foreign ACE causes `ACL_FOREIGN` during read-only preflight; zero dispositions.
- FS-35: absent required immutable canonical migration entry causes `MANIFEST_INCOMPLETE` during read-only preflight; zero dispositions.
- STG-01..35 remain genuine `powershell.exe -File` CI synthetic production entry cases. STG-26 now expects fixed `NATIVE_MANIFEST_HASH_REJECTED` for nested native manifest-hash failure. STG-36 verifies COMPLETE with a concurrent READ/ShareRead handle and no mutations; STG-37 verifies a no-sharing handle produces the fixed `NATIVE_OPEN_SHARING_REJECTED` with no mutations. Each checks the same full-path evidence snapshot before and after, and independent 15-migration/hash receipts.
- WinPS5.1 failure classification inspects at most 8 levels of native-stage nested exceptions; only exact, source-enumerated `InvalidOperationException` messages map to fixed allowed categories. Unknown messages/streams/paths never print. Unrecognized errors fail closed and remain generic; no category is authorization.

## Remaining uncertainty and future security review

The owner-host result exposes only `NATIVE_PREFLIGHT / UNEXPECTED_VERIFICATION_FAILURE`; NO actual Win32 error or native exception is available. These CI fixtures cannot prove that this was the owner-host root cause, nor cover the host's specific third-party security software/ACL/reparse/handle state. Any *future* Owner-host READ-ONLY attempt requires one fresh explicit owner approval following a fresh independent exact-head source audit PASS. No prior approval may be reused. Parent PR #81, protected main and owner evidence/ledger remain untouched. Formal gates, SQL idle checks, retirement and cleanup remain BLOCKED.
