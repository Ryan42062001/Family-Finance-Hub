// FFH-P01 RLS-01 targeted locality regression. Runs NO docker/SQL commands.
// It asserts PowerShell source contracts and models the fail-closed predicates.
// A green JS source test is NOT an execution proof on Windows Docker Desktop.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync("scripts/rls-local/source-provenance.ps1", "utf8");
const prepare = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1", "utf8");
const execute = readFileSync("scripts/rls-local/run-owner.ps1", "utf8");

const localPipe = "npipe:////./pipe/dockerDesktopLinuxEngine";
const forbiddenOverrideNames = [
  "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_CONFIG", "DOCKER_TLS",
  "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH", "DOCKER_TLS_CERTDIR",
  "DOCKER_SSH_COMMAND", "DOCKER_API_VERSION", "DOCKER_CUSTOM_HEADERS",
  "DOCKER_MACHINE_HOST", "DOCKER_MACHINE_NAME", "DOCKER_ENDPOINT",
];

// Mirrors the strict, exact source-validated values; not a substitute for
// PowerShell runtime execution. Keep these model values bound to source.
function projectedDaemon(
  endpoint: string | null,
  variables: Record<string, string | undefined>,
  server: { osType: string; product: string; name: string },
): "ALLOW" | "BLOCK" {
  assert.match(shared, /if \(\$Endpoint -cne 'npipe:\/{4}\.\/pipe\/dockerDesktopLinuxEngine'\)/);
  assert.match(shared, /Assert-FfhDockerEnvironment/);
  assert.match(shared, /\$parts\[0\] -cne 'linux'/);
  assert.match(shared, /\$parts\[1\] -notmatch '\^Docker Desktop/);
  assert.match(shared, /\$parts\[2\] -cne 'docker-desktop'/);
  if (Object.keys(variables).some((key) => forbiddenOverrideNames.includes(key.toUpperCase()))) return "BLOCK";
  if (endpoint !== localPipe) return "BLOCK";
  if (server.osType !== "linux" || !/^Docker Desktop(?:\b|$)/.test(server.product) ||
      server.name !== "docker-desktop") return "BLOCK";
  return "ALLOW";
}

const desktop = { osType: "linux", product: "Docker Desktop", name: "docker-desktop" };

test("RLS-01 locality: verified native Windows Docker Desktop Linux named pipe is accepted in model", () => {
  assert.equal(projectedDaemon(localPipe, {}, desktop), "ALLOW");
  assert.match(shared, /PlatformID\]::Win32NT/);
  assert.match(shared, /Get-Command docker -CommandType Application/);
  assert.match(shared, /docker\.exe/);
  assert.match(shared, /context show/);
  assert.match(shared, /context inspect \$contextName/);
  assert.match(shared, /Endpoints\.docker\.Host/);
  assert.match(shared, /Assert-FfhDockerEndpointValue -Endpoint \$endpoint/);
  assert.match(shared, /info --format '\{\{\.OSType\}\}\|\{\{\.OperatingSystem\}\}\|\{\{\.Name\}\}'/);
  assert.doesNotMatch(prepare + execute + shared, /^\s*&\s*docker\s+context\s+use\s/m);
});

test("RLS-01 locality: remote or ambiguous context endpoints always fail closed", () => {
  for (const endpoint of [
    "ssh://ops@example.test", "tcp://10.0.0.2:2376",
    "tcp://127.0.0.1:2375", "unix:///var/run/docker.sock",
    "npipe:////./pipe/docker_engine",
    "npipe:////./pipe/someRemoteProxy",
    "NPIPE:////./pipe/dockerDesktopLinuxEngine",
    "", "garbage", null,
  ]) assert.equal(projectedDaemon(endpoint, {}, desktop), "BLOCK", String(endpoint));
  for (const server of [
    { osType: "linux", product: "Linux", name: "remote-node" },
    { osType: "windows", product: "Docker Desktop", name: "docker-desktop" },
    { osType: "linux", product: "Docker Desktop", name: "remote-node" },
  ]) assert.equal(projectedDaemon(localPipe, {}, server), "BLOCK");
  assert.match(shared, /contexts\.Count -ne 1/);
  assert.match(shared, /Docker context changed before daemon verification/);
  assert.match(shared, /Docker context changed after daemon verification/);
  assert.match(shared, /TLS context material incompatible/);
});

