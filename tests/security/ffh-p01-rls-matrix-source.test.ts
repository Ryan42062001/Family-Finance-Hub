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


// FFH-P01-RLS-ANON-READ-REGRESSION (source-gated behavior model; NO SQL runs).
// These tests deliberately bind the modeled outcomes to the literal SQL branch.
// They catch the previously observed SELECT count(*) / ROW_COUNT confusion,
// but do NOT establish that PostgreSQL executes these assertions correctly.
const probeSql = matrix.split("CREATE FUNCTION pg_temp.ffh_probe(")[1]?.split("\n$probe$;")[0] ?? "";

function assertAnonScalarContract(sql: string) {
  assert.match(sql, /IF mode IN \('COUNT','ANON_SELECT'\) THEN\s+EXECUTE stmt INTO observed;/);
  assert.match(
    sql,
    /ELSIF mode='ANON_SELECT' THEN[\s\S]*?IF NOT denied AND observed IS DISTINCT FROM 0 THEN\s+RAISE EXCEPTION 'MATRIX_UNAUTHORIZED_READ category=% family=%'/,
  );
  assert.doesNotMatch(
    sql,
    /ELSIF mode IN \('[^']*DENY[^)]*ANON_SELECT[^)]*\) THEN/,
    "anonymous SELECT must not use the DML-denial branch",
  );
}

function projectedAnonRead(scalarCount: number | null, denied = false) {
  assertAnonScalarContract(probeSql);
  return !denied && scalarCount !== 0 ? "MATRIX_UNAUTHORIZED_READ" : "PASS";
}

test("FFH-P01 regression: anonymous SELECT count(*)=0 passes despite one aggregate result row", () => {
  assert.equal(projectedAnonRead(0), "PASS");
  // A prior incorrect probe used mode='COUNT' only, then ROW_COUNT for ANON_SELECT.
  const oldProbe = probeSql.replace(
    "IF mode IN ('COUNT','ANON_SELECT') THEN",
    "IF mode='COUNT' THEN",
  );
  assert.throws(() => assertAnonScalarContract(oldProbe), assert.AssertionError);
  assert.match(matrix, /CASE WHEN principal\.user_id IS NULL THEN 'ANON_SELECT' ELSE 'COUNT' END,0/);
});

test("FFH-P01 regression: anonymous SELECT count(*)>0 and NULL fail as unauthorized reads", () => {
  assert.equal(projectedAnonRead(1), "MATRIX_UNAUTHORIZED_READ");
  assert.equal(projectedAnonRead(3), "MATRIX_UNAUTHORIZED_READ");
  assert.equal(projectedAnonRead(null), "MATRIX_UNAUTHORIZED_READ");
  assert.match(probeSql, /MATRIX_UNAUTHORIZED_READ category=% family=%/);
  assert.match(matrix, /'foreign-exact-select',family/);
  assert.match(matrix, /'foreign-broad-select',family/);
});

test("FFH-P01 regression: denied anonymous query is accepted only on expected SQLSTATE 42501", () => {
  assertAnonScalarContract(probeSql);
  assert.match(
    probeSql,
    /mode IN \('GRANT','FORBIDDEN','ANON_SELECT','ANON_WRITE','ANON_INSERT'\)\s+AND error_state='42501'/,
  );
  assert.match(probeSql, /error_message ILIKE '%permission denied%'/);
  assert.match(probeSql, /error_message ILIKE '%row-level security%'/);
  assert.match(probeSql, /ELSE\s+RAISE EXCEPTION 'MATRIX_WRONG_ERROR category=% family=% state=%'/);
  // Expected 42501 permission denial sets denied=true, while an unexpected
  // constraint/syntax error is not accepted and must go to MATRIX_WRONG_ERROR.
  assert.equal(projectedAnonRead(null, true), "PASS");
  const classifiedDenial = (state: string, message: string) =>
    state === "42501" && (/permission denied/i.test(message) || /row-level security/i.test(message));
  assert.equal(classifiedDenial("42501", "permission denied for table accounts"), true);
  assert.equal(classifiedDenial("42501", "new row violates row-level security policy"), true);
  assert.equal(classifiedDenial("23503", "violates foreign key constraint"), false);
  assert.equal(classifiedDenial("42601", "syntax error"), false);
});

test("FFH-P01 regression: DML still reads ROW_COUNT and retains unauthorized-write classification", () => {
  assert.match(
    probeSql,
    /IF mode IN \('COUNT','ANON_SELECT'\) THEN\s+EXECUTE stmt INTO observed;\s+ELSE\s+(?:--[^\n]*\n\s*)?EXECUTE stmt;\s+GET DIAGNOSTICS observed = ROW_COUNT;/,
  );
  assert.match(
    probeSql,
    /ELSIF mode IN \('DENY','FORBIDDEN','ANON_WRITE'\) THEN\s+IF NOT denied AND observed IS DISTINCT FROM 0 THEN\s+RAISE EXCEPTION 'MATRIX_UNAUTHORIZED_WRITE category=% family=%'/,
  );
  assert.match(probeSql, /IF mode IN \('COUNT','ROWS'\) THEN\s+IF denied OR observed IS DISTINCT FROM expected THEN/);
  // These are source-backed modeled results, not SQL execution outcomes.
  const projectedDml = (rowCount: number, denied = false) =>
    !denied && rowCount !== 0 ? "MATRIX_UNAUTHORIZED_WRITE" : "PASS";
  assert.equal(projectedDml(0), "PASS");
  assert.equal(projectedDml(1), "MATRIX_UNAUTHORIZED_WRITE");
  assert.equal(projectedDml(2), "MATRIX_UNAUTHORIZED_WRITE");
  assert.equal(projectedDml(0, true), "PASS");
  assert.match(matrix, /GET DIAGNOSTICS n=ROW_COUNT;/);
});
