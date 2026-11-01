// FFH-P01 #83: real Windows PowerShell 5.1 functions driven by fake Docker.
// No Docker/SQL/hosted calls; never invoke either owner entrypoint.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const harness = String.raw\`
$ErrorActionPreference='Stop'
. (Join-Path (Get-Location).Path 'scripts/rls-local/automatic-cleanup.ps1')
. (Join-Path (Get-Location).Path 'scripts/rls-local/cleanup-executor.ps1')
$sha='a'*40
$tok='b'*24
$i=Get-FfhRunIdentity -SourceSha $sha -RunToken $tok
$script:mode='EMPTY'
$script:containerId='c'*64
$script:containerName='supabase_db_'+$i.project
$fake = {
  param([string[]]$argv)
  $cmd=$argv -join ' '
  if ($argv[0] -ceq 'info') { return 'mock-daemon-1234' }
  if ($argv[0] -ceq 'ps') {
    if ($cmd -match '--filter label=') {
      if ($script:mode -ceq 'LABELLED') { return $script:containerId }
      return
    }
    if ($script:mode -ceq 'UNLABELLED') {return ($script:containerId+' '+$script:containerName)}
    if ($script:mode -ceq 'PRESENT') {return $script:containerId}
    return
  }
  if ($argv[0] -ceq 'volume' -or $argv[0] -ceq 'network') {return}
  if ($argv[0] -ceq 'inspect') {
    $last=$argv[$argv.Count-1]
    if ($last -ceq '{{.Name}}') {return ('/'+$script:containerName)}
    if ($last -ceq '{{.Id}}') {return $script:containerId}
    if ($last -ceq '{{json .Config.Labels}}') {
      return ('{"com.supabase.cli.project":"'+$i.project+'","com.docker.compose.project":"wrong"}')
    }
    if ($last -ceq '{{json .Mounts}}') {return '[]'}
    if ($last -ceq '{{json .NetworkSettings.Networks}}') {return '{}'}
    if ($last -ceq '{{.State.Running}}') {return 'false'}
  }
  throw 'FAKE_UNHANDLED_COMMAND'
}
function Check([string]$label,[scriptblock]$action) {
  & $action
  [Console]::Out.WriteLine('PASS '+$label)
}
function MustThrow([scriptblock]$action) {
  $failed=$false
  try { & $action | Out-Null } catch {$failed=$true}
  if (-not $failed) {throw 'MOCK_EXPECTED_BLOCK'}
}
Check 'identity-length' {if ($i.project.Length -ne 39){throw 'bad length'}}
Check 'identity-full-token' {if (-not $i.project.EndsWith($tok)){throw 'truncated'}}
Check 'identity-unique' {if ((Get-FfhRunIdentity -SourceSha $sha -RunToken ('d'*24)).project -ceq $i.project){throw 'collision'}}
Check 'bad-token' {MustThrow {Get-FfhRunIdentity -SourceSha $sha -RunToken '*'}}
Check 'bad-sha' {MustThrow {Get-FfhRunIdentity -SourceSha 'bad' -RunToken $tok}}
Check 'local-daemon-metadata' {if ((Get-FfhObservedDaemon -Fake $fake) -cne 'mock-daemon-1234'){throw 'daemon mismatch'}}
Check 'empty-precreation' {Assert-FfhPrecreationNamespace -Identity $i -Fake $fake}
Check 'labelled-precreation-block' {$script:mode='LABELLED';MustThrow {Assert-FfhPrecreationNamespace -Identity $i -Fake $fake};$script:mode='EMPTY'}
Check 'unlabelled-precreation-block' {$script:mode='UNLABELLED';MustThrow {Assert-FfhPrecreationNamespace -Identity $i -Fake $fake};$script:mode='EMPTY'}
Check 'stopped-sql-idle' {if ((Get-FfhSqlIdleAttestation -Identity $i -Fake $fake) -cne 'VERIFIED_DAEMON_SQL_IDLE'){throw 'idle unknown'}}
Check 'dual-label-conflict-block' {$script:mode='LABELLED';MustThrow {Get-FfhResourceSnapshot -Identity $i -Fake $fake};$script:mode='EMPTY'}
Check 'mock-exact-action-pass' {Invoke-FfhExactDockerCommand -Arguments @('rm',('c'*64)) -Fake {param($a) 'EXIT_ZERO'}}
Check 'mock-exact-action-fail' {MustThrow {Invoke-FfhExactDockerCommand -Arguments @('rm',('c'*64)) -Fake {param($a) 'BLOCKED'}}}
Check 'exact-absence-pass' {Test-FfhExactAbsent -Kind 'containers' -Id $script:containerId -Fake $fake}
Check 'exact-absence-refused' {$script:mode='PRESENT';MustThrow {Test-FfhExactAbsent -Kind 'containers' -Id $script:containerId -Fake $fake};$script:mode='EMPTY'}
\`;

test("FFH-P01 PowerShell 5.1 real adapter functions: 15 isolated fake-Docker faults", () => {
  const interpreter = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const result = spawnSync(interpreter,
    ["-NoLogo","-NoProfile","-NonInteractive","-Command",harness],
    {encoding:"utf8",windowsHide:true,timeout:45_000});
  assert.ifError(result.error);
  assert.equal(result.status,0,
    "WinPS fake-adapter failure:\n"+result.stdout+"\n"+result.stderr);
  assert.equal((result.stdout.match(/^PASS /gm)??[]).length,15,result.stdout);
  assert.doesNotMatch(result.stdout,/password|apikey|secret/i);
});
