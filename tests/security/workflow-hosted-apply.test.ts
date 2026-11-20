// Workflow improvement after FFH-P09: one-paste hosted apply file (scripts/hosted/build-apply.mjs).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error plain ESM script without type declarations
import { buildApply } from "../../scripts/hosted/build-apply.mjs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const migrationPath = "supabase/migrations/20261120100000_ffh_p11_set_aside_integrity.sql"; // the newest migration
const inputs = {
  migrationPath,
  migrationSql: read(migrationPath),
  paritySql: read("scripts/rls-local/parity.sql"),
  expectedText: read("scripts/rls-local/parity.expected.txt"),
  stripCrSql: read("scripts/rls-local/strip-cr.sql"),
  checksSql: read("scripts/hosted/checks/20261120100000.sql"),
};

test("one-paste apply: single transaction, pre-check, record, paste repair, checks, parity, all-or-nothing", () => {
  const sql: string = buildApply(inputs);
  assert.equal((sql.match(/^begin;$/gm) ?? []).length, 1, "exactly one begin");
  assert.equal((sql.match(/^commit;$/gm) ?? []).length, 1, "exactly one commit");
  const order = ["pre-check expected 27 recorded migrations", "alter column reserved_amount type numeric", "insert into supabase_migrations.schema_migrations(version, name) values ('20261120100000', 'ffh_p11_set_aside_integrity')",
    "execute replace(pg_get_functiondef(f.oid), E'\\r', '')", "phase check: ", "create temp table ffh_apply_parity as", "FFH_APPLY_FAIL nothing was applied: %", "commit;"];
  let at = -1;
  for (const marker of order) {
    const i = sql.indexOf(marker, at + 1);
    assert.ok(i > at, `out of order or missing: ${marker}`);
    at = i;
  }
  for (const row of read("scripts/rls-local/parity.expected.txt").trim().split("\n")) {
    const [section, items, fp] = row.split("|");
    assert.ok(sql.includes(`('${section}', ${items}, '${fp}')`), `expected parity row ${section}`);
  }
  assert.doesNotMatch(sql, /\r/);
  assert.doesNotMatch(sql, /^\s*--.*\n\s*begin;\s*\n[\s\S]*^\s*begin;/m, "the migration's own begin is removed");
});

test("one-paste apply refuses ambiguous inputs", () => {
  assert.throws(() => buildApply({ ...inputs, migrationPath: "supabase/migrations/bad name.sql" }));
  assert.throws(() => buildApply({ ...inputs, migrationSql: "begin;\nselect 1;\nbegin;\ncommit;\ncommit;" }));
  assert.throws(() => buildApply({ ...inputs, expectedText: "migrations|x|y" }));
  assert.throws(() => buildApply({ ...inputs, stripCrSql: "select 1;" }));
});

test("CI rehearses the newest migration's one-paste file (CRLF paste and a must-fail control)", () => {
  const ci = read(".github/workflows/ci.yml");
  const job = ci.slice(ci.indexOf("  rls-matrix:"), ci.indexOf("  full-phase:"));
  assert.match(job, /run: bash scripts\/rls-ci\/hosted-rehearsal\.sh/);
  const script = read("scripts/rls-ci/hosted-rehearsal.sh");
  assert.match(script, /GITHUB_ACTIONS:-\}" == "true"/);
  assert.match(script, /== "HOSTED_REHEARSAL_PASS" \]\]/);
  const harness = read("scripts/rls-local/local-harness/run.sh");
  assert.match(harness, /sed 's\/\$\/\\r\/'/, "pasted with CRLF");
  assert.match(harness, /FFH_APPLY_FAIL nothing was applied: parity: /);
  assert.match(harness, /HOSTED_REHEARSAL_FAIL negative-left-changes/);
});
