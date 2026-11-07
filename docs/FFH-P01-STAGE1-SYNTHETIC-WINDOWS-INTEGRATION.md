# FFH-P01 #83 — consolidated Stage 1 full-entry Windows integration

## Provenance and boundary

This matrix describes the **production** `owner-disposable-recovery-plan.ps1` call graph, executed via actual `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File` on an **ephemeral GitHub-hosted Windows runner**. It is not an Owner-host read-only Plan, not a valid host Stage 1 forensic receipt and never grants SQL or cleanup permission.

The actual source script, its arguments parser, stage telemetry, inherited modules, journal and ACL readers, cache reader, Git checkout integrity, cross-SHA provenance comparison, native `FfhP01OwnedRoot` C# type, `Inspect` and `Preflight`, terminal reread and exact one-line output contract are retained. The only simulation is a clearly labelled, read-only Docker metadata adapter for the Windows runner, which has no real Owner Docker Desktop engine. Every synthetic COMPLETE line includes `INTEGRATION_SCOPE=CI_SYNTHETIC_ONLY`, which **cannot match the original Owner-host COMPLETE receipt format**.

The CI-only adapter is loaded after the production module imports when a ticket under `RUNNER_TEMP`, a clean detached checkout physically under the disposable runner's UserProfile, and the GitHub Windows runner flags all match. The ticket pins the **actual** checkout HEAD. The test creates the isolated, known-path evidence directory and disposable root only if completely absent and removes only its self-created fixture objects after all children exit. No Owner paths, Docker daemon, SQL, hosted APIs or protected `FFH-RLS-Test` resources are touched. Synthetic privileged env flags are not security attestations by themselves, and a local impersonation of CI could yield only an explicitly marked synthetic result; the final auditor must assess this separation.

For source checks, the CI checkout is full-depth so the unchanged historical `cba20f7fecea8b7dfdbcb10fb245765825ef97c0` source-provenance Git blob and **15 immutable migration blobs** can be compared to the new exact HEAD by the real production function. The test creates the genuine root marker with protected ACL, exact config bytes, a 15-migration copy tree, source receipt, 96-byte-limited `supabase/.temp/cli-latest`, consumed sequence-11 journal, one-shot consumed ledger and failed FINAL receipt, and asks the original native C# code to identify the physical root file ID. Each child invocation is checked for zero content/timestamp changes to the held journal/ledger/FINAL/cache/root-fixture sentinel files and stable evidence/root namespace listings.

## Actual stage-by-stage evidence matrix

Each `STG-nn` is a genuine child **-File** process with its own exit code and single bounded stdout record; Docker replies are synthetic. `PASS` means actual checks execute under the CI fixture, not that the Owner host is proven safe. `FAIL_INJECTED` means deliberate safe synthetic fault was rejected at the expected stage. `NOT_TESTABLE` means no truthful full-process failure proof without unsafe state modification or bypassing source checks.

