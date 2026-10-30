// Static contract checks only. These tests NEVER connect to PostgreSQL or
// prove RLS enforcement. An independent reviewer must witness a real local run.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const matrix = readFileSync("scripts/rls-local/matrix.sql", "utf8");
const preflight = readFileSync("scripts/rls-local/preflight.sql", "utf8");
const owner = readFileSync("scripts/rls-local/run-owner.ps1", "utf8");

const financial = [
  "accounts",
  "income_sources",
  "expenses",
  "debts",
  "retirement_accounts",
  "goals",
  "household_people",
  "insurance_exposures",
  "household_financial_preferences",
  "person_hsa_tax_year_profiles",
  "person_hsa_month_statuses",
  "household_hsa_married_allocations",
  "household_hsa_legal_spouse_authorities",
];

test("FFH-P01 matrix declares explicit valid INSERT fixtures for all 13 financial families", () => {
  assert.equal(financial.length, 13);
  for (const table of financial) {
    assert.ok(matrix.includes("WHEN '" + table + "' THEN"), "fixture not defined: " + table);
    assert.ok(preflight.includes("'" + table + "'"), "preflight missing: " + table);
  }
  assert.match(matrix, /MATRIX_INCOMPLETE_FINANCIAL_BASELINE/);
  assert.match(matrix, /count\(\*\) FROM pg_temp\.ffh_rls_baselines\) <> 26/);
});

test("FFH-P01 RLS probes execute under effective non-bypass roles and synthetic claims", () => {
  assert.match(matrix, /SET LOCAL ROLE %I/);
  assert.match(matrix, /rolbypassrls OR rolsuper/);
  assert.match(matrix, /current_user <> role_name/);
  assert.match(matrix, /auth\.uid\(\) IS DISTINCT FROM who/);
  assert.match(matrix, /RESET ROLE/);
  assert.match(matrix, /request\.jwt\.claim\.sub/);
  assert.match(matrix, /MATRIX_POSITIVE_ROLE_BYPASS/);
  assert.match(matrix, /MATRIX_POSITIVE_SELECT_FAIL/);
  assert.match(matrix, /MATRIX_POSITIVE_UPDATE_FAIL/);
  assert.match(matrix, /MATRIX_POSITIVE_DELETE_FAIL/);
});

test("FFH-P01 covers ownership, read-only, outsider, anonymous and both directions", () => {
  for (const phrase of [
    "a-owner-to-b", "a-member-to-b", "a-viewer-to-b",
    "b-owner-to-a", "outsider-to-a", "outsider-to-b",
    "anon-to-a", "anon-to-b", "viewer-own-insert-denied",
    "reassignment-a-to-b-denied", "reassignment-b-to-a-denied",
    "member-revocation-financial-write", "creator-immutable",
    "household-member-update-denied", "profile-cross-insert",
    "membership-anon-denied", "profile-anon-read",
  ]) assert.ok(matrix.includes(phrase), "missing role/action: " + phrase);
  assert.match(matrix, /cross-household-unchanged/);
  assert.match(matrix, /md5\(row_to_json\(t\)::text\)/);
  assert.match(matrix, /MATRIX_REVERSE_REASSIGNMENT_CHANGED_SOURCE/);
});

test("FFH-P01 denial receipts cannot misclassify unrelated FK, check or grant errors", () => {
  assert.match(matrix, /error_state='42501'/);
  assert.match(matrix, /error_message ILIKE '%row-level security%'/);
  assert.match(matrix, /error_message ILIKE '%permission denied%'/);
  assert.match(matrix, /error_state='23503'/);
  assert.match(matrix, /error_constraint=wanted_constraint/);
  assert.match(matrix, /MATRIX_WRONG_ERROR/);
  assert.match(matrix, /MATRIX_DENIAL_NOT_OBSERVED/);
  assert.match(matrix, /MATRIX_UNAUTHORIZED_WRITE/);
  for (const fk of [
    "accounts_related_goal_household_fkey",
    "accounts_related_debt_household_fkey",
    "income_sources_owner_person_household_fkey",
    "retirement_accounts_owner_person_household_fkey",
    "insurance_exposures_person_household_fkey",
    "person_hsa_tax_year_profiles_person_household_fkey",
    "person_hsa_month_statuses_profile_fkey",
    "household_hsa_married_allocations_person_one_fkey",
    "household_hsa_legal_spouse_authorities_person_one_fkey",
  ]) assert.ok(matrix.includes(fk), "missing composite FK: " + fk);
});

test("FFH-P01 is fail-closed, rollback-only and zero-residue, never a hosted connection", () => {
  assert.match(matrix, /\\set ON_ERROR_STOP on/);
  assert.match(matrix, /\\set VERBOSITY terse/);
  assert.match(matrix, /SET LOCAL statement_timeout/);
  assert.match(matrix, /SET LOCAL lock_timeout/);
  assert.match(matrix, /CREATE TEMP TABLE ffh_rls_receipts/);
  assert.match(matrix, /MATRIX_NONEMPTY_BASELINE_NO_WRITES_PERMITTED/);
  assert.match(matrix, /BEGIN;\s+SET LOCAL statement_timeout/);
  assert.match(matrix, /ROLLBACK;\s+\\echo MATRIX_ROLLBACK_COMPLETE/);
  assert.match(matrix, /MATRIX_ZERO_RESIDUE_PASS/);
  assert.doesNotMatch(matrix, /^\s*COMMIT\s*;/im);
  assert.doesNotMatch(matrix, /https?:\/\/|service_role|SUPABASE_ACCESS_TOKEN|postgresql:\/\//i);
  assert.match(owner, /FFH-P01-RLS-EXECUTION-GO/);
  assert.match(owner, /supabase_db_FFH-RLS-Test/);
  assert.match(owner, /54322/);
  assert.match(owner, /127\.0\.0\.1/);
  assert.match(owner, /ExpectedHead/);
  assert.match(owner, /MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW/);
});
