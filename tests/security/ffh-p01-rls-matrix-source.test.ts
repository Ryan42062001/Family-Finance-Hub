// Static contract checks only. These tests NEVER connect to PostgreSQL or
// prove RLS enforcement. An independent reviewer must witness a real local run.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const matrix = readFileSync("scripts/rls-local/matrix.sql", "utf8");
const preflight = readFileSync("scripts/rls-local/preflight.sql", "utf8");
const owner = readFileSync("scripts/rls-local/run-owner.ps1", "utf8");
const fresh = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1", "utf8");
const provenance = readFileSync("scripts/rls-local/source-provenance.ps1", "utf8");

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
  assert.match(owner, /Assert-FfhDbLoopback/);
  assert.match(owner, /FreshRoot/);
  assert.match(provenance, /54332/);
  assert.match(provenance, /127\.0\.0\.1/);
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


// RLS-01/02/03 remediation verification is SOURCE-LEVEL only: no Docker,
// local database, authenticated impersonation or SQL is run by these tests.
test("FFH-P01 RLS-01 pins all migration blobs and whole checkout to immutable HEAD", () => {
  assert.match(provenance, /git -C \$root status --porcelain=v1 --untracked-files=all/);
  assert.match(provenance, /git -C \$root rev-parse HEAD/);
  assert.match(provenance, /phase\/ffh-p01-release-readiness/);
  assert.match(provenance, /git -C \$root ls-files -- 'supabase\/migrations\/\*\.sql'/);
  assert.match(provenance, /\$migrationNames\.Count -ne 15/);
  assert.match(provenance, /git -C \$root rev-parse --verify \$refName/);
  assert.match(provenance, /git -C \$root hash-object -- \$relative/);
  assert.match(provenance, /Get-FileHash -LiteralPath \$absolute -Algorithm SHA256/);
  for (const path of [
    "scripts/rls-local/matrix.sql",
    "scripts/rls-local/preflight.sql",
    "scripts/rls-local/run-owner.ps1",
    "scripts/rls-local/prepare-fresh-owner.ps1",
    "scripts/rls-local/source-provenance.ps1",
    "scripts/rls-local/run.sh",
    ".github/workflows/ci.yml",
    "scripts/validate-release-candidate.mjs",
    "AGENTS.md",
    "docs/WORKFLOW.md",
  ]) assert.ok(provenance.includes(path), "missing provenance path " + path);
  assert.match(provenance, /supabase\/\.temp\/project-ref/);
  assert.match(provenance, /SUPABASE_ACCESS_TOKEN/);
  assert.match(provenance, /DATABASE_URL/);
});

test("FFH-P01 RLS-01 fresh-DB plan never resets the existing owner's project", () => {
  assert.match(fresh, /FFH-P01-FRESH-LOCAL-GO/);
  assert.match(fresh, /Assert-FfhSourceCheckout -ExpectedHead \$ExpectedHead/);
  assert.match(fresh, /Assert-FfhFreshRoot/);
  assert.match(fresh, /if \(Test-Path -LiteralPath \$root\)/);
  assert.match(fresh, /Get-FileHash -LiteralPath \$dest -Algorithm SHA256/);
  assert.match(fresh, /Invoke-FfhPinnedLocalSupabase -Operation Start/);
  assert.match(fresh, /Invoke-FfhPinnedLocalSupabase -Operation Reset/);
  assert.match(provenance, /--yes supabase@2\.122\.0/);
  assert.match(provenance, /db reset --local --no-seed/);
  assert.match(fresh, /Assert-FfhDbLoopback -Container \$containerName/);
  assert.match(fresh, /OWNER_OPERATED_NEW_PROJECT_RESET_APPLIED_AND_PREFLIGHT_PASS/);
  assert.match(fresh, /ffh-p01-local-provenance\.sha256/);
  assert.match(provenance, /project_id = "\$projectId"/);
  assert.match(provenance, /port = 54332/);
  assert.match(provenance, /shadow_port = 54333/);
  assert.match(provenance, /FFH-P01-RLS-Fresh-/);
  assert.match(owner, /FFH-P01-RLS-EXECUTION-GO/);
  assert.match(owner, /Assert-FfhSourceCheckout -ExpectedHead \$ExpectedHead/);
  assert.match(owner, /Assert-FfhDbLoopback -Container \$container/);
  assert.match(owner, /receipt\.migration_application -cne 'OWNER_OPERATED_NEW_PROJECT_RESET_APPLIED_AND_PREFLIGHT_PASS'/);
  assert.match(owner, /receipt\.config_sha256/);
  assert.match(owner, /receipt\.source_sha256/);
  assert.match(owner, /Get-FileHash -LiteralPath \$copy -Algorithm SHA256/);
  assert.match(owner, /MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW/);
  assert.doesNotMatch(owner + fresh, /supabase@2\.122\.0 db reset --linked/);
  // Inspect executable CLI invocations only: comments intentionally describe
  // fail-closed hosted-link checks and must not create a false CI failure.
  const cliCommands = (owner + "\n" + fresh).split("\n")
    .filter((line) => /^\s*& npx\s/.test(line)).join("\n");
  assert.doesNotMatch(cliCommands, /supabase link|--db-url|--project-ref/i);
});

