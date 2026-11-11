import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// Executes the real project_resources() function from the CI runner against a
// fake `docker` command (no Docker, network or database involved).
const runner = readFileSync(new URL("../../scripts/rls-ci/run-matrix.sh", import.meta.url), "utf8");
const fn = runner.match(/^project_resources\(\) \{[\s\S]*?^\}$/m)?.[0];

function inventory(fakeDocker: string): { status: number | null; stdout: string } {
  assert.ok(fn, "project_resources() not found in run-matrix.sh");
  const dir = mkdtempSync(join(tmpdir(), "ffh-fake-docker-"));
  try {
    writeFileSync(join(dir, "docker"), "#!/usr/bin/env bash\n" + fakeDocker);
    chmodSync(join(dir, "docker"), 0o755);
    const script = `set -euo pipefail\nPROJECT_ID=ffh_ci_rls_1_1\n${fn}\nout="$(project_resources)" || exit 7\nprintf '%s' "$out"`;
    const result = spawnSync("bash", ["-c", script], { env: { PATH: `${dir}:/usr/bin:/bin` } as unknown as NodeJS.ProcessEnv, encoding: "utf8" });
    return { status: result.status, stdout: result.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("FFH-P01 runner inventory reports nothing when no run resources exist", () => {
  assert.deepEqual(inventory('echo "unrelated_container"'), { status: 0, stdout: "" });
});

test("FFH-P01 runner inventory lists leftover resources of this run", () => {
  const r = inventory('case "$1" in ps) echo supabase_db_ffh_ci_rls_1_1;; volume) echo supabase_db_ffh_ci_rls_1_1;; *) echo bridge;; esac');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /supabase_db_ffh_ci_rls_1_1/);
});

test("FFH-P01 runner inventory fails (never 'empty') when Docker cannot be inspected", () => {
  for (const failing of ["ps", "volume", "network"]) {
    const r = inventory(`[ "$1" = "${failing}" ] && { echo "daemon unavailable" >&2; exit 1; }; echo ok`);
    assert.equal(r.status, 7, `inspection failure in docker ${failing} must propagate`);
  }
});
