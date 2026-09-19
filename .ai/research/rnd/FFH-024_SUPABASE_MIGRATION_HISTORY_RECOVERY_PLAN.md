# FFH-024 — Supabase Migration-History Recovery Plan

Status: READY_FOR_MANAGER — RESEARCH / RECOVERY PLAN ONLY  
Owner: Product & Technical R&D Engineer  
Target project: `tsqwvggojeudgspnumze`  
Research baseline: Manager control-plane head `20a46c1b6660bf3aa5e7d455e2e0b5cf689098cf`

No live database write, `db push`, `migration repair`, MCP `apply_migration`, manual DDL, direct `supabase_migrations` mutation, credential change, or migration-SQL edit was performed by FFH-024.

## Executive conclusion

A supported recovery path exists.

The lowest-risk plan is:

1. authenticate/link a current Supabase CLI in a user-controlled or otherwise secret-safe execution environment;
2. take a pre-change backup and preserve read-only migration/schema evidence;
3. use **history-only** `supabase migration repair` to align the two remote-generated migration identities whose stored SQL already corresponds to canonical repository migrations:
   - `20260829180242 household_foundation` -> repository version `0001`;
   - `20260903135253 phase_5b_goal_intelligence` -> repository version `20260903134156`;
4. verify migration history is otherwise aligned and that exactly three repository migrations remain pending;
5. run `supabase db push --linked --include-all --dry-run`; it must list exactly:
   - `20260902190000_phase_5a_hybrid_retirement_floor.sql`;
   - `20260909005000_ffh_010_hsa_input_contract.sql`;
   - `20260909033000_ffh_011_simple_plan_limit_contract.sql`;
6. only under separate Manager authorization, execute the corresponding linked `db push --include-all`, which preserves the repository file versions and applies the three pending migrations in migration order;
7. verify exact history entries, expected schema/RLS/security state, and advisor results before returning to FFH-020 / FFH-016.

MCP `apply_migration`, `db pull`, manual DDL, migration-file renaming/rewriting, direct migration-table SQL, `migration squash`, and linked `db reset` are not the recommended recovery mechanism.

## Current repository/live state

### VERIFIED FACT

At Manager head `20a46c1b6660bf3aa5e7d455e2e0b5cf689098cf`, repository migration order is:

- `0001_household_foundation.sql`
- matching timestamped migrations through `20260901020220_phase_5_adversarial_audit_remediation.sql`
- `20260902190000_phase_5a_hybrid_retirement_floor.sql`
- `20260903134156_phase_5b_goal_intelligence.sql`
- `20260909005000_ffh_010_hsa_input_contract.sql`
- `20260909033000_ffh_011_simple_plan_limit_contract.sql`

The linked project is `tsqwvggojeudgspnumze`, status `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.166` in `us-east-2`.

Current remote migration history is:

- `20260829180242 household_foundation`
- `20260829182715 phase_2_household_financial_profile`
- `20260829183541 phase_2_expenses`
- `20260829223642 phase_5_ownership_and_planning_foundation`
- `20260829223716 phase_5_ownership_foundation_indexes`
- `20260829223935 phase_5_priority_engine_context`
- `20260829234300 phase_5_tax_profile_context`
- `20260829234446 phase_5_tax_profile_mfs_context`
- `20260831235822 phase_5_closure_input_context`
- `20260901020220 phase_5_adversarial_audit_remediation`
- `20260903135253 phase_5b_goal_intelligence`

Remote history therefore lacks repository versions `0001`, `20260902190000`, `20260903134156`, `20260909005000`, and `20260909033000`, while it contains two remote-only identities `20260829180242` and `20260903135253`.

### VERIFIED FACT — household foundation identity

A read-only query of `supabase_migrations.schema_migrations` shows remote record `20260829180242 household_foundation` stores the executable SQL corresponding to repository `0001_household_foundation.sql`: pgcrypto, `household_role`, the foundation tables, RLS, `private.is_household_member`, grants/policies, and the two indexes. Differences observed are comments/formatting, not executable meaning.