test("RLS-01 locality: any Docker endpoint/TLS/context environment override blocks", () => {
  for (const variable of forbiddenOverrideNames) {
    assert.match(shared, new RegExp(variable));
    assert.equal(projectedDaemon(localPipe, { [variable]: "" }, desktop), "BLOCK", variable);
    assert.equal(projectedDaemon(localPipe, { [variable]: "remote" }, desktop), "BLOCK", variable);
  }
  assert.match(shared, /GetEnvironmentVariables\(\)\.Keys/);
  assert.match(shared, /Docker endpoint\/environment override present/);
  // No silent change of the user's globally selected context or config.
  assert.doesNotMatch(prepare + execute + shared, /^\s*(?:docker|&\s+\$dockerCli\.Source)\s+context\s+use\s/m);
});

function positions(source: string, needles: string[]) {
  return needles.map((needle) => {
    const i = source.indexOf(needle);
    assert.ok(i !== -1, "missing source boundary: " + needle);
    return i;
  });
}

test("RLS-01 locality: both owner entrypoints check daemon before first dangerous command", () => {
  for (const source of [prepare, execute]) {
    const [importAt, localityAt] = positions(source, [
      '. "$PSScriptRoot/source-provenance.ps1"',
      "[void](Assert-FfhLocalDockerDesktop)",
    ]);
    assert.ok(importAt < localityAt);
    const firstDaemonOperation = source.search(/& docker (?:ps|inspect|exec)|& npx --yes supabase@2\.122\.0/);
    assert.ok(firstDaemonOperation > localityAt);
  }
  // Recheck before fresh local start, destructive reset and Docker-local SQL.
  const startPatterns = [
    /\[void\]\(Assert-FfhLocalDockerDesktop\)\s+& npx --yes supabase@2\.122\.0 db start/,
    /\[void\]\(Assert-FfhLocalDockerDesktop\)\s+& npx --yes supabase@2\.122\.0 db reset --local --no-seed/,
    /\[void\]\(Assert-FfhLocalDockerDesktop\)\s+\$readOnly = @\(/,
  ];
  const start = startPatterns.map((pattern) => {
    const matched = pattern.exec(prepare);
    assert.ok(matched, "missing guard-before-operation source: " + pattern);
    return matched.index;
  });
  assert.ok(start[0] < start[1] && start[1] < start[2]);
  assert.match(execute, /\[void\]\(Assert-FfhLocalDockerDesktop\)\s+\$preflightOutput = @\(/);
  assert.match(execute, /\[void\]\(Assert-FfhLocalDockerDesktop\)\s+Get-Content -LiteralPath \(Join-Path \$source\.repo 'scripts\/rls-local\/matrix\.sql'\)/);
  assert.match(shared, /function Assert-FfhDbLoopback \{[\s\S]*?\[void\]\(Assert-FfhLocalDockerDesktop\)\s+\$raw = & docker inspect/);
});

test("RLS-01 locality: fresh root is fixed-drive direct-child of profile with no reparse chain", () => {
  for (const snippet of [
    "Assert-FfhNoReparsePath -Path $home",
    "Assert-FfhFreshTree -FreshRoot $root",
    "[IO.DriveType]::Fixed",
    "[IO.FileAttributes]::ReparsePoint",
    "[Environment+SpecialFolder]::UserProfile",
    "Split-Path $root -Parent",
    "supabase/migrations",
    "supabase/config.toml",
    "ffh-p01-local-provenance.json",
    "Get-ChildItem -LiteralPath $migrations -Force",
  ]) assert.ok(shared.includes(snippet), "missing root guard " + snippet);
  assert.match(prepare, /Assert-FfhFreshTree -FreshRoot \$root/);
  assert.match(execute, /Assert-FfhFreshTree -FreshRoot \$root/);
  assert.match(prepare, /if \(Test-Path -LiteralPath \$root\)/);
  assert.match(shared, /fresh project must be direct child of local Windows profile/);
});
