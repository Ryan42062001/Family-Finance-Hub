import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../../supabase/migrations/20260901020220_phase_5_adversarial_audit_remediation.sql", import.meta.url), "utf8");
const phase5aMigration = readFileSync(new URL("../../supabase/migrations/20260902190000_phase_5a_hybrid_retirement_floor.sql", import.meta.url), "utf8");
const snapshotLoader = readFileSync(new URL("../../lib/supabase/money-priority-snapshot.ts", import.meta.url), "utf8");
const financialTables = [
  "accounts", "income_sources", "expenses", "debts", "retirement_accounts", "goals",
  "household_people", "insurance_exposures", "household_financial_preferences",
];

test("role helpers are private security-definer functions with restricted execution", () => {
  for (const helper of ["can_read_household", "can_write_household_financials", "is_household_owner"]) {
    assert.match(migration, new RegExp(`function private\\.${helper}\\(target_household_id uuid\\)[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`, "i"));
    assert.match(migration, new RegExp(`revoke all on function private\\.${helper}\\(uuid\\) from public, anon, authenticated`, "i"));
    assert.match(migration, new RegExp(`grant execute on function private\\.${helper}\\(uuid\\) to authenticated`, "i"));
  }
  assert.match(migration, /hm\.role in \('owner', 'member'\)/);
  assert.match(migration, /hm\.role = 'owner'/);
});

test("every financial table grants viewers read policy but requires writer role for mutations", () => {
  for (const table of financialTables) {
    assert.match(migration, new RegExp(`create policy ${table}_household_read on public\\.${table} for select to authenticated using \\(private\\.can_read_household\\(household_id\\)\\)`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_write_insert on public\\.${table} for insert to authenticated with check \\(private\\.can_write_household_financials\\(household_id\\)\\)`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_write_update on public\\.${table} for update to authenticated using \\(private\\.can_write_household_financials\\(household_id\\)\\) with check \\(private\\.can_write_household_financials\\(household_id\\)\\)`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_write_delete on public\\.${table} for delete to authenticated using \\(private\\.can_write_household_financials\\(household_id\\)\\)`, "i"));
  }
});

test("household metadata is owner-only and created_by is immutable", () => {
  assert.match(migration, /create policy households_update_owners[\s\S]*?private\.is_household_owner\(id\)[\s\S]*?with check \(private\.is_household_owner\(id\)\)/i);
  assert.match(migration, /if new\.created_by is distinct from old\.created_by then[\s\S]*?raise exception 'households\.created_by is immutable'/i);
  assert.match(migration, /before update on public\.households[\s\S]*?preserve_household_created_by/i);
});

test("UPDATE policies prevent household-id reassignment and cross-household writes", () => {
  for (const table of financialTables) {
    const policy = new RegExp(`create policy ${table}_household_write_update[\\s\\S]*?using \\(private\\.can_write_household_financials\\(household_id\\)\\)[\\s\\S]*?with check \\(private\\.can_write_household_financials\\(household_id\\)\\)`, "i");
    assert.match(migration, policy);
  }
});

test("plan compensation is account-specific, nonnegative, and documented as distinct", () => {
  assert.match(migration, /alter table public\.retirement_accounts[\s\S]*?plan_eligible_compensation_annual numeric\(14,2\)/i);
  assert.match(migration, /plan_eligible_compensation_annual is null or plan_eligible_compensation_annual >= 0/i);
  assert.match(migration, /distinct from person-wide compensation and prior-year sponsor wages/i);
});

test("HSA intent preference is nullable, nonnegative, loader-aligned, and inherits existing RLS", () => {
  assert.match(phase5aMigration, /alter table public\.household_financial_preferences/);
  assert.match(phase5aMigration, /expected_hsa_medical_spending_annual numeric\(14,2\) null/);
  assert.match(phase5aMigration, /expected_hsa_medical_spending_annual is null[\s\S]*expected_hsa_medical_spending_annual >= 0/);
  assert.match(snapshotLoader, /planning_pension_monthly, expected_hsa_medical_spending_annual, tax_profile_year/);
  assert.doesNotMatch(phase5aMigration, /create policy|drop policy|security definer/i);
});