Therefore this is a migration-**identity** mismatch, not evidence that the foundation DDL is absent.

### VERIFIED FACT — Phase 5B identity

A read-only query of remote migration record `20260903135253 phase_5b_goal_intelligence` shows its stored executable SQL corresponds to repository `20260903134156_phase_5b_goal_intelligence.sql`.

Independent live catalog checks also found all repository Phase-5B effects:

- all 8 added `public.goals` columns with matching types/nullability/default behavior;
- all 11 named check constraints with matching semantics;
- both repository column comments.

Therefore Phase 5B is already live and must **not** replay its DDL merely to fix the version mismatch.

### VERIFIED FACT — Phase 5A / FFH-010 / FFH-011

`20260902190000_phase_5a_hybrid_retirement_floor.sql` is absent from remote history and its expected `public.household_financial_preferences.expected_hsa_medical_spending_annual` column is absent. It is genuinely unapplied.

FFH-010 `20260909005000` and FFH-011 `20260909033000` are absent from remote history and their previously checked prerequisite objects/columns remain absent.

## Current official Supabase semantics

Primary official references checked on 2026-09-11:

- Database migration sync/repair guidance: https://supabase.com/docs/guides/deployment/database-migrations
- CLI reference: https://supabase.com/docs/reference/cli/installing-and-updating
- Local CLI workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Backup/restore with CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

### VERIFIED FACT — `supabase migration list`

Current official CLI documentation says local migrations come from `supabase/migrations`, remote history comes from `supabase_migrations.schema_migrations`, and **only migration timestamps/versions are compared**. Names or SQL equivalence do not cause two differently-versioned rows to match.

Implication: the present `0001`/`20260829180242` and `20260903134156`/`20260903135253` pairs remain history discrepancies even though their DDL corresponds.

### VERIFIED FACT — `supabase migration repair`

Current official guidance says:

- `--status applied` inserts/marks a migration record as applied;
- `--status reverted` removes/marks the migration record as reverted;
- repair changes the **tracking table only** and does not apply or revert the migration SQL.

This is the supported mechanism when actual schema state is already correct but migration history is not.

### VERIFIED FACT — `supabase db push --dry-run` and linked `db push`

Current official guidance says linked `db push` compares repository migrations with remote history, applies migrations not yet applied, and records a migration history row after successful application. `--dry-run` prints the migrations that would be applied without applying them.

Current CLI reference exposes `--include-all`, defined as including all migrations not found in remote history. It is required here because Phase 5A is an older pending migration than an already-live later migration.

### VERIFIED FACT — current related commands

Current CLI still exposes:

- `migration list`
- `migration repair`
- `migration fetch`
- `migration up`
- `db pull`
- `db push`
- `db reset`

There is no documented replacement that makes `migration repair` obsolete. `migration up --linked --include-all` can apply pending linked migrations, but `db push` is preferred here because it has the required `--dry-run` preview contract.

`migration fetch` / `db pull` are not preferred here: the repository already contains the intended canonical migration files, and fetching/pulling the remote-generated identities would create new/duplicate local history instead of preserving the accepted repository versions.

`db reset --linked` is destructive and is expressly inappropriate for this live recovery.

## Exact recommended action sequence

All commands below are **NOT EXECUTED by FFH-024**. They are a Manager-authorization packet for the future executor.

### 0. Manager authorization and single executor

- Manager selects one executor and freezes concurrent database migration deployment.
- Recommended owner: Application, Data & Integration Engineer resuming FFH-020.
- Work Helper may assist only if Manager explicitly reassigns this live recovery; it should not independently own schema-history mutation while App/Data owns FFH-020.

### 1. Fresh source + CLI preflight

From a fresh checkout of the Manager-approved milestone checkpoint:

```bash
supabase --version
supabase migration list --help
supabase migration repair --help
supabase db push --help
```

Confirm current installed CLI supports:

- linked `migration list`;
- `migration repair [version] --status applied|reverted`;
- linked `db push --dry-run`;
- `db push --include-all`.

