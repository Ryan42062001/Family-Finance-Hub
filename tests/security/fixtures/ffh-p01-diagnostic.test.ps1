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
. (Join-Path $repo 'scripts/rls-local/diagnostic-lifecycle.ps1')
. (Join-Path $repo 'scripts/rls-local/diagnostic-network.ps1')
. (Join-Path $repo 'scripts/rls-local/diagnostic-migration-stage.ps1')
# Bind exact production function bodies without executing the owner's
# top-level operator entrypoint (which is intentionally mutating in Run).
$entryPath=Join-Path $repo 'scripts/rls-local/owner-disposable-diagnostic.ps1'
$astTokens=$null;$astErrors=$null
$entryAst=[Management.Automation.Language.Parser]::ParseFile(
  $entryPath,[ref]$astTokens,[ref]$astErrors)
if (@($astErrors).Count -ne 0) {throw 'MOCK_ENTRYPOINT_SOURCE_PARSE_INVALID'}
foreach($name in @('Confirm-FfhDiagnosticStarted','Invoke-FfhOwnerDisposableDiagnostic')) {
  $found=@($entryAst.FindAll({
    param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
      $node.Name -ceq $name
  },$false))
  if ($found.Count -ne 1) {throw ('MOCK_ENTRYPOINT_FUNCTION_NOT_FOUND_'+$name)}
  Invoke-Expression $found[0].Extent.Text
}
$script:base=''
$script:evidence=''
$script:identity=$null
$script:mock=$null
$script:cid='c'*64
$script:nid='d'*64
$script:legacyId='f'*64
$script:mutations=New-Object 'System.Collections.Generic.List[string]'
$script:actionArgs=New-Object 'System.Collections.Generic.List[string]'
$script:idleQueryArgs=New-Object 'System.Collections.Generic.List[string]'
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
  param([string]$root,[string]$action='PROBE',[string]$fileId='')
  $script:fsQueries++
  if ($root -cne $script:identity.root) {throw 'MOCK_BLOCKED: wrong root'}
  if ($action -ceq 'VERIFY_OWNER') {
    if ($fileId -cne '12345678:abcdef0123456789') {return 'UNKNOWN'}
    return $script:mock.root
  }
  if ($action -ceq 'RETIRE') {
    if ($fileId -cne '12345678:abcdef0123456789') {throw 'MOCK_BLOCKED: wrong file ID'}
    if ($script:mock.root -ceq 'OWNED') {$script:mock.root='ABSENT';return 'RETIRED'}
    if ($script:mock.root -ceq 'ABSENT') {return 'ABSENT'}
    return $script:mock.root
  }
  if ($action -cne 'PROBE') {throw 'MOCK_BLOCKED: invalid filesystem verb'}
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
      if ($script:mock.composeOnly -and $filter.StartsWith('label=com.supabase.cli.project')) {return}
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
      [void]$script:actionArgs.Add(($argv -join ' '))
      [void]$script:mutations.Add('volume rm')
      if ($script:mock.failRm) {return 'BLOCKED'}
      $script:mock.v=$false
      return 'EXIT_ZERO'
    }
  }
  if ($verb -ceq 'network') {
    if ($argv[1] -ceq 'create') {
      [void]$script:actionArgs.Add(($argv -join ' '))
      [void]$script:mutations.Add('network create')
      if ($script:mock.n -or $script:mock.failNetworkCreate) {return 'BLOCKED'}
      $script:mock.n=$true
      return 'EXIT_ZERO'
    }
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
      if ($fmt -ceq '{{.EnableIPv6}}') {
        if ($script:mock.ipv6Bridge) {return 'true'}
        return 'false'
      }
      if ($fmt -ceq '{{json .Options}}') {
        if ($script:mock.unsafeBridge) {return '{"com.docker.network.bridge.host_binding_ipv4":"0.0.0.0"}'}
        return '{"com.docker.network.bridge.host_binding_ipv4":"127.0.0.1"}'
      }
      if ($fmt -ceq '{{json .Containers}}') {
        $c=@{}
        if($script:mock.c) {$c[$script:cid]=@{Name=$script:identity.container}}
        if($script:mock.foreignNetwork) {$c[('e'*64)]=@{Name='foreign'}}
        return (ConvertTo-Json -InputObject $c -Compress -Depth 5)
      }
      throw 'MOCK_BLOCKED: network inspect field'
    }
    if ($argv[1] -ceq 'rm') {
      [void]$script:actionArgs.Add(($argv -join ' '))
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
    if ($fmt -ceq '{{json .State}}') {return '{"Running":true,"Health":{"Status":"healthy"}}'}
    if ($fmt -ceq '{{json .NetworkSettings.Ports}}') {
      if ($script:mock.wrongPort) {return '{"5432/tcp":[{"HostIp":"127.0.0.1","HostPort":"26435"}]}'}
      if ($script:mock.nonLocalPort) {return '{"5432/tcp":[{"HostIp":"0.0.0.0","HostPort":"26430"}]}'}
      return '{"5432/tcp":[{"HostIp":"127.0.0.1","HostPort":"26430"}]}'
    }
    throw 'MOCK_BLOCKED: container inspect field'
  }
  if ($verb -ceq 'exec') {
    [void]$script:idleQueryArgs.Add(($argv -join ' '))
    if ($script:mock.sqlTimeout) {throw 'MOCK_SQL_TIMEOUT'}
    if ($script:mock.sqlActive) {return '1'}
    return '0'
  }
  if ($verb -ceq 'stop') {
    [void]$script:actionArgs.Add(($argv -join ' '))
    [void]$script:mutations.Add('stop')
    if ($script:mock.failStop) {return 'BLOCKED'}
    $script:mock.running=$false
    return 'EXIT_ZERO'
  }
  if ($verb -ceq 'rm') {
    [void]$script:actionArgs.Add(($argv -join ' '))
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
    badCompose=$false;failStop=$false;failRm=$false;failNetworkCreate=$false;sqlActive=$false;sqlTimeout=$false
    root='OWNED';wrongPort=$false;nonLocalPort=$false;composeOnly=$false;unsafeBridge=$false;ipv6Bridge=$false;vname=('supabase_db_'+$script:identity.project+'_data')
    nname=('supabase_network_'+$script:identity.project)
  }
  $script:mutations.Clear()
  $script:actionArgs.Clear()
  $script:idleQueryArgs.Clear()
  $script:fsQueries=0
  $script:FfhMockLastCleanupFailure='NONE'
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

