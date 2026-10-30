// FFH-P01 real Windows PowerShell 5.1 native stderr/version-probe regressions.
// Executes only the AST-extracted pure version helper and harmless built-in
// cmd.exe echo emitters. No owner entrypoint, Docker, npx, Supabase, SQL,
// database, local job-runner, downloaded package or file writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const prepare = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1", "utf8");
const shared = readFileSync("scripts/rls-local/source-provenance.ps1", "utf8");
const ownerMatrix = readFileSync("scripts/rls-local/run-owner.ps1", "utf8");

const labels = [
  "notice_stderr_exit_zero_exact_version",
  "clean_stdout_exit_zero_exact_version",
  "notice_stderr_nonzero_exit",
  "incorrect_version_exit_zero",
  "ambiguous_version_stdout",
  "missing_version_stdout",
  "stderr_only_exit_zero",
  "missing_launcher",
];

const ps = String.raw`
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# AST extract ONLY the isolated helper definition. The owner script is never
# dot-sourced or launched, and npx/Docker/Supabase are never invoked.
$path = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'scripts/rls-local/prepare-fresh-owner.ps1'))
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$parseErrors)
if ($null -eq $ast -or ($null -ne $parseErrors -and $parseErrors.Count -gt 0)) {
  throw 'BLOCKED: owner script AST parse failed'
}
$functions = @($ast.FindAll({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq 'Assert-FfhExactNativeVersion'
}, $true))
if ($functions.Count -ne 1) { throw 'BLOCKED: isolated version probe missing or duplicated' }
. ([scriptblock]::Create($functions[0].Extent.Text))

# Only stock Windows cmd.exe, invoked as an absolute OS path, provides a real
# native subprocess and real stderr on PowerShell 5.1. It writes no files.
$emitter = [string]$env:ComSpec
if ([string]::IsNullOrWhiteSpace($emitter) -or
    [IO.Path]::GetFileName($emitter) -ine 'cmd.exe' -or
    -not (Test-Path -LiteralPath $emitter -PathType Leaf)) {
  throw 'BLOCKED: synthetic cmd.exe emitter unavailable'
}
$missing = Join-Path $env:TEMP 'FFH-P01-NONEXISTENT-PROBE-EXE-NO-EXECUTE.exe'
if (Test-Path -LiteralPath $missing) { throw 'BLOCKED: missing-emitter fixture unexpectedly exists' }

function Assert-Case {
  param([string]$Label,[string]$Command,[bool]$ExpectPass,
    [string]$EmitterPath=$emitter)
  $blocked = $false
  try {
    $null = Assert-FfhExactNativeVersion -Executable $EmitterPath -Arguments @('/d','/c',$Command)
  } catch {
    if ($_.Exception.Message -notmatch '^BLOCKED:') {
      throw ('Unexpected version probe exception in ' + $Label + ': ' + $_.Exception.GetType().Name)
    }
    $blocked = $true
  }
  if ($ExpectPass -eq $blocked) {
    throw ('Wrong version-probe disposition for ' + $Label)
  }
  if ($ErrorActionPreference -cne 'Stop') {
    throw ('Version probe escaped scoped ErrorActionPreference in ' + $Label)
  }
  [Console]::Out.WriteLine('WINPS51_NATIVE_VERSION_PROBE_PASS ' + $Label)
}

# A real cmd.exe stderr write is deliberately used here: PowerShell 5.1 may
# surface this as NativeCommandError under Stop despite exit=0.
Assert-Case 'notice_stderr_exit_zero_exact_version' 'echo 2.122.0 & echo npm notice run family-finance-hub npx 1>&2 & exit /b 0' $true
Assert-Case 'clean_stdout_exit_zero_exact_version' 'echo 2.122.0 & exit /b 0' $true
Assert-Case 'notice_stderr_nonzero_exit' 'echo 2.122.0 & echo npm notice 1>&2 & exit /b 7' $false
Assert-Case 'incorrect_version_exit_zero' 'echo 2.122.1 & exit /b 0' $false
Assert-Case 'ambiguous_version_stdout' 'echo 2.122.0 & echo 2.122.0 & exit /b 0' $false
Assert-Case 'missing_version_stdout' 'exit /b 0' $false
Assert-Case 'stderr_only_exit_zero' 'echo npm notice 1>&2 & exit /b 0' $false
Assert-Case 'missing_launcher' 'echo 2.122.0 & exit /b 0' $false $missing
[Console]::Out.WriteLine('WINPS51_NATIVE_VERSION_SCOPED_PREFERENCE=PASS')
`;

test("FFH-P01 real Windows PowerShell 5.1 harmless native stderr/exit/version behavior is fail closed", () => {
  assert.equal(process.platform,"win32","Actual Windows PowerShell 5.1 required");
  const result = spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-Command",ps
  ],{cwd:process.cwd(),encoding:"utf8",windowsHide:true,timeout:45_000});
  assert.ifError(result.error);
  assert.equal(result.status,0,"Windows native stderr/version-probe tests failed:\n"+result.stdout+"\n"+result.stderr);
  const receipts=result.stdout.split(/\r?\n/);
  for(const label of labels){
    assert.equal(receipts.filter(x=>x==="WINPS51_NATIVE_VERSION_PROBE_PASS "+label).length,1,
      "Expected single Windows PS5.1 behavioral receipt for "+label);
  }
  assert.equal(receipts.filter(x=>x==="WINPS51_NATIVE_VERSION_SCOPED_PREFERENCE=PASS").length,1);
});

test("FFH-P01 source pinning and isolated stderr preference do not weaken owner security boundary",()=>{
  assert.match(prepare,/function Assert-FfhExactNativeVersion \{/);
  assert.match(prepare,/\$ErrorActionPreference = 'Continue'/);
  assert.match(prepare,/\$stdoutLines = @\(& \$Executable @Arguments 2>\$null\)/);
  assert.match(prepare,/\$nativeExitCode = \$LASTEXITCODE/);
  assert.match(prepare,/\$result\.ExitCode -ne 0/);
  assert.match(prepare,/@\(\$result\.Stdout\)\.Count -ne 1/);
  assert.match(prepare,/\[string\]\$result\.Stdout\[0\]\)\.Trim\(\) -cne '2\.122\.0'/);
  assert.match(prepare,/Get-Command npx\.cmd -CommandType Application -All/);
  assert.match(prepare,/\$npxVersionLaunchers\.Count -ne 1/);
  assert.match(prepare,/Assert-FfhExactNativeVersion -Executable \(\[string\]\$npxVersionLaunchers\[0\]\.Source\) -Arguments @\('--yes','supabase@2\.122\.0','--version'\)/);
  assert.doesNotMatch(prepare,/\$version\s*=\s*@\(& npx/);
  assert.match(prepare,/^\$ErrorActionPreference = 'Stop'$/m);
  assert.match(prepare,/\$root = Assert-FfhFreshRoot -FreshRoot \$FreshRoot/);
  assert.match(prepare,/Invoke-FfhPinnedLocalSupabase -Operation Start/);
  assert.match(prepare,/Invoke-FfhPinnedLocalSupabase -Operation Reset/);
  assert.match(shared,/function Invoke-FfhNativeJobChild \{/);
  assert.match(shared,/Get-Command -Name 'docker\.exe' -CommandType Application -All/);
  assert.match(shared,/EnvironmentVariables\['DOCKER_HOST'\] = \$dockerBinding\.Endpoint/);
  assert.match(ownerMatrix,/OWNER_OPERATED_SYNTHETIC_MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW/);
});
