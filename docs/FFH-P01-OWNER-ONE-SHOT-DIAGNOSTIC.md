# FFH-P01 #83 — one disposable owner-host diagnostic (not formal Gate A/B)

**Authority:** [Manager/Owner one-run GO](https://github.com/Ryan42062001/Family-Finance-Hub/pull/84#issuecomment-6687625657); [Issue #83](https://github.com/Ryan42062001/Family-Finance-Hub/issues/83#issuecomment-6687635138). New source must first obtain its **own focused independent source/security audit PASS at the exact SHA** before executing on the Windows owner laptop. This file is operator procedure, not permission to run a formal database test.

## Isolation and guarantees

- ONLY `scripts/rls-local/owner-disposable-diagnostic.ps1` is in scope. **NEVER** invoke `prepare-fresh-owner.ps1`, `run-owner.ps1`, `supabase stop`, `supabase db reset`, a Docker prune, or manual file-tree deletion for this diagnostic.
- Run from the separate clean `%USERPROFILE%\Family-Finance-Hub-P01-Audit` checkout **detached at the audited full SHA**. Do not change the original project checkout, the linked Supabase project, any legacy `FFH-RLS-Test` container, volume or network, main or the parent branch.
- `Plan` checks exact-SHA clean Git source, no hosted link or remote env, pinned local daemon, existing protected baseline, empty disposable namespace and absence of prior attempts. It does not create a root, journal, or Docker resource. Its randomly proposed token/ports are illustrative; `Run` independently rechecks and allocates fresh identity/ports.
- CLI must be a **preexisting extracted `supabase.exe`** under the user's npm `_npx\...\node_modules\supabase\bin` cache, with exact `package.json` version 2.122.0, exact bounded `--version` response, no reparse path, and **operator-pinned SHA-256 from Plan to Run**. No `npx`, `npm install`, or package updates are invoked. If the path is not found or multiple candidates exist, pass an explicit cached `-CliExecutable` path; do not download one merely for this diagnostic.
- Durable `%USERPROFILE%\FFH-P01-RLS-Evidence` contains an exclusive lock, SHA/token-bound creation journal, immutable one-shot consumption marker and redacted TEST/FINAL receipts. This is **not** a reusable work directory.
- `Run` creates an unpredictable 96-bit token project `ffhp1_<SHA-prefix>_<token>`, a direct-child profile root `FFH-P01-RLS-Fresh-<SHA-prefix>_<token>`, dynamic isolated loopback DB and shadow ports, the canonical 15 SHA-256-proven migration **file copies only**, a deterministic DB-only `config.toml`, an exact owned marker and journaled creation receipt. Copying migration files is not migration reset or the formal preflight.
- Only one local CLI command is run: **`supabase db start`**, inside a bounded Windows Job Object. The diagnostic does **not** run migrations explicitly, `db reset`, formal SQL matrix/preflight, hosted SQL, or Gate A/B transitions. The command may itself perform CLI-defined internal DB setup; this must not be misrepresented as a formal Gate.
- On startup success, independently verify daemon ID, full 64-character container ID, **both real Supabase and Compose labels for each resource kind**, resource count, exact names, local volume driver, network bridge, all container mounts, attached volumes and network peers, live healthy DB and strictly `127.0.0.1`/`::1` DB port 5432 bindings. Confirm no other published ports and stable protected `FFH-RLS-Test` inventory.
- Before any Docker stop/rm, require two successful, independent read-only PostgreSQL client-activity count checks against the **exact verified diagnostic DB ID**; any nonzero, timeout or ambiguous query blocks. Do not counterfeit a Gate A/B SQL admission or COMPLETE receipt. Stop and remove **only** exact journaled and separately reattested new container, volume and network IDs, in that order. Require durable IN_FLIGHT, no blind retry, exact kind-specific absence and protected inventory preservation.
- Root retirement invokes the audited Windows handle-held exhaustive file permit preflight before Docker mutation, then exact C# Retire after Docker resources are absent. Every migration hash, config, marker and creation receipt must match, and `.temp` may be **empty only**. Any unmanifested CLI-generated file, foreign object, ACL/reparse/hardlink, identity drift or unclear state ⇒ **CLEANUP_BLOCKED_MANUAL_REVIEW**, never wildcard cleanup or false verified status.
- `TEST_RESULT` and `CLEANUP_RESULT` are independent. A failed cleanup cannot convert a test into PASS or claim CLEANUP_VERIFIED. Crash/exception/interrupted stop or delete leaves the one-shot permanently consumed and requires manual independent inspection, not an automatic second invocation.

## Operator steps (only after exact-head independent audit PASS)

In a native Windows PowerShell 5.1 session:

```powershell
$repo = Join-Path $env:USERPROFILE 'Family-Finance-Hub-P01-Audit'
git -C $repo fetch origin feature/ffh-p01-automatic-test-cleanup
git -C $repo checkout --detach <FINAL_AUDITED_40_HEX_SHA>
Set-Location $repo
git status --short
$sha = (git rev-parse HEAD).Trim()
$entry = Join-Path $repo 'scripts\rls-local\owner-disposable-diagnostic.ps1'
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $entry -Mode Plan -ExpectedHead $sha
```

Each invocation must start in a **fresh Windows PowerShell 5.1 process**; an already-loaded native Job Object type is rejected. Record the **full 64-character `CLI_SHA256=`** printed by Plan locally. Then make exactly one deliberate invocation:

```powershell
$cliHash = '<COPY_64_HEX_CLI_SHA256_FROM_PLAN>'
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $entry -Mode Run -ExpectedHead $sha -CliSha256 $cliHash -ExplicitAuthorization FFH-P01-ONE-SHOT-DIAGNOSTIC-GO
```

If Plan reports **multiple/missing cached CLIs**, first locate an already present exact binary read-only, for example under `$env:LOCALAPPDATA\npm-cache\_npx\...\node_modules\supabase\bin\supabase.exe`, and repeat Plan with `-CliExecutable '<FULL_EXISTING_CACHED_EXE_PATH>'`. Pass the same `-CliExecutable` and printed SHA in Run. Do not use a `npx --yes` wrapper or select the first executable from arbitrary PATH.

## Expected reporting

**Full success:** `DIAG_RESULT=PASS TEST_RESULT=PASS CLEANUP_RESULT=CLEANUP_VERIFIED`, no new project-labelled/named resources, root absent by native probe, original protected inventory unchanged. Gate A and B remain NOT_STARTED; FULL PHASE remains SKIPPED.

**Any blocked/uncertain operation:** `DIAG_RESULT=BLOCKED TEST_RESULT=UNKNOWN CLEANUP_RESULT=CLEANUP_BLOCKED_MANUAL_REVIEW` (or `UNKNOWN_JOURNAL_UNVERIFIED` when no durable terminal receipt can be read). **Do not retry**. Preserve the new disposable root, Docker resources and private journal for independent inspection; do not run `supabase stop`, unverified `docker rm`, or `Remove-Item -Recurse` to compensate. Send only redacted states and exact feature SHA to the Manager—not private Docker inspect bodies, secrets or tokens stored in host files.

The Owner authorized one actual diagnostic; this doc does **not** authorize executing it from ChatGPT or GitHub, formal Gate A #6 / Gate B 913, FULL PHASE, hosted/production changes, spending, merges or `FFH-RLS-Test` changes.