function Prepare-DiagnosticMock {
  Start-MockCase
  [void](New-FfhPrecreationJournal -Identity $script:identity -Ports @(26430,26431) -Fake $script:fakeDocker)
  $j=Read-FfhJournal -Identity $script:identity
  $j | Add-Member -MemberType NoteProperty -Name runKind -Value ONE_SHOT_DIAGNOSTIC -Force
  $j | Add-Member -MemberType NoteProperty -Name diagnosticStatus -Value START_IN_FLIGHT -Force
  $j | Add-Member -MemberType NoteProperty -Name diagnosticCliSha256 -Value ('a'*64) -Force
  $j.rootOwnership=[pscustomobject]@{fileId='12345678:abcdef0123456789';markerVersion=1}
  $j.rootReceiptSha256='a'*64
  $j.state='DIAG_START_IN_FLIGHT'
  $j.testResult='RUNNING'
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
}
function Mark-DiagnosticStarted {
  $script:mock.c=$true;$script:mock.v=$true;$script:mock.n=$true
  $script:mock.running=$true
  $j=Read-FfhJournal -Identity $script:identity
  $seen=@(Get-FfhResourceSnapshot -Identity $script:identity -Fake $script:fakeDocker)
  $j.resources=@($seen | ForEach-Object {[pscustomobject]@{kind=$_.kind;id=$_.id;name=$_.name}})
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  [void](Set-FfhDiagnosticJournal -Identity $script:identity -Status START_VERIFIED -TestResult PASS)
  $j=Read-FfhJournal -Identity $script:identity
  $j.evidenceSaved=$true;$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
}
function MustBlock([scriptblock]$action) {
  try {[void](& $action)} catch {return}
  throw 'MOCK_EXPECTED_DIAGNOSTIC_BLOCK'
}
function AssertIt([bool]$condition,[string]$code) {
  if (-not $condition) {throw ('MOCK_DIAG_ASSERT_'+$code)}
}
function Receipt([int]$index) {
  Write-Output ('DG-'+$index.ToString('00')+' PASS')
}
# DG-01: real production diagnostic cleanup function, synthetic daemon/fs.
try {
  Prepare-DiagnosticMock
  Mark-DiagnosticStarted
  $result=Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs
  $j=Read-FfhJournal -Identity $script:identity
  AssertIt ($result -ceq 'CLEANUP_VERIFIED' -and $j.testResult -ceq 'PASS' -and
    $j.cleanupResult -ceq 'CLEANUP_VERIFIED' -and $j.diagnosticStatus -ceq 'CLEANUP_VERIFIED' -and
    $j.rootRetirement.status -ceq 'ABSENT_VERIFIED') 'SUCCESS_STATES'
  AssertIt ($j.sqlBoundary.status -ceq 'NOT_STARTED' -and $j.gateAResult -ceq 'NOT_STARTED' -and
    $j.gateBResult -ceq 'NOT_STARTED') 'FORMAL_GATES_FALSIFIED'
  AssertIt (($script:mutations -join ',') -ceq 'stop,rm,volume rm,network rm') 'EXACT_MUTATION_ORDER'
  AssertIt (($script:actionArgs -join '|') -ceq ('stop --time=-1 '+$script:cid+'|rm '+$script:cid+
    '|volume rm '+$script:mock.vname+'|network rm '+$script:nid)) 'EXACT_DOCKER_COMMAND_VECTOR'
  AssertIt ($script:mock.root -ceq 'ABSENT' -and $script:mock.legacy) 'ROOT_LEGACY'
  Receipt 1
} finally {Stop-MockCase}

