// FFH-P01 Windows PowerShell 5.1 automatic-variable collision regression.
// Runs ONLY the AST-extracted Assert-FfhFreshRoot with safe function mocks.
// No owner entrypoint, Docker, Supabase, SQL, file writes, or job-tree runner.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const shared = readFileSync("scripts/rls-local/source-provenance.ps1", "utf8");
const ownerPrepare = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1", "utf8");
const ownerMatrix = readFileSync("scripts/rls-local/run-owner.ps1", "utf8");

const ps = String.raw`
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$paths = @(
  'scripts/rls-local/source-provenance.ps1',
  'scripts/rls-local/prepare-fresh-owner.ps1',
  'scripts/rls-local/run-owner.ps1'
)
$scriptAsts = @()
$protected = @(
  'home','profile','host','pid','pshome','psscriptroot',
  'pscommandpath','args','matches','input','error','myinvocation',
  'psversiontable','psboundparameters','true','false','null',
  'foreach','this','pwd'
)

function Get-ForbiddenAssignments {
  param([Management.Automation.Language.Ast]$ScriptAst)
  $assignments = @($ScriptAst.FindAll({
    param($node)
    $node -is [Management.Automation.Language.AssignmentStatementAst]
  }, $true))
  $forbidden = @()
  foreach ($assignment in $assignments) {
    $lhs = $assignment.Left
    if ($lhs -is [Management.Automation.Language.VariableExpressionAst] -and
        $protected -contains $lhs.VariablePath.UserPath) {
      $forbidden += [string]$lhs.VariablePath.UserPath
    }
  }
  return @($forbidden)
}

foreach ($path in $paths) {
  $fullPath = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path $path))
  $tokens = $null
  $parseErrors = $null
  $scriptAst = [Management.Automation.Language.Parser]::ParseFile(
    $fullPath, [ref]$tokens, [ref]$parseErrors
  )
  if ($null -eq $scriptAst -or ($null -ne $parseErrors -and $parseErrors.Count -gt 0)) {
    throw ('AST parse failed: ' + $path)
  }
  $forbidden = @(Get-ForbiddenAssignments -ScriptAst $scriptAst)
  if ($forbidden.Count -gt 0) {
    throw ('Protected automatic variable assigned: ' + ($forbidden -join ','))
  }
  $scriptAsts += $scriptAst
}
[Console]::Out.WriteLine('WINPS51_AUTOMATIC_VARIABLE_ASSIGNMENT_SCAN_PASS files=3')

# Confirm future source mutations assigning HOME are caught even if they parse.
$definitions = @($scriptAsts[0].FindAll({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq 'Assert-FfhFreshRoot'
}, $true))
if ($definitions.Count -ne 1) { throw 'Expected exactly one isolated fresh-root function' }
$functionText = $definitions[0].Extent.Text
$badFunction = $functionText.Replace('$userHomePath =', '$home =')
if ($badFunction -ceq $functionText) { throw 'Mutation did not modify protected assignment' }
$mutationTokens = $null
$mutationErrors = $null
$mutationAst = [Management.Automation.Language.Parser]::ParseInput(
  $badFunction, [ref]$mutationTokens, [ref]$mutationErrors
)
if (($null -ne $mutationErrors -and $mutationErrors.Count -gt 0) -or
    @((Get-ForbiddenAssignments -ScriptAst $mutationAst)).Count -ne 1) {
  throw 'Mutation regression failed to detect automatic HOME collision'
}
[Console]::Out.WriteLine('WINPS51_AUTOMATIC_VARIABLE_MUTATION_PASS')

# Define ONLY the isolated function. Its dangerous helpers are mocked below.
. ([scriptblock]::Create($functionText))
$script:OriginalHome = [string]$HOME
$script:OriginalProfile = [string]$PROFILE
$script:ActualHome = [IO.Path]::GetFullPath($HOME).TrimEnd('\','/')
$actualProfile = [IO.Path]::GetFullPath(
  [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
).TrimEnd('\','/')
if (-not $script:ActualHome.Equals($actualProfile,
    [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Windows test host HOME and UserProfile differ; cannot claim valid case'
}
if (([IO.DriveInfo]::new($script:ActualHome.Substring(0,3))).DriveType -ne
    [IO.DriveType]::Fixed) {
  throw 'Windows test host user profile is not on a fixed drive'
}

$script:Sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
$script:FreshName = 'FFH-P01-RLS-Fresh-' + $script:Sha.Substring(0,12)
$script:ValidRoot = Join-Path $script:ActualHome $script:FreshName
$script:RepoRoot = Join-Path $script:ActualHome 'IndependentSourceCheckout'
$script:MockExistingRoot = $false
$script:MockReparseFailure = $false
$script:MockTreeCalls = 0
$script:MockPathChecks = 0

function Test-Path {
  param([string]$LiteralPath,[string]$PathType)
  if ($PSBoundParameters.ContainsKey('PathType')) {
    throw 'MOCK_UNEXPECTED_FILESYSTEM_QUERY'
  }
  return ($script:MockExistingRoot -and $LiteralPath -ceq $script:ValidRoot)
}
function Assert-FfhNoReparsePath {
  param([string]$Path)
  if ($Path -cne $script:ActualHome) { throw 'MOCK_UNEXPECTED_REPARSE_PATH' }
  $script:MockPathChecks++
  if ($script:MockReparseFailure) {
    throw 'BLOCKED: mock reparse-point ancestry'
  }
}
function Assert-FfhFreshTree {
  param([string]$FreshRoot)
  if ($FreshRoot -cne $script:ValidRoot) { throw 'MOCK_UNEXPECTED_TREE_CHECK' }
  $script:MockTreeCalls++
}
function Assert-AutomaticsUnchanged {
  if ([string]$HOME -cne $script:OriginalHome -or
      [string]$PROFILE -cne $script:OriginalProfile) {
    throw 'Protected automatic HOME/PROFILE mutated'
  }
}
function Assert-Invalid {
  param([string]$Label,[string]$Candidate,[string]$Repo=$script:RepoRoot)
  $blocked = $false
  try {
    $null = Assert-FfhFreshRoot -FreshRoot $Candidate -RepoRoot $Repo -ExpectedHead $script:Sha
  } catch {
    if ($_.Exception.Message -notmatch '^BLOCKED:') {
      throw ('Unexpected runtime exception in ' + $Label + ': ' + $_.Exception.GetType().Name)
    }
    $blocked = $true
  }
  if (-not $blocked) { throw ('Invalid root accepted: ' + $Label) }
  Assert-AutomaticsUnchanged
  [Console]::Out.WriteLine('WINPS51_FRESHROOT_PASS ' + $Label)
}

$result = Assert-FfhFreshRoot -FreshRoot $script:ValidRoot -RepoRoot $script:RepoRoot -ExpectedHead $script:Sha
if ($result -cne $script:ValidRoot -or $script:MockTreeCalls -ne 0 -or
    $script:MockPathChecks -ne 1) {
  throw 'Valid SHA-derived direct-child fresh-root rejected or validation changed'
}
Assert-AutomaticsUnchanged
[Console]::Out.WriteLine('WINPS51_FRESHROOT_PASS valid_absent_root')

$script:MockExistingRoot = $true
$result = Assert-FfhFreshRoot -FreshRoot $script:ValidRoot -RepoRoot $script:RepoRoot -ExpectedHead $script:Sha
if ($result -cne $script:ValidRoot -or $script:MockTreeCalls -ne 1) {
  throw 'Existing-tree reparse check omitted'
}
$script:MockExistingRoot = $false
Assert-AutomaticsUnchanged
[Console]::Out.WriteLine('WINPS51_FRESHROOT_PASS existing_root_inspects_tree')

Assert-Invalid 'wrong_sha_name' (Join-Path $script:ActualHome 'FFH-P01-RLS-Fresh-bbbbbbbbbbbb')
Assert-Invalid 'wrong_prefix' (Join-Path $script:ActualHome 'FFH-P01-RLS-Test-aaaaaaaaaaaa')
Assert-Invalid 'nested_parent' (Join-Path (Join-Path $script:ActualHome 'Nested') $script:FreshName)
Assert-Invalid 'legacy_test_tree' (Join-Path (Join-Path $script:ActualHome 'FFH-RLS-Test') $script:FreshName)
Assert-Invalid 'repository_equals_root' $script:ValidRoot $script:ValidRoot
Assert-Invalid 'repository_is_home_parent' $script:ValidRoot $script:ActualHome

$script:MockReparseFailure = $true
Assert-Invalid 'reparse_mock_denial' $script:ValidRoot
$script:MockReparseFailure = $false
Assert-AutomaticsUnchanged
[Console]::Out.WriteLine('WINPS51_AUTOMATIC_HOME_PROFILE_PRESERVED')
`;

