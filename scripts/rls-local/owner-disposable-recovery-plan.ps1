# FFH-P01 #83: read-only, nonformal forensic recovery PLAN for the ONE
# already-consumed owner diagnostic. Never starts a second Run.
# This script has NO mutation mode and must not be run on the owner host until
# the independent auditor and Manager authorize its read-only assessment.
# SEC-STAGE-01: NO script-level param()/CmdletBinding/ValidatePattern.
# WinPS5.1 -File binding happens before the first statement and can print
# untrusted values. Capture only raw tokens; validate inside guarded ARGUMENTS.
$script:FfhRecoveryInvocationArgs=@($args)
$ErrorActionPreference='Stop'
$script:FfhRecoveryStage='INITIALIZATION'
$script:FfhRecoverySyntheticCI=$false
$script:FfhRecoveryCiEnvironmentProbe='NONE'

# No external command, module import, filesystem or environment access.
# All string checks are literal, case-sensitive and bounded before use.
function Read-FfhRecoveryPlanArguments {
  param([object[]]$RawArgs)
  $required=@('ExpectedAuditedHead','ConsumedHead','RunToken','CliSha256')
  if ($null -eq $RawArgs -or $RawArgs.Count -eq 0) {
    throw 'BLOCKED_RECOVERY_ARGUMENTS_MISSING'
  }
  if ($RawArgs.Count -gt 10 -or ($RawArgs.Count % 2) -ne 0) {
    throw 'BLOCKED_RECOVERY_ARGUMENTS_COUNT'
  }
  if ($RawArgs.Count -lt 8) {
    throw 'BLOCKED_RECOVERY_ARGUMENTS_MISSING'
  }
  $seen=@{}
  for($i=0;$i -lt $RawArgs.Count;$i+=2) {
    $keyToken=$RawArgs[$i]
    if ($null -eq $keyToken -or $keyToken -isnot [string] -or
        $keyToken.Length -gt 30) {
      throw 'BLOCKED_RECOVERY_ARGUMENTS_KEY'
    }
    $key=[string]$keyToken
    if ($key -cnotmatch '^-(ExpectedAuditedHead|ConsumedHead|RunToken|CliSha256|PreapprovedCacheSha256)$') {
      if ($key -cmatch '^-[A-Za-z][A-Za-z0-9]{0,29}$') {
        throw 'BLOCKED_RECOVERY_ARGUMENTS_UNKNOWN'
      }
      throw 'BLOCKED_RECOVERY_ARGUMENTS_POSITIONAL'
    }
    $name=[string]$Matches[1]
    if ($seen.ContainsKey($name)) {
      throw 'BLOCKED_RECOVERY_ARGUMENTS_DUPLICATE'
    }
    $valueToken=$RawArgs[$i+1]
    if ($null -eq $valueToken -or $valueToken -isnot [string] -or
        $valueToken.Length -gt 64) {
      throw 'BLOCKED_RECOVERY_ARGUMENTS_VALUE'
    }
    $value=[string]$valueToken
    $pattern=if ($name -ceq 'RunToken') {'^[a-f0-9]{24}$'}
      elseif ($name -ceq 'ExpectedAuditedHead' -or $name -ceq 'ConsumedHead') {'^[a-f0-9]{40}$'}
      else {'^[a-f0-9]{64}$'}
    if ($value -cnotmatch $pattern) {
      throw 'BLOCKED_RECOVERY_ARGUMENTS_VALUE'
    }
    $seen.Add($name,$value)
  }
  foreach($name in $required) {
    if (-not $seen.ContainsKey($name)) {
      throw 'BLOCKED_RECOVERY_ARGUMENTS_MISSING'
    }
  }
  $approvedPin=''
  if ($seen.ContainsKey('PreapprovedCacheSha256')) {
    $approvedPin=[string]$seen['PreapprovedCacheSha256']
  }
  return [pscustomobject]@{
    ExpectedAuditedHead=[string]$seen['ExpectedAuditedHead']
    ConsumedHead=[string]$seen['ConsumedHead']
    RunToken=[string]$seen['RunToken']
    CliSha256=[string]$seen['CliSha256']
    PreapprovedCacheSha256=$approvedPin
  }
}