# DG-02: independently observed SQL activity blocks before stop/rm.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.sqlActive=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0 -and $script:mock.root -ceq 'OWNED') 'BUSY_SQL_CLEAN'
  Receipt 2
} finally {Stop-MockCase}

# DG-03: explicit SQL read timeout does not imply idle.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.sqlTimeout=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'SQL_TIMEOUT'
  Receipt 3
} finally {Stop-MockCase}

# DG-04: late Compose-label mismatch blocks any removal.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.badCompose=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'COMPOSE_DRIFT'
  Receipt 4
} finally {Stop-MockCase}

# DG-05: Compose-only label namespace cannot bypass dual-label proof.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.composeOnly=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'DUAL_LABELS'
  Receipt 5
} finally {Stop-MockCase}

# DG-06: outside-root mount never gets adopted by exact container ID alone.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.foreignMount=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'FOREIGN_MOUNT'
  Receipt 6
} finally {Stop-MockCase}

# DG-07: peer sharing our network prevents removal.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.foreignNetwork=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'FOREIGN_NETWORK'
  Receipt 7
} finally {Stop-MockCase}

# DG-08: foreign volume user prevents any stop/rm.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.foreignVolume=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'FOREIGN_VOLUME'
  Receipt 8
} finally {Stop-MockCase}

# DG-09: daemon ID swap blocks cleanup admission.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.daemon='UNRECOGNIZED-DAEMON'
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'DAEMON'
  Receipt 9
} finally {Stop-MockCase}

# DG-10: nonlocal port bindings have no destructive shortcut.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.nonLocalPort=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'PORT_PUBLIC'
  Receipt 10
} finally {Stop-MockCase}

# DG-11: port drift blocks before stop.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.wrongPort=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'PORT_MISMATCH'
  Receipt 11
} finally {Stop-MockCase}

# DG-12: stolen/missing root ID blocks before Docker stop.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.root='FOREIGN'
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'ROOT_ID'
  Receipt 12
} finally {Stop-MockCase}