Do not proceed if the installed CLI materially differs from current documentation. Record the CLI version in deployment evidence.

Current upstream Supabase CLI work in August 2026 fixed migration ordering for legacy numeric versions (including examples such as `1` vs `10`), which is strong evidence that legacy numeric versions remain supported. Nevertheless, if the executor's current CLI rejects repository version `0001`, STOP; do not rename the migration or manually edit history.

### 2. Authenticate/link without exposing secrets

Official workflow:

```bash
supabase login
supabase link --project-ref tsqwvggojeudgspnumze
```

Reconfirm the target project before any write.

Use browser/native credential storage or secret environment injection. Do not paste access tokens, database passwords, or connection strings into chat, repository files, task files, CI logs, or shell-history-visible commands.

### 3. Backup / rollback prerequisite

Before any repair or push, capture a recovery snapshot outside the repository.

Recommended minimum logical backup set, following current official Supabase backup guidance:

- roles dump;
- schema dump;
- data-only dump;
- migration-history schema/data dump (`supabase_migrations`) or equivalent protected snapshot;
- current `supabase migration list --linked` output and read-only catalog evidence.

If the project's Supabase plan provides a restorable physical backup/PITR checkpoint, record its availability/identifier as additional protection.

Backups may contain production data and must not be committed to Git.

### 4. Reconfirm live identity and drift

Run read-only checks again immediately before repair:

```bash
supabase migration list --linked
```

Confirm the two remote-only identities and three truly pending canonical migrations are unchanged. Reconfirm Phase 5A remains absent and the Phase-5B/household-foundation schema effects remain present.

Any new migration or schema drift => STOP and return to Manager.

### 5. Canonicalize historical household-foundation identity — history only

Because remote `20260829180242` stores the same executable migration as repository `0001`, align history without replaying DDL.

Lower-risk order:

```bash
supabase migration repair 0001 --status applied --linked
supabase migration list --linked
supabase migration repair 20260829180242 --status reverted --linked
supabase migration list --linked
```

Rationale for `applied` first: if the second command fails, the live schema remains represented by at least one history identity rather than temporarily by none.

Expected result: repository `0001` matches remote `0001`; `20260829180242` is gone from remote history; schema is unchanged.

### 6. Canonicalize Phase-5B identity — history only

Because live Phase-5B schema and the remote record's stored SQL correspond to repository `20260903134156`, align history without replaying DDL:

```bash
supabase migration repair 20260903134156 --status applied --linked
supabase migration list --linked
supabase migration repair 20260903135253 --status reverted --linked
supabase migration list --linked
```

Expected result: repository `20260903134156` matches remote `20260903134156`; remote-only `20260903135253` is removed; Phase-5B schema remains unchanged.

### 7. Hard pre-deployment gate

After both history alignments:

```bash
supabase migration list --linked
supabase db push --linked --include-all --dry-run
```

The dry run must identify **exactly these three** migration files, in this order:

1. `20260902190000_phase_5a_hybrid_retirement_floor.sql`
2. `20260909005000_ffh_010_hsa_input_contract.sql`
3. `20260909033000_ffh_011_simple_plan_limit_contract.sql`

No `0001` or Phase-5B migration may be offered for replay.

Any other pending migration, remote-only identity, error, or unexpected ordering => STOP. Do not force, rename, pull, squash, edit SQL, or use MCP to bypass the discrepancy.

### 8. Live deployment — requires separate Manager authorization

Only after Manager reviews the repaired history evidence and exact dry run:

```bash
supabase db push --linked --include-all
```

Do not add `--include-seed`.

This should preserve the repository versions because the deployment source is the repository migration files, not MCP `apply_migration`.

The expected canonical execution order is Phase 5A -> FFH-010 -> FFH-011.

### 9. Post-deployment proof

Immediately verify:

- `supabase migration list --linked` is aligned;
- remote history contains exact versions `0001`, `20260902190000`, `20260903134156`, `20260909005000`, `20260909033000` and no replaced remote-only identities;
- Phase 5A expected column exists with its constraint/comment;
- all FFH-010 objects, indexes, FKs, RLS, grants, policies, and HSA year column/constraint exist;
- FFH-011 category/year columns, check constraint, and comments exist;
- Supabase security/performance advisors show no new attributable blocker.

Then FFH-020 can return to its normal Manager verification path and FFH-016 can later resume independent runtime/PostgREST/RLS parity validation.

## Phase 5A disposition

### VERIFIED FACT

Phase 5A is earlier than Phase 5B/FFH-010/FFH-011 in repository order and is absent both from history and schema.

### STRONG EVIDENCE / RECOMMENDATION

Do **not** mark Phase 5A applied with `migration repair`; that would make history lie about actual schema state.

Phase 5A should be deployed as real DDL before FFH-010/011 in the canonical push. It is not a direct SQL dependency visible inside FFH-010/011, but leaving a known earlier migration unapplied would preserve repository/live divergence and undermine future `db push` reproducibility.

Because current `db push --include-all` applies all missing migrations, the safest normal path is a single canonical push after history repair, with Phase 5A naturally first by version rather than ad-hoc manual application.

## Phase 5B disposition

### VERIFIED FACT

Phase 5B repository and live schema effects match, while only the recorded version differs.

### VERIFIED FACT — command semantics

`migration repair` can mark a version applied/reverted without running its DDL.

### STRONG EVIDENCE / RECOMMENDATION

Mark repository version `20260903134156` applied, then mark remote-only `20260903135253` reverted. This aligns history with the canonical file without attempting duplicate `ADD COLUMN` / constraint DDL.

## Historical `0001` disposition

### VERIFIED FACT

The remote `20260829180242 household_foundation` record stores the same executable foundation migration represented by repository `0001_household_foundation.sql`.

### STRONG EVIDENCE / RECOMMENDATION

Repair this mismatch **now**, before `db push`, rather than merely documenting it forever. `migration list` compares versions only, and current Supabase sync guidance treats local/remote history discrepancies as repair candidates. Recent upstream CLI fixes also explicitly preserve legacy numeric migration-version handling.

Use the same applied-first/reverted-second history-only sequence. If the current CLI refuses legacy version `0001`, return `BLOCKED` to Manager; do not rename the canonical migration under this recovery task.

## Exact-version strategy for FFH-010 / FFH-011

### VERIFIED FACT

Current MCP `apply_migration` does not provide an original repository-version argument in the connected tool contract. It cannot satisfy FFH-020's exact-version requirement.

### VERIFIED FACT

Supabase CLI `db push` uses migration files and records their versions in remote migration history.

### RECOMMENDATION

After history alignment, use repository-root `supabase db push --linked --include-all` only after an exact successful dry run. That is the supported path that preserves `20260909005000` and `20260909033000` rather than creating server-generated migration identities.

## Credentials / user action

### VERIFIED FACT

Current official CLI docs say:

- `supabase login` authenticates with a Personal Access Token and normally stores it in native credential storage;
- `SUPABASE_ACCESS_TOKEN` can be supplied for non-interactive use;
- `supabase link` associates the workspace with the project;
- remote database commands may require the database password; `SUPABASE_DB_PASSWORD` can be used in non-interactive environments.

### REQUIRED USER ACTION

The current agent/runtime does not have the required CLI authentication/database credentials. A user-authorized execution environment must provide them securely. Credentials must never be sent back in the research handoff.

Prefer an interactive/user-controlled terminal or Work session with explicit secret handling. If native credential storage is unavailable, do not persist a PAT into a disposable/shared filesystem without deliberate user approval.

## Failure and rollback expectations

### VERIFIED FACT

History-only repair does not change application schema. Each repair can be checked immediately with `migration list`.

If the canonical `applied` repair succeeds but removal of the remote-only alias fails, STOP with both history rows intact. Do not continue to DDL.

### INFERENCE / SAFETY RULE

