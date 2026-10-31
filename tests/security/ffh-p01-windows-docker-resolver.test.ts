// FFH-P01 Windows PowerShell 5.1 Docker native resolver behavioral regressions.
// Executes ONLY the AST-extracted pure resolver with mocked Get-Command/Test-Path.
// Never dot-sources owner entrypoints, launches docker, SQL, Supabase or the job runner.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const source = readFileSync("scripts/rls-local/source-provenance.ps1", "utf8");
const caseNames = [
  "trusted_two_applications",
  "trusted_single_executable",
  "bare_alias_shadow",
  "bare_function_shadow",
  "bare_cmdlet_shadow",
  "bare_script_wrapper",
  "path_shadow_precedes_trusted",
  "path_shadow_after_trusted",
  "duplicate_native_docker_exe",
  "missing_native_docker_exe",
  "wrong_directory",
  "sibling_precedes_docker_exe",
  "duplicate_extensionless_sibling",
  "forged_executable_definition",
  "forged_native_source",
  "exact_name_alias_shadow",
  "trusted_docker_exe_file_missing",
];
const script = String.raw`
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Parse the provenance source; dot-source ONLY the single, isolated function
# definition extracted by AST. No owner procedure or actual guard is invoked.
$sourcePath = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'scripts/rls-local/source-provenance.ps1'))
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($sourcePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) { throw 'BLOCKED: source AST parse error' }
$functions = @($ast.FindAll({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq 'Resolve-FfhNativeDockerDesktopExecutable'
}, $true))
if ($functions.Count -ne 1) { throw 'BLOCKED: isolated native resolver function missing or duplicated' }
. ([scriptblock]::Create($functions[0].Extent.Text))
$dir = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles)) 'Docker\Docker\resources\bin'
$script:Trusted = Join-Path $dir 'docker.exe'
$siblingPath = Join-Path $dir 'docker'
$evilPath = Join-Path $env:TEMP 'docker.exe'
$script:Exists = $true

function New-App {
  param([string]$Name,[string]$Source,[string]$Path,[string]$Definition)
  if (-not $PSBoundParameters.ContainsKey('Path')) { $Path = $Source }
  if (-not $PSBoundParameters.ContainsKey('Definition')) { $Definition = $Source }
  return [pscustomobject]@{
    Name = $Name
    CommandType = [Management.Automation.CommandTypes]::Application
    Source = $Source
    Path = $Path
    Definition = $Definition
  }
}
function New-Shadow {
  param([string]$Type,[string]$Name)
  return [pscustomobject]@{
    Name = $Name
    CommandType = [Enum]::Parse([Management.Automation.CommandTypes],$Type)
    Source = 'untrusted'
    Path = 'untrusted'
    Definition = 'untrusted'
  }
}
# Deliberately mock only discovery and trusted-file existence. Any new,
# unmocked lookup or attempt to run Docker is a test failure, not a fallback.
function Get-Command {
  param([string]$Name,[string]$CommandType,[switch]$All,[string]$ErrorAction)
  if (-not $All) { throw 'BLOCKED: resolver must enumerate all discovered commands' }
  if ($Name -ceq 'docker.exe') {
    if ($CommandType -ceq 'Application') { return $script:Native }
    if ([string]::IsNullOrEmpty($CommandType)) { return $script:Exact }
  }
  if ($Name -ceq 'docker' -and [string]::IsNullOrEmpty($CommandType)) {
    return $script:Bare
  }
  throw 'BLOCKED: unexpected command lookup'
}
function Test-Path {
  param([string]$LiteralPath,[string]$PathType)
  if ($PathType -cne 'Leaf' -or $LiteralPath -cne $script:Trusted) {
    throw 'BLOCKED: unexpected filesystem probe'
  }
  return $script:Exists
}
function Run-Case {
  param([string]$Label,[object[]]$Native,[object[]]$Exact,
    [object[]]$Bare,[bool]$ExpectedPass,[bool]$FileExists = $true)
  $script:Native = $Native
  $script:Exact = $Exact
  $script:Bare = $Bare
  $script:Exists = $FileExists
  $failedClosed = $false
  $selected = $null
  try {
    $selected = Resolve-FfhNativeDockerDesktopExecutable
  } catch {
    if ($_.Exception.Message -notmatch '^BLOCKED: ') {
      throw ('Unclassified resolution failure in ' + $Label)
    }
    $failedClosed = $true
  }
  if ($ExpectedPass) {
    if ($failedClosed -or $null -eq $selected -or
        $selected.CommandType -ne [Management.Automation.CommandTypes]::Application -or
        [string]$selected.Name -cne 'docker.exe' -or
        [string]$selected.Source -cne $script:Trusted) {
      throw ('Expected trusted docker.exe resolution in ' + $Label)
    }
  } elseif (-not $failedClosed) {
    throw ('Unsafe docker resolution accepted in ' + $Label)
  }
  [Console]::Out.WriteLine('WINPS51_DOCKER_RESOLVER_PASS ' + $Label)
}
$good = New-App 'docker.exe' $script:Trusted
$sibling = New-App 'docker' $siblingPath
$evil = New-App 'docker.exe' $evilPath
$functionShadow = New-Shadow 'Function' 'docker'
$aliasShadow = New-Shadow 'Alias' 'docker'
$cmdletShadow = New-Shadow 'Cmdlet' 'docker'
$scriptShadow = New-Shadow 'ExternalScript' 'docker'
$exactAlias = New-Shadow 'Alias' 'docker.exe'

Run-Case 'trusted_two_applications' @($good) @($good) @($good,$sibling) $true
Run-Case 'trusted_single_executable' @($good) @($good) @($good) $true
Run-Case 'bare_alias_shadow' @($good) @($good) @($aliasShadow,$good,$sibling) $false
Run-Case 'bare_function_shadow' @($good) @($good) @($functionShadow,$good) $false
Run-Case 'bare_cmdlet_shadow' @($good) @($good) @($cmdletShadow,$good) $false
Run-Case 'bare_script_wrapper' @($good) @($good) @($scriptShadow,$good) $false
Run-Case 'path_shadow_precedes_trusted' @($good,$evil) @($good,$evil) @($evil,$good) $false
Run-Case 'path_shadow_after_trusted' @($good,$evil) @($good,$evil) @($good,$evil) $false
Run-Case 'duplicate_native_docker_exe' @($good,$good) @($good,$good) @($good) $false
Run-Case 'missing_native_docker_exe' @() @() @($sibling) $false
Run-Case 'wrong_directory' @($evil) @($evil) @($evil) $false
Run-Case 'sibling_precedes_docker_exe' @($good) @($good) @($sibling,$good) $false
Run-Case 'duplicate_extensionless_sibling' @($good) @($good) @($good,$sibling,$sibling) $false
Run-Case 'forged_executable_definition' @((New-App 'docker.exe' $script:Trusted -Definition $evilPath)) @((New-App 'docker.exe' $script:Trusted -Definition $evilPath)) @($good) $false
Run-Case 'forged_native_source' @((New-App 'docker.exe' $evilPath -Path $script:Trusted -Definition $script:Trusted)) @($good) @($good) $false
Run-Case 'exact_name_alias_shadow' @($good) @($exactAlias,$good) @($good) $false
Run-Case 'trusted_docker_exe_file_missing' @($good) @($good) @($good) $false $false
`;

