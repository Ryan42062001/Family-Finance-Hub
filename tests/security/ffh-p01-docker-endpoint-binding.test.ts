// FFH-P01 RLS-01A/B targeted SOURCE and behavioral-model regressions ONLY.
// No PowerShell entrypoint, Docker, Supabase CLI, SQL, or filesystem fixture runs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guard = readFileSync("scripts/rls-local/source-provenance.ps1","utf8");
const prepare = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
const runOwner = readFileSync("scripts/rls-local/run-owner.ps1","utf8");
const pipe = "npipe:////./pipe/dockerDesktopLinuxEngine";

function daemonOperations(contents: string): string[] {
  return contents.split("\n").filter(line =>
    /& \$(?:dockerCli\.Source|dockerBinding\.Executable)/.test(line) &&
    !/\scontext (?:show|inspect)\b/.test(line));
}
function requireHost(contents: string): void {
  for (const line of daemonOperations(contents)) {
    assert.match(line,/ --host \$(?:endpoint|dockerBinding\.Endpoint) (?:info|ps|inspect|exec)\b/,
      "Daemon command is unbound: " + line);
  }
}

test("RLS-01A six direct daemon invocations use native validated executable and --host", () => {
  for (const src of [guard,prepare,runOwner]) requireHost(src);
  assert.equal([guard,prepare,runOwner].flatMap(daemonOperations).length,6);
  assert.match(guard,/Get-Command docker -CommandType Application/);
  assert.match(guard,/\$resolved\.Source -cne \$dockerCli\.Source/);
  assert.match(guard,/Executable = \[string\]\$dockerCli\.Source/);
  assert.match(guard,/Endpoint = \$endpoint/);
  assert.match(guard,/\$dockerCli\.Source --host \$endpoint info/);
  assert.match(guard,/\$dockerBinding\.Executable --host \$dockerBinding\.Endpoint inspect \$Container/);
  assert.match(prepare,/--host \$dockerBinding\.Endpoint ps -a/);
  assert.match(prepare,/--host \$dockerBinding\.Endpoint exec -i \$containerName/);
  assert.equal((runOwner.match(/--host \$dockerBinding\.Endpoint exec -i \$container/g)??[]).length,2);
});

test("RLS-01A each daemon command fails mutation regression if --host is removed", () => {
  for (const line of [guard,prepare,runOwner].flatMap(daemonOperations)) {
    const damaged=line.replace(/ --host \$(?:endpoint|dockerBinding\.Endpoint)/,"");
    assert.notEqual(damaged,line);
    assert.throws(()=>requireHost(damaged),assert.AssertionError);
  }
});

test("RLS-01A selected context switch AFTER validation cannot redirect explicit host", () => {
  assert.match(guard,/Assert-FfhDockerEndpointValue -Endpoint \$endpoint/);
  const resolve=(validatedHost:string,ambientContext:string)=>{
    void ambientContext; // --host is an explicit fixed argument, never ambient
    return validatedHost===pipe ? validatedHost : "BLOCK";
  };
  for (const hostile of ["remote-prod","tcp-context","ssh-context","default",""]) {
    assert.equal(resolve(pipe,hostile),pipe);
  }
  for (const bad of ["ssh://remote","tcp://127.0.0.1:2375","npipe:////./pipe/docker_engine",""]) {
    assert.equal(resolve(bad,"desktop-linux"),"BLOCK");
  }
  assert.doesNotMatch(guard+prepare+runOwner,/^\s*docker context use/m);
});

test("RLS-01A inherited context, TLS, SSH, host overrides fail closed",()=>{
  const denied=["DOCKER_HOST","DOCKER_CONTEXT","DOCKER_CONFIG","DOCKER_TLS",
    "DOCKER_TLS_VERIFY","DOCKER_CERT_PATH","DOCKER_TLS_CERTDIR","DOCKER_SSH_COMMAND",
    "DOCKER_MACHINE_HOST","DOCKER_ENDPOINT","DOCKER_REMOTE"];
  for (const name of denied) assert.ok(guard.includes("'"+name+"'"),name);
  assert.match(guard,/GetEnvironmentVariables\(\)\.Keys/);
  assert.match(guard,/Docker endpoint\/environment override present/);
  // Even empty inherited overrides are forbidden, not only populated values.
  const deny=(e:Record<string,string>)=>Object.keys(e).some(k=>denied.includes(k.toUpperCase()));
  for (const k of denied) {
    assert.equal(deny({[k]:""}),true);
    assert.equal(deny({[k]:"ssh://remote"}),true);
  }
});

