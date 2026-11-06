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
# Fixture-only scope/ACL substitution onto ONE GUID temp directory.
# The production FileMode.Open reader and entry checks are exercised unchanged.
function Assert-FfhRecoveryExistingDirectory {
  param($Identity)
  if (-not ([IO.Path]::GetFullPath($Identity.evidence)).Equals(
      [IO.Path]::GetFullPath($evidence),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_SCOPE'
  }
  if (-not [IO.Directory]::Exists($Identity.evidence)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING'
  }
  return $true
}
function Assert-FfhPrivateEvidenceAcl {
  param([string]$Path)
  if (-not ([IO.Path]::GetFullPath($Path)).StartsWith(
      ([IO.Path]::GetFullPath($base)+[IO.Path]::DirectorySeparatorChar),
      [StringComparison]::OrdinalIgnoreCase)) {
    throw 'SYNTH_FOREIGN_EVIDENCE_ACL_PATH'
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
    gateBResult='NOT_STARTED';sqlBoundary=[pscustomobject]@{
      phase='NONE';mode='NONE';status='NOT_STARTED';sha=$sha;token=$id.token
      containerId='';daemon='synthetic-daemon'
    }
    sequence=11;daemon='synthetic-daemon';evidenceSaved=$false
    ports=@(26000,26001);postStartMigrationCopies=15
    rootOwnership=[pscustomobject]@{fileId='12345678:abcdef0123456789';markerVersion=1}
    rootRetirement=[pscustomobject]@{status='NOT_STARTED';fileId='';atUtc=''}
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
  # REC-AUD-03: exact sequence and complete SQL-boundary metadata.
  $j.sequence=10
  MustBlock 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE' {
    Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash
  }
  $j.sequence=11
  Receipt 18
  $j.sqlBoundary.mode='Preflight'
  MustBlock 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE' {
    Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash
  }
  $j.sqlBoundary.mode='NONE'
  Receipt 19
  $j.sqlBoundary.daemon='forged'
  MustBlock 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE' {
    Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash
  }
  $j.sqlBoundary.daemon=$j.daemon
  Receipt 20
  $j.sqlBoundary.PSObject.Properties.Remove('token')
  MustBlock 'BLOCKED_RECOVERY_JOURNAL_REQUIRED_FIELD' {
    Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash
  }
  $j.sqlBoundary | Add-Member -NotePropertyName token -NotePropertyValue $id.token
  Receipt 21
  $j.sqlBoundary.containerId=('c'*64)
  MustBlock 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE' {
    Assert-FfhConsumedRecoveryJournal -Identity $id -Journal $j -ConsumedHead $sha -CliSha256 $cliHash
  }
  $j.sqlBoundary.containerId=''
  Receipt 22

  # REC-AUD-04: distinguish self-observed and externally expected hashes.
  [IO.File]::WriteAllText($cache,'v3.0.0',[Text.UTF8Encoding]::new($false))
  $observed=Get-FfhRecoveryCacheEvidence -Root $cacheRoot
  if ($observed.status -cne 'CACHE_OBSERVED_UNPINNED') {
    throw 'SYNTH_UNPINNED_NOT_DISTINGUISHED'
  }
  Receipt 23
  $pinned=Get-FfhRecoveryCacheEvidence -Root $cacheRoot -ExpectedSha256 $observed.sha256
  if ($pinned.status -cne 'CACHE_PINNED_VERIFIED' -or $pinned.sha256 -cne $observed.sha256) {
    throw 'SYNTH_PINNED_CHECK_FAILED'
  }
  Receipt 24

  # REC-AUD-01: large sparse-compatible fixture must stop at LENGTH, never
  # allocate or read the entire untrusted file.
  $big=[IO.FileStream]::new($cache,[IO.FileMode]::Open,
    [IO.FileAccess]::Write,[IO.FileShare]::None)
  try {$big.SetLength(128MB)} finally {$big.Dispose()}
  MustBlock 'BLOCKED_RECOVERY_CACHE_SIZE' {
    Get-FfhRecoveryCacheEvidence -Root $cacheRoot
  }
  Receipt 25
  [IO.File]::WriteAllText($cache,'v3.0.0',[Text.UTF8Encoding]::new($false))

  # REC-AUD-02: missing directory and journal must NEVER be created.
  $missingEvidence=Join-Path $base 'never-created-evidence'
  $fakeIdentity=[pscustomobject]@{evidence=$missingEvidence}
  MustBlock 'BLOCKED_RECOVERY_EVIDENCE_SCOPE' {
    Read-FfhRecoveryExistingJson -Identity $fakeIdentity -Path (Join-Path $missingEvidence 'journal.json')
  }
  if ([IO.Directory]::Exists($missingEvidence)) {throw 'SYNTH_MISSING_EVIDENCE_CREATED'}
  Receipt 26

  # Race injection: fixture-only entry checker removes the synthetic file
  # between successful admission and FileMode.Open. Open must not recreate it.
  $race=Join-Path $evidence 'race.json'
  [IO.File]::WriteAllText($race,'{"ok":true}',[Text.UTF8Encoding]::new($false))
  $originalEntry=(Get-Command Assert-FfhRecoveryExistingEntry).ScriptBlock
  try {
    function Assert-FfhRecoveryExistingEntry {
      param($Identity,[string]$Path,[switch]$Optional)
      if ([IO.File]::Exists($Path)) {[IO.File]::Delete($Path)}
      return $true
    }
    $blocked=$false
    try { [void](Read-FfhRecoveryExistingJson -Identity $id -Path $race) }
    catch {$blocked=$true}
    if (-not $blocked) {throw 'SYNTH_RACE_OPEN_WAS_NOT_BLOCKED'}
  } finally {
    Set-Item -Path Function:\Assert-FfhRecoveryExistingEntry -Value $originalEntry
  }
  if ([IO.File]::Exists($race) -or -not [IO.Directory]::Exists($evidence)) {
    throw 'SYNTH_RACE_CREATED_FILE'
  }
  Receipt 27
  $journalPath=Join-Path $evidence ($id.token+'.json')
  MustBlock 'BLOCKED_RECOVERY_EVIDENCE_ENTRY_MISSING' {
    Read-FfhRecoveryJournal -Identity $id
  }
  if ([IO.File]::Exists($journalPath)) {throw 'SYNTH_MISSING_JOURNAL_CREATED'}
  Receipt 28
  # The real ledger and FINAL receipt were never rewritten by recovery reads.
  if (($ledger|ConvertTo-Json -Depth 10) -cne [IO.File]::ReadAllText($ledgerPath) -or
      ($final|ConvertTo-Json -Depth 10) -cne [IO.File]::ReadAllText($finalPath)) {
    throw 'SYNTH_READ_ONLY_MUTATED_EVIDENCE'
  }
  Receipt 29

  # REC-AUD-04 source-frozen approval: operator cannot self-certify a digest
  # just by passing the hash observed in the same fixture.
  $approved=Assert-FfhRecoveryAuditedCacheApproval -ExpectedSha256 ''
  if (-not $approved) {throw 'SYNTH_UNPINNED_READ_ONLY_REFUSED'}
  Receipt 30
  MustBlock 'BLOCKED_RECOVERY_CACHE_PIN_NOT_PREAPPROVED' {
    Assert-FfhRecoveryAuditedCacheApproval -ExpectedSha256 $observed.sha256
  }
  Receipt 31

  # New STG-xx receipts are real WinPS5.1 child processes. Extract the
  # PRODUCTION entrypoint, category/stage mapper and consumed-plan function
  # from the tracked Plan AST; do not invoke the Plan against Owner evidence.
  $planFile=Join-Path $repo 'scripts/rls-local/owner-disposable-recovery-plan.ps1'
  $pt=$null;$pe=$null
  $planAst=[Management.Automation.Language.Parser]::ParseFile($planFile,[ref]$pt,[ref]$pe)
  if (@($pe).Count -ne 0) {throw 'SYNTH_STG_PLAN_PARSE_FAILED'}
  $names=@('Set-FfhRecoveryStage','Get-FfhRecoverySafeStage',
    'Get-FfhRecoveryFailureCategory','Invoke-FfhRecoveryPlanEntry',
    'Invoke-FfhConsumedRecoveryPlan')
  $parts=@()
  foreach($name in $names) {
    $fn=@($planAst.FindAll({param($node)
      $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
      $node.Name -ceq $name
    },$false))
    if ($fn.Count -ne 1) {throw ('SYNTH_STG_PLAN_FUNCTION_MISSING_'+$name)}
    $parts+= $fn[0].Extent.Text
  }
  $planBody=(@($planAst.FindAll({param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq 'Invoke-FfhConsumedRecoveryPlan'
  },$false))[0]).Extent.Text
  # All security-admission stages must be assigned IN THE production Plan.
  $stageMap=[ordered]@{
    CONSUMED_HEAD='BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD'
    ENVIRONMENT='Assert-FfhNoRemoteConfiguration'
    SOURCE_CHECKOUT='Assert-FfhSourceCheckout'
    CHECKOUT_SCOPE='BLOCKED_RECOVERY_SEPARATE_CHECKOUT_REQUIRED'
    RUN_IDENTITY='Get-FfhRunIdentity'
    EXISTING_EVIDENCE='BLOCKED_RECOVERY_EXISTING_EVIDENCE_OR_ROOT_MISSING'
    JOURNAL_READ='Read-FfhRecoveryJournal'
    TERMINAL_STATE='Assert-FfhConsumedRecoveryJournal'
    CACHE_APPROVAL='Assert-FfhRecoveryAuditedCacheApproval'
    CACHE_INSPECTION='Get-FfhRecoveryCacheEvidence'
    DOCKER_INVENTORY='Assert-FfhDiagnosticInventory'
    DATABASE_HEALTH='Assert-FfhDiagnosticDatabase'
    PROTECTED_BASELINE='Confirm-FfhBaseline'
    CROSS_SHA_PERMIT='Get-FfhRecoveryReadOnlyPermit'
    NATIVE_LOAD='Get-FfhOwnedRootNative'
    NATIVE_INSPECT='[FfhP01OwnedRoot]::Inspect'
    NATIVE_PREFLIGHT='[FfhP01OwnedRoot]::Preflight'
    TERMINAL_REREAD='Read-FfhRecoveryJournal'
    TERMINAL_RECEIPTS='Assert-FfhConsumedRecoveryJournal'
  }
  $last=-1
  foreach($entry in $stageMap.GetEnumerator()) {
    $stageStart=$planBody.IndexOf(("Set-FfhRecoveryStage -Stage '"+$entry.Key+"'"),[StringComparison]::Ordinal)
    if ($stageStart -le $last) {throw ('SYNTH_STG_STAGE_MISSING_OR_ORDER_'+$entry.Key)}
    $operation=$planBody.IndexOf([string]$entry.Value,$stageStart,[StringComparison]::Ordinal)
    if ($operation -lt $stageStart -or $operation -gt ($stageStart+950)) {
      throw ('SYNTH_STG_ACTION_MISSING_'+$entry.Key)
    }
    $last=$stageStart
  }
  if ($planBody -cmatch '(?i)::Retire\s*\(|Invoke-FfhDockerAction\b|Get-FfhDiagnosticSqlIdle\b|Write-FfhJournal\b|Set-FfhRunState\b') {
    throw 'SYNTH_STG_FORBIDDEN_MUTATION_OR_SQL_CALL'
  }
  if ($planAst.Extent.Text -notmatch "Set-FfhRecoveryStage -Stage 'MODULE_IMPORT'" -or
      $planAst.Extent.Text -notmatch 'exit 1') {
    throw 'SYNTH_STG_IMPORT_OR_NONZERO_EXIT_MISSING'
  }
  # Generate ONLY a synthetic child entrypoint in this GUID-scoped test root.
  $harness=Join-Path $base 'synthetic-stage-entry.ps1'
  $head=@'