test("FFH-P01 RLS-02 checks both person-two constraints in both directions without CHECK masking", () => {
  const names = [
    "household_hsa_married_allocations_person_two_fkey",
    "household_hsa_legal_spouse_authorities_person_two_fkey",
  ];
  for (const name of names) {
    assert.equal(matrix.split("'" + name + "'").length - 1, 1, "expected one direct named person-two FK probe");
  }
  // Postgres UUID byte ordering agrees with these deterministic fixture IDs.
  const aLocalFirst = "00000000-0000-4000-8000-000000000101";
  const bForeignSecond = "00000000-0000-4000-8000-000000000202";
  const bLocalFirst = "00000000-0000-4000-8000-000000000301";
  const aForeignSecond = "00000000-0000-4000-8000-000000000402";
  assert.ok(aLocalFirst < bForeignSecond);
  assert.ok(bLocalFirst < aForeignSecond);
  for (const id of [aLocalFirst, bForeignSecond, bLocalFirst, aForeignSecond]) {
    assert.ok(matrix.includes(id), "missing ordered spouse synthetic UUID");
  }
  assert.match(matrix, /a_spouse_first < b_spouse_second AND b_spouse_first < a_spouse_second/);
  assert.match(matrix, /\(a_owner,a,a_spouse_first,b_spouse_second,'A_TO_B'\)/);
  assert.match(matrix, /\(b_owner,b,b_spouse_first,a_spouse_second,'B_TO_A'\)/);
  assert.match(matrix, /principal\.valid_local_one < principal\.foreign_second/);
  assert.match(matrix, /id=principal\.valid_local_one AND household_id=principal\.own_house/);
  assert.match(matrix, /id=principal\.foreign_second AND household_id<>principal\.own_house/);
  assert.match(matrix, /'FK',NULL,'cross-fk-spouse-two'/);
  assert.match(matrix, /mode='FK' AND error_state='23503'/);
  assert.match(matrix, /error_constraint=wanted_constraint/);
  assert.match(matrix, /MATRIX_SPOUSE_SECOND_FK_FIXTURE_INVALID/);
  // The independent audit's historical 909 receipts gain exactly 4 new
  // sibling-FK error receipts (2 table families x 2 direction instances).
  assert.equal(39 + 728 + 52 + 26 + (18 + 4) + 46, 913);
});

test("FFH-P01 RLS-03 tests authenticated creator inserts, owner trigger cardinality, and role restoration", () => {
  const begin = matrix.indexOf("-- RLS-03: actual creator bootstrap");
  const end = matrix.indexOf("INSERT INTO public.household_members(household_id,user_id,role)",begin);
  assert.ok(begin >= 0 && end > begin);
  const bootstrap = matrix.slice(begin,end);
  assert.equal(bootstrap.split("EXECUTE 'SET LOCAL ROLE authenticated';").length - 1, 2);
  assert.equal(bootstrap.split("EXECUTE 'RESET ROLE';").length - 1, 2);
  assert.equal(bootstrap.split("INSERT INTO public.households(id,name,created_by)").length - 1, 2);
  assert.equal(bootstrap.split("RETURNING id INTO row_id;").length - 1, 2);
  assert.match(bootstrap, /current_user <> 'authenticated'/);
  assert.match(bootstrap, /auth\.uid\(\) IS DISTINCT FROM a_owner/);
  assert.match(bootstrap, /auth\.uid\(\) IS DISTINCT FROM b_owner/);
  assert.match(bootstrap, /rolbypassrls OR rolsuper/);
  assert.match(bootstrap, /current_user <> 'postgres' OR auth\.uid\(\) IS NOT NULL/);
  assert.match(bootstrap, /SELECT count\(\*\) FROM public\.household_members WHERE household_id=a\) <> 1/);
  assert.match(bootstrap, /SELECT count\(\*\) FROM public\.household_members WHERE household_id=b\) <> 1/);
  assert.match(matrix, /'creator-bootstrap','households'/);
  assert.match(matrix, /'creator-forged-insert','households'/);
  assert.match(matrix, /ROLLBACK;\s+\\echo MATRIX_ROLLBACK_COMPLETE/);
});