# DG-13: stop failure cannot trigger rm or root-retirement retry.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.failStop=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  $j=Read-FfhJournal -Identity $script:identity
  AssertIt (($script:mutations -join ',') -ceq 'stop' -and
    $j.state -ceq 'DIAG_MUTATION_IN_FLIGHT' -and $script:mock.root -ceq 'OWNED') 'STOP_UNKNOWN'
  Receipt 13
} finally {Stop-MockCase}

# DG-14: verified stop followed by Docker rm failure leaves durable IN_FLIGHT.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.failRm=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  $j=Read-FfhJournal -Identity $script:identity
  AssertIt (($script:mutations -join ',') -ceq 'stop,rm' -and
    $j.state -ceq 'DIAG_MUTATION_IN_FLIGHT' -and $script:mock.root -ceq 'OWNED') 'RM_UNKNOWN'
  Receipt 14
} finally {Stop-MockCase}

# DG-15: protected baseline drift is fatal even if full owned label sets match.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.legacy=$false
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'PROTECTED'
  Receipt 15
} finally {Stop-MockCase}

# DG-16: an incomplete/foreign startup cannot register only a volume as safe.
try {
  Prepare-DiagnosticMock
  $script:mock.v=$true
  $script:mock.c=$false
  MustBlock {
    $dual=@(Assert-FfhDiagnosticLabelBijection -Identity $script:identity -Fake $script:fakeDocker)
    if (@($dual | Where-Object kind -eq containers).Count -ne 1) {throw 'BLOCKED_DIAG_INCOMPLETE_START'}
  }
  AssertIt ($script:mutations.Count -eq 0) 'PARTIAL'
  Receipt 16
} finally {Stop-MockCase}

# DG-17: preexisting labelled namespace blocks before first CLI or mutation.
try {
  Prepare-DiagnosticMock
  $script:mock.c=$true
  MustBlock {Assert-FfhPrecreationNamespace -Identity $script:identity -Fake $script:fakeDocker}
  AssertIt ($script:mutations.Count -eq 0) 'PREEXISTING'
  Receipt 17
} finally {Stop-MockCase}

# DG-18: no native deletion when evidence was not durably committed.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $j=Read-FfhJournal -Identity $script:identity
  $j.evidenceSaved=$false;$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'EVIDENCE_REQUIRED'
  Receipt 18
} finally {Stop-MockCase}

# DG-19: never fabricate a formal Gate A/B SQL COMPLETE receipt.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $j=Read-FfhJournal -Identity $script:identity
  $j.sqlBoundary.status='COMPLETE';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'SQL_FAKE'
  Receipt 19
} finally {Stop-MockCase}

# DG-20: production source entrypoint MUST remain narrow and nonformal.
$entry=Get-Content -LiteralPath (Join-Path $repo 'scripts/rls-local/owner-disposable-diagnostic.ps1') -Raw -Encoding UTF8
if ($entry -notmatch 'ONE-SHOT-DIAGNOSTIC-GO' -or
    $entry -notmatch 'Assert-FfhSourceCheckout -ExpectedHead \$ExpectedHead -AllowDetachedHeadForDiagnostic' -or
    $entry -match '(?i)\b(?:Invoke-FfhPinnedLocalSupabase|Set-FfhSqlBoundary|run-owner\.ps1\s+-|prepare-fresh-owner\.ps1\s+-)\b' -or
    $entry -notmatch 'db start 1>NUL 2>NUL') {throw 'MOCK_DIAG_SOURCE_SCOPE_INVALID'}
Receipt 20


