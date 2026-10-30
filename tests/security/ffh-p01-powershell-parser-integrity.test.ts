// FFH-P01 source-integrity guard. Does NOT execute/dot-source any .ps1 file.
// The only PowerShell operation is Parser.ParseFile: syntax/AST validation.
// Canonical FAST runs npm run test:security on windows-latest.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const paths = [
  "scripts/rls-local/source-provenance.ps1",
  "scripts/rls-local/prepare-fresh-owner.ps1",
  "scripts/rls-local/run-owner.ps1",
] as const;
const shared = readFileSync(paths[0], "utf8");

function functionRegion(source: string, name: string, successor?: string): string {
  const start = source.indexOf(`function ${name} {`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const end = successor ? source.indexOf(`function ${successor} {`, start + 1) : source.length;
  assert.ok(end > start, `Missing successor for ${name}`);
  return source.slice(start, end);
}

function assertNoInjectedInspection(source: string): void {
  const environment = functionRegion(source, "Assert-FfhDockerEnvironment", "Assert-FfhLocalDockerDesktop");
  const locality = functionRegion(source, "Assert-FfhLocalDockerDesktop", "Assert-FfhNoReparsePath");
  const loopback = functionRegion(source, "Assert-FfhDbLoopback");

  // Anchored, quoted single-line patterns immediately close their if conditions.
  assert.ok(environment.includes(
    "$name -match '^(?i:DOCKER_(HOST|CONTEXT|CONFIG|TLS.*|CERT.*|SSH.*|MACHINE.*|ENDPOINT.*|SOCKET.*|REMOTE.*))$') {",
  ), "Environment Docker override regex must be anchored and correctly terminated");
  assert.ok(locality.includes(
    "$contextName -cnotmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$') {",
  ), "Context-name regex must be anchored and correctly terminated");

  // The accidental insertion was a complete copy of the DB inspection body
  // under each regex. No DB inspector commands or parameters belong in guards.
  for (const region of [environment, locality]) {
    assert.doesNotMatch(region, /param\(\[Parameter\(Mandatory=\$true\)\]\[string\]\$Container\)/);
    assert.doesNotMatch(region, /\bdocker\s+inspect\s+\$Container\b/);
    assert.doesNotMatch(region, /NetworkSettings\.Ports/);
    assert.doesNotMatch(region, /\$bindings\s*=\s*@\(/);
  }
  assert.equal((source.match(/function Assert-FfhDbLoopback \{/g) ?? []).length, 1);
  assert.equal((source.match(/\$raw\s*=\s*&\s*\$dockerBinding\.Executable\s+--host\s+\$dockerBinding\.Endpoint\s+inspect\s+\$Container\b/g) ?? []).length, 1);
  assert.equal((source.match(/NetworkSettings\.Ports\.'5432\/tcp'/g) ?? []).length, 1);
  assert.equal((source.match(/param\(\[Parameter\(Mandatory=\$true\)\]\[string\]\$Container\)/g) ?? []).length, 1);
  assert.match(loopback, /\$dockerBinding = Assert-FfhLocalDockerDesktop\s+\$raw = & \$dockerBinding\.Executable --host \$dockerBinding\.Endpoint inspect \$Container/);
  assert.match(loopback, /\$binding\.HostPort -cne '54332'/);
  assert.match(loopback, /\$binding\.HostIp -cnotin @\('127\.0\.0\.1','::1'\)/);
}

test("RLS-01 corrected Docker locality guards contain no injected DB inspection bodies", () => {
  assertNoInjectedInspection(shared);
});

test("RLS-01 regression rejects an inspector inserted inside DOCKER_* regex", () => {
  const anchor = "$name -match '^(?i:DOCKER_(HOST|CONTEXT|CONFIG|TLS.*|CERT.*|SSH.*|MACHINE.*|ENDPOINT.*|SOCKET.*|REMOTE.*))$') {";
  assert.ok(shared.includes(anchor));
  const bad = shared.replace(anchor, anchor + "\n  param([Parameter(Mandatory=$true)][string]$Container)\n  $raw = & docker inspect $Container");
  assert.throws(() => assertNoInjectedInspection(bad), assert.AssertionError);
});

test("RLS-01 regression rejects an inspector inserted inside selected-context regex", () => {
  const anchor = "$contextName -cnotmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$') {";
  assert.ok(shared.includes(anchor));
  const bad = shared.replace(anchor, anchor + "\n  param([Parameter(Mandatory=$true)][string]$Container)\n  $raw = & docker inspect $Container");
  assert.throws(() => assertNoInjectedInspection(bad), assert.AssertionError);
});

test("RLS-01 regression rejects duplicated DB port-inspection body", () => {
  const anchor = "$bindings = @($d[0].NetworkSettings.Ports.'5432/tcp')";
  assert.ok(shared.includes(anchor));
  const bad = shared.replace(anchor, anchor + "\n  " + anchor);
  assert.throws(() => assertNoInjectedInspection(bad), assert.AssertionError);
});

test("Windows PowerShell AST parser-only check fails on syntax errors in all three entrypoints", () => {
  const interpreter = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$files = @(" + paths.map((p) => "'" + p + "'").join(", ") + ")",
    "foreach ($file in $files) {",
    "  $path = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path $file))",
    "  $tokens = $null",
    "  $parseErrors = $null",
    "  $ast = [System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$parseErrors)",
    "  if ($null -eq $ast -or ($null -ne $parseErrors -and $parseErrors.Count -gt 0)) {",
    "    foreach ($problem in $parseErrors) {",
    "      [Console]::Error.WriteLine(('PARSE_ERROR {0} line={1}: {2}' -f $file, $problem.Extent.StartLineNumber, $problem.Message))",
    "    }",
    "    throw ('PowerShell AST parse failed: ' + $file)",
    "  }",
    "  [Console]::Out.WriteLine('PARSE_OK ' + $file)",
    "}",
  ].join("\n");
  // -Command invokes only the PowerShell language parser. It does NOT use
  // -File, dot-source, eval, Docker, Supabase, SQL or the owner entrypoints.
  const result = spawnSync(interpreter, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script,
  ], { cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 30_000 });
  assert.ifError(result.error); // Includes ENOENT: missing interpreter is FAIL, never skip.
  assert.equal(result.status, 0, `PowerShell parser failed (or unavailable):\n${result.stdout}\n${result.stderr}`);
  for (const path of paths) {
    assert.ok(result.stdout.includes("PARSE_OK " + path), `Missing AST parse receipt for ${path}`);
  }
});