[CmdletBinding()]param([Parameter(Mandatory=$true)][string]$Case)
$ErrorActionPreference='Stop'
$script:FfhRecoveryStage='INITIALIZATION'
'@
  $cases=@'
function Assert-FfhNoRemoteConfiguration {
  throw 'BLOCKED: secret=NEVER_PRINT_ME profile=C:\PRIVATE_NEVER_PRINT_ME'
}
switch ($Case) {
  'WRONG_HEAD' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Invoke-FfhConsumedRecoveryPlan -ConsumedHead ('0'*40)
    }
  }
  'ENV_GUARD' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Invoke-FfhConsumedRecoveryPlan -ConsumedHead 'cba20f7fecea8b7dfdbcb10fb245765825ef97c0'
    }
  }
  'EVIDENCE_MISSING' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'EXISTING_EVIDENCE'
      throw 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING'
    }
  }
  'TERMINAL_DRIFT' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'TERMINAL_RECEIPTS'
      throw 'BLOCKED_RECOVERY_FINAL_RECEIPT_DRIFT'
    }
  }
  'CACHE_LARGE' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'CACHE_INSPECTION'
      throw 'BLOCKED_RECOVERY_CACHE_SIZE'
    }
  }
  'NATIVE_INHERITED' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'NATIVE_PREFLIGHT'
      throw 'BLOCKED_ROOT_OPEN_5_NEVER_PRINT_ME'
    }
  }
  'DOCKER_INHERITED' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'DOCKER_INVENTORY'
      throw 'BLOCKED_DIAG_DUAL_LABEL_SET_DRIFT_NEVER_PRINT_ME'
    }
  }
  'UNEXPECTED_SECRET' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'CROSS_SHA_PERMIT'
      throw 'private C:\PRIVATE_NEVER_PRINT_ME id=NEVER_PRINT_ME'
    }
  }
  'IO_SECRET' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'JOURNAL_READ'
      throw ([IO.IOException]::new('C:\PRIVATE_NEVER_PRINT_ME'))
    }
  }
  'UNLISTED_RECOVERY' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'CACHE_APPROVAL'
      throw 'BLOCKED_RECOVERY_UNLISTED_NEVER_PRINT_ME'
    }
  }
  'SOURCE_INHERITED' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'SOURCE_CHECKOUT'
      throw 'BLOCKED: git source failed C:\PRIVATE_NEVER_PRINT_ME'
    }
  }
  'MODULE_IMPORT' {
    Invoke-FfhRecoveryPlanEntry -Action {
      Set-FfhRecoveryStage -Stage 'MODULE_IMPORT'
      throw 'C:\PRIVATE_NEVER_PRINT_ME'
    }
  }
  default {throw 'SYNTH_UNKNOWN_CASE'}
}
'@
  [IO.File]::WriteAllText($harness,($head+[char]10+($parts -join [char]10)+[char]10+$cases),
    [Text.UTF8Encoding]::new($false))
  $checks=@(
    @('WRONG_HEAD','CONSUMED_HEAD','BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD')
    @('ENV_GUARD','ENVIRONMENT','INHERITED_GUARD_REJECTED')
    @('EVIDENCE_MISSING','EXISTING_EVIDENCE','BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING')
    @('TERMINAL_DRIFT','TERMINAL_RECEIPTS','BLOCKED_RECOVERY_FINAL_RECEIPT_DRIFT')
    @('CACHE_LARGE','CACHE_INSPECTION','BLOCKED_RECOVERY_CACHE_SIZE')
    @('NATIVE_INHERITED','NATIVE_PREFLIGHT','NATIVE_GUARD_REJECTED')
    @('DOCKER_INHERITED','DOCKER_INVENTORY','DIAGNOSTIC_GUARD_REJECTED')
    @('UNEXPECTED_SECRET','CROSS_SHA_PERMIT','UNEXPECTED_VERIFICATION_FAILURE')
    @('IO_SECRET','JOURNAL_READ','READ_IO_FAILURE')
    @('UNLISTED_RECOVERY','CACHE_APPROVAL','RECOVERY_GUARD_UNCLASSIFIED')
    @('SOURCE_INHERITED','SOURCE_CHECKOUT','INHERITED_GUARD_REJECTED')
    @('MODULE_IMPORT','MODULE_IMPORT','UNEXPECTED_VERIFICATION_FAILURE')
  )
  $num=31
  foreach($check in $checks) {
    $psi=[Diagnostics.ProcessStartInfo]::new()
    $psi.FileName=Join-Path $PSHOME 'powershell.exe'
    $psi.Arguments='-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
      $harness+'" -Case '+$check[0]
    $psi.UseShellExecute=$false
    $psi.RedirectStandardOutput=$true
    $psi.RedirectStandardError=$true
    $psi.CreateNoWindow=$true
    $proc=[Diagnostics.Process]::new()
    try {
      $proc.StartInfo=$psi
      if (-not $proc.Start()) {throw 'SYNTH_STG_PROCESS_START'}
      if (-not $proc.WaitForExit(30000)) {
        $proc.Kill();throw 'SYNTH_STG_PROCESS_TIMEOUT'
      }
      $stdout=$proc.StandardOutput.ReadToEnd().Trim()
      $stderr=$proc.StandardError.ReadToEnd().Trim()
      $expected='RECOVERY_PLAN=BLOCKED STAGE='+$check[1]+' CATEGORY='+$check[2]+
        ' SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED NO_MUTATION=YES'
      if ($proc.ExitCode -ne 1 -or $stdout -cne $expected -or $stderr.Length -ne 0 -or
          $stdout -match 'NEVER_PRINT_ME|PRIVATE_|cba20f7f|[a-f0-9]{64}') {
        throw ('SYNTH_STG_EXIT_OR_SANITIZATION_'+$check[0])
      }
    } finally {$proc.Dispose()}
    $num++
    Receipt $num
  }
  # No production resource was invoked; the fixture-owned ledger and FINAL
  # receipt remain byte-identical after every subprocess and synthetic race.
  if (($ledger|ConvertTo-Json -Depth 10) -cne [IO.File]::ReadAllText($ledgerPath) -or
      ($final|ConvertTo-Json -Depth 10) -cne [IO.File]::ReadAllText($finalPath) -or
      [IO.File]::Exists((Join-Path $evidence 'race.json'))) {
    throw 'SYNTH_STG_EVIDENCE_MUTATED'
  }
  Receipt 44
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
