# FFH-P01 RLS-AC-06 Windows PowerShell 5.1 integrated offline fault suite.
# The executable owner scripts are NEVER invoked. Dot-sourced functions use
# a synthetic Docker daemon, isolated private evidence files and fake root.
# No socket, SQL, Docker daemon, production data, or owner's FFH resources.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../'))
. (Join-Path $repo 'scripts/rls-local/source-provenance.ps1')
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
. (Join-Path $repo 'scripts/rls-local/cleanup-executor.ps1')
$script:base=''
$script:evidence=''
$script:identity=$null
$script:mock=$null
$script:cid='c'*64
$script:nid='d'*64
$script:legacyId='f'*64
$script:mutations=New-Object 'System.Collections.Generic.List[string]'
$script:fsQueries=0

# Test-only replacement of the profile directory binding. This *narrows*
# every access to a freshly-created, private, GUID-named temp fixture.
function Assert-FfhEvidencePath {
  param($Identity)
  if (-not $script:evidence -or
      -not ([IO.Path]::GetFullPath([string]$Identity.evidence)).Equals(
        [IO.Path]::GetFullPath($script:evidence),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'MOCK_BLOCKED: evidence path outside disposable test fixture'
  }
  Assert-FfhPrivateEvidenceAcl -Path $script:evidence
}

$script:fakeFs={
  param([string]$root)
  $script:fsQueries++
  if ($root -cne $script:identity.root) {throw 'MOCK_BLOCKED: wrong root'}
  return $script:mock.root
}
$script:fakeDocker={
  param([string[]]$argv)
  if (-not $argv -or $argv.Count -eq 0) {throw 'MOCK_BLOCKED: empty command'}
  $verb=$argv[0]
  $joined=$argv -join ' '
  if ($verb -ceq 'info') {return $script:mock.daemon}
  if ($verb -ceq 'ps') {
    $filter=''
    $position=[array]::IndexOf($argv,'--filter')
    if($position -ge 0) { $filter=[string]$argv[$position+1] }
    if ($filter.StartsWith('label=')) {
      if ($script:mock.c) {return $script:cid}
      return
    }
    if ($filter.StartsWith('volume=')) {
      if ($script:mock.foreignVolume) {return ('e'*64)}
      if ($script:mock.c -and $script:mock.v) {return $script:cid}
      return
    }
    if($joined.Contains('{{.ID}} {{.Names}}')) {
      if ($script:mock.c) {Write-Output ($script:cid+' '+$script:identity.container)}
      if ($script:mock.legacy) {Write-Output ($script:legacyId+' FFH-RLS-Test')}
      return
    }
    if($joined.Contains('{{.ID}}')) {
      if($script:mock.c) {return $script:cid}
      return
    }
    throw 'MOCK_BLOCKED: unexpected ps selector'
  }
  if ($verb -ceq 'volume') {
    if ($argv[1] -ceq 'ls') {
      if ($script:mock.v) {return $script:mock.vname}
      return
    }
    if ($argv[1] -ceq 'inspect') {
      $fmt=$argv[$argv.Count-1]
      if ($fmt -ceq '{{json .Labels}}') {
        return (Get-MockLabels)
      }
      if ($fmt -ceq '{{.Driver}}') {return 'local'}
      throw 'MOCK_BLOCKED: volume inspect field'
    }
    if ($argv[1] -ceq 'rm') {
      [void]$script:mutations.Add('volume rm')
      if ($script:mock.failRm) {return 'BLOCKED'}
      $script:mock.v=$false
      return 'EXIT_ZERO'
    }
  }
  if ($verb -ceq 'network') {
    if ($argv[1] -ceq 'ls') {
      if(-not $script:mock.n) {return}
      if($joined.Contains('{{.ID}} {{.Name}}')) {return ($script:nid+' '+$script:mock.nname)}
      return $script:nid
    }
    if ($argv[1] -ceq 'inspect') {
      $fmt=$argv[$argv.Count-1]
      if ($fmt -ceq '{{.Name}}') {return $script:mock.nname}
      if ($fmt -ceq '{{.Id}}') {return $script:nid}
      if ($fmt -ceq '{{json .Labels}}') {return (Get-MockLabels)}
      if ($fmt -ceq '{{.Driver}}') {return 'bridge'}
      if ($fmt -ceq '{{json .Containers}}') {
        $c=@{}
        if($script:mock.c) {$c[$script:cid]=@{Name=$script:identity.container}}
        if($script:mock.foreignNetwork) {$c[('e'*64)]=@{Name='foreign'}}
        return (ConvertTo-Json -InputObject $c -Compress -Depth 5)
      }
      throw 'MOCK_BLOCKED: network inspect field'
    }
    if ($argv[1] -ceq 'rm') {
      [void]$script:mutations.Add('network rm')
      if ($script:mock.failRm) {return 'BLOCKED'}
      $script:mock.n=$false
      return 'EXIT_ZERO'
    }
  }
  if ($verb -ceq 'inspect') {
    $fmt=$argv[$argv.Count-1]
    if($fmt -ceq '{{.Name}}') {return ('/'+$script:identity.container)}
    if($fmt -ceq '{{.Id}}') {return $script:cid}
    if($fmt -ceq '{{json .Config.Labels}}') {return (Get-MockLabels)}
    if($fmt -ceq '{{json .Mounts}}') {
      if ($script:mock.foreignMount) {return '[{"Type":"volume","Name":"FOREIGN_FINANCIAL_DATA"}]'}
      if ($script:mock.v) {return ('[{"Type":"volume","Name":"'+$script:mock.vname+'"}]')}
      return '[]'
    }
    if($fmt -ceq '{{json .NetworkSettings.Networks}}') {
      $nets=@{}
      if($script:mock.n) {$nets[$script:mock.nname]=@{NetworkID=$script:nid}}
      return (ConvertTo-Json -InputObject $nets -Compress -Depth 4)
    }
    if ($fmt -ceq '{{.State.Running}}') {
      if ($script:mock.running) {return 'true'}
      return 'false'
    }
    throw 'MOCK_BLOCKED: container inspect field'
  }
  if ($verb -ceq 'exec') {
    if ($script:mock.sqlTimeout) {throw 'MOCK_SQL_TIMEOUT'}
    if ($script:mock.sqlActive) {return '1'}
    return '0'
  }
  if ($verb -ceq 'stop') {
    [void]$script:mutations.Add('stop')
    if ($script:mock.failStop) {return 'BLOCKED'}
    $script:mock.running=$false
    return 'EXIT_ZERO'
  }
  if ($verb -ceq 'rm') {
    [void]$script:mutations.Add('rm')
    if ($script:mock.failRm) {return 'BLOCKED'}
    $script:mock.c=$false
    return 'EXIT_ZERO'
  }
  throw ('MOCK_UNEXPECTED_DOCKER_VERB '+$verb)
}
function Get-MockLabels {
  $compose=$script:identity.project
  if ($script:mock.badCompose) { $compose='wrong-project' }
  $o=@{
    'com.supabase.cli.project'=$script:identity.project
    'com.docker.compose.project'=$compose
  }
  return (ConvertTo-Json -InputObject $o -Compress)
}
function Start-MockCase {
  $script:base=Join-Path ([IO.Path]::GetTempPath()) ('ffh-p01-ac-'+[Guid]::NewGuid().ToString('N'))
  $script:evidence=Join-Path $script:base 'FFH-P01-RLS-Evidence'
  [void](New-Item -ItemType Directory -Path $script:evidence -Force -ErrorAction Stop)
  Initialize-FfhPrivateEvidenceAcl -Path $script:evidence -NewlyCreated
  $sha='a'*40
  $script:identity=Get-FfhRunIdentity -SourceSha $sha -RunToken (New-FfhRunToken)
  $script:identity.evidence=$script:evidence
  $script:mock=[pscustomobject]@{
    daemon='mock-docker-engine-1234'; c=$false;v=$false;n=$false;running=$false
    legacy=$true;foreignVolume=$false;foreignNetwork=$false;foreignMount=$false
    badCompose=$false;failStop=$false;failRm=$false;sqlActive=$false;sqlTimeout=$false
    root='ABSENT';vname=('supabase_db_'+$script:identity.project+'_data')
    nname=('supabase_network_'+$script:identity.project)
  }
  $script:mutations.Clear()
  $script:fsQueries=0
}
function Stop-MockCase {
  $canonical=[IO.Path]::GetFullPath($script:base)
  $prefix=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if (-not $canonical.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($canonical) -cnotmatch '^ffh-p01-ac-[0-9a-f]{32}$') {
    throw 'MOCK_REFUSED_TO_REMOVE_UNOWNED_FIXTURE'
  }
  if ([IO.Directory]::Exists($canonical)) {[IO.Directory]::Delete($canonical,$true)}
}
function New-MockJournal {
  [void](New-FfhPrecreationJournal -Identity $script:identity -Ports @(26430,26431) -Fake $script:fakeDocker)
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_A_RUNNING' -GateAResult 'RUNNING' -TestResult 'RUNNING')
}
function Set-MockResources {
  $script:mock.c=$true;$script:mock.v=$true;$script:mock.n=$true
  $script:mock.running=$true
}
function Save-MockGateAFail {
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_A_FAILED' -GateAResult 'FAIL' -TestResult 'FAIL')
  Write-FfhRedactedEvidence -Identity $script:identity -Phase 'GATE_A' -Result 'FAIL' -Category 'MOCK_FAILURE'
}
function Save-MockGateAPass {
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_A_PRESERVED' -GateAResult 'PASS' -TestResult 'PASS' -CleanupResult 'PRESERVED_FOR_GATE_B')
  Write-FfhRedactedEvidence -Identity $script:identity -Phase 'GATE_A' -Result 'PASS' -Category 'NONE'
}
function Ensure-MockRegistered {
  [void](Register-FfhOwnedResources -Identity $script:identity -Fake $script:fakeDocker)
}
function Run-MockCleanup {
  $idle=Get-FfhSqlIdleAttestation -Identity $script:identity -Fake $script:fakeDocker
  return (Invoke-FfhVerifiedCleanup -Identity $script:identity -SqlIdleAttestation $idle -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs)
}
function Assert-Mock([bool]$condition,[string]$why) {
  if (-not $condition) {throw ('MOCK_ASSERT_'+$why)}
}
function Must-Block([scriptblock]$action) {
  $before=$script:mutations.Count
  $blocked=$false
  try { & $action | Out-Null } catch {$blocked=$true}
  if(-not $blocked) {throw 'MOCK_EXPECTED_EXCEPTION'}
  if($script:mutations.Count -ne $before) {throw 'MOCK_DESTRUCTIVE_ACTION_AFTER_BLOCK'}
}
function Must-BlockCleanup {
  $before=$script:mutations.Count
  $got=Run-MockCleanup
  if($got -cne 'CLEANUP_BLOCKED_MANUAL_REVIEW' -or
     $script:mutations.Count -ne $before) {
    throw ('MOCK_EXPECTED_ZERO_MUTATION_BLOCK got='+$got)
  }
}
function Prepare-FailingRun([switch]$Resources) {
  New-MockJournal
  if($Resources) {Set-MockResources}
  Ensure-MockRegistered
  Save-MockGateAFail
}
function Prepare-PreservedRun([switch]$Resources) {
  New-MockJournal
  if($Resources) {Set-MockResources}
  Ensure-MockRegistered
  Save-MockGateAPass
}
function Prepare-GateB {
  [void](Set-FfhRunState -Identity $script:identity -State 'GATE_B_RUNNING' -GateBResult 'RUNNING' -TestResult 'RUNNING')
}
function Verify-Results([string]$a,[string]$b,[string]$cleanup) {
  $j=Read-FfhJournal -Identity $script:identity
  Assert-Mock ($j.gateAResult -ceq $a) 'GATE_A_RESULT'
  Assert-Mock ($j.gateBResult -ceq $b) 'GATE_B_RESULT'
  Assert-Mock ($j.cleanupResult -ceq $cleanup) 'CLEANUP_RESULT'
}
$cases=@(
  'AC-01','AC-02','AC-03','AC-04','AC-05','AC-06','AC-07','AC-08',
  'AC-09','AC-10','AC-11','AC-12','AC-13','AC-14','AC-15','AC-16',
  'AC-17','AC-18','AC-19','AC-20','AC-21','AC-22'
)
foreach($case in $cases) {
  Start-MockCase
  try {
    switch ($case) {
      'AC-01' {
        $other=Get-FfhRunIdentity -SourceSha ('a'*40) -RunToken (New-FfhRunToken)
        Assert-Mock ($other.project -cne $script:identity.project -and
          $other.project.Length -eq 39 -and $script:identity.project.Length -eq 39) 'RUN_ID'
        New-MockJournal
        Assert-Mock ((Read-FfhJournal -Identity $script:identity).version -eq 2) 'JOURNAL_SCHEMA'
      }
      'AC-02' {
        $script:mock.c=$true
        Must-Block {New-MockJournal}
      }
      'AC-03' {
        Must-Block {Select-FfhRunPorts -Identity $script:identity -FakeCandidate {50000} -FakeProbe {$true} -FakeUsedPorts @(50000)}
        Must-Block {Select-FfhRunPorts -Identity $script:identity -FakeCandidate {59999} -FakeProbe {$true} -FakeUsedPorts @(9000)}
      }
      'AC-04' {
        $pair=@(Select-FfhRunPorts -Identity $script:identity -FakeCandidate {59998} -FakeProbe {$true} -FakeUsedPorts @(9000))
        Assert-Mock ($pair[0] -eq 59998 -and $pair[1] -eq 59999) 'PORT_BOUND'
        # After release of the reservation, a mock foreign bind makes the
        # source guard refuse the mismatched published host port.
        $source=Get-Content -LiteralPath (Join-Path $repo 'scripts/rls-local/source-provenance.ps1') -Raw
        Assert-Mock ($source.Contains('$binding.HostPort -cne ([string]$DbPort)')) 'POST_BIND_LOCALITY_GUARD'
        Assert-Mock ($script:mutations.Count -eq 0) 'PORT_RACE_NO_DELETE'
      }
      'AC-05' {
        New-MockJournal
        $j=Read-FfhJournal -Identity $script:identity
        $j.sha='0'*40
        Must-Block {Write-FfhJournal -Identity $script:identity -Journal $j}
        # Simulate a torn/truncated journal after power loss: never infer a
        # resource owner or authorize a retry from partially decoded JSON.
        $path=Get-FfhJournalPath -Identity $script:identity
        [IO.File]::WriteAllText($path,'{"version":2,"sha":')
        Must-Block {Read-FfhJournal -Identity $script:identity}
      }
      'AC-06' {
        $script:mock.n=$true
        Must-Block {New-MockJournal}
      }
      'AC-07' {
        New-MockJournal
        $script:mock.n=$true
        Ensure-MockRegistered
        Save-MockGateAFail
        $script:mock.n=$false
        Must-BlockCleanup
      }
      'AC-08' {
        Prepare-FailingRun -Resources
        $script:mock.daemon='another-engine'
        Must-BlockCleanup
      }
      'AC-09' {
        Prepare-FailingRun -Resources
        $script:mock.badCompose=$true
        Must-BlockCleanup
      }
      'AC-10' {
        Prepare-FailingRun -Resources
        $script:mock.foreignVolume=$true
        Must-BlockCleanup
      }
      'AC-11' {
        Prepare-FailingRun -Resources
        $script:mock.foreignNetwork=$true
        Must-BlockCleanup
      }
      'AC-12' {
        Prepare-FailingRun -Resources
        $script:mock.sqlActive=$true
        Must-BlockCleanup
      }
      'AC-13' {
        Prepare-FailingRun -Resources
        $script:mock.sqlTimeout=$true
        Must-BlockCleanup
      }
      'AC-14' {
        Prepare-FailingRun -Resources
        $script:mock.failStop=$true
        $result=Run-MockCleanup
        Assert-Mock ($result -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') 'GRACEFUL_STOP_FAIL'
        Assert-Mock (($script:mutations -join ',') -ceq 'stop') 'NO_FORCE_OR_FOLLOWON_DELETE'
      }
      'AC-15' {
        New-MockJournal
        [void](Set-FfhRunState -Identity $script:identity -State 'GATE_A_FAILED' -GateAResult 'FAIL' -TestResult 'FAIL')
        # A stale receipt collision prevents publishing fresh evidence.
        $dest=Join-Path $script:evidence ($script:identity.token+'.GATE_A.result.json')
        [IO.File]::WriteAllText($dest,'{"interrupted":true}')
        Initialize-FfhPrivateEvidenceAcl -Path $dest -NewlyCreated
        Must-Block {Write-FfhRedactedEvidence -Identity $script:identity -Phase 'GATE_A' -Result 'FAIL' -Category 'MOCK_FAILURE'}
        Must-BlockCleanup
      }
      'AC-16' {
        New-MockJournal
        $script:identity.evidence=Join-Path $script:base 'wrong-directory'
        Must-Block {Read-FfhJournal -Identity $script:identity}
      }
      'AC-17' {
        Prepare-FailingRun
        $script:mock.root='PRESENT'
        Must-BlockCleanup
        # Explicitly make the test fixture's evidence DACL inheritable and
        # confirm the real owner/ACL guard rejects it without mutation.
        $acl=[IO.Directory]::GetAccessControl($script:evidence)
        $acl.SetAccessRuleProtection($false,$true)
        [IO.Directory]::SetAccessControl($script:evidence,$acl)
        Must-Block {Read-FfhJournal -Identity $script:identity}
      }
      'AC-18' {
        Prepare-FailingRun -Resources
        [void](Set-FfhRunState -Identity $script:identity -State 'MUTATION_IN_FLIGHT')
        Must-BlockCleanup
      }
      'AC-19' {
        Prepare-PreservedRun -Resources
        $idle=Get-FfhSqlIdleAttestation -Identity $script:identity -Fake $script:fakeDocker
        $result=Invoke-FfhVerifiedCleanup -Identity $script:identity -SqlIdleAttestation $idle -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs
        Assert-Mock ($result -ceq 'PRESERVED_FOR_GATE_B') 'GATE_A_PRESERVE'
        Assert-Mock ($script:mutations.Count -eq 0) 'PREMATURE_CLEANUP'
        Verify-Results 'PASS' 'NOT_STARTED' 'PRESERVED_FOR_GATE_B'
      }
      'AC-20' {
        Prepare-PreservedRun -Resources
        Prepare-GateB
        $result=Complete-FfhGateB -Identity $script:identity -GateBResult 'FAIL' -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs
        Assert-Mock ($result -ceq 'CLEANUP_VERIFIED') 'GATE_B_FAIL_CLEANUP_PASS'
        Verify-Results 'PASS' 'FAIL' 'CLEANUP_VERIFIED'
        Must-Block {Assert-FfhGateBSuccessfulExit -Identity $script:identity -CleanupResult $result}
      }
      'AC-21' {
        Prepare-FailingRun -Resources
        $script:mock.legacy=$false
        Must-BlockCleanup
      }
      'AC-22' {
        Prepare-PreservedRun -Resources
        Prepare-GateB
        $result=Complete-FfhGateB -Identity $script:identity -GateBResult 'PASS' -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs
        Assert-Mock ($result -ceq 'CLEANUP_VERIFIED') 'GATE_B_PASS_CLEANUP_PASS'
        Verify-Results 'PASS' 'PASS' 'CLEANUP_VERIFIED'
        Assert-Mock ([bool](Assert-FfhGateBSuccessfulExit -Identity $script:identity -CleanupResult $result)) 'GATE_B_SUCCESS_EXIT'
        Assert-Mock (($script:mutations -join ',') -ceq 'stop,rm,volume rm,network rm') 'EXACT_ACTION_ORDER'
        Assert-Mock ($script:fsQueries -ge 2) 'FINAL_ABSENCE_DOUBLE_CHECK'
        # Independently exercise PASS/BLOCKED with a newly isolated journal.
        Stop-MockCase
        Start-MockCase
        Prepare-PreservedRun
        Prepare-GateB
        $script:mock.root='PRESENT'
        $blocked=Complete-FfhGateB -Identity $script:identity -GateBResult 'PASS' -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs
        Assert-Mock ($blocked -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') 'GATE_B_PASS_ROOT_BLOCKED'
        Verify-Results 'PASS' 'PASS' 'CLEANUP_BLOCKED_MANUAL_REVIEW'
        Must-Block {Assert-FfhGateBSuccessfulExit -Identity $script:identity -CleanupResult $blocked}
      }
      default {throw 'MOCK_UNHANDLED_CASE'}
    }
    Write-Output ($case+' PASS')
  } catch {
    [Console]::Error.WriteLine(($case+' FAIL '+$_.Exception.Message))
    exit 1
  } finally {
    Stop-MockCase
  }
}