Do not assume a failed multi-statement migration automatically leaves zero schema effects. Supabase CLI migration execution has changed over time, and current official user docs do not provide a sufficiently strong cross-version guarantee for every client/network/failure mode to make automatic rollback an acceptance assumption.

If `db push` fails:

1. do not retry automatically;
2. capture the exact error and CLI version;
3. run read-only `migration list` and schema/catalog checks;
4. identify which migrations/history rows actually completed and whether the failing migration left any partial effect;
5. compare against the preflight backup;
6. return `BLOCKED` to Manager for a narrow recovery decision.

Do not fix a failed push with manual DDL or direct `supabase_migrations` writes.

A full backup restore is a last-resort Manager/user decision, not the first response to a failed additive migration.

## Commands not recommended for this recovery

- **MCP `apply_migration`** — cannot preserve repository versions in the current tool contract.
- **Manual DDL** — would bypass the accepted repository migration/history contract.
- **Direct SQL against `supabase_migrations`** — supported `migration repair` exists; direct edits are unnecessary and risk malformed metadata.
- **`db pull`** — appropriate when remote schema is truly unrepresented locally, but here the already-live mismatched schemas already have canonical repository files; pulling would create additional identity/source noise.
- **`migration fetch`** — would import remote-generated identities rather than preserve the canonical repository history.
- **`migration squash`** — rewrites migration representation and is far outside the narrow recovery scope.
- **`db reset --linked`** — destructive; official docs warn it drops/rebuilds the linked remote database and should not be used on production.

## Classification summary

### VERIFIED FACT

- Manager head and task routing verified.
- Target project identity/health verified.
- Live migration history verified read-only.
- Household-foundation and Phase-5B remote stored SQL correspond to their canonical repository migrations.
- Phase-5B live DDL effects verified.
- Phase 5A, FFH-010, and FFH-011 remain genuinely unapplied.
- `migration list` compares versions/timestamps only.
- `migration repair` is history-only; `applied` inserts/marks a history row and `reverted` removes/marks it reverted.
- `db push --dry-run`, linked `db push`, and `--include-all` remain current supported CLI capabilities.
- CLI login/link and backup mechanisms are documented by Supabase.

### STRONG EVIDENCE

- Canonicalizing `0001` and Phase 5B through applied-first/reverted-second repair is the lowest-risk supported history alignment.
- `0001` should be repaired now because leaving a remote-only identity risks continuing sync errors.
- Phase 5A should execute before FFH-010/011 through the canonical `--include-all` push.
- App/Data Engineering should own the live execution after Manager authorization.

### INFERENCE

- A failed migration may require partial-state diagnosis even if a particular CLI path usually uses transactional behavior; do not make atomic rollback a contractual assumption without observing the executor's exact CLI behavior/result.

### UNKNOWN / STOP CONDITIONS

- Exact current CLI version in the future execution environment until the executor reports `supabase --version`.
- Whether that exact installed CLI accepts legacy `0001` until preflight; upstream evidence says legacy numeric versions are supported, but a refusal is a hard stop.
- Whether the linked project's current Supabase plan has physical backup/PITR available; verify before execution.
- Any schema/history changes that occur after this research snapshot; all live evidence must be refreshed immediately before repair.

## Recommended executing role

**Application, Data & Integration Engineer / Implementation Engineer**, resuming FFH-020 after explicit Manager authorization.

Reason: this is live migration-history/schema deployment and persistence integration work already owned by FFH-020. Work Helper should not become the default owner merely because recovery is technical; it may assist only if Manager explicitly delegates the narrow live recovery and credential/runtime boundaries are satisfied.

## Manager gate

FFH-024 is research-complete and `READY_FOR_MANAGER`.

Manager should either:

1. approve the recovery sequence and reactivate FFH-020 with explicit authority for the two history repairs, backup/preflight, exact dry-run, then canonical `db push --include-all`; or
2. return FFH-024 for remediation if Manager requires a different backup/execution environment or rejects canonicalization of the legacy `0001` identity.
