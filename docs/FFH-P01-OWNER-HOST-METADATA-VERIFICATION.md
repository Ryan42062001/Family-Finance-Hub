# FFH-P01 #83 — Owner-host read-only metadata verification procedure

**Status:** PREPARED ONLY; no Owner-host authorization or execution. Use only after a separate bounded Manager/Owner read-only metadata GO. This is not formal Gate A #6, Gate B/913 or a destructive dry run.

## Pinned prerequisite evidence

- Repository: `Ryan42062001/Family-Finance-Hub`; draft PR #84; branch `feature/ffh-p01-automatic-test-cleanup`. The executing `-ExpectedHead` must be the separately approved **immutable full commit SHA**, not a moving branch name. The parent-release SHA remains `344c4c7ac1f46d8b1fd2d81b2b4a391cbd136983`.
- Owner-host Windows PowerShell 5.1, local fixed-disk profile and Docker Desktop Linux engine reachable **only** through `npipe:////./pipe/dockerDesktopLinuxEngine`; deny remote contexts and hosted DB configuration.
- Installed Supabase CLI version must be proven as exactly **2.122.0** with a read-only `--version` invocation of a *known, already-installed, trusted executable*. Do not use `npx --yes` during this read-only inventory because it may install/write a cache. If a trusted installed binary is absent, record **CLI_VERSION_UNVERIFIED** and stop. The inventory script deliberately does not claim version verification or execute npx.
- Freeze an immutable 40-character source SHA and the journal's exact 24-character run token. Preserve the protected `FFH-RLS-Test` baseline independently. Record ownership of any live disposable project before discussing changes.

## Future bounded execution (not currently authorized)

Run from an otherwise clean checkout of the approved SHA, with no hosted credentials in the environment:

```powershell
powershell.exe -NoProfile -NonInteractive -File .\scripts\rls-local\owner-host-metadata-inventory.ps1 `
  -ExpectedHead <APPROVED_FULL_40_HEX_SHA> `
  -RunToken <EXACT_24_HEX_JOURNAL_TOKEN> `
  -ExplicitAuthorization FFH-P01-READ-ONLY-METADATA-GO
```

The script uses only source/git checks and existing bounded, local Docker **read-only** operations: engine identity, `ps -a`, `volume ls`, `network ls` and exact-ID `inspect`. It emits sanitized JSON counts, dual-label inventory coverage, published loopback binding results, peer/mount counts and a SHA-256 fingerprint of the protected baseline. It does **not** output raw Docker IDs, usernames, mount paths, env variables, passwords, keys, connection URLs or SQL. Keep the raw operator receipt private; share only the redacted output and its SHA-256.

## Independent interpretation

A source-modeled label is not host evidence. Confirm by resource kind that both `com.supabase.cli.project` and `com.docker.compose.project` are present and exactly match the SHA/token-derived run namespace. Compare the named-resource namespace count with the dual-labeled exact-owned snapshot count. A mismatch blocks cleanup; **never** adopt an unlabeled resource based on a name alone. Inspect each container's exact 64-hex ID, locally bound ports, volume/bind mounts, and network peers against the durable journal before any future mutation. The JSON does not grant delete authorization and does not demonstrate idle PostgreSQL processes.

Only after a separate approval for a bounded isolated disposable host dry run, and an independent before/after baseline, may the runtime cleanup path be exercised. Nonzero/timeout SQL, lingering child processes, mutable daemon state, failed mount/ACL/reparse checks, a missing marker or interrupted root deletion must yield `CLEANUP_BLOCKED_MANUAL_REVIEW`; never infer `CLEANUP_VERIFIED`. No formal Owner-host Gate A #6 or Gate B/913 is authorized by this procedure.
