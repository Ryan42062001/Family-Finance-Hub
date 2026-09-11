# Product & Technical R&D Handoff

HANDOFF

Task ID: FFH-024

Role: Product & Technical R&D Engineer

Status: READY_FOR_MANAGER

## Result

A supported Supabase migration-history recovery sequence is documented at:

`.ai/research/rnd/FFH-024_SUPABASE_MIGRATION_HISTORY_RECOVERY_PLAN.md`

Research baseline Manager head:

`20a46c1b6660bf3aa5e7d455e2e0b5cf689098cf`

Research artifact commit:

`b8656413bd08199ac997e36f909f84206874e678`

## Key evidence

- Live remote history and stored migration SQL were inspected read-only.
- Remote `20260829180242 household_foundation` corresponds to repository `0001_household_foundation.sql`.
- Remote `20260903135253 phase_5b_goal_intelligence` corresponds to repository `20260903134156_phase_5b_goal_intelligence.sql`; all 8 added columns, 11 named constraints, and 2 repository comments were verified live.
- Phase 5A `20260902190000`, FFH-010 `20260909005000`, and FFH-011 `20260909033000` remain genuinely unapplied.
- Current official Supabase docs confirm `migration list` compares versions/timestamps, `migration repair` changes tracking only, and linked `db push --dry-run --include-all` remains supported.

## Recommended sequence

1. App/Data executor authenticates/links securely and takes a protected backup.
2. History-only align `0001` with remote `20260829180242`: canonical `applied` first, verify, then remote-only `reverted`, verify.
3. History-only align Phase 5B: canonical `20260903134156 applied` first, verify, then remote-only `20260903135253 reverted`, verify.
4. `migration list` must then show only three real pending repository migrations.
5. `db push --linked --include-all --dry-run` must show exactly Phase 5A -> FFH-010 -> FFH-011.
6. Manager separately authorizes the live `db push --linked --include-all`.
7. App/Data verifies exact history/schema/RLS/advisors and resumes FFH-020 / later FFH-016 gates.

If current CLI rejects legacy version `0001`, or any fresh schema/history drift appears, STOP and return BLOCKED; do not rename migrations, use MCP `apply_migration`, manually execute DDL, or directly edit migration history.

## Safety

FFH-024 made no live database/history/schema/data/configuration writes and did not modify migration SQL or expose credentials.

## Exact next action

Manager reviews the recovery artifact and either authorizes the bounded App/Data recovery sequence or returns FFH-024 for remediation.