# DG-21: the real production post-start confirmation registers only verified
# labelled resources, observes DB healthy/idle, and persists a TEST receipt.
try {
  Prepare-DiagnosticMock
  $script:mock.c=$true;$script:mock.v=$true;$script:mock.n=$true
  $script:mock.running=$true
  $j=Read-FfhJournal -Identity $script:identity
  $j.resources=@([pscustomobject]@{kind='networks';id=$script:nid;name=$script:mock.nname})
  $j | Add-Member -MemberType NoteProperty -Name postStartMigrationCopies -Value 15 -Force
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  $syntheticSource=[pscustomobject]@{migration_files=@(1..15)}
  $j=Confirm-FfhDiagnosticStarted -Identity $script:identity -Source $syntheticSource -FakeDocker $script:fakeDocker -FakeFilesystem $script:fakeFs
  AssertIt ($j.diagnosticStatus -ceq 'START_VERIFIED' -and
    $j.testResult -ceq 'PASS' -and $j.evidenceSaved -and
    $j.sqlBoundary.status -ceq 'NOT_STARTED' -and
    $j.gateAResult -ceq 'NOT_STARTED' -and $j.gateBResult -ceq 'NOT_STARTED' -and
    $script:mutations.Count -eq 0) 'ACTUAL_START_CONFIRM'
  $receipt=Join-Path $script:evidence ($script:identity.token+'.DIAG_TEST.json')
  AssertIt (Test-Path -LiteralPath $receipt -PathType Leaf) 'TEST_RECEIPT_DURABLE'
  Receipt 21
} finally {Stop-MockCase}

# DG-22: out-of-order state transitions cannot jump to VERIFIED.
try {
  Prepare-DiagnosticMock
  MustBlock {Set-FfhDiagnosticJournal -Identity $script:identity -Status CLEANUP_VERIFIED -CleanupResult CLEANUP_VERIFIED}
  $j=Read-FfhJournal -Identity $script:identity
  AssertIt ($j.diagnosticStatus -ceq 'START_IN_FLIGHT' -and
    $j.cleanupResult -cne 'CLEANUP_VERIFIED') 'NO_SKIP_STATE'
  Receipt 22
} finally {Stop-MockCase}