# The ONLY CI integration seam: inject read-only Docker *metadata* at a
# real -File entry on an ephemeral, explicitly ticketed Windows GitHub runner.
# Never usable silently: synthetic COMPLETE has an unmistakable extra marker.
# The original Git source, evidence, cache, journal, native C# Inspect/Preflight,
# and their fail-closed security checks remain genuine and unmodified.
function Enable-FfhRecoverySyntheticCiDocker {
  param([string]$AuditedHead)
  if ($env:FFH_P01_CI_STAGE1 -cne 'INTEGRATION_ONLY') {return}
  if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_OS -cne 'Windows' -or
      $env:CI -cne 'true' -or
      [Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
      [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP) -or
      [string]::IsNullOrWhiteSpace($env:GITHUB_WORKSPACE) -or
      [string]::IsNullOrWhiteSpace($env:FFH_P01_CI_STAGE1_TICKET)) {
    throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
  }
  $profileRoot=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $expectedRepo=Join-Path $profileRoot 'Family-Finance-Hub-P01-Recovery'
  $actualRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
  $runnerTemp=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\')
  $ticket=[IO.Path]::GetFullPath($env:FFH_P01_CI_STAGE1_TICKET)
  $actualHead=@(& git -C $actualRepo rev-parse HEAD 2>$null)
  if (-not $actualRepo.Equals($expectedRepo,[StringComparison]::OrdinalIgnoreCase) -or
      -not $ticket.StartsWith(($runnerTemp+'\'),[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($ticket) -cnotmatch '^ffh-p01-stage1-[a-f0-9]{32}\.ticket$' -or
      -not [IO.File]::Exists($ticket) -or
      $AuditedHead -cnotmatch '^[a-f0-9]{40}$' -or
      $actualHead.Count -ne 1 -or
      [IO.File]::ReadAllText($ticket,[Text.Encoding]::ASCII).Trim() -cne $actualHead[0]) {
    throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
  }
  $adapter=Join-Path $actualRepo 'tests/security/fixtures/ffh-p01-stage1-ci-docker-adapter.ps1'
  if (-not (Test-Path -LiteralPath $adapter -PathType Leaf)) {
    throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
  }
  return $adapter
}
function Invoke-FfhConsumedRecoveryPlan {
  param([string]$ExpectedAuditedHead,[string]$ConsumedHead,
    [string]$RunToken,[string]$CliSha256,[string]$PreapprovedCacheSha256)
  Set-FfhRecoveryStage -Stage 'CONSUMED_HEAD'
  # Prevent repurposing this forensic tool for another resource or run.
  if ($ConsumedHead -cne 'cba20f7fecea8b7dfdbcb10fb245765825ef97c0') {
    throw 'BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD'
  }
  Set-FfhRecoveryStage -Stage 'ENVIRONMENT'
  $script:FfhRecoveryCiEnvironmentProbe='REMOTE'
  Assert-FfhNoRemoteConfiguration
  $script:FfhRecoveryCiEnvironmentProbe='SUPABASE'
  Assert-FfhDiagnosticNoSupabaseOverrides
  $script:FfhRecoveryCiEnvironmentProbe='DOCKER_ENV'
  Assert-FfhDockerEnvironment
  $script:FfhRecoveryCiEnvironmentProbe='DOCKER_LOCAL'
  [void](Assert-FfhLocalDockerDesktop)
  $script:FfhRecoveryCiEnvironmentProbe='NONE'
  # Bind source verification to THIS audited script's own checkout,
  # never the caller's arbitrary working directory or original Audit tree.
  Set-FfhRecoveryStage -Stage 'SOURCE_CHECKOUT'
  $sourceRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
  $initialLocation=Get-Location
  try {
    Set-Location -LiteralPath $sourceRoot
    $source=Assert-FfhSourceCheckout -ExpectedHead $ExpectedAuditedHead -AllowDetachedHeadForDiagnostic
  } finally {Set-Location -LiteralPath $initialLocation.Path}
  Set-FfhRecoveryStage -Stage 'CHECKOUT_SCOPE'
  $profile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $approved=Join-Path $profile 'Family-Finance-Hub-P01-Recovery'
  if (-not ([IO.Path]::GetFullPath($source.repo)).Equals(
      [IO.Path]::GetFullPath($approved),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED_RECOVERY_SEPARATE_CHECKOUT_REQUIRED'
  }
  Assert-FfhNoReparsePath -Path $approved
  Set-FfhRecoveryStage -Stage 'RUN_IDENTITY'
  $identity=Get-FfhRunIdentity -SourceSha $ConsumedHead -RunToken $RunToken
  Set-FfhRecoveryStage -Stage 'EXISTING_EVIDENCE'
  # Do not allow Assert-FfhEvidencePath to create a missing evidence root.
  if (-not (Test-Path -LiteralPath $identity.evidence -PathType Container) -or
      -not (Test-Path -LiteralPath $identity.root -PathType Container)) {
    throw 'BLOCKED_RECOVERY_EXISTING_EVIDENCE_OR_ROOT_MISSING'
  }
  Assert-FfhNoReparsePath -Path $identity.root
  # Read through the recovery-specific existing-only evidence path: no
  # transitive call to the normal creating Read-FfhJournal.
  Set-FfhRecoveryStage -Stage 'JOURNAL_READ'
  $j=Read-FfhRecoveryJournal -Identity $identity
  Set-FfhRecoveryStage -Stage 'TERMINAL_STATE'
  [void](Assert-FfhConsumedRecoveryJournal -Identity $identity -Journal $j -ConsumedHead $ConsumedHead -CliSha256 $CliSha256)
  Set-FfhRecoveryStage -Stage 'CACHE_APPROVAL'
  [void](Assert-FfhRecoveryAuditedCacheApproval -ExpectedSha256 $PreapprovedCacheSha256)
  Set-FfhRecoveryStage -Stage 'CACHE_INSPECTION'
  $cache=Get-FfhRecoveryCacheEvidence -Root $identity.root -ExpectedSha256 $PreapprovedCacheSha256
  # Re-attest the exact Linux named pipe and full journalled resource set.
  Set-FfhRecoveryStage -Stage 'DOCKER_INVENTORY'
  $resource=@(Assert-FfhDiagnosticInventory -Identity $identity -Journal $j)
  if ($resource.Count -ne 3) {throw 'BLOCKED_RECOVERY_RESOURCE_INVENTORY_DRIFT'}
  Set-FfhRecoveryStage -Stage 'DATABASE_HEALTH'
  $db=Assert-FfhDiagnosticDatabase -Identity $identity -Journal $j
  $journalContainers=@($j.resources | Where-Object { $_.kind -ceq 'containers' })
  if ($journalContainers.Count -ne 1 -or $db -cne $journalContainers[0].id) {
    throw 'BLOCKED_RECOVERY_DATABASE_IDENTITY_DRIFT'
  }
  Set-FfhRecoveryStage -Stage 'PROTECTED_BASELINE'
  Confirm-FfhBaseline -Journal $j
  # The new audited native implementation is loaded only from this HEAD.
  # Original consumed SHA's source-provenance and 15 migrations are checked
  # independently by Get-FfhRecoveryReadOnlyPermit against immutable Git IDs.
  Set-FfhRecoveryStage -Stage 'CROSS_SHA_PERMIT'
  $permit=Get-FfhRecoveryReadOnlyPermit -Identity $identity -Journal $j -Source $source -AuditedHead $ExpectedAuditedHead -CacheSha256 $cache.sha256
  Set-FfhRecoveryStage -Stage 'NATIVE_LOAD'
  $parent=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $leaf='FFH-P01-RLS-Fresh-'+$ConsumedHead.Substring(0,12)+'-'+$RunToken
  Assert-FfhNoReparsePath -Path $parent
  [void](Get-FfhOwnedRootNative)
  Set-FfhRecoveryStage -Stage 'NATIVE_INSPECT'
  if ([FfhP01OwnedRoot]::Inspect($parent,$leaf,(Get-FfhRootMarker -Identity $identity)) -cne
      $j.rootOwnership.fileId) {
    throw 'BLOCKED_RECOVERY_NATIVE_ROOT_IDENTITY_CHANGED'
  }
  Set-FfhRecoveryStage -Stage 'NATIVE_PREFLIGHT'
  if ([FfhP01OwnedRoot]::Preflight($parent,$leaf,$j.rootOwnership.fileId,
      (Get-FfhRootMarker -Identity $identity),$permit) -cne 'PREFLIGHT_OK') {
    throw 'BLOCKED_RECOVERY_NATIVE_PREFLIGHT'
  }
  # Re-read existing journal and receipts after native preflight. Never
  # silently adopt a rewritten journal during read-only assessment.
  Set-FfhRecoveryStage -Stage 'TERMINAL_REREAD'
  $endJournal=Read-FfhRecoveryJournal -Identity $identity
  Set-FfhRecoveryStage -Stage 'TERMINAL_RECEIPTS'
  [void](Assert-FfhConsumedRecoveryJournal -Identity $identity -Journal $endJournal -ConsumedHead $ConsumedHead -CliSha256 $CliSha256)
  if (($j | ConvertTo-Json -Depth 30 -Compress) -cne
      ($endJournal | ConvertTo-Json -Depth 30 -Compress)) {
    throw 'BLOCKED_RECOVERY_JOURNAL_DRIFT_DURING_PLAN'
  }
  # Preserve UNKNOWN first failure. Do NOT execute even read-only SQL without
  # its separately scoped host authorization, and never print Docker payloads.
  Set-FfhRecoveryStage -Stage 'COMPLETE'
  $ciMarker=if ($script:FfhRecoverySyntheticCI) {' INTEGRATION_SCOPE=CI_SYNTHETIC_ONLY'} else {''}
  # Adversarial CI-only output injection tests the ORIGINAL outer strict
  # one-record output contract; the raw private marker must never escape.
  if ($script:FfhRecoverySyntheticCI -and
      $env:FFH_P01_CI_STAGE1_FAULT -ceq 'OUTPUT_EXTRA') {
    Write-Output 'PRIVATE_NEVER_PRINT_CI_SECRET'
  }
  Write-Output ('RECOVERY_PLAN=READ_ONLY_EVIDENCE_ONLY STAGE=COMPLETE CATEGORY=NONE'+
    ' SOURCE_HEAD=VERIFIED'+
    ' CONSUMED_HEAD=VERIFIED CONSUMED_LEDGER=UNCHANGED'+
    ' FULL_JOURNAL_IDENTITY=VERIFIED EXACT_DOCKER_IDENTITY=VERIFIED'+
    ' NATIVE_ROOT_PREFLIGHT=PASS CACHE_STATUS='+$cache.status+
    ' CACHE_SHAPE='+$cache.shape+
    ' CACHE_SHA256=PRIVATE_NOT_PRINTED'+
    ' FIRST_FAILURE=UNKNOWN SQL_IDLE=NOT_AUTHORIZED'+
    ' DELETION=BLOCKED_PENDING_INDEPENDENT_AUDIT_AND_NEW_OWNER_GO'+$ciMarker)
}
# FFH-P01 #83 deterministic, nonsecret telemetry. The stage is set BEFORE
# each bound read-only step and remains intact through inherited nested catches.
# No stack trace, raw message, path, Docker JSON, token, ID or digest is emitted.
function Set-FfhRecoveryStage {
  param([Parameter(Mandatory=$true)][ValidateSet(
    'INITIALIZATION',
    'ARGUMENTS',
    'OUTPUT_CONTRACT',
    'MODULE_IMPORT',
    'CONSUMED_HEAD',
    'ENVIRONMENT',
    'SOURCE_CHECKOUT',
    'CHECKOUT_SCOPE',
    'RUN_IDENTITY',
    'EXISTING_EVIDENCE',
    'JOURNAL_READ',
    'TERMINAL_STATE',
    'CACHE_APPROVAL',
    'CACHE_INSPECTION',
    'DOCKER_INVENTORY',
    'DATABASE_HEALTH',
    'PROTECTED_BASELINE',
    'CROSS_SHA_PERMIT',
    'NATIVE_LOAD',
    'NATIVE_INSPECT',
    'NATIVE_PREFLIGHT',
    'TERMINAL_REREAD',
    'TERMINAL_RECEIPTS',
    'COMPLETE'
  )][string]$Stage)
  $script:FfhRecoveryStage=$Stage
}
function Get-FfhRecoverySafeStage {
  param([string]$Stage)
  $known=@(
    'INITIALIZATION',
    'ARGUMENTS',
    'OUTPUT_CONTRACT',
    'MODULE_IMPORT',
    'CONSUMED_HEAD',
    'ENVIRONMENT',
    'SOURCE_CHECKOUT',
    'CHECKOUT_SCOPE',
    'RUN_IDENTITY',
    'EXISTING_EVIDENCE',
    'JOURNAL_READ',
    'TERMINAL_STATE',
    'CACHE_APPROVAL',
    'CACHE_INSPECTION',
    'DOCKER_INVENTORY',
    'DATABASE_HEALTH',
    'PROTECTED_BASELINE',
    'CROSS_SHA_PERMIT',
    'NATIVE_LOAD',
    'NATIVE_INSPECT',
    'NATIVE_PREFLIGHT',
    'TERMINAL_REREAD',
    'TERMINAL_RECEIPTS',
    'COMPLETE'
  )
  if ($known -ccontains $Stage) {return $Stage}
  return 'INITIALIZATION'
}
function Get-FfhRecoveryFailureCategory {
  param([string]$ErrorText,[System.Management.Automation.ErrorRecord]$Failure,[string]$Stage)
  # Explicit compile-time allowlist: never echo caller-selected uppercase
  # strings merely because they resemble a BLOCKED_RECOVERY_ token.
  $known=@(
    'BLOCKED_RECOVERY_CACHE_CONTENT',
    'BLOCKED_RECOVERY_CACHE_DIGEST_FORMAT',
    'BLOCKED_RECOVERY_CACHE_DRIFT',
    'BLOCKED_RECOVERY_CACHE_ENCODING',
    'BLOCKED_RECOVERY_CACHE_FILE_KIND',
    'BLOCKED_RECOVERY_CACHE_FILE_MISSING',
    'BLOCKED_RECOVERY_CACHE_FOREIGN_CHILD',
    'BLOCKED_RECOVERY_CACHE_HASH_DRIFT',
    'BLOCKED_RECOVERY_CACHE_PIN_NOT_PREAPPROVED',
    'BLOCKED_RECOVERY_CACHE_SIZE',
    'BLOCKED_RECOVERY_CONFIG_SOURCE_DRIFT',
    'BLOCKED_RECOVERY_CONSUMED_LEDGER_INVALID',
    'BLOCKED_RECOVERY_CONTAINER_IDENTITY',
    'BLOCKED_RECOVERY_DATABASE_IDENTITY_DRIFT',
    'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_DRIFT',
    'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING',
    'BLOCKED_RECOVERY_EVIDENCE_DRIFT',
    'BLOCKED_RECOVERY_EVIDENCE_ENTRY_DRIFT',
    'BLOCKED_RECOVERY_EVIDENCE_ENTRY_MISSING',
    'BLOCKED_RECOVERY_EVIDENCE_ENTRY_SCOPE',
    'BLOCKED_RECOVERY_EVIDENCE_SCOPE',
    'BLOCKED_RECOVERY_EVIDENCE_SHORT_READ',
    'BLOCKED_RECOVERY_EVIDENCE_SIZE',
    'BLOCKED_RECOVERY_EXISTING_EVIDENCE_OR_ROOT_MISSING',
    'BLOCKED_RECOVERY_FINAL_RECEIPT_DRIFT',
    'BLOCKED_RECOVERY_JOURNAL_DRIFT_DURING_PLAN',
    'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE',
    'BLOCKED_RECOVERY_JOURNAL_READBACK_IDENTITY',
    'BLOCKED_RECOVERY_JOURNAL_REQUIRED_FIELD',
    'BLOCKED_RECOVERY_JOURNAL_SEQUENCE',
    'BLOCKED_RECOVERY_MIGRATION_FILE_SHAPE',
    'BLOCKED_RECOVERY_MIGRATION_GIT_OBJECT_DRIFT',
    'BLOCKED_RECOVERY_NATIVE_PREFLIGHT',
    'BLOCKED_RECOVERY_NATIVE_ROOT_IDENTITY_CHANGED',
    'BLOCKED_RECOVERY_NETWORK_IDENTITY',
    'BLOCKED_RECOVERY_RESOURCE_CARDINALITY',
    'BLOCKED_RECOVERY_RESOURCE_INVENTORY_DRIFT',
    'BLOCKED_RECOVERY_SEPARATE_CHECKOUT_REQUIRED',
    'BLOCKED_RECOVERY_SOURCE_PERMIT_INVALID',
    'BLOCKED_RECOVERY_UNEXPECTED_TEST_RECEIPT',
    'BLOCKED_RECOVERY_VOLUME_IDENTITY',
    'BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD',
    'BLOCKED_RECOVERY_OUTPUT_CONTRACT',
    'BLOCKED_RECOVERY_ARGUMENTS_MISSING',
    'BLOCKED_RECOVERY_ARGUMENTS_COUNT',
    'BLOCKED_RECOVERY_ARGUMENTS_KEY',
    'BLOCKED_RECOVERY_ARGUMENTS_UNKNOWN',
    'BLOCKED_RECOVERY_ARGUMENTS_POSITIONAL',
    'BLOCKED_RECOVERY_ARGUMENTS_DUPLICATE',
    'BLOCKED_RECOVERY_ARGUMENTS_VALUE'
  )
  if ($known -ccontains $ErrorText) {return $ErrorText}
  # WinPS5.1 wraps static C# calls as MethodInvocationException and often
  # TargetInvocationException. Inspect only a bounded exception chain at the
  # two native stages; emit ONLY compile-time allowlisted categories.
  # Never echo a message, inner exception, file path, object ID or digest.
  if ($Stage -cin @('NATIVE_INSPECT','NATIVE_PREFLIGHT') -and $null -ne $Failure) {
    $nativeAllowed=@(
      'BLOCKED_ROOT_OPEN_2','BLOCKED_ROOT_OPEN_3',
      'BLOCKED_ROOT_OPEN_5','BLOCKED_ROOT_OPEN_32','BLOCKED_ROOT_OPEN_33',
      'BLOCKED_ROOT_INFO','BLOCKED_ROOT_REPARSE_OR_TYPE',
      'BLOCKED_ROOT_ID_UNKNOWN','BLOCKED_ROOT_HARDLINK',
      'BLOCKED_ROOT_PATH_IDENTITY','BLOCKED_ROOT_ACL_OWNER',
      'BLOCKED_ROOT_ACL_FOREIGN','BLOCKED_ROOT_CACHE_SIZE',
       'BLOCKED_ROOT_BRANCH_SIZE',
      'BLOCKED_ROOT_HASH_SEEK','BLOCKED_ROOT_HASH_READ',
      'BLOCKED_ROOT_CACHE_DRIFT','BLOCKED_ROOT_MARKER_SIZE',
      'BLOCKED_ROOT_MARKER_MISMATCH','BLOCKED_ROOT_MANIFEST_INVALID',
      'BLOCKED_ROOT_MANIFEST_UNKNOWN_PATH',
      'BLOCKED_ROOT_MANIFEST_INCOMPLETE','BLOCKED_ROOT_LIMIT_DEPTH',
      'BLOCKED_ROOT_LIMIT_SIBLINGS','BLOCKED_ROOT_LIMIT_TOTAL',
      'BLOCKED_ROOT_UNPERMITTED_PATH','BLOCKED_ROOT_DUPLICATE_ENTRY',
      'BLOCKED_ROOT_VOLUME','BLOCKED_ROOT_MANIFEST_HASH',
      'BLOCKED_ROOT_TREE_RACE','BLOCKED_ROOT_ID_DRIFT',
      'BLOCKED_ROOT_ROOT_DISAPPEARED_BEFORE_RETIRE'
    )
    $cause=$Failure.Exception
    for ($level=0; $level -lt 8 -and $null -ne $cause; $level++) {
      if ($cause -is [InvalidOperationException]) {
        $literal=[string]$cause.Message
        if ($nativeAllowed -ccontains $literal) {
          if ($literal -ceq 'BLOCKED_ROOT_OPEN_5') {return 'NATIVE_OPEN_ACCESS_REJECTED'}
          if ($literal -cin @('BLOCKED_ROOT_OPEN_32','BLOCKED_ROOT_OPEN_33')) {
            return 'NATIVE_OPEN_SHARING_REJECTED'
          }
          if ($literal -ceq 'BLOCKED_ROOT_MANIFEST_HASH') {
            return 'NATIVE_MANIFEST_HASH_REJECTED'
          }
          return 'NATIVE_GUARD_REJECTED'
        }
      }
      $cause=$cause.InnerException
    }
  }
  if ($ErrorText -cmatch '^BLOCKED_RECOVERY_') {
    return 'RECOVERY_GUARD_UNCLASSIFIED'
  }
  if ($ErrorText -cmatch '^BLOCKED_ROOT_') {
    return 'NATIVE_GUARD_REJECTED'
  }
  if ($ErrorText -cmatch '^BLOCKED_DIAG_') {
    return 'DIAGNOSTIC_GUARD_REJECTED'
  }
  if ($ErrorText -cmatch '^BLOCKED(?::|_)') {
    return 'INHERITED_GUARD_REJECTED'
  }
  if ($null -ne $Failure) {
    if ($Failure.Exception -is [Management.Automation.CommandNotFoundException]) {
      return 'COMMAND_UNAVAILABLE'
    }
    if ($Failure.Exception -is [UnauthorizedAccessException]) {
      return 'ACCESS_REJECTED'
    }
    if ($Failure.Exception -is [IO.IOException]) {
      return 'READ_IO_FAILURE'
    }
    if ($Failure.Exception -is [Management.Automation.ParameterBindingException]) {
      return 'PARAMETER_BINDING_REJECTED'
    }
  }
  return 'UNEXPECTED_VERIFICATION_FAILURE'
}
function Invoke-FfhRecoveryPlanEntry {
  param([Parameter(Mandatory=$true)][scriptblock]$Action)
  try {
    # Constrain *all* host-readable helper streams, including native Git
    # stderr, warnings, verbose/debug/info and unexpected stdout. Do not
    # disclose data emitted by an inherited helper before a failure.
    $observed=@(& $Action 2>$null 3>$null 4>$null 5>$null 6>$null)
    Set-FfhRecoveryStage -Stage 'OUTPUT_CONTRACT'
    $safe='^RECOVERY_PLAN=READ_ONLY_EVIDENCE_ONLY STAGE=COMPLETE CATEGORY=NONE SOURCE_HEAD=VERIFIED CONSUMED_HEAD=VERIFIED CONSUMED_LEDGER=UNCHANGED FULL_JOURNAL_IDENTITY=VERIFIED EXACT_DOCKER_IDENTITY=VERIFIED NATIVE_ROOT_PREFLIGHT=PASS CACHE_STATUS=CACHE_(OBSERVED_UNPINNED|PINNED_VERIFIED) CACHE_SHAPE=CLI_TAG_OR_EMPTY CACHE_SHA256=PRIVATE_NOT_PRINTED FIRST_FAILURE=UNKNOWN SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED_PENDING_INDEPENDENT_AUDIT_AND_NEW_OWNER_GO$'
    if ($script:FfhRecoverySyntheticCI) {
      $safe=$safe.Substring(0,$safe.Length-1)+' INTEGRATION_SCOPE=CI_SYNTHETIC_ONLY$'
    }
    if ($observed.Count -ne 1 -or [string]$observed[0] -cnotmatch $safe) {
      throw 'BLOCKED_RECOVERY_OUTPUT_CONTRACT'
    }
    Write-Output ([string]$observed[0])
  } catch {
    # Preserve the FIRST failing stage, including inherited helper catches.
    # Exit nonzero without PowerShell's default private-path stack/error echo.
    $failure=$_
    $stage=Get-FfhRecoverySafeStage -Stage ([string]$script:FfhRecoveryStage)
    $category=Get-FfhRecoveryFailureCategory -ErrorText ([string]$failure.Exception.Message) -Failure $failure -Stage $stage
    # No private exception is exposed. Only CI-synthetic receipts distinguish
    # the *name* of an existing production ENVIRONMENT guard for diagnosis.
    if ($script:FfhRecoverySyntheticCI -and $stage -ceq 'ENVIRONMENT' -and
        $script:FfhRecoveryCiEnvironmentProbe -cin @('REMOTE','SUPABASE','DOCKER_ENV','DOCKER_LOCAL')) {
      $category='CI_ENV_'+$script:FfhRecoveryCiEnvironmentProbe+'_FAILED'
    }
    Write-Output ('RECOVERY_PLAN=BLOCKED STAGE='+$stage+' CATEGORY='+$category+
      ' SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED NO_MUTATION=YES')
    exit 1
  }
}
Invoke-FfhRecoveryPlanEntry -Action {
  Set-FfhRecoveryStage -Stage 'ARGUMENTS'
  $validated=Read-FfhRecoveryPlanArguments -RawArgs $script:FfhRecoveryInvocationArgs
  $script:FfhRecoveryInvocationArgs=$null
  Set-FfhRecoveryStage -Stage 'MODULE_IMPORT'
  . "$PSScriptRoot/source-provenance.ps1"
  . "$PSScriptRoot/automatic-cleanup.ps1"
  . "$PSScriptRoot/cleanup-executor.ps1"
  . "$PSScriptRoot/diagnostic-lifecycle.ps1"
  . "$PSScriptRoot/diagnostic-network.ps1"
  . "$PSScriptRoot/diagnostic-recovery-readonly.ps1"
  $ciAdapter=Enable-FfhRecoverySyntheticCiDocker -AuditedHead $validated.ExpectedAuditedHead
  if ($ciAdapter) {
    # Dot-source in THIS guarded action's scope, where the production helpers
    # were just imported. A nested function-local import would evaporate.
    . $ciAdapter
    $syntheticDocker=(Get-Command Assert-FfhLocalDockerDesktop -CommandType Function).ScriptBlock
    $syntheticRead=(Get-Command Invoke-FfhDockerRead -CommandType Function).ScriptBlock
    if ($syntheticDocker.ToString() -cnotmatch 'CI_SYNTHETIC_NO_EXTERNAL_PROCESS' -or
        $syntheticRead.ToString() -cnotmatch 'FfhCiFault') {
      throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
    }
    # Bind fake read-only metadata functions into this isolated child script's
    # scope: nested imported functions must not resolve the parent originals.
    Set-Item -Path Function:\script:Assert-FfhLocalDockerDesktop -Value $syntheticDocker
    Set-Item -Path Function:\script:Invoke-FfhDockerRead -Value $syntheticRead
    $script:FfhRecoverySyntheticCI=$true
  }
  Invoke-FfhConsumedRecoveryPlan -ExpectedAuditedHead $validated.ExpectedAuditedHead -ConsumedHead $validated.ConsumedHead -RunToken $validated.RunToken -CliSha256 $validated.CliSha256 -PreapprovedCacheSha256 $validated.PreapprovedCacheSha256
}
