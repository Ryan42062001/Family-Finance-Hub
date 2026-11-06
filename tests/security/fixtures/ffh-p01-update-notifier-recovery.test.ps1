# FFH-P01 #83 WinPS5.1 offline updater/recovery regression.
# Pure synthetic files under an isolated GUID temp root; no Docker, SQL,
# owner diagnostic Plan/Run, native retirement or external network.
[CmdletBinding()]param()
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../'))
. (Join-Path $repo 'scripts/rls-local/source-provenance.ps1')
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
. (Join-Path $repo 'scripts/rls-local/diagnostic-recovery-readonly.ps1')
$ownerPath=Join-Path $repo 'scripts/rls-local/owner-disposable-diagnostic.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($ownerPath,[ref]$tokens,[ref]$errors)
if (@($errors).Count -gt 0) {throw 'SYNTH_OWNER_PARSE_ERRORS'}
foreach($name in @('Start-FfhDiagnosticPinnedDb','Get-FfhDiagnosticFailureCategory')) {
  $found=@($ast.FindAll({
    param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -ceq $name
  },$false))
  if ($found.Count -ne 1) {throw 'SYNTH_OWNER_FUNCTION_NOT_FOUND'}
  Invoke-Expression $found[0].Extent.Text
}
function Receipt([int]$n) {Write-Output ('RC-'+$n.ToString('00')+' PASS')}
function MustBlock([string]$category,[scriptblock]$action) {
  try {[void](& $action)} catch {
    if ($_.Exception.Message -cne $category) {
      throw ('SYNTH_WRONG_CATEGORY_EXPECTED_'+$category)
    }
    return
  }
  throw ('SYNTH_DID_NOT_BLOCK_'+$category)
}
function Category([string]$message) {
  try {throw $message} catch {return Get-FfhDiagnosticFailureCategory -Failure $_}
}

