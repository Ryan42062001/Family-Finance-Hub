import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../../supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql", import.meta.url), "utf8");
const contract = readFileSync(new URL("../../lib/calculations/money-priority-hsa-input-contract.ts", import.meta.url), "utf8");
const snapshot = readFileSync(new URL("../../lib/calculations/money-priority-snapshot.ts", import.meta.url), "utf8");
const loader = readFileSync(new URL("../../lib/supabase/money-priority-snapshot.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../../app/financial-profile/hsa/actions.ts", import.meta.url), "utf8");
const authorityMigration = readFileSync(new URL("../../supabase/migrations/20260911170000_ffh_023_hsa_legal_spouse_authority.sql", import.meta.url), "utf8");
const hsaPage = readFileSync(new URL("../../app/financial-profile/hsa/page.tsx", import.meta.url), "utf8");
const hypothetical = readFileSync(new URL("../../lib/calculations/money-priority-hypothetical.ts", import.meta.url), "utf8");

const tables = ["person_hsa_tax_year_profiles", "person_hsa_month_statuses", "household_hsa_married_allocations"];

test("FFH-D005 HSA tables are additive, tax-year bound, and unknown-safe", () => {
  assert.match(migration, /add column hsa_ytd_tax_year smallint null/i);
  assert.match(migration, /hsa_ytd_tax_year is null or hsa_ytd_tax_year between 2004 and 9999/i);
  assert.match(migration, /create table public\.person_hsa_tax_year_profiles/i);
  assert.match(migration, /unique \(person_id, household_id, tax_year\)/i);
  assert.match(migration, /create table public\.person_hsa_month_statuses/i);
  assert.match(migration, /month smallint not null check \(month between 1 and 12\)/i);
  assert.match(migration, /eligibility_status text not null default 'unknown'[\s\S]*'eligible','ineligible','unknown'/i);
  assert.match(migration, /coverage_status text not null default 'unknown'[\s\S]*'self_only','family','none','unknown'/i);
  assert.match(migration, /evidence_status text not null default 'unknown'[\s\S]*'confirmed','planning_assumption','unknown'/i);
  assert.match(migration, /create table public\.household_hsa_married_allocations/i);
  assert.match(migration, /unique \(household_id, tax_year\)/i);
  assert.doesNotMatch(migration, /default\s+'eligible'|default\s+'family'|default\s+'elected'/i);
});

test("legacy HSA account hints are not backfilled or silently strengthened", () => {
  assert.doesNotMatch(migration, /update\s+public\.retirement_accounts[\s\S]*hsa_eligible/i);
  assert.doesNotMatch(migration, /update\s+public\.retirement_accounts[\s\S]*hsa_coverage_type/i);
  assert.match(migration, /Legacy absence is representable|does not backfill legacy|not authoritative person eligibility/i);
  assert.match(snapshot, /hsaCoverageType: nullableString\(row\.hsa_coverage_type\)/);
  assert.match(snapshot, /hsaEligible: nullableBoolean\(row\.hsa_eligible\)/);
  assert.match(snapshot, /hsaYtdTaxYear: nullableNumber\(row\.hsa_ytd_tax_year\)/);
});

