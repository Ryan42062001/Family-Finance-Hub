# Exact process-exit contract for the real Gate B success guard.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][ValidateSet('PASS_PASS','PASS_BLOCKED','FAIL_PASS')][string]$Case)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../../scripts/rls-local/cleanup-executor.ps1')
$script:case=$Case
function Read-FfhJournal {
  param($Identity)
  switch ($script:case) {
    'PASS_PASS' { return [pscustomobject]@{gateAResult='PASS';gateBResult='PASS';cleanupResult='CLEANUP_VERIFIED'} }
    'PASS_BLOCKED' {return [pscustomobject]@{gateAResult='PASS';gateBResult='PASS';cleanupResult='CLEANUP_BLOCKED_MANUAL_REVIEW'} }
    'FAIL_PASS' {return [pscustomobject]@{gateAResult='PASS';gateBResult='FAIL';cleanupResult='CLEANUP_VERIFIED'} }
  }
}
$result=if($Case -ceq 'PASS_BLOCKED') {'CLEANUP_BLOCKED_MANUAL_REVIEW'}else{'CLEANUP_VERIFIED'}
[void](Assert-FfhGateBSuccessfulExit -Identity ([pscustomobject]@{}) -CleanupResult $result)
exit 0
