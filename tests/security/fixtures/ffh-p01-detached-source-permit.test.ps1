# DG-AUD-01/02: native WinPS5.1 REAL detached immutable-SHA source chain.
# Isolated temp clone + private synthetic journal. No real Docker, SQL,
# Supabase CLI, native deletion or owner-host Plan/Run is executed.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
function AssertIt([bool]$value,[string]$reason) {
  if (-not $value) {throw ('INTEGRATION_ASSERT_'+$reason)}
}
function MustBlock([scriptblock]$action,[string]$reason) {
  try {[void](& $action)} catch {return}
  throw ('INTEGRATION_EXPECTED_BLOCK_'+$reason)
}
function Receipt([int]$i) {Write-Output ('PI-'+$i.ToString('00')+' PASS')}

$origin=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$sha=([string](& git -C $origin rev-parse HEAD)).Trim()
if ($LASTEXITCODE -ne 0 -or $sha -cnotmatch '^[a-f0-9]{40}$') {
  throw 'INTEGRATION_SOURCE_HEAD_UNRESOLVED'
}
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('ffh-p01-permit-'+[Guid]::NewGuid().ToString('N'))
$clone=Join-Path $fixture 'audit-checkout'
$evidence=Join-Path $fixture 'synthetic-private-evidence'
$originalLocation=[IO.Directory]::GetCurrentDirectory()
$script:dockerCreates=0;$script:sqlExecutes=0;$script:deleteCalls=0;$script:nativeCalls=0
$script:planChecks=0
try {
  [void](New-Item -ItemType Directory -Path $fixture -ErrorAction Stop)
  # Copy Git objects from the CI runner ONLY. No network, no hosted Supabase.
  & git clone --no-hardlinks --no-checkout --quiet -- $origin $clone
  if ($LASTEXITCODE -ne 0) {throw 'INTEGRATION_TEMP_LOCAL_CLONE_FAILED'}
  & git -C $clone checkout --detach --quiet $sha
  if ($LASTEXITCODE -ne 0) {throw 'INTEGRATION_TEMP_DETACH_FAILED'}
  if (([string](& git -C $clone branch --show-current)).Trim() -cne '') {
    throw 'INTEGRATION_CLONE_NOT_DETACHED'
  }
  [IO.Directory]::SetCurrentDirectory($clone)
  Set-Location -LiteralPath $clone

  # Dot-source actual executable production functions from the IMMUTABLE
  # detached temp clone. DO NOT shadow Assert-FfhSourceCheckout.
  . (Join-Path $clone 'scripts/rls-local/source-provenance.ps1')
  . (Join-Path $clone 'scripts/rls-local/automatic-cleanup.ps1')
  . (Join-Path $clone 'scripts/rls-local/cleanup-executor.ps1')
  . (Join-Path $clone 'scripts/rls-local/diagnostic-lifecycle.ps1')
  . (Join-Path $clone 'scripts/rls-local/diagnostic-network.ps1')
  $validator=(Get-Command Assert-FfhSourceCheckout -CommandType Function).ScriptBlock.Ast.Extent.File
  AssertIt ([IO.Path]::GetFullPath($validator).Equals(
    [IO.Path]::GetFullPath((Join-Path $clone 'scripts/rls-local/source-provenance.ps1')),
    [StringComparison]::OrdinalIgnoreCase)) 'REAL_VALIDATOR_FROM_IMMUTABLE_CLONE'
  $actualSha=([string](& git rev-parse HEAD)).Trim()
  AssertIt ($actualSha -ceq $sha) 'IMMUTABLE_CLONE_SHA'
  $source=Assert-FfhSourceCheckout -ExpectedHead $sha -AllowDetachedHeadForDiagnostic
  AssertIt ($source.head -ceq $sha -and $source.repo -ceq $clone -and
    @($source.migration_files).Count -eq 15) 'REAL_DETACHED_15_MIGRATION_SOURCE'
  Receipt 1

  # Test body of ACTUAL production diagnostic Plan, but replace only external
  # Docker/CLI and owner-profile integration endpoints with no-op adapters.
  # The source validator above and below ALWAYS remains real and unmocked.
  $path=Join-Path $clone 'scripts/rls-local/owner-disposable-diagnostic.ps1'
  $astTokens=$null;$astErrors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$astTokens,[ref]$astErrors)
  if (@($astErrors).Count) {throw 'INTEGRATION_ENTRYPOINT_PARSE_FAILED'}
  $nodes=@($ast.FindAll({
    param($n)
    $n -is [Management.Automation.Language.FunctionDefinitionAst] -and
      $n.Name -ceq 'Invoke-FfhOwnerDisposableDiagnostic'
  },$false))
  if ($nodes.Count -ne 1) {throw 'INTEGRATION_ENTRYPOINT_FUNCTION_MISSING'}
  Invoke-Expression $nodes[0].Extent.Text
  # External adapters are intentionally unable to touch real Docker/SQL.
  function Assert-FfhLocalDockerDesktop {
    return [pscustomobject]@{Endpoint='npipe:////./pipe/dockerDesktopLinuxEngine';Executable='SYNTHETIC_ONLY'}
  }
  function Resolve-FfhDiagnosticCachedCli {
    param([string]$CliExecutable,[string]$CliSha256)
    return [pscustomobject]@{Path='SYNTHETIC_NOT_EXECUTED';Sha256=('a'*64);Version='2.122.0'}
  }
  function Assert-FfhDiagnosticApprovedCheckout {
    param($Source)
    if (-not ([IO.Path]::GetFullPath($Source.repo)).Equals(
      [IO.Path]::GetFullPath($clone),[StringComparison]::OrdinalIgnoreCase)) {
      throw 'INTEGRATION_NOT_SYNTHETIC_CLONE'
    }
  }
  function Assert-FfhDiagnosticNoPriorAttempt {
    param($Identity)
    $script:planChecks++
    if (Test-Path -LiteralPath $Identity.root) {
      throw 'INTEGRATION_OWNER_ROOT_PRESENT'
    }
  }
  function Select-FfhRunPorts {param($Identity);return @(28321,28322)}
  function Get-FfhObservedDaemon {param($Fake);return 'SYNTHETIC_DAEMON_NO_DOCKER'}
  function Get-FfhProtectedInventory {param($Fake);return @('SYNTHETIC_LEGACY_CONTAINER','SYNTHETIC_LEGACY_VOLUME','SYNTHETIC_LEGACY_NETWORK')}
  function Invoke-FfhDockerRead {param($Arguments,$Fake);throw 'INTEGRATION_FORBIDDEN_DOCKER_READ'}
  function Invoke-FfhExactDockerCommand {param($Arguments,$Fake);$script:dockerCreates++;throw 'INTEGRATION_FORBIDDEN_DOCKER_MUTATION'}
  function Invoke-FfhNativeJobChild {param($StartInfo);$script:sqlExecutes++;throw 'INTEGRATION_FORBIDDEN_PROCESS_START'}
  function Set-FfhSqlBoundary {$script:sqlExecutes++;throw 'INTEGRATION_FORBIDDEN_SQL'}
  function Invoke-FfhOwnedRootRetirement {$script:deleteCalls++;throw 'INTEGRATION_FORBIDDEN_ROOT_RETIRE'}

  # Capture index bytes AND precise mtime. On this real detached clone, Plan
  # uses git --no-optional-locks and must not create index.lock or a journal.
  $idx=Join-Path $clone '.git/index'
  $idxLock=Join-Path $clone '.git/index.lock'
  AssertIt (Test-Path -LiteralPath $idx -PathType Leaf) 'CLONED_INDEX_EXISTS'
  $indexHashBefore=Get-FfhFileSha256 -Path $idx
  $indexTimeBefore=[IO.File]::GetLastWriteTimeUtc($idx).Ticks
  $ledger=Join-Path $evidence '.ffh-p01-one-shot-diagnostic.json'
  AssertIt (-not (Test-Path -LiteralPath $evidence)) 'NO_SYNTHETIC_JOURNAL_BEFORE_PLAN'
  $plan=@(Invoke-FfhOwnerDisposableDiagnostic -Mode Plan -ExpectedHead $sha)
  AssertIt (@($plan | Where-Object {$_ -match '^PLAN_ONLY=NO_MUTATION'}).Count -eq 1 -and
    @($plan | Where-Object {$_ -match '^DIAG_PREFLIGHT=PASS MODE=Plan'}).Count -eq 1) 'ACTUAL_PRODUCTION_PLAN_BODY'
  AssertIt ((Get-FfhFileSha256 -Path $idx) -ceq $indexHashBefore -and
    [IO.File]::GetLastWriteTimeUtc($idx).Ticks -eq $indexTimeBefore -and
    -not (Test-Path -LiteralPath $idxLock) -and -not (Test-Path -LiteralPath $evidence) -and
    -not (Test-Path -LiteralPath $ledger) -and $script:planChecks -eq 1) 'PLAN_INDEX_AND_LEDGER_UNCHANGED'
  $code=Get-Content -LiteralPath (Join-Path $clone 'scripts/rls-local/source-provenance.ps1') -Raw
  AssertIt ($code.Contains('git --no-optional-locks -C $root status --porcelain=v1 --untracked-files=all') -and
    $code.Contains('git -C $root status --porcelain=v1 --untracked-files=all')) 'SCOPED_NO_OPTIONAL_LOCKS_AND_FORMAL_UNCHANGED'
  Receipt 2

  # Prepare a PRIVATE test-only journal, not an owner-host run. The real
  # Write-FfhJournal/Read-FfhJournal functions preserve runKind on disk.
  [void](New-Item -ItemType Directory -Path $evidence -ErrorAction Stop)
  Initialize-FfhPrivateEvidenceAcl -Path $evidence -NewlyCreated
  function Assert-FfhEvidencePath {
    param($Identity)
    if ($Identity.evidence -cne $evidence) {throw 'INTEGRATION_UNTRUSTED_EVIDENCE_PATH'}
    Assert-FfhPrivateEvidenceAcl -Path $evidence
  }
  $identity=Get-FfhRunIdentity -SourceSha $sha -RunToken (New-FfhRunToken)
  $identity.evidence=$evidence
  $journal=[pscustomobject]@{
    version=2;sha=$identity.sha;token=$identity.token
    root=$identity.root;project=$identity.project;ports=@(28321,28322)
    rootReceiptSha256=('c'*64);rootReceiptCheckSha256=''
    rootOwnership=[pscustomobject]@{fileId='12345678:abcdef0123456789';markerVersion=1}
    runKind='ONE_SHOT_DIAGNOSTIC';diagnosticStatus='ROOT_CREATED'
    state='DIAG_ROOT_CREATED';sequence=0
    gateAResult='NOT_STARTED';gateBResult='NOT_STARTED'
    sqlBoundary=[pscustomobject]@{sha=$identity.sha;token=$identity.token;status='NOT_STARTED'}
    resources=@()
  }
  Write-FfhJournal -Identity $identity -Journal $journal
  $persisted=Read-FfhJournal -Identity $identity
  AssertIt ($persisted.runKind -ceq 'ONE_SHOT_DIAGNOSTIC' -and
    $persisted.sha -ceq $sha -and $persisted.token -ceq $identity.token) 'RUN_KIND_DURABLE'
  $fullPermit=Get-FfhRootPermitSpec -Identity $identity -Journal $persisted
  $migrationRows=@($fullPermit -split [char]10 | Where-Object {
    $_ -match '^F\|supabase\\migrations\\'
  })
  AssertIt ($migrationRows.Count -eq 15 -and
    $fullPermit.Contains('D|supabase\migrations|-') -and
    $fullPermit.Contains('F|.ffh-p01-owned-root|')) 'REAL_JOURNAL_SOURCE_PERMIT_15'
  Receipt 3

  # ONLY the native file-handle Preflight primitive is synthetic. This fake
  # has no Retire/Dispose/SetFileInformation method: deletion is impossible.
  Add-Type -TypeDefinition @'