const caseNames = [
  "valid_absent_root","existing_root_inspects_tree","wrong_sha_name",
  "wrong_prefix","nested_parent","legacy_test_tree","repository_equals_root",
  "repository_is_home_parent","reparse_mock_denial",
];

test("RLS-01 Windows PowerShell 5.1 executes isolated fresh-root guard with mocked filesystem and protected automatics", () => {
  assert.equal(process.platform, "win32", "Windows PowerShell 5.1 is required, not a skipped test");
  const result = spawnSync("powershell.exe", [
    "-NoLogo","-NoProfile","-NonInteractive","-Command",ps,
  ], { cwd: process.cwd(), encoding: "utf8", windowsHide: true, timeout: 45_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, "Windows PowerShell fresh-root test failed:\n" + result.stdout + "\n" + result.stderr);
  const receipts = result.stdout.split(/\r?\n/);
  for (const name of caseNames) {
    assert.equal(receipts.filter(s => s === "WINPS51_FRESHROOT_PASS " + name).length,1,name);
  }
  for (const line of [
    "WINPS51_AUTOMATIC_VARIABLE_ASSIGNMENT_SCAN_PASS files=3",
    "WINPS51_AUTOMATIC_VARIABLE_MUTATION_PASS",
    "WINPS51_AUTOMATIC_HOME_PROFILE_PRESERVED",
  ]) assert.equal(receipts.filter(s=>s===line).length,1,line);
});

test("RLS-01 source contract retains fresh-root, SHA, drive, profile, reparse and historical boundaries", () => {
  assert.match(shared, /function Assert-FfhFreshRoot \{/);
  assert.match(shared, /\$userHomePath = \[IO\.Path\]::GetFullPath\(\$HOME\)/);
  assert.match(shared, /\$userProfilePath = \[IO\.Path\]::GetFullPath\(\[Environment\]::GetFolderPath/);
  assert.match(shared, /\$userHomePath\.Equals\(\$userProfilePath,/);
  assert.match(shared, /Split-Path \$root -Parent\)\.Equals\(\$userHomePath,/);
  assert.match(shared, /DriveInfo\]::new\(\$userHomePath\.Substring\(0,3\)\)/);
  assert.match(shared, /Assert-FfhNoReparsePath -Path \$userHomePath/);
  assert.match(shared, /Assert-FfhFreshTree -FreshRoot \$root/);
  assert.match(shared, /FFH-P01-RLS-Fresh-/);
  assert.match(shared, /\$root -match '\(\?i\)FFH-RLS-Test'/);
  assert.doesNotMatch(shared, /\$(?:home|profile|args)\s*=/i);
  assert.doesNotMatch(ownerMatrix, /\$matches\s*=/i);
  assert.match(shared, /\$supabaseCliArguments = if \(\$Operation -ceq 'Start'\)/);
  assert.match(ownerMatrix, /\$matchingReceiptRows = @\(\$receipt\.source_sha256/);
  assert.match(ownerPrepare, /Assert-FfhFreshRoot -FreshRoot \$FreshRoot/);
  assert.match(ownerMatrix, /Assert-FfhFreshRoot -FreshRoot \$FreshRoot/);
});