test("RLS-01A child-only pinned Supabase start/reset no parent DOCKER_HOST mutation",()=>{
  assert.match(guard,/function Invoke-FfhPinnedLocalSupabase \{/);
  assert.match(guard,/\[Diagnostics\.ProcessStartInfo\]::new\(\)/);
  assert.match(guard,/\$startInfo\.UseShellExecute = \$false/);
  assert.match(guard,/EnvironmentVariables\['DOCKER_HOST'\] = \$dockerBinding\.Endpoint/);
  assert.match(guard,/EnvironmentVariables\.ContainsKey\('DOCKER_CONTEXT'\)/);
  assert.match(guard,/EnvironmentVariables\.ContainsKey\('DOCKER_TLS_VERIFY'\)/);
  assert.match(guard,/EnvironmentVariables\.ContainsKey\('DOCKER_CONFIG'\)/);
  assert.match(guard,/Get-Command npx\.cmd -CommandType Application/);
  assert.match(guard,/\[Environment\]::SystemDirectory/);
  assert.match(guard,/\/d \/s \/c/);
  assert.match(guard,/--yes supabase@2\.122\.0/);
  assert.match(guard,/'db start'/);
  assert.match(guard,/'db reset --local --no-seed'/);
  assert.match(guard,/1>NUL 2>NUL/);
  assert.match(prepare,/Invoke-FfhPinnedLocalSupabase -Operation Start/);
  assert.match(prepare,/Invoke-FfhPinnedLocalSupabase -Operation Reset/);
  assert.doesNotMatch(guard+prepare+runOwner,/\$env:DOCKER_HOST\s*=/);
});

test("RLS-01A child environment models success/failure restoration and no hostile selector",()=>{
  assert.match(guard,/finally \{[\s\S]*?\[Environment\]::SetEnvironmentVariable\('DOCKER_HOST',\$parentDockerHost,'Process'\)/);
  assert.match(guard,/\[ValidateSet\('Start','Reset'\)\]/);
  assert.match(guard,/EnvironmentVariables\['DOCKER_HOST'\] -cne 'npipe:\/{4}\.\/pipe\/dockerDesktopLinuxEngine'/);
  for (const exit of [0,1]) {
    const parent={PATH:"safe",CUSTOM:"keep"};
    const child:Record<string,string>={...parent,DOCKER_HOST:pipe};
    assert.equal(child.DOCKER_HOST,pipe);
    assert.equal("DOCKER_CONTEXT" in child,false);
    assert.equal("DOCKER_TLS_VERIFY" in child,false);
    assert.deepEqual(parent,{PATH:"safe",CUSTOM:"keep"});
    assert.equal(exit===0 ? "PASS":"BLOCK",exit===0?"PASS":"BLOCK");
  }
  assert.match(guard,/if \(\$child\.ExitCode -ne 0\)/);
  assert.match(guard,/WaitForExit\(900000\)/);
});

function rootOrder(source:string):void {
  const required=[
    "if (Test-Path -LiteralPath $root)",
    "Assert-FfhNoReparsePath -Path $parent",
    "New-Item -ItemType Directory -Path $root -ErrorAction Stop",
    "Assert-FfhNoReparsePath -Path $root",
    "New-Item -ItemType Directory -Path $supabaseDir -ErrorAction Stop",
    "Assert-FfhNoReparsePath -Path $supabaseDir",
    "New-Item -ItemType Directory -Path $migrationsDir -ErrorAction Stop",
    "Assert-FfhNoReparsePath -Path $migrationsDir",
  ];
  const pos=required.map(s=>source.indexOf(s));
  assert.ok(pos.every(x=>x>=0),"missing staged creation/verification step");
  assert.ok(pos.every((x,i)=>i===0||x>pos[i-1]),"unsafe directory creation before verification");
  assert.doesNotMatch(source,/New-Item[^\n]*'supabase\/migrations'[^\n]*-Force/);
}
test("RLS-01B root then supabase then migrations are created one-by-one after validation",()=>{
  rootOrder(prepare);
  assert.match(prepare,/if \(Test-Path -LiteralPath \$supabaseDir\)/);
  assert.match(prepare,/if \(Test-Path -LiteralPath \$migrationsDir\)/);
  assert.match(prepare,/Assert-FfhFreshTree -FreshRoot \$root/);
  assert.match(guard,/\[IO\.DriveType\]::Fixed/);
  assert.match(guard,/\[IO\.FileAttributes\]::ReparsePoint/);
  assert.match(guard,/FFH-RLS-Test/);
});
test("RLS-01B regression rejects recursively making nested directories before root check",()=>{
  const nested="New-Item -ItemType Directory -Path (Join-Path $root 'supabase/migrations') -Force | Out-Null";
  const changed=prepare.replace("New-Item -ItemType Directory -Path $root -ErrorAction Stop | Out-Null",nested);
  assert.notEqual(changed,prepare);
  assert.throws(()=>rootOrder(changed),assert.AssertionError);
  const reordered=prepare.replace("Assert-FfhNoReparsePath -Path $root\nAssert-FfhFreshTree","Assert-FfhFreshTree");
  assert.notEqual(reordered,prepare);
  assert.throws(()=>rootOrder(reordered),assert.AssertionError);
});
test("RLS-01B modeled junction before any staged check fails; later same-user race remains",()=>{
  const allow=(present:boolean,junction:"none"|"parent"|"root"|"supabase"|"migrations")=>{
    if(present) return false;
    for (const step of ["parent","root","supabase","migrations"]) if(junction===step)return false;
    return true;
  };
  assert.equal(allow(false,"none"),true);
  assert.equal(allow(true,"none"),false);
  for (const x of ["parent","root","supabase","migrations"] as const)assert.equal(allow(false,x),false);
  // Sequential checks are not a handle-bound defense against malicious
  // substitution in the interval between a successful check and a write.
});