using System;
public static class FfhP01OwnedRoot {
  public static int PreflightCalls=0;
  public static string Preflight(string parent,string leaf,string id,string marker,string manifest) {
    PreflightCalls++;
    if (id!="12345678:abcdef0123456789" ||
        !leaf.StartsWith("FFH-P01-RLS-Fresh-",StringComparison.Ordinal) ||
        !manifest.Contains("D|supabase\\migrations|-") ||
        manifest.Contains("F|supabase\\migrations\\") ||
        !manifest.Contains("F|ffh-p01-local-provenance.json|"))
      throw new InvalidOperationException("INTEGRATION_INVALID_STAGING_MANIFEST");
    return "PREFLIGHT_OK";
  }
}
'@
  function Get-FfhOwnedRootNative {
    $script:nativeCalls++
    return ('FfhP01OwnedRoot' -as [type])
  }
  $before=[FfhP01OwnedRoot]::PreflightCalls
  Assert-FfhDiagnosticStagingRoot -Identity $identity -Journal $persisted
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq ($before+1) -and
    $script:nativeCalls -eq 1 -and
    $script:deleteCalls -eq 0) 'REAL_STAGING_FUNCTION_REACHED_NATIVE_PREFLIGHT'
  Receipt 4

  # On a DETACHED SHA, non-diagnostic runKind must not be a permission bypass.
  $j=Read-FfhJournal -Identity $identity
  [void]$j.PSObject.Properties.Remove('runKind')
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $identity -Journal $j
  $callBefore=[FfhP01OwnedRoot]::PreflightCalls
  MustBlock {Get-FfhRootPermitSpec -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'ABSENT_RUN_KIND'
  MustBlock {Assert-FfhDiagnosticStagingRoot -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'ABSENT_RUN_KIND_STAGING'
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq $callBefore) 'ABSENT_KIND_NO_NATIVE'
  Receipt 5

  $j=Read-FfhJournal -Identity $identity
  $j | Add-Member -MemberType NoteProperty -Name runKind -Value 'FORGED_NOT_DIAGNOSTIC' -Force
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $identity -Journal $j
  MustBlock {Get-FfhRootPermitSpec -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'FORGED_RUN_KIND'
  MustBlock {Assert-FfhDiagnosticStagingRoot -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'FORGED_RUN_KIND_STAGING'
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq $callBefore) 'FORGED_KIND_NO_NATIVE'
  Receipt 6

  $j=Read-FfhJournal -Identity $identity
  $j.runKind='ONE_SHOT_DIAGNOSTIC';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $identity -Journal $j
  $wrongSha='f'*40
  if ($wrongSha -ceq $sha) {$wrongSha='e'*40}
  $badIdentity=Get-FfhRunIdentity -SourceSha $wrongSha -RunToken $identity.token
  $badIdentity.evidence=$identity.evidence
  $badJournal=Read-FfhJournal -Identity $identity
  $badJournal.sha=$wrongSha;$badJournal.project=$badIdentity.project
  $badJournal.root=$badIdentity.root
  MustBlock {Get-FfhRootPermitSpec -Identity $badIdentity -Journal $badJournal} 'WRONG_SHA'
  MustBlock {Assert-FfhSourceCheckout -ExpectedHead $wrongSha -AllowDetachedHeadForDiagnostic} 'WRONG_SHA_SOURCE'
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq $callBefore) 'WRONG_SHA_NO_NATIVE'
  Receipt 7

  $dirty=Join-Path $clone 'synthetic-untracked-permit-test.txt'
  if (Test-Path -LiteralPath $dirty) {throw 'INTEGRATION_DIRTY_SENTINEL_ALREADY_EXISTS'}
  [IO.File]::WriteAllText($dirty,'synthetic test only')
  try {
    MustBlock {Get-FfhRootPermitSpec -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'DIRTY_CHECKOUT'
    MustBlock {Assert-FfhDiagnosticStagingRoot -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'DIRTY_STAGING'
  } finally {
    # Exact newly-created synthetic temp-clone file only.
    if (Test-Path -LiteralPath $dirty) {[IO.File]::Delete($dirty)}
  }
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq $callBefore) 'DIRTY_NO_NATIVE'
  Receipt 8

  $tempLinkDir=Join-Path $clone 'supabase/.temp'
  $hostedLink=Join-Path $tempLinkDir 'project-ref'
  if (Test-Path -LiteralPath $tempLinkDir) {throw 'INTEGRATION_HOSTED_SENTINEL_DIR_ALREADY_EXISTS'}
  [void](New-Item -ItemType Directory -Path $tempLinkDir -ErrorAction Stop)
  [IO.File]::WriteAllText($hostedLink,'synthetic-fake-hosted-project-ref')
  try {
    MustBlock {Get-FfhRootPermitSpec -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'HOSTED_LINK'
    MustBlock {Assert-FfhDiagnosticStagingRoot -Identity $identity -Journal (Read-FfhJournal -Identity $identity)} 'HOSTED_LINK_STAGING'
  } finally {
    if (Test-Path -LiteralPath $hostedLink) {[IO.File]::Delete($hostedLink)}
    if (Test-Path -LiteralPath $tempLinkDir) {[IO.Directory]::Delete($tempLinkDir,$false)}
  }
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq $callBefore) 'HOSTED_LINK_NO_NATIVE'
  Receipt 9

  MustBlock {Assert-FfhSourceCheckout -ExpectedHead $sha} 'FORMAL_DETACHED_NOT_ALLOWED'
  AssertIt ([FfhP01OwnedRoot]::PreflightCalls -eq $callBefore) 'FORMAL_DOES_NOT_BYPASS_DETACHED'
  Receipt 10

  # A negative Plan on a dirty checkout cannot create journal or refresh index.
  $idxHash=Get-FfhFileSha256 -Path $idx
  $idxTime=[IO.File]::GetLastWriteTimeUtc($idx).Ticks
  $dirty=Join-Path $clone 'synthetic-plan-dirty.txt'
  [IO.File]::WriteAllText($dirty,'synthetic plan dirty')
  try {
    MustBlock {Invoke-FfhOwnerDisposableDiagnostic -Mode Plan -ExpectedHead $sha} 'DIRTY_PLAN'
    AssertIt ((Get-FfhFileSha256 -Path $idx) -ceq $idxHash -and
      [IO.File]::GetLastWriteTimeUtc($idx).Ticks -eq $idxTime -and
      -not (Test-Path -LiteralPath $idxLock)) 'DIRTY_PLAN_NO_INDEX_REFRESH'
  } finally {
    if (Test-Path -LiteralPath $dirty) {[IO.File]::Delete($dirty)}
  }
  Receipt 11

  AssertIt ($script:dockerCreates -eq 0 -and $script:sqlExecutes -eq 0 -and
    $script:deleteCalls -eq 0 -and
    [FfhP01OwnedRoot]::PreflightCalls -eq 1 -and
    @((Get-ChildItem -LiteralPath $evidence -File -Filter '*.json')).Count -eq 1 -and
    -not (Test-Path -LiteralPath $ledger)) 'ZERO_MUTATION_OR_ONE_SHOT_CONSUMPTION'
  Receipt 12
} catch {
  # Preserve the genuine source/fixture failure line; a later safe fixture
  # cleanup must never mask the original integration exception.
  [Console]::Error.WriteLine('INTEGRATION_FAIL_AT ' +
    [string]$_.InvocationInfo.PositionMessage + ' STACK ' +
    [string]$_.ScriptStackTrace + ' MESSAGE ' + [string]$_.Exception.Message)
  throw
} finally {
  [IO.Directory]::SetCurrentDirectory($originalLocation)
  Set-Location -LiteralPath $origin
  $safe=[IO.Path]::GetFullPath($fixture)
  $prefix=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if (-not $safe.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($safe) -cnotmatch '^ffh-p01-permit-[0-9a-f]{32}$') {
    throw 'INTEGRATION_CLEANUP_UNOWNED_PATH_REFUSED'
  }
  if ([IO.Directory]::Exists($safe)) {
    # Git pack/idx objects in a temporary --no-hardlinks clone can be
    # read-only. Clear that attribute ONLY inside the exact GUID-named
    # disposable fixture after checking for reparse redirection.
    $entries=@(Get-ChildItem -LiteralPath $safe -Force -Recurse -ErrorAction Stop)
    foreach($entry in $entries) {
      if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'INTEGRATION_TEMP_CLONE_REPARSE_REQUIRES_REVIEW'
      }
      if (-not $entry.PSIsContainer -and
          ($entry.Attributes -band [IO.FileAttributes]::ReadOnly)) {
        [IO.File]::SetAttributes($entry.FullName,
          ($entry.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)))
      }
    }
    [IO.Directory]::Delete($safe,$true)
  }
}
