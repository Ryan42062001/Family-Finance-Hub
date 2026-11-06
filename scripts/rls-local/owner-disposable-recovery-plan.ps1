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
  [ValidatePattern('^[a-f0-9]{64}$')][string]$ExpectedCacheSha256
)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/source-provenance.ps1"
. "$PSScriptRoot/automatic-cleanup.ps1"
. "$PSScriptRoot/cleanup-executor.ps1"
. "$PSScriptRoot/diagnostic-lifecycle.ps1"
. "$PSScriptRoot/diagnostic-network.ps1"
. "$PSScriptRoot/diagnostic-recovery-readonly.ps1"

function Invoke-FfhConsumedRecoveryPlan {
  param([string]$ExpectedAuditedHead,[string]$ConsumedHead,
    [string]$RunToken,[string]$CliSha256,[string]$ExpectedCacheSha256)
  # Prevent repurposing this forensic tool for another resource or run.
  if ($ConsumedHead -cne 'cba20f7fecea8b7dfdbcb10fb245765825ef97c0') {
    throw 'BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD'
  }
  Assert-FfhNoRemoteConfiguration
  Assert-FfhDiagnosticNoSupabaseOverrides
  Assert-FfhDockerEnvironment
  [void](Assert-FfhLocalDockerDesktop)
  $source=Assert-FfhSourceCheckout -ExpectedHead $ExpectedAuditedHead -AllowDetachedHeadForDiagnostic
  $profile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $approved=Join-Path $profile 'Family-Finance-Hub-P01-Recovery'
  if (-not ([IO.Path]::GetFullPath($source.repo)).Equals(
      [IO.Path]::GetFullPath($approved),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED_RECOVERY_SEPARATE_CHECKOUT_REQUIRED'
  }
  Assert-FfhNoReparsePath -Path $approved
  $identity=Get-FfhRunIdentity -SourceSha $ConsumedHead -RunToken $RunToken
  # Do not allow Assert-FfhEvidencePath to create a missing evidence root.
  if (-not (Test-Path -LiteralPath $identity.evidence -PathType Container) -or
      -not (Test-Path -LiteralPath $identity.root -PathType Container)) {
    throw 'BLOCKED_RECOVERY_EXISTING_EVIDENCE_OR_ROOT_MISSING'
  }
  $j=Read-FfhJournal -Identity $identity
  [void](Assert-FfhConsumedRecoveryJournal -Identity $identity -Journal $j -ConsumedHead $ConsumedHead -CliSha256 $CliSha256)
  $cache=Get-FfhRecoveryCacheEvidence -Root $identity.root -ExpectedSha256 $ExpectedCacheSha256
  # Re-attest the exact Linux named pipe and full journalled resource set.
  $resource=@(Assert-FfhDiagnosticInventory -Identity $identity -Journal $j)
  if ($resource.Count -ne 3) {throw 'BLOCKED_RECOVERY_RESOURCE_INVENTORY_DRIFT'}
  $db=Assert-FfhDiagnosticDatabase -Identity $identity -Journal $j
  $journalContainers=@($j.resources | Where-Object { $_.kind -ceq 'containers' })
  if ($journalContainers.Count -ne 1 -or $db -cne $journalContainers[0].id) {
    throw 'BLOCKED_RECOVERY_DATABASE_IDENTITY_DRIFT'
  }
  Confirm-FfhBaseline -Journal $j
  # The new audited native implementation is loaded only from this HEAD.
  # Original consumed SHA's source-provenance and 15 migrations are checked
  # independently by Get-FfhRecoveryReadOnlyPermit against immutable Git IDs.
  $permit=Get-FfhRecoveryReadOnlyPermit -Identity $identity -Journal $j -Source $source -AuditedHead $ExpectedAuditedHead -CacheSha256 $cache.sha256
  $parent=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $leaf='FFH-P01-RLS-Fresh-'+$ConsumedHead.Substring(0,12)+'-'+$RunToken
  Assert-FfhNoReparsePath -Path $parent
  [void](Get-FfhOwnedRootNative)
  if ([FfhP01OwnedRoot]::Inspect($parent,$leaf,(Get-FfhRootMarker -Identity $identity)) -cne
      $j.rootOwnership.fileId) {
    throw 'BLOCKED_RECOVERY_NATIVE_ROOT_IDENTITY_CHANGED'
  }
  if ([FfhP01OwnedRoot]::Preflight($parent,$leaf,$j.rootOwnership.fileId,
      (Get-FfhRootMarker -Identity $identity),$permit) -cne 'PREFLIGHT_OK') {
    throw 'BLOCKED_RECOVERY_NATIVE_PREFLIGHT'
  }
  # Preserve UNKNOWN first failure. Do NOT execute even read-only SQL without
  # its separately scoped host authorization, and never print Docker payloads.
  Write-Output ('RECOVERY_PLAN=READ_ONLY_PREFLIGHT_PASS SOURCE_HEAD='+$ExpectedAuditedHead+
    ' CONSUMED_HEAD='+$ConsumedHead+' CONSUMED_LEDGER=UNCHANGED'+
    ' FULL_JOURNAL_IDENTITY=VERIFIED EXACT_DOCKER_IDENTITY=VERIFIED'+
    ' NATIVE_ROOT_PREFLIGHT=PASS CACHE_SHAPE='+$cache.shape+
    ' CACHE_BYTES='+$cache.bytes+' CACHE_SHA256='+$cache.sha256+
    ' FIRST_FAILURE=UNKNOWN SQL_IDLE=NOT_AUTHORIZED'+
    ' DELETION=BLOCKED_PENDING_INDEPENDENT_AUDIT_AND_NEW_OWNER_GO')
}
Invoke-FfhConsumedRecoveryPlan -ExpectedAuditedHead $ExpectedAuditedHead -ConsumedHead $ConsumedHead -RunToken $RunToken -CliSha256 $CliSha256 -ExpectedCacheSha256 $ExpectedCacheSha256
