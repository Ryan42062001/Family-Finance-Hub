# Application, Data & Integration Engineer Handoff

HANDOFF

Task ID: FFH-020

Role: Application, Data & Integration Engineer

Status: BLOCKED — EXACT REPOSITORY MIGRATION VERSIONS CANNOT BE PRESERVED WITH CURRENT MCP APPLY TOOL

## Verified repository state

- Repository: `Ryan42062001/Family-Finance-Hub`
- Milestone branch: `phase-5-money-priority-engine`
- Pre-execution branch head: `fb6d19641a490763c15ef3f1eb9f6e3f47934e7a`
- FFH-020 is the Manager-authorized deployment-only task for already-accepted FFH-010 / FFH-011 migrations.
- No production migration SQL, application source, Core logic, policy, or configuration was modified.

## Accepted migration source re-verified

1. `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql`
   - blob: `2e2a75a17439c2d75422ec271492333c0eb283c1`
   - exact match to the Manager-authorized FFH-010 source.

2. `supabase/migrations/20260909033000_ffh_011_simple_plan_limit_contract.sql`
   - blob: `3f01921b5a346c1e1e95259db30d104e68f8a184`
   - exact match to the Manager-authorized FFH-011 source.

## Live Supabase preflight — 2026-09-11

Target project re-identified:
- ref: `tsqwvggojeudgspnumze`
- name: `Ryan4206's Project`
- region: `us-east-2`
- PostgreSQL: `17.6.1.166`
- status: `ACTIVE_HEALTHY`

Migration history:
- latest applied migration remains `20260903135253 phase_5b_goal_intelligence`;
- repository migration `20260909005000` is absent;
- repository migration `20260909033000` is absent.

Fresh read-only catalog introspection returned `false` for all six FFH-016 prerequisite objects/columns:
- `public.person_hsa_tax_year_profiles`
- `public.person_hsa_month_statuses`
- `public.household_hsa_married_allocations`
- `public.retirement_accounts.hsa_ytd_tax_year`
- `public.retirement_accounts.simple_plan_limit_category`
- `public.retirement_accounts.simple_plan_limit_tax_year`

No unexpected six-object drift was discovered.

## Deployment blocker

Current Supabase guidance confirms that linked-project `supabase db push` applies pending repository migrations while preserving migration history/version identity.

The currently connected Supabase MCP `apply_migration` tool is a supported migration mechanism, but its tool contract exposes only `project_id`, `name`, and `query`; there is no repository migration `version` parameter. Current MCP/Management-API behavior generates the applied migration version server-side.

Using that tool for either FFH-020 migration would therefore create a new remote-only migration version rather than repository versions `20260909005000` and `20260909033000`. That would knowingly violate FFH-020 acceptance criteria 3/4 and leave local/remote migration history divergent for future CLI `migration list` / `db push` use.

The current agent runtime does not expose `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or project-ref credentials needed to invoke the Supabase CLI directly. The repository currently has no Supabase deployment workflow available to dispatch; `.github/workflows/` contains only `ci.yml`.

Per FFH-020's safety boundary, the worker stopped before any live DDL rather than apply exact SQL under a mismatched migration version or manually edit `supabase_migrations` history.

## Changes actually made

- Live Supabase schema/data/config: NONE.
- Accepted migration SQL: NONE.
- Production/application/Core code: NONE.
- Repository documentation only: FFH-020 task + this App/Data handoff record the capability blocker and exact evidence.

## Checkpoints

PRODUCTION_SHA: N/A — DEPLOYMENT-ONLY

VALIDATED_CI: N/A — no production source remediation

HANDOFF_SHA: this documentation commit; verify exact branch head after write

INTEGRATION_SHA: N/A — no new production integration

DEPLOYMENT_TARGET: `tsqwvggojeudgspnumze`

DEPLOYMENT_EVIDENCE: Preflight complete; deployment intentionally not performed because current MCP tooling cannot preserve repository migration version identity

Validation status: BLOCKED

Escalation count: 0 — tooling/capability boundary, not repeated owner remediation

## Exact next action

Resume FFH-020 from an authenticated repository checkout capable of running the Supabase CLI against `tsqwvggojeudgspnumze`. Compare local/remote migration history first, use `supabase db push --dry-run`/linked equivalent, then deploy with `supabase db push --linked` (or current linked-project equivalent) so repository versions `20260909005000` and `20260909033000` are recorded exactly.

After deployment, return to App/Data Engineering to verify:
- both exact versions in `list_migrations`;
- all six formerly missing schema objects/columns;
- RLS enabled on all three FFH-010 tables;
- expected FFH-010 policies/grants/constraints;
- FFH-011 columns/constraint/comments;
- Supabase security and performance advisor results.

Only then update FFH-020 to `READY_FOR_MANAGER`. FFH-016 remains blocked until Manager accepts the FFH-020 deployment evidence and explicitly reactivates it.
