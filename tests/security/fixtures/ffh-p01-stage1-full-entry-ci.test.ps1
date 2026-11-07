# FFH-P01 Stage 1: ACTUAL -File production Plan, isolated CI-owned resources.
# This is strictly a GitHub-hosted ephemeral Windows runner fixture. No Owner
# laptop, Docker, SQL, Retire, cleanup, hosted services or protected test root.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_OS -cne 'Windows' -or
    $env:CI -cne 'true' -or
    [Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw 'STG_CI_WINDOWS_ONLY'
}
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$head=(& git -C $repo rev-parse HEAD).Trim()
if ($head -cnotmatch '^[a-f0-9]{40}$' -or
    [IO.Path]::GetFullPath($env:GITHUB_WORKSPACE) -cne $repo -or
    -not $env:RUNNER_TEMP) {throw 'STG_CI_SOURCE_SCOPE'}
$old='cba20f7fecea8b7dfdbcb10fb245765825ef97c0'
# Full-depth history required: keep source Git object comparison GENUINE.
& git -C $repo cat-file -e ($old+'^{commit}') 2>$null
if ($LASTEXITCODE -ne 0) {throw 'STG_HISTORY_MISSING_DO_NOT_FAKE_PERMIT'}
. (Join-Path $repo 'scripts/rls-local/source-provenance.ps1')
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
$profileRoot=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
$approved=Join-Path $profileRoot 'Family-Finance-Hub-P01-Recovery'
$token='b'*24;$cliHash='a'*64
$id=Get-FfhRunIdentity -SourceSha $old -RunToken $token
$ticket=Join-Path ([IO.Path]::GetFullPath($env:RUNNER_TEMP)) ('ffh-p01-stage1-'+[Guid]::NewGuid().ToString('N')+'.ticket')
$journalPath=Get-FfhJournalPath -Identity $id
$ledgerPath=Join-Path $id.evidence '.ffh-p01-one-shot-diagnostic.json'
$finalPath=Join-Path $id.evidence ($token+'.DIAG_FINAL.json')
$cachePath=Join-Path $id.root 'supabase\.temp\cli-latest'
$rootReceipt=Join-Path $id.root 'ffh-p01-local-provenance.json'
$configPath=Join-Path $id.root 'supabase\config.toml'
$markerPath=Join-Path $id.root '.ffh-p01-owned-root'
$utf8=[Text.UTF8Encoding]::new($false)
$created=$false;$rootCreated=$false;$evidenceCreated=$false
function Write-Utf8([string]$Path,[string]$Value) {
  [IO.File]::WriteAllText($Path,$Value,$utf8)
}
function Restore-Utf8([string]$Path,[string]$Value) {
  Write-Utf8 -Path $Path -Value $Value
}
function Digest([string]$Path) {
  $hash=[Security.Cryptography.SHA256]::Create()
  try {return ([BitConverter]::ToString($hash.ComputeHash([IO.File]::ReadAllBytes($Path))).Replace('-','').ToLowerInvariant())}
  finally {$hash.Dispose()}
}
function Assert-OnlyOwnedPaths {
  if ($id.evidence -cne (Join-Path $profileRoot 'FFH-P01-RLS-Evidence') -or
      $id.root -cne (Join-Path $profileRoot ('FFH-P01-RLS-Fresh-'+$old.Substring(0,12)+'-'+$token)) -or
      $id.root -match '(?i)FFH-RLS-Test' -or
      $approved -match '(?i)FFH-RLS-Test') {throw 'STG_UNSAFE_FIXTURE_PATH'}
}
function Run-Plan([string]$Case,[string]$Fault,[string]$ExpectedStage,
  [string]$ExpectedCategory,[int]$Exit,[string]$HeadArg=$head,
  [string]$ConsumedArg=$old,[string]$Pin='',[string]$EnvFault='') {
  $p=Join-Path $approved 'scripts/rls-local/owner-disposable-recovery-plan.ps1'
  if (-not [IO.File]::Exists($p)) {throw 'STG_ENTRY_NOT_TRACKED'}
  $arguments='-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
    $p+'" -ExpectedAuditedHead '+$HeadArg+' -ConsumedHead '+$ConsumedArg+
    ' -RunToken '+$token+' -CliSha256 '+$cliHash
  if ($Pin) {$arguments+=' -PreapprovedCacheSha256 '+$Pin}
  $info=[Diagnostics.ProcessStartInfo]::new()
  $info.FileName='powershell.exe'
  $info.Arguments=$arguments
  $info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  $info.EnvironmentVariables['FFH_P01_CI_STAGE1']='INTEGRATION_ONLY'
  $info.EnvironmentVariables['FFH_P01_CI_STAGE1_TICKET']=$ticket
  $info.EnvironmentVariables['FFH_P01_CI_STAGE1_FAULT']=$Fault
  if ($EnvFault) {$info.EnvironmentVariables[$EnvFault]='PRIVATE_NEVER_PRINT_CI_SECRET'}
  $proc=[Diagnostics.Process]::new()
  try {
    $proc.StartInfo=$info
    if (-not $proc.Start()) {throw 'STG_PROCESS_START'}
    $stdoutAsync=$proc.StandardOutput.ReadToEndAsync()
    $stderrAsync=$proc.StandardError.ReadToEndAsync()
    if (-not $proc.WaitForExit(60000)) {
      $proc.Kill()
      throw 'STG_PROCESS_TIMEOUT'
    }
    $stdout=[string]$stdoutAsync.Result
    $stderr=[string]$stderrAsync.Result
    $lines=@($stdout -split '\r?\n' | Where-Object {$_ -ne ''})
    if ($proc.ExitCode -ne $Exit -or $lines.Count -ne 1 -or
        $stderr.Length -ne 0 -or
        ($stdout+$stderr) -match 'PRIVATE_NEVER_PRINT_CI_SECRET|C:\\Users\\|D:\\a\\| at .*\.ps1:') {
      throw ('STG_CONTRACT_'+$Case+'_EXIT_'+$proc.ExitCode+'_LINES_'+$lines.Count+
        '_ERR_'+$stderr.Length)
    }
    $line=$lines[0]
    if ($Exit -eq 0) {
      if ($line -cnotmatch ('^RECOVERY_PLAN=READ_ONLY_EVIDENCE_ONLY STAGE=COMPLETE CATEGORY=NONE'+
        ' SOURCE_HEAD=VERIFIED CONSUMED_HEAD=VERIFIED CONSUMED_LEDGER=UNCHANGED'+
        ' FULL_JOURNAL_IDENTITY=VERIFIED EXACT_DOCKER_IDENTITY=VERIFIED'+
        ' NATIVE_ROOT_PREFLIGHT=PASS CACHE_STATUS=CACHE_OBSERVED_UNPINNED'+
        ' CACHE_SHAPE=CLI_TAG_OR_EMPTY CACHE_SHA256=PRIVATE_NOT_PRINTED'+
        ' FIRST_FAILURE=UNKNOWN SQL_IDLE=NOT_AUTHORIZED'+
        ' DELETION=BLOCKED_PENDING_INDEPENDENT_AUDIT_AND_NEW_OWNER_GO'+
        ' INTEGRATION_SCOPE=CI_SYNTHETIC_ONLY$')) {
        throw ('STG_SUCCESS_CONTRACT_'+$Case+'_LINE_'+$line)
      }
    } else {
      if ($line -cne ('RECOVERY_PLAN=BLOCKED STAGE='+$ExpectedStage+
        ' CATEGORY='+$ExpectedCategory+
        ' SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED NO_MUTATION=YES')) {
        throw ('STG_FAILURE_CATEGORY_'+$Case+'_ACTUAL_'+$line)
      }
    }
  } finally {$proc.Dispose()}
}
function Snapshot {
  $paths=@($journalPath,$ledgerPath,$finalPath,$cachePath,$rootReceipt,$configPath,$markerPath)
  $rows=@()
  foreach($path in $paths) {
    if ([IO.File]::Exists($path)) {
      $rows+=($path+'|'+(Digest $path)+'|'+[IO.File]::GetLastWriteTimeUtc($path).Ticks)
    } else {$rows+=($path+'|ABSENT')}
  }
  $rows+=('EVIDENCE='+(@([IO.Directory]::GetFileSystemEntries($id.evidence)) | Sort-Object) -join ',')
  $rows+=('ROOT='+(@([IO.Directory]::GetFileSystemEntries($id.root)) | Sort-Object) -join ',')
  return ($rows -join [char]10)
}
function ExecuteCase([int]$N,[string]$Case,[string]$Fault,
  [string]$Stage,[string]$Category,[int]$Exit=1,
  [string]$HeadArg=$head,[string]$ConsumedArg=$old,
  [string]$Pin='',[string]$EnvFault='') {
  $pre=Snapshot
  Run-Plan -Case $Case -Fault $Fault -ExpectedStage $Stage -ExpectedCategory $Category -Exit $Exit -HeadArg $HeadArg -ConsumedArg $ConsumedArg -Pin $Pin -EnvFault $EnvFault
  $post=Snapshot
  if ($pre -cne $post) {throw ('STG_MUTATION_'+$Case)}
  Write-Output ('STG-'+$N.ToString('00')+' PASS '+$Case+' STAGE='+$Stage)
}
Assert-OnlyOwnedPaths
if ([IO.Directory]::Exists($approved) -or [IO.Directory]::Exists($id.root) -or
    [IO.Directory]::Exists($id.evidence) -or [IO.File]::Exists($ticket)) {
  throw 'STG_EXISTING_PROFILE_PATH_UNTOUCHABLE'
}
try {
  # The actual Plan verifies EXACT source checkout and historical Git blobs.
  $out=@(& git -C $repo worktree add --detach $approved HEAD 2>&1)
  if ($LASTEXITCODE -ne 0 -or -not [IO.Directory]::Exists($approved)) {
    throw 'STG_GIT_WORKTREE_CREATE_FAILED'
  }
  $created=$true
  $loc=Get-Location
  try {
    Set-Location -LiteralPath $approved
    $src=Assert-FfhSourceCheckout -ExpectedHead $head -AllowDetachedHeadForDiagnostic
  } finally {Set-Location -LiteralPath $loc.Path}
  if ($src.repo -cne $approved -or @($src.migration_files).Count -ne 15) {
    throw 'STG_REAL_SOURCE_CHECK_FAILED'
  }
  Write-Utf8 -Path $ticket -Value $head
  [void][IO.Directory]::CreateDirectory($id.root);$rootCreated=$true
  Initialize-FfhPrivateEvidenceAcl -Path $id.root -NewlyCreated
  [void][IO.Directory]::CreateDirectory((Join-Path $id.root 'supabase\migrations'))
  [void][IO.Directory]::CreateDirectory((Join-Path $id.root 'supabase\.temp'))
  Write-Utf8 -Path $markerPath -Value (Get-FfhRootMarker -Identity $id)
  Initialize-FfhPrivateEvidenceAcl -Path $markerPath -NewlyCreated
  Write-Utf8 -Path $configPath -Value (Get-FfhFreshConfig -ExpectedHead $old -RunToken $token -DbPort 26000 -ShadowPort 26001)
  foreach($file in @($src.migration_files)) {
    [IO.File]::Copy((Join-Path $approved $file.path),(Join-Path $id.root ($file.path -replace '/','\')))
  }
  Write-Utf8 -Path $cachePath -Value 'v2.122.0'
  $rootData='{"syntheticCiFixture":true,"nonOwnerEvidence":true}'
  Write-Utf8 -Path $rootReceipt -Value $rootData
  [void](Get-FfhOwnedRootNative)
  $fileId=[FfhP01OwnedRoot]::Inspect($profileRoot,[IO.Path]::GetFileName($id.root),(Get-FfhRootMarker -Identity $id))
  if ($fileId -cnotmatch '^[a-f0-9]{8}:[a-f0-9]{16}$') {
    throw 'STG_REAL_NATIVE_INSPECT_INVALID'
  }
  [void][IO.Directory]::CreateDirectory($id.evidence);$evidenceCreated=$true
  Initialize-FfhPrivateEvidenceAcl -Path $id.evidence -NewlyCreated
  $j=[ordered]@{
    version=2;sha=$old;token=$token;project=$id.project;root=$id.root
    evidence=$id.evidence;container=$id.container;runKind='ONE_SHOT_DIAGNOSTIC'
    cliVersion='2.122.0';diagnosticCliSha256=$cliHash
    state='MANUAL_REVIEW';diagnosticStatus='MANUAL_REVIEW'
    testResult='UNKNOWN';cleanupResult='CLEANUP_BLOCKED_MANUAL_REVIEW'
    gateAResult='NOT_STARTED';gateBResult='NOT_STARTED'
    sqlBoundary=[ordered]@{phase='NONE';mode='NONE';status='NOT_STARTED';
      sha=$old;token=$token;containerId='';daemon='CI_SYNTHETIC_DAEMON'}
    sequence=11;daemon='CI_SYNTHETIC_DAEMON';evidenceSaved=$false
    ports=@(26000,26001);postStartMigrationCopies=15
    rootOwnership=[ordered]@{fileId=$fileId;markerVersion=1}
    rootRetirement=[ordered]@{status='NOT_STARTED';fileId='';atUtc=''}
    rootReceiptSha256=(Digest $rootReceipt);rootReceiptCheckSha256=''
    protected=@(('C:'+('f'*64)+' FFH-RLS-Test'))
    resources=@(
      [ordered]@{kind='containers';id=('c'*64);name=('/'+$id.container)}
      [ordered]@{kind='volumes';id=('supabase_db_'+$id.project);name=('supabase_db_'+$id.project)}
      [ordered]@{kind='networks';id=('d'*64);name=('supabase_network_'+$id.project)}
    )
  }
  $ledger=[ordered]@{schema=1;runKind='ONE_SHOT_DIAGNOSTIC'
    sha=$old;token=$token;cliVersion='2.122.0';cliSha256=$cliHash
    state='CONSUMED_BEFORE_ANY_PROJECT_CREATION'}
  $final=[ordered]@{schema=1;kind='ONE_SHOT_DIAGNOSTIC'
    sourceSha=$old;runToken=$token;stage='FINAL';testResult='UNKNOWN'
    cleanupResult='CLEANUP_BLOCKED_MANUAL_REVIEW';category='FAIL_CLOSED'
    gateA='NOT_STARTED';gateB='NOT_STARTED'}
  $jText=ConvertTo-Json -InputObject $j -Depth 30
  $ledgerText=ConvertTo-Json -InputObject $ledger -Depth 12
  $finalText=ConvertTo-Json -InputObject $final -Depth 12
  Write-Utf8 $journalPath $jText
  Write-Utf8 $ledgerPath $ledgerText
  Write-Utf8 $finalPath $finalText
  foreach($e in @($journalPath,$ledgerPath,$finalPath)) {
    Initialize-FfhPrivateEvidenceAcl -Path $e -NewlyCreated
  }
  # CI-only snapshot before/after EACH real PowerShell child invocation.
  ExecuteCase 1 'COMPLETE_SHARED_CONTAINER_VOLUME_NATIVE_PREFLIGHT' '' 'COMPLETE' 'NONE' 0
  ExecuteCase 2 'WRONG_CONSUMED_HEAD' '' 'CONSUMED_HEAD' 'BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD' 1 $head ('e'*40)
  ExecuteCase 3 'REMOTE_ENV_REJECTED' '' 'ENVIRONMENT' 'INHERITED_GUARD_REJECTED' 1 $head $old '' 'DATABASE_URL'
  ExecuteCase 4 'SOURCE_SHA_MISMATCH' '' 'SOURCE_CHECKOUT' 'INHERITED_GUARD_REJECTED' 1 ('e'*40)
  # Every mutation below is TEST SETUP only and is immediately restored.
  try {
    [IO.File]::Delete($journalPath)
    ExecuteCase 5 'JOURNAL_MISSING' '' 'JOURNAL_READ' 'BLOCKED_RECOVERY_EVIDENCE_ENTRY_MISSING'
  } finally {Write-Utf8 $journalPath $jText}
  try {
    $mut=$j | ConvertTo-Json -Depth 30 | ConvertFrom-Json
    $mut.sequence=10
    Write-Utf8 $journalPath ($mut|ConvertTo-Json -Depth 30)
    ExecuteCase 6 'JOURNAL_SEQUENCE' '' 'TERMINAL_STATE' 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE'
  } finally {Write-Utf8 $journalPath $jText}
  try {
    $mut=$j | ConvertTo-Json -Depth 30 | ConvertFrom-Json
    $mut.resources[1].name+='_'+'data'
    $mut.resources[1].id=$mut.resources[1].name
    Write-Utf8 $journalPath ($mut|ConvertTo-Json -Depth 30)
    ExecuteCase 7 'PINNED_VOLUME_OLD_SUFFIX' '' 'TERMINAL_STATE' 'BLOCKED_RECOVERY_VOLUME_IDENTITY'
  } finally {Write-Utf8 $journalPath $jText}
  try {
    Write-Utf8 $ledgerPath ($ledgerText -replace 'CONSUMED_BEFORE_ANY_PROJECT_CREATION','NOT_CONSUMED')
    ExecuteCase 8 'LEDGER_DRIFT' '' 'TERMINAL_STATE' 'BLOCKED_RECOVERY_CONSUMED_LEDGER_INVALID'
  } finally {Write-Utf8 $ledgerPath $ledgerText}
  try {
    Write-Utf8 $finalPath ($finalText -replace 'FAIL_CLOSED','PRIVATE_NEVER_PRINT_CI_SECRET')
    ExecuteCase 9 'FINAL_RECEIPT_DRIFT_SANITIZED' '' 'TERMINAL_STATE' 'BLOCKED_RECOVERY_FINAL_RECEIPT_DRIFT'
  } finally {Write-Utf8 $finalPath $finalText}
  ExecuteCase 10 'CACHE_APPROVAL_UNTRUSTED_PIN' '' 'CACHE_APPROVAL' 'BLOCKED_RECOVERY_CACHE_PIN_NOT_PREAPPROVED' 1 $head $old ('e'*64)
  try {
    Write-Utf8 $cachePath 'PRIVATE_NEVER_PRINT_CI_SECRET'
    ExecuteCase 11 'CACHE_MALFORMED_NO_LEAK' '' 'CACHE_INSPECTION' 'BLOCKED_RECOVERY_CACHE_CONTENT'
    Write-Utf8 $cachePath ('x'*97)
    ExecuteCase 12 'CACHE_BOUNDED_SIZE' '' 'CACHE_INSPECTION' 'BLOCKED_RECOVERY_CACHE_SIZE'
    Write-Utf8 $cachePath 'v2.122.0'
    Write-Utf8 (Join-Path (Split-Path $cachePath -Parent) 'extra') 'x'
    ExecuteCase 13 'CACHE_FOREIGN_CHILD' '' 'CACHE_INSPECTION' 'BLOCKED_RECOVERY_CACHE_FOREIGN_CHILD'
  } finally {
    Write-Utf8 $cachePath 'v2.122.0'
    $extra=Join-Path (Split-Path $cachePath -Parent) 'extra'
    if ([IO.File]::Exists($extra)) {[IO.File]::Delete($extra)}
  }
  ExecuteCase 14 'DOCKER_DAEMON_DRIFT' 'DAEMON' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 15 'DOCKER_DUAL_LABEL_BIJECTION' 'LABEL' 'DOCKER_INVENTORY' 'DIAGNOSTIC_GUARD_REJECTED'
  ExecuteCase 16 'UNLABELLED_GLOBAL_EXTRA' 'UNLABELLED_EXTRA' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 17 'CONTAINER_ID_DRIFT' 'CONTAINER_ID' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 18 'FOREIGN_MOUNT' 'MOUNT' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 19 'FOREIGN_VOLUME_CONSUMER' 'CONSUMER' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 20 'FOREIGN_NETWORK_PEER' 'PEER' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 21 'NETWORK_NOT_LOOPBACK' 'NETWORK_BIND' 'DOCKER_INVENTORY' 'DIAGNOSTIC_GUARD_REJECTED'
  ExecuteCase 22 'UNHEALTHY_DB' 'HEALTH' 'DATABASE_HEALTH' 'DIAGNOSTIC_GUARD_REJECTED'
  ExecuteCase 23 'DB_NONLOCAL_PORT' 'PORT' 'DATABASE_HEALTH' 'DIAGNOSTIC_GUARD_REJECTED'
  try {
    $mut=$j|ConvertTo-Json -Depth 30|ConvertFrom-Json
    $mut.rootReceiptSha256='e'*64
    Write-Utf8 $journalPath ($mut|ConvertTo-Json -Depth 30)
    # Correctly formatted digest reaches genuine permit + native file hash,
    # whereas an invalid digest format must stop in CROSS_SHA_PERMIT.
    $mut.rootReceiptSha256='NOT_A_HASH'
    Write-Utf8 $journalPath ($mut|ConvertTo-Json -Depth 30)
    ExecuteCase 24 'CROSS_SHA_PERMIT_INVALID' '' 'CROSS_SHA_PERMIT' 'BLOCKED_RECOVERY_SOURCE_PERMIT_INVALID'
  } finally {Write-Utf8 $journalPath $jText}
  try {
    $mut=$j|ConvertTo-Json -Depth 30|ConvertFrom-Json
    $mut.rootOwnership.fileId='deadbeef:deadbeefdeadbeef'
    Write-Utf8 $journalPath ($mut|ConvertTo-Json -Depth 30)
    ExecuteCase 25 'NATIVE_INSPECT_IDENTITY' '' 'NATIVE_INSPECT' 'BLOCKED_RECOVERY_NATIVE_ROOT_IDENTITY_CHANGED'
  } finally {Write-Utf8 $journalPath $jText}
  try {
    Write-Utf8 $configPath 'PRIVATE_NEVER_PRINT_CI_SECRET'
    ExecuteCase 26 'NATIVE_PREFLIGHT_HASH' '' 'NATIVE_PREFLIGHT' 'NATIVE_GUARD_REJECTED'
  } finally {Write-Utf8 $configPath (Get-FfhFreshConfig -ExpectedHead $old -RunToken $token -DbPort 26000 -ShadowPort 26001)}
  ExecuteCase 27 'UNEXPECTED_DOCKER_ERROR_SANITIZED' 'STREAM_LEAK' 'DOCKER_INVENTORY' 'UNEXPECTED_VERIFICATION_FAILURE'
  ExecuteCase 28 'FINAL_COMPLETE_REVALIDATION' '' 'COMPLETE' 'NONE' 0
  ExecuteCase 29 'PROTECTED_BASELINE_DRIFT' 'PROTECTED_BASELINE' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 30 'NETWORK_IMMUTABLE_ID_DRIFT' 'NETWORK_ID' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  ExecuteCase 31 'UNLABELLED_VOLUME_OLD_SUFFIX' 'VOLUME_NAME' 'DOCKER_INVENTORY' 'INHERITED_GUARD_REJECTED'
  try {
    $mut=$j|ConvertTo-Json -Depth 30|ConvertFrom-Json
    $mut.resources[2]=$mut.resources[1]
    Write-Utf8 $journalPath ($mut|ConvertTo-Json -Depth 30)
    ExecuteCase 32 'DUPLICATE_JOURNAL_VOLUME' '' 'TERMINAL_STATE' 'BLOCKED_RECOVERY_RESOURCE_CARDINALITY'
  } finally {Write-Utf8 $journalPath $jText}
  ExecuteCase 33 'STRICT_OUTPUT_CONTRACT' 'OUTPUT_EXTRA' 'OUTPUT_CONTRACT' 'BLOCKED_RECOVERY_OUTPUT_CONTRACT'
  ExecuteCase 34 'SANITIZED_CI_MODULE_IMPORT' 'MODULE_IMPORT' 'MODULE_IMPORT' 'UNEXPECTED_VERIFICATION_FAILURE'
  ExecuteCase 35 'LATE_PROTECTED_BASELINE' 'PROTECTED_LATE' 'PROTECTED_BASELINE' 'INHERITED_GUARD_REJECTED'
} finally {
  # Test-created paths only, on a uniquely gated ephemeral GH runner.
  if ($evidenceCreated -and [IO.Directory]::Exists($id.evidence)) {
    if ([IO.Path]::GetFileName($id.evidence) -cne 'FFH-P01-RLS-Evidence') {
      throw 'STG_CLEANUP_EVIDENCE_SCOPE'
    }
    [IO.Directory]::Delete($id.evidence,$true)
  }
  if ($rootCreated -and [IO.Directory]::Exists($id.root)) {
    if ([IO.Path]::GetFileName($id.root) -cne ('FFH-P01-RLS-Fresh-'+$old.Substring(0,12)+'-'+$token)) {
      throw 'STG_CLEANUP_ROOT_SCOPE'
    }
    [IO.Directory]::Delete($id.root,$true)
  }
  if ($created -and [IO.Directory]::Exists($approved)) {
    & git -C $repo worktree remove --force $approved 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {throw 'STG_WORKTREE_REMOVE_FAILED'}
  }
  if ([IO.File]::Exists($ticket)) {[IO.File]::Delete($ticket)}
}