test("RLS-01A Windows PowerShell 5.1 runs isolated resolver against 17 mocked precedence scenarios", () => {
  assert.equal(process.platform, "win32", "Only canonical windows-latest may claim Windows PS5.1 behavior");
  const output = spawnSync("powershell.exe", [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script,
  ], { cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 45_000 });
  assert.ifError(output.error);
  assert.equal(output.status, 0,
    "Windows PowerShell resolver behavioral tests failed:\n" + output.stdout + "\n" + output.stderr);
  const receipts = output.stdout.split(/\r?\n/).filter(line => line.startsWith("WINPS51_DOCKER_RESOLVER_PASS "));
  assert.equal(receipts.length, caseNames.length, "Not all mocked resolver scenarios executed");
  for (const label of caseNames) {
    assert.equal(receipts.filter(line => line === "WINPS51_DOCKER_RESOLVER_PASS " + label).length, 1,
      "Missing/duplicated runtime behavioral receipt for " + label);
  }
});

test("RLS-01A native resolver source refuses unsafe first-match or scalar command resolution", () => {
  assert.match(source,/function Resolve-FfhNativeDockerDesktopExecutable \{/);
  assert.match(source,/Get-Command -Name 'docker.exe' -CommandType Application -All/);
  assert.match(source,/Get-Command -Name 'docker.exe' -All/);
  assert.match(source,/Get-Command -Name 'docker' -All/);
  assert.match(source,/\$native.Count -ne 1/);
  assert.match(source,/\$exactAll.Count -ne 1/);
  assert.match(source,/\[string\]\$bareAll\[0\]\.Name -cne 'docker.exe'/);
  assert.match(source,/\$trustedExeCount -ne 1/);
  assert.match(source,/\$trustedSiblingCount -gt 1/);
  assert.match(source,/Docker executable path or identity not trusted/);
  assert.match(source,/Test-Path -LiteralPath \$trustedExe -PathType Leaf/);
  assert.doesNotMatch(source,/\$dockerCli = Get-Command docker -CommandType Application/);
  assert.doesNotMatch(source,/\$resolved = Get-Command docker -ErrorAction SilentlyContinue/);
  assert.match(source,/\$dockerCli = Resolve-FfhNativeDockerDesktopExecutable/);
});
