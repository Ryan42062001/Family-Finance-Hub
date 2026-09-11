# Application, Data & Integration Engineer Handoff

HANDOFF

Task ID: FFH-020

Role: Application, Data & Integration Engineer

Status: BLOCKED — PRE-EXISTING MIGRATION-HISTORY / DEPENDENCY DRIFT REQUIRES MANAGER DISPOSITION

## Verified repository state

- Repository: `Ryan42062001/Family-Finance-Hub`
- Milestone branch: `phase-5-money-priority-engine`
- FFH-020 is the Manager-authorized deployment-only task for already-accepted FFH-010 / FFH-011 migrations.
- No production migration SQL, application source, Core logic, policy, live schema/data/configuration, or migration history was modified.

## Accepted migration source re-verified

1. `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql`
   - blob: `2e2a75a17439c2d75422ec271492333c0eb283c1`
   - exact match to the Manager-authorized FFH-010 source.

2. `supabase/migrations/20260909033000_ffh_011_simple_plan_limit_contract.sql`
   - blob: `3f01921b5a346c1e1e95259db30d104e68f8a184`
   - exact match to the Manager-authorized FFH-011 source.

## Live Supabase preflight — 2026-09-11

Target project:
- ref: `tsqwvggojeudgspnumze`
- name: `Ryan4206's Project`
- region: `us-east-2`
- PostgreSQL: `17.6.1.166`
- status: `ACTIVE_HEALTHY`

FFH-020 target migrations remain absent:
- `20260909005000` — absent
- `20260909033000` — absent

All six FFH-016 prerequisite schema objects/columns remain absent:
- `public.person_hsa_tax_year_profiles`
- `public.person_hsa_month_statuses`
- `public.household_hsa_married_allocations`
- `public.retirement_accounts.hsa_ytd_tax_year`
- `public.retirement_accounts.simple_plan_limit_category`
- `public.retirement_accounts.simple_plan_limit_tax_year`

## Newly verified pre-existing migration drift

A repository-to-live migration-order comparison found two material pre-FFH-020 problems that trigger the task's explicit drift stop rule.

### 1. Earlier repository migration is genuinely unapplied

Repository contains:
- `20260902190000_phase_5a_hybrid_retirement_floor.sql`
- blob `4bd9c98d9404c8eaa35b213fd7f4a1df6d8cf98c`

Live migration history contains no `20260902190000` entry. Fresh live catalog inspection also proves the migration's expected column is absent:
- `public.household_financial_preferences.expected_hsa_medical_spending_annual` = absent

This means a normal repository `supabase db push` would have additional pending work before FFH-010/011. Applying or bypassing that earlier migration is outside FFH-020's current deployment-only authorization.

### 2. Phase 5B migration schema is live under a different migration version

Repository contains:
- `20260903134156_phase_5b_goal_intelligence.sql`
- blob `2c99e849bb8960732cb898e43e709e9a15b3524f`

Live migration history instead records:
- `20260903135253 phase_5b_goal_intelligence`

Fresh catalog checks show representative Phase 5B schema is already present live:
- `public.goals.goal_intelligence_confirmed` = present
- `public.goals.underlying_need` = present
- `public.goals.expected_borrowing_apr` = present

So the live database has the Phase 5B schema under a different migration-history version than the repository file. A repository push cannot be assumed safe until that history divergence is deliberately reconciled.

The earliest repository/live history also differs (`0001_household_foundation.sql` in source versus `20260829180242 household_foundation` live), confirming that exact file-version identity has not always been preserved historically. Later migrations through `20260901020220` match their repository timestamps.

## Tooling evidence

Current Supabase guidance says linked-project `supabase db push` applies pending repository migrations and tracks migration versions.

The connected Supabase MCP `apply_migration` action exposes only `project_id`, `name`, and `query`; it has no migration `version` argument. Current MCP/Management-API behavior generates its own migration version, so using it for FFH-010/011 would create additional remote-only version divergence instead of the required repository versions `20260909005000` and `20260909033000`.

The current runtime also has:
- no installed Supabase CLI binary;
- no cached Supabase CLI authentication/configuration;
- no `SUPABASE_ACCESS_TOKEN`;
- no `SUPABASE_DB_PASSWORD`;
- no project-ref credential environment;
- no repository Supabase deployment workflow to dispatch (`.github/workflows/` contains only `ci.yml`).

Even if CLI credentials became available, the newly proven pre-existing Phase 5A/5B migration drift must be dispositioned before a normal `db push` is safe under FFH-020.

## Advisor baseline

Read-only Supabase advisors were run before deployment:
- Security advisor: zero lints.
- Performance advisor: one INFO `unused_index` lint group with 16 pre-existing findings.

These performance findings predate FFH-020 and were not remediated because cleanup is out of scope.

## Changes actually made

- Live Supabase schema/data/config: NONE.
- Live migration history: NONE.
- Accepted FFH-010 / FFH-011 migration SQL: NONE.
- Production/application/Core code: NONE.
- Repository writes: documentation-only FFH-020 task/handoff evidence.

## Checkpoints

PRODUCTION_SHA: N/A — DEPLOYMENT-ONLY

VALIDATED_CI: N/A — no production source remediation

HANDOFF_SHA: this documentation checkpoint; verify exact branch head after write

INTEGRATION_SHA: N/A — no production integration

DEPLOYMENT_TARGET: `tsqwvggojeudgspnumze`

DEPLOYMENT_EVIDENCE: Source/target/schema/advisor preflight complete; no migration applied because pre-existing migration history/dependency drift triggered the task's mandatory stop condition

Validation status: BLOCKED

Escalation count: 0 — newly discovered environment/history dependency and capability boundary, not repeated owner remediation

## Exact next action

Manager / Architect must provide a narrow migration-history/dependency disposition before further FFH-020 live writes:

- decide whether/how to deploy or otherwise reconcile repository migration `20260902190000_phase_5a_hybrid_retirement_floor.sql`;
- decide how to reconcile repository `20260903134156_phase_5b_goal_intelligence.sql` with live history entry `20260903135253 phase_5b_goal_intelligence` whose schema is already present;
- explicitly authorize any `supabase migration repair`, equivalent history reconciliation, or earlier-migration deployment if required;
- then provide/activate an exact-version-preserving deployment path for FFH-010/011.

Do not run `supabase db push`, MCP `apply_migration`, manual DDL, or direct `supabase_migrations` edits under the current authorization.

Once Manager-authorized migration history/dependency reconciliation is complete, reactivate App/Data Engineering to apply FFH-010 first and FFH-011 second, verify the exact target migration versions, six schema objects, FFH-010 RLS/policies/grants/constraints, FFH-011 constraint/comments, rerun Supabase advisors, and return FFH-020 `READY_FOR_MANAGER` or `BLOCKED` with exact evidence.

FFH-016 remains blocked and separate until Manager accepts the FFH-020 deployment evidence.