# DG-23: a failed stop consumes the cleanup attempt; no blind retry allowed.
try {
  Prepare-DiagnosticMock;Mark-DiagnosticStarted
  $script:mock.failStop=$true
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  $script:mock.failStop=$false
  MustBlock {Invoke-FfhDiagnosticCleanup -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt (($script:mutations -join ',') -ceq 'stop' -and
    $script:mock.root -ceq 'OWNED') 'NO_RETRY'
  Receipt 23
} finally {Stop-MockCase}

# New entrypoint syntax is parsed in WinPS5.1 without running ANY top-level
# operator action, Docker startup, native file disposition or SQL.
$tokens=$null;$errors=$null
[void][Management.Automation.Language.Parser]::ParseFile(
  (Join-Path $repo 'scripts/rls-local/owner-disposable-diagnostic.ps1'),
  [ref]$tokens,[ref]$errors)
if (@($errors).Count -ne 0) {throw 'MOCK_DIAG_ENTRYPOINT_PARSE_ERROR'}

# DG-24/25: production Plan body under strict test-only adapters. Its own
# read-only output must not create a journal, consume approval or call Docker.
function Assert-FfhNoRemoteConfiguration {}
function Assert-FfhDockerEnvironment {}
function Assert-FfhLocalDockerDesktop {
  return [pscustomobject]@{Executable='NEVER_INVOKED';Endpoint='npipe:////./pipe/dockerDesktopLinuxEngine'}
}
function Assert-FfhSourceCheckout {
  param([string]$ExpectedHead,[switch]$AllowDetachedHeadForDiagnostic)
  if (-not $AllowDetachedHeadForDiagnostic -or $ExpectedHead -cne ('a'*40)) {throw 'MOCK_PLAN_SOURCE'}
  return [pscustomobject]@{repo=$repo;migration_files=@();all_files=@()}
}
function Assert-FfhDiagnosticApprovedCheckout {param($Source)}
function Resolve-FfhDiagnosticCachedCli {
  param([string]$CliExecutable,[string]$CliSha256)
  return [pscustomobject]@{Path='MOCK_NEVER_RUN';Sha256=('a'*64);Version='2.122.0'}
}
function Select-FfhRunPorts {param($Identity);return @(26430,26431)}
function Assert-FfhDiagnosticNoPriorAttempt {param($Identity)}
function Get-FfhObservedDaemon {param($Fake);return 'MOCK_VERIFIED_DAEMON'}
function Get-FfhProtectedInventory {param($Fake);return @('C:legacy FFH-RLS-Test','V:legacy FFH-RLS-Test','N:legacy FFH-RLS-Test')}
$planLines=@(Invoke-FfhOwnerDisposableDiagnostic -Mode Plan -ExpectedHead ('a'*40) -CliExecutable 'MOCK_NEVER_RUN' -CliSha256 ('a'*64))
AssertIt (@($planLines | Where-Object {$_ -match '^PLAN_ONLY=NO_MUTATION' }).Count -eq 1) 'PLAN_OUTPUT'
AssertIt (@($planLines | Where-Object {$_ -match '^DIAG_PREFLIGHT=PASS MODE=Plan' }).Count -eq 1) 'PLAN_PREFLIGHT'
Receipt 24
MustBlock {Invoke-FfhOwnerDisposableDiagnostic -Mode Run -ExpectedHead ('a'*40) -ExplicitAuthorization 'FFH-P01-ONE-SHOT-DIAGNOSTIC-GO'}
MustBlock {Invoke-FfhOwnerDisposableDiagnostic -Mode Run -ExpectedHead ('a'*40) -CliSha256 ('a'*64)}
Receipt 25


# DG-26: a loopback-only owned bridge is constructed with exactly one command
# and journaled before CLI startup, with immutable dual labels and options.
try {
  Prepare-DiagnosticMock
  $j=Read-FfhJournal -Identity $script:identity
  $j.diagnosticStatus='ROOT_CREATED';$j.state='DIAG_ROOT_CREATED';$j.testResult='NOT_STARTED'
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  $created=New-FfhDiagnosticOwnedLoopbackNetwork -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs
  AssertIt ($created.diagnosticStatus -ceq 'NETWORK_READY' -and
    @($created.resources).Count -eq 1 -and
    $created.resources[0].id -ceq $script:nid -and
    $script:mock.n -and $script:mutations.Count -eq 1) 'JOURNALED_LOOPBACK_NET'
  $cmd=[string]$script:actionArgs[0]
  AssertIt ($cmd -match 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' -and
    $cmd -match [regex]::Escape('com.supabase.cli.project='+$script:identity.project) -and
    $cmd -match [regex]::Escape('com.docker.compose.project='+$script:identity.project) -and
    $cmd.EndsWith($script:mock.nname)) 'LOOPBACK_NETWORK_VECTOR'
  Receipt 26
} finally {Stop-MockCase}

# DG-27: a Docker daemon that does NOT retain the loopback network option
# never grants permission to start a database.
try {
  Prepare-DiagnosticMock
  $j=Read-FfhJournal -Identity $script:identity
  $j.diagnosticStatus='ROOT_CREATED';$j.state='DIAG_ROOT_CREATED';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  $script:mock.unsafeBridge=$true
  MustBlock {New-FfhDiagnosticOwnedLoopbackNetwork -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  $j=Read-FfhJournal -Identity $script:identity
  AssertIt ($j.state -ceq 'DIAG_MUTATION_IN_FLIGHT' -and $script:mock.n) 'IN_FLIGHT_UNSAFE_NETWORK'
  Receipt 27
} finally {Stop-MockCase}

# DG-28: an already present foreign project network is never adopted.
try {
  Prepare-DiagnosticMock
  $j=Read-FfhJournal -Identity $script:identity
  $j.diagnosticStatus='ROOT_CREATED';$j.state='DIAG_ROOT_CREATED';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  $script:mock.n=$true
  MustBlock {New-FfhDiagnosticOwnedLoopbackNetwork -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  AssertIt ($script:mutations.Count -eq 0) 'NO_NETWORK_ADOPTION'
  Receipt 28
} finally {Stop-MockCase}


# DG-29: even correct IPv4 loopback option must reject enabled IPv6 bridge.
try {
  Prepare-DiagnosticMock
  $j=Read-FfhJournal -Identity $script:identity
  $j.diagnosticStatus='ROOT_CREATED';$j.state='DIAG_ROOT_CREATED';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  $script:mock.ipv6Bridge=$true
  MustBlock {New-FfhDiagnosticOwnedLoopbackNetwork -Identity $script:identity -Fake $script:fakeDocker -FakeFilesystem $script:fakeFs}
  $j=Read-FfhJournal -Identity $script:identity
  AssertIt ($j.state -ceq 'DIAG_MUTATION_IN_FLIGHT' -and $script:mock.n) 'IPV6_BRIDGE_DENIED'
  Receipt 29
} finally {Stop-MockCase}


function Prepare-SyntheticMigrationStage {
  Prepare-DiagnosticMock
  $root=Join-Path $script:base 'FFH-P01-RLS-Fresh-Synthetic-Only'
  $migrations=Join-Path $root 'supabase\migrations'
  [void](New-Item -ItemType Directory -Path $migrations -Force)
  $sourceRoot=Join-Path $script:base 'source'
  $sourceMigrations=Join-Path $sourceRoot 'supabase\migrations'
  [void](New-Item -ItemType Directory -Path $sourceMigrations -Force)
  $script:identity.root=$root
  $j=Read-FfhJournal -Identity $script:identity
  $j.root=$root;$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $script:identity -Journal $j
  $rows=@()
  foreach($i in 1..15) {
    $name=('20261106010000_synthetic_'+$i.ToString('00')+'.sql')
    $path='supabase/migrations/'+$name
    $text='-- SYNTHETIC_ONLY_'+$i
    $sourceFile=Join-Path $sourceMigrations $name
    [IO.File]::WriteAllText($sourceFile,$text,[Text.UTF8Encoding]::new($false))
    $sha=[Security.Cryptography.SHA256]::Create()
    try {
      $digest=[BitConverter]::ToString(
        $sha.ComputeHash([Text.UTF8Encoding]::new($false).GetBytes($text))).Replace('-','').ToLowerInvariant()
    } finally {$sha.Dispose()}
    $rows+= [pscustomobject]@{path=$path;sha256=$digest}
  }
  return [pscustomobject]@{repo=$sourceRoot;migration_files=$rows}
}
try {
  $synthetic=Prepare-SyntheticMigrationStage
  Complete-FfhDiagnosticMigrationStaging -Identity $script:identity -Source $synthetic
  $j=Read-FfhJournal -Identity $script:identity
  $dest=Join-Path $script:identity.root 'supabase\migrations'
  AssertIt ($j.postStartMigrationCopies -eq 15 -and
    @((Get-ChildItem -LiteralPath $dest -File)).Count -eq 15 -and
    $script:mutations.Count -eq 0 -and
    $j.gateAResult -ceq 'NOT_STARTED' -and $j.sqlBoundary.status -ceq 'NOT_STARTED') 'LATE_COPY_ONLY'
  Receipt 30
} finally {Stop-MockCase}

try {
  $synthetic=Prepare-SyntheticMigrationStage
  $foreign=Join-Path $script:identity.root 'supabase\migrations\foreign.txt'
  [IO.File]::WriteAllText($foreign,'NOT OURS')
  MustBlock {Complete-FfhDiagnosticMigrationStaging -Identity $script:identity -Source $synthetic}
  $dest=Join-Path $script:identity.root 'supabase\migrations'
  AssertIt ((Get-Content -LiteralPath $foreign -Raw) -eq 'NOT OURS' -and
    @((Get-ChildItem -LiteralPath $dest -File)).Count -eq 1 -and
    $script:mutations.Count -eq 0) 'FOREIGN_STAGING_PRESERVED'
  Receipt 31
} finally {Stop-MockCase}

# Static AST guarantee: zero application migrations in root before db start.
$treeFunction=@($entryAst.FindAll({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -ceq 'New-FfhDiagnosticTree'
},$false))
if ($treeFunction.Count -ne 1 -or
    $treeFunction[0].Extent.Text -match 'Copy-Item' -or
    $treeFunction[0].Extent.Text -notmatch 'migrations_copied_before_start=0' -or
    $entry -notmatch 'Complete-FfhDiagnosticMigrationStaging -Identity') {
  throw 'MOCK_STAGING_MIGRATION_APPLICATION_RISK'
}
Receipt 32
