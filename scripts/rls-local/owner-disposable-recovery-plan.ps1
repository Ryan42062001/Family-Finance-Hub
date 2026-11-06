# FFH-P01 #83: read-only, nonformal forensic recovery PLAN for the ONE
# already-consumed owner diagnostic. Never starts a second Run.
# This script has NO mutation mode and must not be run on the owner host until
# the independent auditor and Manager authorize its read-only assessment.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedAuditedHead,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ConsumedHead,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{24}$')][string]$RunToken,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{64}$')][string]$CliSha256,
  [ValidatePattern('^[a-f0-9]{64}$')][string]$PreapprovedCacheSha256
)
$ErrorActionPreference='Stop'
$script:FfhRecoveryStage='INITIALIZATION'

function Invoke-FfhConsumedRecoveryPlan {
  param([string]$ExpectedAuditedHead,[string]$ConsumedHead,
    [string]$RunToken,[string]$CliSha256,[string]$PreapprovedCacheSha256)
  Set-FfhRecoveryStage -Stage 'CONSUMED_HEAD'
  # Prevent repurposing this forensic tool for another resource or run.
  if ($ConsumedHead -cne 'cba20f7fecea8b7dfdbcb10fb245765825ef97c0') {
    throw 'BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD'
  }
  Set-FfhRecoveryStage -Stage 'ENVIRONMENT'
  Assert-FfhNoRemoteConfiguration
  Assert-FfhDiagnosticNoSupabaseOverrides
  Assert-FfhDockerEnvironment
  [void](Assert-FfhLocalDockerDesktop)
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
  Write-Output ('RECOVERY_PLAN=READ_ONLY_EVIDENCE_ONLY STAGE=COMPLETE CATEGORY=NONE'+
    ' SOURCE_HEAD=VERIFIED'+
    ' CONSUMED_HEAD=VERIFIED CONSUMED_LEDGER=UNCHANGED'+
    ' FULL_JOURNAL_IDENTITY=VERIFIED EXACT_DOCKER_IDENTITY=VERIFIED'+
    ' NATIVE_ROOT_PREFLIGHT=PASS CACHE_STATUS='+$cache.status+
    ' CACHE_SHAPE='+$cache.shape+
    ' CACHE_SHA256=PRIVATE_NOT_PRINTED'+
    ' FIRST_FAILURE=UNKNOWN SQL_IDLE=NOT_AUTHORIZED'+
    ' DELETION=BLOCKED_PENDING_INDEPENDENT_AUDIT_AND_NEW_OWNER_GO')
}
# FFH-P01 #83 deterministic, nonsecret telemetry. The stage is set BEFORE
# each bound read-only step and remains intact through inherited nested catches.
# No stack trace, raw message, path, Docker JSON, token, ID or digest is emitted.
function Set-FfhRecoveryStage {
  param([Parameter(Mandatory=$true)][ValidateSet(
    'INITIALIZATION',
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
  param([string]$ErrorText,[System.Management.Automation.ErrorRecord]$Failure)
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
    'BLOCKED_RECOVERY_OUTPUT_CONTRACT'
  )
  if ($known -ccontains $ErrorText) {return $ErrorText}
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
    if ($observed.Count -ne 1 -or [string]$observed[0] -cnotmatch $safe) {
      throw 'BLOCKED_RECOVERY_OUTPUT_CONTRACT'
    }
    Write-Output ([string]$observed[0])
  } catch {
    # Preserve the FIRST failing stage, including inherited helper catches.
    # Exit nonzero without PowerShell's default private-path stack/error echo.
    $failure=$_
    $stage=Get-FfhRecoverySafeStage -Stage ([string]$script:FfhRecoveryStage)
    $category=Get-FfhRecoveryFailureCategory -ErrorText ([string]$failure.Exception.Message) -Failure $failure
    Write-Output ('RECOVERY_PLAN=BLOCKED STAGE='+$stage+' CATEGORY='+$category+
      ' SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED NO_MUTATION=YES')
    exit 1
  }
}
Invoke-FfhRecoveryPlanEntry -Action {
  Set-FfhRecoveryStage -Stage 'MODULE_IMPORT'
  . "$PSScriptRoot/source-provenance.ps1"
  . "$PSScriptRoot/automatic-cleanup.ps1"
  . "$PSScriptRoot/cleanup-executor.ps1"
  . "$PSScriptRoot/diagnostic-lifecycle.ps1"
  . "$PSScriptRoot/diagnostic-network.ps1"
  . "$PSScriptRoot/diagnostic-recovery-readonly.ps1"
  Invoke-FfhConsumedRecoveryPlan -ExpectedAuditedHead $ExpectedAuditedHead -ConsumedHead $ConsumedHead -RunToken $RunToken -CliSha256 $CliSha256 -PreapprovedCacheSha256 $PreapprovedCacheSha256
}
