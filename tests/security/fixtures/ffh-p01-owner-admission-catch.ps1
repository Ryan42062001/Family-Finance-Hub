# RLS-AC-10 WinPS5.1 real owner Gate A/B admission and catch excerpts.
# Only private synthetic Docker, SQL and filesystem adapters; never owner host.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$base=([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'ffh-p01-integrated-22.ps1'))).Replace([string][char]13,'')
$cut=$base.IndexOf('$cases=@(')
if($cut -lt 0){throw 'MOCK_OWNER_FIXTURE_CUT_MISSING'}
$script:fixtureRepo=$repo
$prefix=$base.Substring(0,$cut)
$oldRepo='$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '+[char]39+'../../../'+[char]39+'))'
if (-not $prefix.Contains($oldRepo)) {throw 'MOCK_OWNER_REPO_SOURCE_BOUNDARY_MISSING'}
$prefix=$prefix.Replace($oldRepo,'$repo=$script:fixtureRepo')
Invoke-Expression $prefix
$script:baseDocker=$script:fakeDocker
$script:realRegister=(Get-Command Register-FfhOwnedResources).ScriptBlock
function Register-FfhOwnedResources {
  param($Identity,[scriptblock]$Fake)
  return (& $script:realRegister -Identity $Identity -Fake $script:fakeDocker)
}
# Owner exception paths call these real functions without test arguments.
# Inject only the Docker/native/filesystem edges, never replace the logic.
$script:realIdle=(Get-Command Get-FfhSqlIdleAttestation).ScriptBlock
function Get-FfhSqlIdleAttestation {
  param($Identity,[scriptblock]$Fake)
  return (& $script:realIdle -Identity $Identity -Fake $script:fakeDocker)
}
$script:realCleanup=(Get-Command Invoke-FfhVerifiedCleanup).ScriptBlock
function Invoke-FfhVerifiedCleanup {
  param($Identity,[string]$SqlIdleAttestation,[scriptblock]$Fake,[scriptblock]$FakeFilesystem)
  return (& $script:realCleanup -Identity $Identity -SqlIdleAttestation $SqlIdleAttestation -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs)
}
$script:idleCalls=0;$script:preflightCalls=0;$script:matrixCalls=0
$script:fault='';$script:postPreflightFault=''
$script:blockTerminalWrites=$false
$script:afterCompleteFailure=''
$script:baseSetState=(Get-Command Set-FfhRunState).ScriptBlock
function Set-FfhRunState {
  param($Identity,[string]$State,[string]$TestResult,[string]$CleanupResult,
    [string]$GateAResult,[string]$GateBResult)
  if($script:blockTerminalWrites -and $State -ceq 'MANUAL_REVIEW'){
    throw 'MOCK_TERMINAL_WRITE_DENIED'
  }
  return (& $script:baseSetState @PSBoundParameters)
}
$script:fakeDocker={
  param([string[]]$argv)
  if($argv[0] -ceq 'exec'){
    $script:idleCalls++
    if([string]$argv[2] -cne $script:cid){throw 'MOCK_IDLE_QUERY_NOT_EXACT_ID'}
  }
  $fmt=[string]$argv[$argv.Count-1]
  if($argv[0] -ceq 'inspect'){
    if($script:fault -ceq 'PORT' -and $fmt -ceq '{{json .NetworkSettings.Ports}}'){
      return '{"5432/tcp":[{"HostIp":"127.0.0.1","HostPort":"26499"}]}'
    }
    if($script:fault -ceq 'NONLOOPBACK' -and $fmt -ceq '{{json .NetworkSettings.Ports}}'){
      return '{"5432/tcp":[{"HostIp":"0.0.0.0","HostPort":"26430"}]}'
    }
    if($script:fault -ceq 'HEALTH' -and $fmt -ceq '{{json .State}}'){
      return '{"Running":true,"Health":{"Status":"unhealthy"}}'
    }
    if($script:fault -ceq 'ID' -and $fmt -ceq '{{.Id}}'){return ('e'*64)}
  }
  if($script:fault -ceq 'DAEMON' -and $argv[0] -ceq 'info'){
    return 'foreign-daemon-id'
  }
  return @(& $script:baseDocker $argv)
}
function Invoke-FfhOwnedLocalPsql {
  param([string]$Mode,$Container,$SqlPath,$DockerBinding,$Source,$Identity,$ContainerId)
  if($ContainerId -cne $script:cid){throw 'MOCK_OWNER_WRONG_SQL_ID'}
  $phase=if($script:journalGateA){'GATE_A'}else{'GATE_B'}
  if($Mode -ceq 'Preflight'){$script:preflightCalls++}
  elseif($Mode -ceq 'Matrix'){$script:matrixCalls++}
  else {throw 'MOCK_OWNER_BAD_SQL_MODE'}
  [void](Set-FfhSqlBoundary -Identity $Identity -Phase $phase -Mode $Mode -Status 'EXECUTING' -ContainerId $ContainerId)
  if($script:simulateSqlFailure -ceq $Mode){throw 'MOCK_ADMITTED_SQL_FAILURE'}
  [void](Set-FfhSqlBoundary -Identity $Identity -Phase $phase -Mode $Mode -Status 'COMPLETE' -ContainerId $ContainerId)
  if($script:afterCompleteFailure -ceq $Mode){throw 'MOCK_POST_CLIENT_COMPLETED_TEST_FAILURE'}
  if($script:postPreflightFault -and $Mode -ceq 'Preflight'){
    $script:fault=$script:postPreflightFault
    if($script:fault -ceq 'LABEL'){$script:mock.badCompose=$true}
    if($script:fault -ceq 'BASELINE'){$script:mock.legacy=$false}
  }
}
function Reset-Counts{
  $script:idleCalls=0;$script:preflightCalls=0;$script:matrixCalls=0
  $script:fault='';$script:postPreflightFault=''
  $script:blockTerminalWrites=$false;$script:journalGateA=$false
  $script:simulateSqlFailure='';$script:afterCompleteFailure=''
}
function Check([bool]$ok,[string]$label){if(-not $ok){throw ('MOCK_OWNER_'+$label)}}
$sourceA=([IO.File]::ReadAllText((Join-Path $repo 'scripts/rls-local/prepare-fresh-owner.ps1'))).Replace([string][char]13,'')
$sourceB=([IO.File]::ReadAllText((Join-Path $repo 'scripts/rls-local/run-owner.ps1'))).Replace([string][char]13,'')
$aFirst=$sourceA.IndexOf("  [void](Set-FfhSqlBoundary -Identity "+'$identity'+" -Phase 'GATE_A' -Mode 'Preflight' -Status 'PENDING')")
$aStart=$sourceA.LastIndexOf('  $dockerBinding = Assert-FfhLocalDockerDesktop',$aFirst)
$aEnd=$sourceA.IndexOf('  $receipt.migration_application',$aFirst)
$aCatch=$sourceA.LastIndexOf(([char]10+"catch {"+[char]10+"  # Gate A"))
$aCatchEnd=$sourceA.LastIndexOf(([char]10+'finally { $lock.Dispose() }'))
$bCatch=$sourceB.LastIndexOf(([char]10+"catch {"+[char]10+"  if ("+'$gateBStarted'+")"))
$bCatchEnd=$sourceB.LastIndexOf(([char]10+'finally { $lock.Dispose() }'))
if($aStart -lt 0 -or $aEnd -le $aStart -or $aCatch -lt 0 -or
   $aCatchEnd -le $aCatch -or $bCatch -lt 0 -or $bCatchEnd -le $bCatch){
  throw 'MOCK_OWNER_SOURCE_FRAGMENT_NOT_FOUND'
}
$aBody='try {'+[char]10+$sourceA.Substring($aStart,$aEnd-$aStart)+[char]10+'}'+$sourceA.Substring($aCatch,$aCatchEnd-$aCatch)
$aCatchBody="try { throw 'MOCK_INTERRUPTED_EVIDENCE' }"+$sourceA.Substring($aCatch,$aCatchEnd-$aCatch)
$bCatchBody="try { throw 'MOCK_INTERRUPTED_EVIDENCE' }"+$sourceB.Substring($bCatch,$bCatchEnd-$bCatch)
function Begin([string]$phase){
  Start-MockCase;Reset-Counts
  if($phase -ceq 'A'){
    $script:journalGateA=$true
    New-MockJournal
    Set-MockResources
    Ensure-MockRegistered
  } else {Prepare-PreservedRun -Resources}
}
function End{ $script:blockTerminalWrites=$false;Stop-MockCase }
function Run-GateA {
  $identity=$script:identity;$containerName=$identity.container
  $source=[pscustomobject]@{repo=$repo}
  $journalCreated=$true;$terminalStatePersistenceFailed=$false
  return @(& {try {Invoke-Expression $aBody} catch {}})
}
function Run-Catch([string]$phase){
  $identity=$script:identity;$journalCreated=$true
  $gateBStarted=$true;$gateBSqlStage='Matrix'
  $terminalStatePersistenceFailed=$false
  $scriptText=if($phase -ceq 'A'){$aCatchBody}else{$bCatchBody}
  return @(& {try {Invoke-Expression $scriptText} catch {}})
}
foreach($caseName in @('PORT','NONLOOPBACK','HEALTH','ID','LABEL','DAEMON','BASELINE')){
  Begin 'B'
  try {
    $script:fault=$caseName
    if($caseName -ceq 'LABEL'){$script:mock.badCompose=$true}
    if($caseName -ceq 'BASELINE'){$script:mock.legacy=$false}
    $result=Invoke-MockOwnerGateBTail
    $j=Read-FfhJournal -Identity $script:identity
    Check ($result -ceq 'EXIT_NONZERO') ('B_PREFLIGHT_'+$caseName+'_EXIT')
    Check ($script:preflightCalls -eq 0 -and $script:matrixCalls -eq 0 -and $script:idleCalls -eq 0) ('B_PREFLIGHT_'+$caseName+'_ZERO_SQL')
    Check ($script:mutations.Count -eq 0) ('B_PREFLIGHT_'+$caseName+'_ZERO_DELETE')
    Check ($j.gateBResult -ceq 'UNKNOWN' -and $j.cleanupResult -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') ('B_PREFLIGHT_'+$caseName+'_JOURNAL')
    Write-Output ('OWNER-B-PREFLIGHT-'+$caseName+' PASS')
  } finally {End}
}
foreach($caseName in @('PORT','NONLOOPBACK','HEALTH','ID','LABEL','DAEMON','BASELINE')){
  Begin 'B'
  try {
    $script:postPreflightFault=$caseName
    $result=Invoke-MockOwnerGateBTail
    $j=Read-FfhJournal -Identity $script:identity
    Check ($result -ceq 'EXIT_NONZERO') ('B_MATRIX_'+$caseName+'_EXIT')
    Check ($script:preflightCalls -eq 1 -and $script:matrixCalls -eq 0 -and $script:idleCalls -eq 0) ('B_MATRIX_'+$caseName+'_ZERO_NEW_SQL')
    Check ($script:mutations.Count -eq 0) ('B_MATRIX_'+$caseName+'_ZERO_DELETE')
    Check ($j.gateBResult -ceq 'UNKNOWN' -and $j.cleanupResult -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') ('B_MATRIX_'+$caseName+'_JOURNAL')
    Write-Output ('OWNER-B-MATRIX-'+$caseName+' PASS')
  } finally {End}
}
foreach($caseName in @('PORT','NONLOOPBACK','HEALTH','ID','LABEL','DAEMON','BASELINE')){
  Begin 'A'
  try {
    $script:fault=$caseName
    if($caseName -ceq 'LABEL'){$script:mock.badCompose=$true}
    if($caseName -ceq 'BASELINE'){$script:mock.legacy=$false}
    $out=Run-GateA
    $j=Read-FfhJournal -Identity $script:identity
    Check ($script:preflightCalls -eq 0 -and $script:matrixCalls -eq 0 -and $script:idleCalls -eq 0) ('A_'+$caseName+'_ZERO_SQL')
    Check ($script:mutations.Count -eq 0) ('A_'+$caseName+'_ZERO_DELETE')
    Check ($j.gateAResult -ceq 'UNKNOWN' -and $j.cleanupResult -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') ('A_'+$caseName+'_JOURNAL')
    Write-Output ('OWNER-A-'+$caseName+' PASS')
  } finally {End}
}
# Distinguish admitted/completed client failure (eligible for reverified
# cleanup) from an indeterminate EXECUTING native client (never eligible).
foreach($mode in @('Preflight','Matrix')){
  Begin 'B'
  try {
    $script:afterCompleteFailure=$mode
    $result=Invoke-MockOwnerGateBTail
    $j=Read-FfhJournal -Identity $script:identity
    Check ($result -ceq 'EXIT_NONZERO') ('B_ADMITTED_'+$mode+'_NONZERO')
    Check ($j.gateBResult -ceq 'FAIL' -and $j.cleanupResult -ceq 'CLEANUP_VERIFIED') ('B_ADMITTED_'+$mode+'_SAFE_CLEANUP')
    Check ($script:idleCalls -gt 0 -and
      ($script:mutations -join ',') -ceq 'stop,rm,volume rm,network rm') ('B_ADMITTED_'+$mode+'_EXACT_CLEANUP')
    Write-Output ('OWNER-B-'+$mode.ToUpperInvariant()+'-COMPLETED-CLIENT-FAIL PASS')
  } finally {End}
}
Begin 'A'
try {
  $script:afterCompleteFailure='Preflight'
  $null=Run-GateA
  $j=Read-FfhJournal -Identity $script:identity
  if ($j.gateAResult -cne 'FAIL' -or $j.cleanupResult -cne 'CLEANUP_VERIFIED') {
    throw ('MOCK_OWNER_A_COMPLETED_ACTUAL gateA='+$j.gateAResult+
      ' cleanup='+$j.cleanupResult+' state='+$j.state+
      ' boundary='+$j.sqlBoundary.status+' idleCalls='+$script:idleCalls+
      ' actions='+($script:mutations -join ',')+
      ' reason='+$script:FfhMockLastCleanupFailure)
  }
  Check ($script:idleCalls -gt 0 -and ($script:mutations -join ',') -ceq 'stop,rm,volume rm,network rm') 'A_COMPLETED_CLIENT_EXACT_CLEANUP'
  Write-Output 'OWNER-A-PREFLIGHT-COMPLETED-CLIENT-FAIL PASS'
} finally {End}
Begin 'B'
try {
  $script:simulateSqlFailure='Preflight'
  $result=Invoke-MockOwnerGateBTail
  $j=Read-FfhJournal -Identity $script:identity
  Check ($result -ceq 'EXIT_NONZERO') 'B_EXECUTING_UNKNOWN_NONZERO'
  Check ($j.gateBResult -ceq 'UNKNOWN' -and $j.cleanupResult -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') 'B_EXECUTING_UNKNOWN_DURABLE'
  Check ($script:idleCalls -eq 0 -and $script:mutations.Count -eq 0) 'B_EXECUTING_UNKNOWN_NO_SQL_DELETE'
  Write-Output 'OWNER-B-NATIVE-EXECUTING-UNKNOWN-NO-CLEANUP PASS'
} finally {End}
Begin 'A'
try {
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_A_PRESERVED' -GateAResult 'PASS' -TestResult 'PASS' -CleanupResult 'PRESERVED_FOR_GATE_B')
  $script:blockTerminalWrites=$true
  $out=@(Run-Catch 'A')
  Check (($out -join ' ') -match 'OUTCOME_UNKNOWN TERMINAL_STATE_PERSISTENCE_FAILED') 'A_TERMINAL_UNKNOWN'
  Check ((Read-FfhJournal -Identity $script:identity).cleanupResult -ceq 'PRESERVED_FOR_GATE_B') 'A_OLD_RECEIPT_READABLE'
  Check ($script:idleCalls -eq 0 -and $script:mutations.Count -eq 0) 'A_PERSIST_ZERO_SQL_DELETE'
  Write-Output 'OWNER-A-TERMINAL-PERSISTENCE-FAILED PASS'
} finally {End}
Begin 'B'
try {
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_B_RUNNING' -GateBResult 'RUNNING')
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_B_COMPLETE' -GateBResult 'PASS')
  $script:blockTerminalWrites=$true
  $out=@(Run-Catch 'B')
  Check (($out -join ' ') -match 'OUTCOME_UNKNOWN TERMINAL_STATE_PERSISTENCE_FAILED') 'B_TERMINAL_UNKNOWN'
  Check ((Read-FfhJournal -Identity $script:identity).gateBResult -ceq 'PASS') 'B_OLD_PASS_READABLE'
  Check ($script:idleCalls -eq 0 -and $script:mutations.Count -eq 0) 'B_PERSIST_ZERO_SQL_DELETE'
  Write-Output 'OWNER-B-TERMINAL-PERSISTENCE-FAILED PASS'
} finally {End}
Write-Output 'OWNER-ADMISSION-AND-CATCH-ALL PASS'
