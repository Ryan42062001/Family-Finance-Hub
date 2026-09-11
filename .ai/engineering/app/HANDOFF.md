# Application, Data & Integration Engineer Handoff

HANDOFF

Task ID: FFH-016

Role: Application, Data & Integration Engineer

Status: BLOCKED — LIVE SUPABASE MIGRATION MISMATCH REQUIRES MANAGER-AUTHORIZED REMEDIATION

## Verified repository state

- Repository: `Ryan42062001/Family-Finance-Hub`
- Milestone branch refreshed during execution: `phase-5-money-priority-engine`
- Latest authoritative branch head before the 2026-09-11 re-verification documentation writes: `647e4d03f29a4e95621a6d9ec4660b8304d5a245`
- PR #5 remained open, unmerged, mergeable, and pointed at the milestone branch.
- `.ai/shared/WORKFLOW_V3.md` is now canonical for workforce/chat/execution-mode routing while `.ai/shared/WORKFLOW.md` safeguards remain authoritative.
- `FFH-016` is the Manager-approved App/Data verification-only task.

## Assigned verification scope

Verify the accepted live persistence/runtime contracts for:
- FFH-010: `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql`
- FFH-011: `supabase/migrations/20260909033000_ffh_011_simple_plan_limit_contract.sql`

The task explicitly forbids silently deploying or fixing a live mismatch; any required migration/deployment remediation must be routed back to Manager first.

## Live environment identified

Linked Supabase project:
- project ref: `tsqwvggojeudgspnumze`
- name: `Ryan4206's Project`
- region: `us-east-2`
- PostgreSQL: `17.6.1.166`

The project was initially `INACTIVE`. A read attempt timed out because the database was paused. The project was restored so the assigned live verification could be performed; it subsequently reached `ACTIVE_HEALTHY`. No schema migration, DDL remediation, or production-code change was applied by FFH-016.

## Reproducible live evidence

### Migration history

`list_migrations` succeeded after the project was healthy. The latest applied migration returned was:

- `20260903135253` — `phase_5b_goal_intelligence`

The live migration history did **not** contain:
- `20260909005000` — FFH-010 HSA input contract
- `20260909033000` — FFH-011 SIMPLE plan-limit contract

### Live schema introspection

A read-only SQL query checked the concrete objects required by those two accepted repository migrations. Every check returned `false`:

- `public.person_hsa_tax_year_profiles` exists: false
- `public.person_hsa_month_statuses` exists: false
- `public.household_hsa_married_allocations` exists: false
- `public.retirement_accounts.hsa_ytd_tax_year` exists: false
- `public.retirement_accounts.simple_plan_limit_category` exists: false
- `public.retirement_accounts.simple_plan_limit_tax_year` exists: false

This proves the accepted repository migration files exist in source but have not been applied to the linked live Supabase project.

## Source/runtime contract already confirmed in repository

Repository inspection confirmed the application is wired to the missing live schema:
- `app/financial-profile/hsa/actions.ts` writes the FFH-010 HSA tables/columns.
- `app/financial-profile/hsa/page.tsx` reads the HSA profile/month/allocation tables and HSA YTD tax-year column.
- `app/financial-profile/simple/actions.ts` writes the explicit SIMPLE category + tax-year contract.
- `lib/supabase/money-priority-snapshot.ts` selects HSA profile/month/allocation rows plus HSA/SIMPLE retirement-account columns for the authoritative runtime snapshot.
- `lib/calculations/money-priority-snapshot.ts` preserves explicit SIMPLE category/tax-year semantics through normalization.
- `lib/calculations/money-priority-hsa-input-contract.ts` preserves explicit `unknown` HSA status values and validates person/tax-year/month references.

Therefore the live schema mismatch blocks the normal application/PostgREST loader path rather than representing unused repository-only columns.

## Verification stopped at authorized mismatch boundary

Not executed/claimed because the prerequisite schema is absent:
- authenticated PostgREST select/write success for FFH-010/FFH-011 objects;
- FFH-010 household RLS owner/member/viewer/nonmember matrix on the missing tables;
- live persistence -> reload -> normalized snapshot parity for HSA and SIMPLE values;
- browser capture/reload;
- Recommendation Refresh propagation using live FFH-010/FFH-011 data.

Continuing those checks cannot produce valid success evidence until the accepted migrations are actually applied. Per FFH-016 non-goals, no silent deployment or migration repair was performed.

## Checkpoints

PRODUCTION_SHA: N/A — VERIFICATION-ONLY; no production code/schema remediation authorized

VALIDATED_CI: N/A — live verification task; no remediation CI claimed

HANDOFF_SHA: established by this documentation commit; record exact SHA in FFH-016 task file after write

INTEGRATION_SHA: N/A — no remediation integrated

Runtime evidence: FAIL/BLOCKED at migration-application and live-schema gates

Validation status: BLOCKED — accepted FFH-010 and FFH-011 migrations are absent from linked live Supabase

Escalation count: 0 — this is a discovered environment/deployment mismatch, not repeated same-root implementation guessing

## Live re-verification — 2026-09-11

The verification-only gate was re-run against the intended linked project without changing schema or data:

- Project `tsqwvggojeudgspnumze` reported `ACTIVE_HEALTHY`, region `us-east-2`, PostgreSQL `17.6.1.166`.
- `list_migrations` again returned `20260903135253 phase_5b_goal_intelligence` as the latest applied migration. FFH-010 `20260909005000` and FFH-011 `20260909033000` remain absent.
- A fresh read-only catalog query again returned false for `person_hsa_tax_year_profiles`, `person_hsa_month_statuses`, `household_hsa_married_allocations`, `retirement_accounts.hsa_ytd_tax_year`, `retirement_accounts.simple_plan_limit_category`, and `retirement_accounts.simple_plan_limit_tax_year`.
- Actual migration application and expected schema/API availability fail. PostgREST reads/writes, household RLS role behavior, null/confirmed persistence and reload, loader/normalized-snapshot propagation, Recommendation Refresh, and browser capture/reload remain downstream-blocked; none is claimed.
- No migration, DDL, application write, test fixture, runtime setting, or production repair was applied.

## Exact next action

Manager / Architect should review this live evidence and authorize a separate deployment/remediation step to apply the already-accepted FFH-010 and FFH-011 migrations to the intended linked Supabase environment. After deployment is independently evidenced, reactivate FFH-016 to resume PostgREST, RLS, persistence/reload, normalized snapshot, and browser/runtime parity verification.

Do not mark Phase 5 merge-ready from repository migration-file existence alone.