test("new HSA financial tables preserve role-aware household RLS", () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_read[\\s\\S]*private\\.can_read_household\\(household_id\\)`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_write_insert[\\s\\S]*private\\.can_write_household_financials\\(household_id\\)`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_write_update[\\s\\S]*using \\(private\\.can_write_household_financials\\(household_id\\)\\)[\\s\\S]*with check \\(private\\.can_write_household_financials\\(household_id\\)\\)`, "i"));
    assert.match(migration, new RegExp(`create policy ${table}_household_write_delete[\\s\\S]*private\\.can_write_household_financials\\(household_id\\)`, "i"));
  }
});

test("database enums and runtime unions stay aligned", () => {
  for (const value of ["eligible", "ineligible", "unknown"]) {
    assert.ok(migration.includes(`'${value}'`));
    assert.ok(contract.includes(`"${value}"`));
  }
  for (const value of ["self_only", "family", "none", "unknown"]) {
    assert.ok(migration.includes(`'${value}'`));
    assert.ok(contract.includes(`"${value}"`));
  }
  for (const value of ["confirmed", "planning_assumption", "unknown"]) {
    assert.ok(migration.includes(`'${value}'`));
    assert.ok(contract.includes(`"${value}"`));
  }
  for (const value of ["not_elected", "elected", "unknown", "not_applicable", "pending", "satisfied", "failed"]) {
    assert.ok(migration.includes(`'${value}'`));
    assert.ok(contract.includes(`"${value}"`));
  }
});

test("loader carries one canonical HSA person/month/allocation contract and tax-year-bound YTD", () => {
  assert.match(loader, /hsa_ytd_tax_year/);
  assert.match(loader, /from\("person_hsa_tax_year_profiles"\)/);
  assert.match(loader, /from\("person_hsa_month_statuses"\)/);
  assert.match(loader, /from\("household_hsa_married_allocations"\)/);
  assert.match(loader, /hsaTaxYearProfiles: hsaTaxYearProfiles\.data/);
  assert.match(loader, /hsaMonthStatuses: hsaMonthStatuses\.data/);
  assert.match(loader, /hsaMarriedAllocations: hsaMarriedAllocations\.data/);
  assert.match(snapshot, /hsa: HsaSnapshotContract/);
  assert.match(snapshot, /hsaTaxYearProfiles\?: Raw\[\] \| null/);
});

test("capture actions require explicit household people and YTD tax year without owner inference", () => {
  assert.match(actions, /assertPerson\(supabase, householdId, personId\)/);
  assert.match(actions, /HSA YTD contributions require an explicit tax year/);
  assert.match(actions, /account_type: "hsa"/);
  assert.doesNotMatch(actions, /hsa_eligible\s*:/);
  assert.doesNotMatch(actions, /hsa_coverage_type\s*:/);
  assert.doesNotMatch(actions, /created_by|linked_user_id|claimsData.*owner_person_id|service_role/i);
  assert.match(actions, /Array\.from\(\{ length: 12 \}/);
  assert.match(actions, /onConflict: "person_id,household_id,tax_year,month"/);
});

test("equal married-family default is not persisted", () => {
  assert.match(migration, /Absence means no alternate agreement is persisted; the equal default remains derived policy/i);
  assert.doesNotMatch(migration, /equal_default_amount|default_spouse_allocation|default\s+4375/i);
  assert.match(actions, /saveAlternateMarriedHsaAllocation/);
});

test("FFH-022 legal-spouse authority is pair-specific, tax-year-bound, unknown-safe, and role-protected", () => {
  assert.match(authorityMigration, /create table public\.household_hsa_legal_spouse_authorities/i);
  assert.match(authorityMigration, /tax_year smallint not null check \(tax_year between 2004 and 9999\)/i);
  assert.match(authorityMigration, /'confirmed_legal_spouses','confirmed_not_legal_spouses','unknown'/i);
  assert.match(authorityMigration, /default 'unknown'/i);
  assert.match(authorityMigration, /unique \(household_id, tax_year, person_one_id, person_two_id\)/i);
  assert.match(authorityMigration, /check \(person_one_id < person_two_id\)/i);
  assert.doesNotMatch(authorityMigration, /insert into|update\s+public\./i);
  assert.match(authorityMigration, /enable row level security/i);
  assert.match(authorityMigration, /private\.can_read_household\(household_id\)/i);
  assert.match(authorityMigration, /private\.can_write_household_financials\(household_id\)/i);
});

test("loader, normalized contract, reruns, and UI preserve explicit legal-spouse authority", () => {
  assert.match(loader, /from\("household_hsa_legal_spouse_authorities"\)/);
  assert.match(loader, /hsaLegalSpouseAuthorities: hsaLegalSpouseAuthorities\.data/);
  assert.match(snapshot, /hsaLegalSpouseAuthorities\?: Raw\[\] \| null/);
  assert.match(contract, /legalSpouseAuthorities: HsaLegalSpouseAuthority\[\]/);
  assert.match(hypothetical, /hsaLegalSpouseAuthorities: snapshot\.hsa\.legalSpouseAuthorities\.map/);
  assert.match(actions, /saveHsaLegalSpouseAuthority/);
  assert.match(actions, /confirmation_source: "explicit_household_confirmation"/);
  assert.match(hsaPage, /Unknown \/ confirm later/);
  assert.match(hsaPage, /Legally married spouses/);
  assert.match(hsaPage, /Not legally married to each other/);
  assert.match(hsaPage, /no prior-year answer carries forward/i);
});