| Production stage | Positive path | Injected failure / evidence | Authentic vs simulated |
|---|---|---|---|
| INITIALIZATION | PASS | NOT_TESTABLE: pre-entry interpreter failure; existing AR controls | Actual script |
| ARGUMENTS | PASS | Existing actual `-File` AR-01..21 malformed input | Actual bounded parser |
| MODULE_IMPORT | PASS | STG-34: CI-only module-adapter load failure | Actual tracked production modules; injected adapter |
| CONSUMED_HEAD | PASS | STG-02: wrong immutable consumed head | Actual source |
| ENVIRONMENT | PASS | STG-03: injected DATABASE_URL | Actual environment guard; synthetic Docker endpoint only |
| SOURCE_CHECKOUT | PASS | STG-04: wrong audited head | Actual clean worktree / Git hashed files |
| CHECKOUT_SCOPE | PASS | NOT_TESTABLE as a separate negative with verified Git/entry and fixed approved directory | Actual profile path equality/reparse |
| RUN_IDENTITY | PASS | Existing malformed token AR cases; no separate post-parser fake identity | Actual source SHA/token/project |
| EXISTING_EVIDENCE | PASS | NOT_TESTABLE as independent negative without relocating root while native identity held; early missing-evidence checks covered elsewhere | Actual existing-only root/evidence check |
| JOURNAL_READ | PASS | STG-05 missing JSON | Actual private ACL + FileMode.Open |
| TERMINAL_STATE | PASS | STG-06 sequence, STG-07 old volume suffix, STG-08 consumed ledger, STG-09 FINAL, STG-32 duplicated kind | Actual terminal journal/ledger/receipt contract |
| CACHE_APPROVAL | PASS | STG-10 unaudited operator pin rejected | Actual source-immutable pin gate |
| CACHE_INSPECTION | PASS | STG-11 untrusted content, STG-12 97-byte size, STG-13 foreign child | Actual 97-byte ceiling, file handle and stable hash |
| DOCKER_INVENTORY | PASS | STG-14..21, STG-27, STG-29..31: daemon, labels, unlabeled global extra, IDs, mounts, consumers, peers, network binding, stream sanitization and baseline drift | Actual full production validators with **synthetic Docker metadata**, CLI v2.122.0 C/V same-name |
| DATABASE_HEALTH | PASS | STG-22 unhealthy, STG-23 nonlocal DB host port | Actual validator with synthetic state/ports JSON |
| PROTECTED_BASELINE | PASS | STG-35 late protected baseline drift | Actual validator with synthetic global namespace |
| CROSS_SHA_PERMIT | PASS | STG-24 invalid receipt digest; historical Git object comparisons genuine | Actual Git + complete SHA-256 manifest construction |
| NATIVE_LOAD | PASS | NOT_TESTABLE separately without corrupting signed/tracked C# source | Actual immutable native source + Add-Type |
| NATIVE_INSPECT | PASS | STG-25 wrong but format-valid root file ID | Actual C# Windows held-handle root marker/ACL |
| NATIVE_PREFLIGHT | PASS | STG-26 tampered test-only config, native manifest hash failure | Actual C# read-only tree and file/ACL/ID verification; no Retire |
| TERMINAL_REREAD | PASS | NOT_TESTABLE: genuine concurrent destructive race disallowed; original second read executed | Actual existing-only journal read |
| TERMINAL_RECEIPTS | PASS | NOT_TESTABLE separate *midflight* change; prior terminal ledger/FINAL mutations STG-08/09 rejected | Actual complete terminal validator and JSON equality |
| COMPLETE | PASS | STG-01, STG-28 happy receipt (marked synthetic) | Actual program flow, synthetic Docker only |
| OUTPUT_CONTRACT | PASS | STG-33 two-output private-looking injection yields one sanitized BLOCKED record | Actual bounded one-record outer wrapper |

## Receipt catalogue

- **STG-01 / STG-28:** full original Stage 1 COMPLETE; native Inspect and Preflight PASS; cache status `CACHE_OBSERVED_UNPINNED`, `EXACT_DOCKER_IDENTITY=VERIFIED`, source+ledger unchanged, first failure UNKNOWN, SQL not authorized, deletion blocked; explicit `CI_SYNTHETIC_ONLY`.
- **STG-02..13:** wrong original consumed head, ambient DB env, wrong audit source head, missing journal, sequence drift, obsolete `_data` volume, consumed ledger/FINAL drift, unapproved cache SHA, private-shaped cache content, 97-byte cache and foreign `.temp` child.
- **STG-14..23:** wrong daemon, dual ownership label mismatch, hidden unlabeled resource, forged immutable C ID, foreign mount, foreign volume consumer, foreign network peer, unsafe bridge bind, unhealthy DB and nonlocal published PostgreSQL port.
- **STG-24..26:** invalid cross-SHA source permit, native file ID mismatch and native tree/manifest drift.
- **STG-27..35:** warning/info/error-stream secret suppression, second COMPLETE, synthetic protected baseline drift, forged network ID, extra legacy volume name, duplicate journal volume kind, outer strict output contract, guarded module import fault and late baseline drift.

## Controls retained and hard holds

The separate fast security suite still exercises KI-01..25, RC-01..57, JR-01..08, AR-01..21, native FS-27/28, real localhost PORT-01..05, all existing SQL/Docker admission and one-shot terminal controls. Nonproduction FAST runs release 18/18, ordinary 980/980, security >=208/208, dedicated full-entry integration, typecheck and lint, but **FULL PHASE remains SKIPPED**.

The test's synthetic Docker environment is **not** a check of the Owner's actual daemon, labels, drivers, mounts, consumers, peers, bridge settings, port bindings, PostgreSQL health, native ACL state or active SQL clients. No Stage 2 SQL-idle verification or Stage 3 destructive cleanup is simulated as Owner authority. All Owner-host authorizations (original Run, read-only Plans and metadata diagnostic) are CONSUMED. Next actual Owner-host read-only Plan needs a fresh independent end-to-end audit PASS at the exact SHA and a new explicit Owner approval; do not do piecemeal Owner retries. FFH-P01 remains PUNCH_LIST / HIGH / BLOCKED.