# Production command construction is exercised without launching a child.
# All normal guards are *mocked*, but actual ProcessStartInfo env is captured.
function Assert-FfhDiagnosticNoSupabaseOverrides {}
function Assert-FfhNoRemoteConfiguration {}
function Assert-FfhDockerEnvironment {}
function Assert-FfhLocalDockerDesktop {
  return [pscustomobject]@{Endpoint='npipe:////./pipe/dockerDesktopLinuxEngine'}
}
function Assert-FfhDiagnosticLaunchPreflight {param($Identity,$Cli);return $true}
function Assert-FfhNoReparsePath {param($Path)}
$script:captured=$false
function Invoke-FfhNativeJobChild {
  param($StartInfo)
  if ($StartInfo.EnvironmentVariables['SUPABASE_NO_UPDATE_NOTIFIER'] -cne '1' -or
      $StartInfo.EnvironmentVariables['DOCKER_HOST'] -cne 'npipe:////./pipe/dockerDesktopLinuxEngine' -or
      $StartInfo.EnvironmentVariables['DO_NOT_TRACK'] -cne '1' -or
      $StartInfo.EnvironmentVariables['SUPABASE_ACCESS_TOKEN'] -ne $null -or
      $StartInfo.Arguments -cnotmatch 'db start 1>NUL 2>NUL' -or
      $StartInfo.WorkingDirectory -cne 'C:\SYNTHETIC_ROOT_NEVER_CREATED') {
    throw 'SYNTH_CHILD_ENV_OR_JOB_CONTRACT'
  }
  $script:captured=$true
  return 'EXIT_ZERO'
}
$oldToken=[Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN')
$oldNotifier=[Environment]::GetEnvironmentVariable('SUPABASE_NO_UPDATE_NOTIFIER')
try {
  [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN','SYNTHETIC_ONLY')
  [Environment]::SetEnvironmentVariable('SUPABASE_NO_UPDATE_NOTIFIER','0')
  Start-FfhDiagnosticPinnedDb -Identity ([pscustomobject]@{root='C:\SYNTHETIC_ROOT_NEVER_CREATED'}) -Cli ([pscustomobject]@{Path='C:\SYNTHETIC_PINNED_CLI_NEVER_EXECUTED\supabase.exe';Sha256=('a'*64)})
  if (-not $script:captured) {throw 'SYNTH_PINNED_CHILD_NOT_CAPTURED'}
  Receipt 1
} finally {
  [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN',$oldToken)
  [Environment]::SetEnvironmentVariable('SUPABASE_NO_UPDATE_NOTIFIER',$oldNotifier)
}
if ((Category 'BLOCKED_DIAG_DB_NOT_HEALTHY') -cne 'BLOCKED_DIAG_DB_NOT_HEALTHY') {throw 'SYNTH_CATEGORY_DIAG'}
Receipt 2
if ((Category 'BLOCKED_ROOT_PERMIT_JOURNAL_INCOMPLETE') -cne 'BLOCKED_ROOT_PERMIT_JOURNAL_INCOMPLETE') {throw 'SYNTH_CATEGORY_ROOT'}
Receipt 3
if ((Category 'BLOCKED: private path changed') -cne 'ADMISSION_BLOCKED_UNCLASSIFIED') {throw 'SYNTH_CATEGORY_LEGACY'}
Receipt 4
if ((Category 'private token=NEVER_PRINT_ME') -cne 'UNEXPECTED_EXCEPTION') {throw 'SYNTH_CATEGORY_PRIVATE'}
Receipt 5

$base=Join-Path ([IO.Path]::GetTempPath()) ('ffh-p01-recovery-fixture-'+[Guid]::NewGuid().ToString('N'))
$cacheRoot=Join-Path $base 'disposable-root'
$dir=Join-Path $cacheRoot 'supabase\.temp'
$evidence=Join-Path $base 'isolated-evidence'
[void](New-Item -ItemType Directory -Path $dir -Force)
[void](New-Item -ItemType Directory -Path $evidence)
$cache=Join-Path $dir 'cli-latest'
# Substitute the approved fixture-only evidence checker, never host paths.
function Assert-FfhEvidenceEntry {
  param($Identity,[string]$Path,[switch]$Optional)
  $expected=[IO.Path]::GetFullPath($Path)
  $parent=[IO.Path]::GetFullPath($Identity.evidence)
  if (-not ([IO.Path]::GetDirectoryName($expected)).Equals(
      $parent,[StringComparison]::OrdinalIgnoreCase)) {throw 'SYNTH_FOREIGN_EVIDENCE'}
  if (-not $Optional -and -not (Test-Path -LiteralPath $expected -PathType Leaf)) {
    throw 'SYNTH_EVIDENCE_MISSING'
  }
}
try {
  [IO.File]::WriteAllText($cache,'v3.0.0',[Text.UTF8Encoding]::new($false))
  $v=Get-FfhRecoveryCacheEvidence -Root $cacheRoot
  if ($v.bytes -ne 6 -or $v.sha256 -cnotmatch '^[a-f0-9]{64}$' -or
      $v.shape -cne 'CLI_TAG_OR_EMPTY') {throw 'SYNTH_CACHE_HASH_OR_SHAPE'}
  Receipt 6
  MustBlock 'BLOCKED_RECOVERY_CACHE_HASH_DRIFT' {Get-FfhRecoveryCacheEvidence -Root $cacheRoot -ExpectedSha256 ('a'*64)}
  Receipt 7
  [IO.File]::WriteAllText((Join-Path $dir 'another-file'),'SYNTHETIC')
  MustBlock 'BLOCKED_RECOVERY_CACHE_FOREIGN_CHILD' {Get-FfhRecoveryCacheEvidence -Root $cacheRoot}
  [IO.File]::Delete((Join-Path $dir 'another-file'))
  Receipt 8
  [IO.File]::WriteAllText($cache,'not-a-release-tag-with-any-secret',[Text.UTF8Encoding]::new($false))
  MustBlock 'BLOCKED_RECOVERY_CACHE_CONTENT' {Get-FfhRecoveryCacheEvidence -Root $cacheRoot}
  Receipt 9
  [IO.File]::WriteAllText($cache,('x'*97),[Text.UTF8Encoding]::new($false))
  MustBlock 'BLOCKED_RECOVERY_CACHE_SIZE' {Get-FfhRecoveryCacheEvidence -Root $cacheRoot}
  Receipt 10
  [IO.File]::WriteAllText($cache,'',[Text.UTF8Encoding]::new($false))
  if ((Get-FfhRecoveryCacheEvidence -Root $cacheRoot).bytes -ne 0) {throw 'SYNTH_EMPTY_CACHE_REFUSED'}
  Receipt 11

  $sha='cba20f7fecea8b7dfdbcb10fb245765825ef97c0'
  $cliHash='a'*64
  $id=Get-FfhRunIdentity -SourceSha $sha -RunToken ('b'*24)
  $id.evidence=$evidence
  $j=[pscustomobject]@{
    version=2;sha=$sha;token=$id.token;project=$id.project;root=$id.root
    evidence=$evidence;container=$id.container;runKind='ONE_SHOT_DIAGNOSTIC'
    cliVersion='2.122.0';diagnosticCliSha256=$cliHash;state='MANUAL_REVIEW'
    diagnosticStatus='MANUAL_REVIEW';testResult='UNKNOWN'
    cleanupResult='CLEANUP_BLOCKED_MANUAL_REVIEW';gateAResult='NOT_STARTED'
    gateBResult='NOT_STARTED';sqlBoundary=[pscustomobject]@{phase='NONE';status='NOT_STARTED'}
    ports=@(26000,26001);postStartMigrationCopies=15
    rootOwnership=[pscustomobject]@{fileId='12345678:abcdef0123456789';markerVersion=1}
    rootRetirement=[pscustomobject]@{status='NOT_STARTED'}
    resources=@(
      [pscustomobject]@{kind='containers';id=('c'*64);name=('/'+$id.container)}
      [pscustomobject]@{kind='volumes';id=('supabase_db_'+$id.project+'_data');name=('supabase_db_'+$id.project+'_data')}
      [pscustomobject]@{kind='networks';id=('d'*64);name=('supabase_network_'+$id.project)}
    )
  }
  $ledger=[ordered]@{schema=1;runKind='ONE_SHOT_DIAGNOSTIC';sha=$sha;token=$id.token;cliVersion='2.122.0';cliSha256=$cliHash;state='CONSUMED_BEFORE_ANY_PROJECT_CREATION'}
  $final=[ordered]@{schema=1;kind='ONE_SHOT_DIAGNOSTIC';sourceSha=$sha;runToken=$id.token;stage='FINAL';testResult='UNKNOWN';cleanupResult='CLEANUP_BLOCKED_MANUAL_REVIEW';category='FAIL_CLOSED';gateA='NOT_STARTED';gateB='NOT_STARTED'}
  $ledgerPath=Join-Path $evidence '.ffh-p01-one-shot-diagnostic.json'
  $finalPath=Join-Path $evidence ($id.token+'.DIAG_FINAL.json')
  [IO.File]::WriteAllText($ledgerPath,($ledger|ConvertTo-Json -Depth 10))
  [IO.File]::WriteAllText($finalPath,($final|ConvertTo-Json -Depth 10))
  if (-not (Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash)) {
    throw 'SYNTH_CONSUMED_JOURNAL_REJECTED'
  }
  Receipt 12
  $j.sqlBoundary.status='COMPLETE'
  MustBlock 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE' {Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash}
  $j.sqlBoundary.status='NOT_STARTED'
  Receipt 13
  $ledger.state='NOT_CONSUMED'
  [IO.File]::WriteAllText($ledgerPath,($ledger|ConvertTo-Json -Depth 10))
  MustBlock 'BLOCKED_RECOVERY_CONSUMED_LEDGER_INVALID' {Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash}
  Receipt 14
  $ledger.state='CONSUMED_BEFORE_ANY_PROJECT_CREATION'
  [IO.File]::WriteAllText($ledgerPath,($ledger|ConvertTo-Json -Depth 10))
  $final.category='ATTEMPTED_RETRY'
  [IO.File]::WriteAllText($finalPath,($final|ConvertTo-Json -Depth 10))
  MustBlock 'BLOCKED_RECOVERY_FINAL_RECEIPT_DRIFT' {Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash}
  Receipt 15
  $entryPath=Join-Path $repo 'scripts/rls-local/owner-disposable-recovery-plan.ps1'
  $et=$null;$ee=$null
  $ea=[Management.Automation.Language.Parser]::ParseFile($entryPath,[ref]$et,[ref]$ee)
  if (@($ee).Count -ne 0) {throw 'SYNTH_RECOVERY_ENTRY_PARSE_INVALID'}
  $f=@($ea.FindAll({param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq 'Get-FfhRecoveryFailureCategory'
  },$false))
  if ($f.Count -ne 1) {throw 'SYNTH_RECOVERY_ERROR_CATEGORY_FUNCTION_MISSING'}
  Invoke-Expression $f[0].Extent.Text
  if ((Get-FfhRecoveryFailureCategory -ErrorText 'BLOCKED_RECOVERY_CACHE_HASH_DRIFT') -cne
      'BLOCKED_RECOVERY_CACHE_HASH_DRIFT') {throw 'SYNTH_RECOVERY_CATEGORY_NOT_PRESERVED'}
  Receipt 16
  if ((Get-FfhRecoveryFailureCategory -ErrorText 'secret=NEVER_PRINT_ME') -cne
      'UNEXPECTED_VERIFICATION_FAILURE') {throw 'SYNTH_RECOVERY_CATEGORY_NOT_SANITIZED'}
  Receipt 17
} finally {
  # Test-owned GUID synthetic path only, never an Owner root or evidence.
  $canonical=[IO.Path]::GetFullPath($base)
  $parent=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if (-not ([IO.Path]::GetDirectoryName($canonical)).Equals(
      $parent,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($canonical) -cnotmatch '^ffh-p01-recovery-fixture-[a-f0-9]{32}$') {
    throw 'SYNTH_CLEANUP_SCOPE_INVALID'
  }
  if ([IO.Directory]::Exists($canonical)) {[IO.Directory]::Delete($canonical,$true)}
}
