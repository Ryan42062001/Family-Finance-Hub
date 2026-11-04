# FFH-P01 #83 exact-run cleanup executor. Import after source-provenance.ps1
# and automatic-cleanup.ps1. Importing never accesses Docker or the filesystem.
Set-StrictMode -Version Latest

function Get-FfhFullResourceNamespace {
  param([scriptblock]$Fake)
  $all=@()
  foreach ($row in @(Invoke-FfhDockerRead -Arguments @('ps','-a','--no-trunc','--format','{{.ID}} {{.Names}}') -Fake $Fake)) {
    $all+= 'C:' + ([string]$row).Trim()
  }
  foreach ($row in @(Invoke-FfhDockerRead -Arguments @('volume','ls','--format','{{.Name}}') -Fake $Fake)) {
    $all+= 'V:' + ([string]$row).Trim()
  }
  foreach ($row in @(Invoke-FfhDockerRead -Arguments @('network','ls','--no-trunc','--format','{{.ID}} {{.Name}}') -Fake $Fake)) {
    $all+= 'N:' + ([string]$row).Trim()
  }
  return @($all | Where-Object { $_ -notmatch '^[CVN]:$' } | Sort-Object -Unique)
}
function Get-FfhProtectedInventory {
  param([scriptblock]$Fake)
  return @(Get-FfhFullResourceNamespace -Fake $Fake | Where-Object { $_ -match '(?i)FFH[-_]RLS[-_]Test' })
}
function Assert-FfhPrecreationNamespace {
  param($Identity,[scriptblock]$Fake)
  if (@(Get-FfhOwnedNames -Project $Identity.project -Kind containers -Fake $Fake).Count -or
      @(Get-FfhOwnedNames -Project $Identity.project -Kind volumes -Fake $Fake).Count -or
      @(Get-FfhOwnedNames -Project $Identity.project -Kind networks -Fake $Fake).Count) {
    throw 'BLOCKED: run-labelled resource exists before creation'
  }
  if (@(Get-FfhFullResourceNamespace -Fake $Fake |
        Where-Object { $_ -match [regex]::Escape($Identity.project) }).Count) {
    throw 'BLOCKED: run-named resource exists even without labels'
  }
}
function Confirm-FfhBaseline {
  param($Journal,[scriptblock]$Fake)
  $now=@(Get-FfhProtectedInventory -Fake $Fake)
  $baseline=@($Journal.protected)
  if (($now -join [char]10) -cne ($baseline -join [char]10)) {
    throw 'BLOCKED: protected FFH-RLS-Test inventory changed'
  }
}
function Assert-FfhExactInventory {
  param($Identity,$Journal,[scriptblock]$Fake)
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $Journal.daemon) {
    throw 'BLOCKED: Docker daemon drift'
  }
  Confirm-FfhBaseline -Journal $Journal -Fake $Fake
  $owned=@(Get-FfhResourceSnapshot -Identity $Identity -Fake $Fake)
  $records=@($Journal.resources)
  if ($owned.Count -ne $records.Count) {
    throw 'BLOCKED: incomplete resource inventory cardinality'
  }
  foreach ($kind in @('containers','volumes','networks')) {
    if (@($owned | Where-Object { $_.kind -ceq $kind }).Count -ne
        @($records | Where-Object { $_.kind -ceq $kind }).Count) {
      throw 'BLOCKED: per-kind resource inventory count mismatch'
    }
  }
  foreach ($entry in $owned) {
    if (@($records | Where-Object { $_.kind -ceq $entry.kind -and
          $_.id -ceq $entry.id -and $_.name -ceq $entry.name }).Count -ne 1) {
      throw 'BLOCKED: observed resource has no exact journal entry'
    }
  }
  foreach ($entry in $records) {
    if (@($owned | Where-Object { $_.kind -ceq $entry.kind -and
          $_.id -ceq $entry.id -and $_.name -ceq $entry.name }).Count -ne 1) {
      throw 'BLOCKED: journaled exact resource missing or duplicated'
    }
  }
  $all=@(Get-FfhFullResourceNamespace -Fake $Fake)
  foreach ($entry in $all) {
    if ($entry -match [regex]::Escape($Identity.project)) {
      $found=@($records | Where-Object {
        $entry.Contains([string]$_.id) -or $entry.Contains([string]$_.name)
      })
      if ($found.Count -ne 1) { throw 'BLOCKED: unlabeled or ambiguous named resource' }
    }
  }
  $ids=@($records | Where-Object kind -eq 'containers' | ForEach-Object id)
  $volumeNames=@($records | Where-Object kind -eq 'volumes' | ForEach-Object name)
  $netIds=@($records | Where-Object kind -eq 'networks' | ForEach-Object id)
  foreach ($entry in $owned) {
    if ($entry.kind -eq 'containers') {
      foreach ($mount in @($entry.mounts)) {
        if ($mount.Type -ceq 'volume') {
          if ($volumeNames -cnotcontains $mount.Name) {
            throw 'BLOCKED: container uses foreign volume'
          }
        } elseif ($mount.Type -ceq 'bind') {
          $source=[IO.Path]::GetFullPath([string]$mount.Source)
          $root=[IO.Path]::GetFullPath($Identity.root)
          if (-not $source.StartsWith(($root.TrimEnd('\')+'\'),
            [StringComparison]::OrdinalIgnoreCase)) {
            throw 'BLOCKED: container has outside-root bind mount'
          }
        } else {throw 'BLOCKED: container mount type unknown'}
      }
      foreach ($key in @($entry.networks.PSObject.Properties.Name)) {
        $net=$entry.networks.$key
        if ($netIds -cnotcontains $net.NetworkID) {
          throw 'BLOCKED: container uses foreign network'
        }
      }
    }
    if ($entry.kind -eq 'volumes') {
      $refs=@(Invoke-FfhDockerRead -Arguments @('ps','-a','--no-trunc','--filter',
        ('volume='+$entry.name),'--format','{{.ID}}') -Fake $Fake)
      foreach ($ref in $refs) {if ($ids -cnotcontains [string]$ref) {
        throw 'BLOCKED: volume attached to foreign container'
      }}
    }
    if ($entry.kind -eq 'networks') {
      $raw=@(Invoke-FfhDockerRead -Arguments @('network','inspect',$entry.id,
        '--format','{{json .Containers}}') -Fake $Fake)
      if ($raw.Count -ne 1) {throw 'BLOCKED: network attachment inventory missing'}
      if ([string]$raw[0] -ne 'null' -and [string]$raw[0] -ne '{}') {
        $connections=([string]$raw[0] | ConvertFrom-Json)
        foreach ($name in @($connections.PSObject.Properties.Name)) {
          if ($ids -cnotcontains [string]$name) {
            throw 'BLOCKED: foreign network endpoint'
          }
        }
      }
    }
  }
  return @($owned)
}
# Journal-bound admission is the real owner/SQL-runner guard. No mutation.
function Assert-FfhJournaledSqlAdmission {
  param(
    [Parameter(Mandatory=$true)]$Identity,
    [Parameter(Mandatory=$true)][ValidateSet('GATE_A','GATE_B')][string]$Phase,
    [scriptblock]$Fake,
    [switch]$ForCleanup
  )
  $j=Read-FfhJournal -Identity $Identity
  if ($Identity.sha -cnotmatch '^[a-f0-9]{40}$' -or
      $Identity.token -cnotmatch '^[a-f0-9]{24}$') {
    throw 'BLOCKED_SQL_ADMISSION_SOURCE_ID_INVALID'
  }
  if ($j.version -ne 2 -or $j.sha -cne $Identity.sha -or
      $j.token -cne $Identity.token -or $j.project -cne $Identity.project -or
      $j.root -cne $Identity.root -or $j.container -cne $Identity.container -or
      [string]::IsNullOrWhiteSpace([string]$j.daemon) -or
      $j.cliVersion -cne '2.122.0' -or
      $Identity.project -cne ('ffhp1_'+$Identity.sha.Substring(0,8)+'_'+$Identity.token) -or
      $Identity.container -cne ('supabase_db_'+$Identity.project) -or
      @($j.ports).Count -ne 2 -or [int]$j.ports[0] -lt 20000 -or
      [int]$j.ports[0] -gt 59998 -or [int]$j.ports[1] -ne ([int]$j.ports[0]+1)) {
    throw 'BLOCKED_SQL_ADMISSION_JOURNAL_IDENTITY_INVALID'
  }
  if ($ForCleanup) {
    if ($j.sqlBoundary.phase -cne $Phase -or
        $j.sqlBoundary.status -cne 'COMPLETE' -or
        $j.sqlBoundary.containerId -cnotmatch '^[a-f0-9]{64}$' -or
        $j.sqlBoundary.daemon -cne $j.daemon -or
        $j.state -cnotin @('GATE_A_FAILED','GATE_B_FAILED','GATE_B_COMPLETE','CLEANUP_RUNNING')) {
      throw 'BLOCKED_SQL_CLEANUP_NOT_PREVIOUSLY_ADMITTED'
    }
  } elseif ($Phase -ceq 'GATE_A') {
    if ($j.gateAResult -cne 'RUNNING' -or
        $j.state -cnotin @('INVENTORY_VERIFIED','GATE_A_RUNNING') -or
        $j.gateBResult -cne 'NOT_STARTED') {
      throw 'BLOCKED_SQL_ADMISSION_GATE_A_STATE_INVALID'
    }
  } else {
    if ($j.gateAResult -cne 'PASS' -or $j.gateBResult -cne 'RUNNING' -or
        $j.state -cne 'GATE_B_RUNNING' -or
        $j.cleanupResult -cne 'PRESERVED_FOR_GATE_B') {
      throw 'BLOCKED_SQL_ADMISSION_GATE_B_STATE_INVALID'
    }
  }
  $expected=@($j.resources | Where-Object {
    $_.kind -ceq 'containers' -and
    $_.name -ceq ('/'+$Identity.container) -and
    $_.id -cmatch '^[a-f0-9]{64}$'
  })
  if ($expected.Count -ne 1 -or
      @($j.resources | Where-Object { $_.kind -ceq 'containers' }).Count -ne 1) {
    throw 'BLOCKED_SQL_ADMISSION_JOURNALED_CONTAINER_ABSENT'
  }
  # Full bijection also checks dual labels, daemon, protected baseline,
  # foreign mounts, volume consumers, network peers and all other resources.
  $verified=@(Assert-FfhExactInventory -Identity $Identity -Journal $j -Fake $Fake)
  $db=@($verified | Where-Object {
    $_.kind -ceq 'containers' -and $_.id -ceq $expected[0].id -and
    $_.name -ceq $expected[0].name -and $_.running
  })
  if ($db.Count -ne 1) {
    throw 'BLOCKED_SQL_ADMISSION_CONTAINER_ID_CHANGED_OR_STOPPED'
  }
  $cid=[string]$db[0].id
  if ($ForCleanup -and $cid -cne [string]$j.sqlBoundary.containerId) {
    throw 'BLOCKED_SQL_CLEANUP_CONTAINER_ID_DRIFT'
  }
  $id=@(Invoke-FfhDockerRead -Arguments @('inspect',$cid,'--format','{{.Id}}') -Fake $Fake)
  $name=@(Invoke-FfhDockerRead -Arguments @('inspect',$cid,'--format','{{.Name}}') -Fake $Fake)
  $stateRaw=@(Invoke-FfhDockerRead -Arguments @('inspect',$cid,'--format','{{json .State}}') -Fake $Fake)
  $portsRaw=@(Invoke-FfhDockerRead -Arguments @('inspect',$cid,'--format','{{json .NetworkSettings.Ports}}') -Fake $Fake)
  if ($id.Count -ne 1 -or $id[0] -cne $cid -or $name.Count -ne 1 -or
      $name[0] -cne ('/'+$Identity.container) -or
      $stateRaw.Count -ne 1 -or $portsRaw.Count -ne 1) {
    throw 'BLOCKED_SQL_ADMISSION_INSPECT_IDENTITY_INVALID'
  }
  try {
    $state=([string]$stateRaw[0] | ConvertFrom-Json)
    $ports=([string]$portsRaw[0] | ConvertFrom-Json)
    $binds=@($ports.'5432/tcp')
  } catch {throw 'BLOCKED_SQL_ADMISSION_INSPECT_JSON_INVALID'}
  if (-not $state.Running -or $state.Health.Status -cne 'healthy' -or
      $binds.Count -lt 1 -or $binds.Count -gt 2) {
    throw 'BLOCKED_SQL_ADMISSION_HEALTH_OR_PORT_INVALID'
  }
  foreach ($binding in $binds) {
    if ([string]$binding.HostPort -cne [string]$j.ports[0] -or
        [string]$binding.HostIp -cnotin @('127.0.0.1','::1')) {
      throw 'BLOCKED_SQL_ADMISSION_NONLOCAL_OR_WRONG_PORT'
    }
  }
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {
    throw 'BLOCKED_SQL_ADMISSION_DAEMON_CHANGED'
  }
  Confirm-FfhBaseline -Journal $j -Fake $Fake
  return $cid
}

# Never print a stale in-memory result after cleanup or evidence write errors.
function Get-FfhDurableRunStatus {
  param([Parameter(Mandatory=$true)]$Identity,
    [switch]$TerminalStatePersistenceFailed)
  if ($TerminalStatePersistenceFailed) {
    return ('OUTCOME_UNKNOWN TERMINAL_STATE_PERSISTENCE_FAILED '+
      'GATE_A_RESULT=UNKNOWN GATE_B_RESULT=UNKNOWN '+
      'CLEANUP_RESULT=UNKNOWN_JOURNAL_UNVERIFIED RUN_TOKEN='+$Identity.token)
  }
  try {
    $j=Read-FfhJournal -Identity $Identity
    if ($j.version -ne 2 -or
        $j.gateAResult -cnotin @('NOT_STARTED','RUNNING','PASS','FAIL','UNKNOWN') -or
        $j.gateBResult -cnotin @('NOT_STARTED','RUNNING','PASS','FAIL','UNKNOWN') -or
        [string]::IsNullOrWhiteSpace([string]$j.cleanupResult)) {
      throw 'BLOCKED: final journal unverified'
    }
    return ('GATE_A_RESULT='+$j.gateAResult+' GATE_B_RESULT='+$j.gateBResult+
      ' CLEANUP_RESULT='+$j.cleanupResult+' RUN_TOKEN='+$Identity.token)
  } catch {
    return ('GATE_A_RESULT=UNKNOWN GATE_B_RESULT=UNKNOWN '+
      'CLEANUP_RESULT=UNKNOWN_JOURNAL_UNVERIFIED RUN_TOKEN='+$Identity.token)
  }
}

# Rejected admission must not execute SQL-idle checks or Docker mutation.
function Block-FfhRejectedSqlAdmission {
  param($Identity,[ValidateSet('GATE_A','GATE_B')][string]$Phase,
    [ValidateSet('Preflight','Matrix')][string]$Mode)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.sqlBoundary.phase -ceq $Phase -and
      $j.sqlBoundary.mode -ceq $Mode -and
      $j.sqlBoundary.status -cin @('PENDING','ADMITTED')) {
    [void](Set-FfhSqlBoundary -Identity $Identity -Phase $Phase -Mode $Mode -Status 'REJECTED')
  }
  if ($Phase -ceq 'GATE_A') {
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -GateAResult 'UNKNOWN' -TestResult 'UNKNOWN' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
  } else {
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -GateBResult 'UNKNOWN' -TestResult 'UNKNOWN' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
  }
}

function Invoke-FfhExactDockerCommand {
  param([string[]]$Arguments,[scriptblock]$Fake)
  if ($Fake) {
    $result=@(& $Fake $Arguments)
    if ($result.Count -ne 1 -or $result[0] -cne 'EXIT_ZERO') {
      throw 'BLOCKED: fake Docker exact action failed'
    }
    return
  }
  $binding=Assert-FfhLocalDockerDesktop
  if ($binding.Endpoint -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'BLOCKED: exact-action daemon endpoint drift'
  }
  # String is constructed only from fixed commands and previously verified Docker IDs.
  foreach ($word in $Arguments) {
    if ($word -notmatch '^[A-Za-z0-9_.:=/-]+$') {
      throw 'BLOCKED: unsafe native argument'
    }
  }
  $start=[Diagnostics.ProcessStartInfo]::new()
  $start.FileName=$binding.Executable
  $start.Arguments='--host '+$binding.Endpoint+' '+($Arguments -join ' ')
  $start.WorkingDirectory=[Environment]::GetFolderPath('UserProfile')
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true
  foreach ($key in @($start.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^(?i:DOCKER_)') {
      $start.EnvironmentVariables.Remove($key)
    }
  }
  $start.EnvironmentVariables['DOCKER_HOST']=$binding.Endpoint
  $outcome=Invoke-FfhNativeJobChild -StartInfo $start
  if ($outcome -cne 'EXIT_ZERO') {
    throw 'BLOCKED: bounded Docker action nonzero or indeterminate'
  }
}
function Test-FfhExactAbsent {
  param([string]$Kind,[string]$Id,[scriptblock]$Fake)
  switch ($Kind) {
    'containers' { $ids=@(Invoke-FfhDockerRead -Arguments @('ps','-a','--no-trunc','--format','{{.ID}}') -Fake $Fake) }
    'volumes' { $ids=@(Invoke-FfhDockerRead -Arguments @('volume','ls','--format','{{.Name}}') -Fake $Fake) }
    'networks' { $ids=@(Invoke-FfhDockerRead -Arguments @('network','ls','--no-trunc','--format','{{.ID}}') -Fake $Fake) }
    default { throw 'BLOCKED: unknown resource kind' }
  }
  if ($ids -ccontains $Id) { throw 'BLOCKED: resource not absent following action' }
}
# Root retirement is separate from exact Docker retirement. The filesystem
# adapter holds native Win32 handles with OPEN_REPARSE_POINT and denies rename,
# checks per-entry ACLs and file IDs, and uses only handle dispositions.
function Test-FfhVerifiedRootAbsent {
  param($Identity,[scriptblock]$FakeFilesystem)
  if ($Identity.sha -cnotmatch '^[a-f0-9]{40}$' -or
      $Identity.token -cnotmatch '^[a-f0-9]{24}$') {
    throw 'BLOCKED: root SHA or token invalid'
  }
  $home=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $root=[IO.Path]::GetFullPath([string]$Identity.root)
  $leaf='FFH-P01-RLS-Fresh-'+$Identity.sha.Substring(0,12)+'-'+$Identity.token
  if (-not ([IO.Path]::GetDirectoryName($root)).Equals(
      $home,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($root) -cne $leaf -or $root -match '(?i)FFH-RLS-Test') {
    throw 'BLOCKED: root parent or exact leaf invalid'
  }
  if ($FakeFilesystem) {
    $result=@(& $FakeFilesystem $root 'PROBE')
    if ($result.Count -ne 1 -or $result[0] -cne 'ABSENT') {
      throw 'BLOCKED: exact fake root still present or unknown'
    }
  } else {
    Assert-FfhNoReparsePath -Path $home
    [void](Get-FfhOwnedRootNative)
    if ([FfhP01OwnedRoot]::Probe($home,$leaf) -cne 'ABSENT') {
      throw 'BLOCKED: exact root still present'
    }
  }
  return $true
}
function Invoke-FfhOwnedRootRetirement {
  param($Identity,$Journal,[scriptblock]$FakeFilesystem)
  if ($Journal.state -cne 'CLEANUP_RUNNING' -or
      $Journal.sha -cne $Identity.sha -or $Journal.token -cne $Identity.token -or
      $Journal.root -cne $Identity.root -or
      $Journal.rootOwnership.markerVersion -ne 1 -or
      $Journal.rootOwnership.fileId -cnotmatch '^[a-f0-9]{8}:[a-f0-9]{16}$' -or
      $Journal.rootRetirement.status -cne 'NOT_STARTED' -or
      @($Journal.resources).Count -ne 0 -or -not $Journal.evidenceSaved) {
    throw 'BLOCKED: root ownership or cleanup journal incomplete'
  }
  $home=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $root=[IO.Path]::GetFullPath([string]$Identity.root)
  $leaf='FFH-P01-RLS-Fresh-'+$Identity.sha.Substring(0,12)+'-'+$Identity.token
  if (-not ([IO.Path]::GetDirectoryName($root)).Equals($home,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($root) -cne $leaf) {
    throw 'BLOCKED: root identity changed'
  }
  # Crash after this write: IN_FLIGHT never automatically retries.
  $Journal.rootRetirement=[pscustomobject]@{
    status='IN_FLIGHT';fileId=$Journal.rootOwnership.fileId
    atUtc=[DateTime]::UtcNow.ToString('o')
  }
  $Journal.sequence=[int]$Journal.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $Journal
  if ($FakeFilesystem) {
    $reply=@(& $FakeFilesystem $root 'RETIRE' $Journal.rootOwnership.fileId)
    if ($reply.Count -ne 1 -or $reply[0] -cnotin @('RETIRED','ABSENT')) {
      throw 'BLOCKED: fake filesystem retirement failed or changed'
    }
  } else {
    Assert-FfhNoReparsePath -Path $home
    [void](Get-FfhOwnedRootNative)
    $observed=[FfhP01OwnedRoot]::Probe($home,$leaf)
    if ($observed -cne 'ABSENT' -and $observed -cne $Journal.rootOwnership.fileId) {
      throw 'BLOCKED: root file ID mismatch'
    }
    if ([FfhP01OwnedRoot]::Retire($home,$leaf,$Journal.rootOwnership.fileId,
        (Get-FfhRootMarker -Identity $Identity)) -cnotin @('RETIRED','ABSENT')) {
      throw 'BLOCKED: native retirement indeterminate'
    }
  }
  [void](Test-FfhVerifiedRootAbsent -Identity $Identity -FakeFilesystem $FakeFilesystem)
  $after=Read-FfhJournal -Identity $Identity
  if ($after.rootRetirement.status -cne 'IN_FLIGHT') {
    throw 'BLOCKED: root retirement intent changed'
  }
  $after.rootRetirement.status='ABSENT_VERIFIED'
  $after.sequence=[int]$after.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $after
  [void](Test-FfhVerifiedRootAbsent -Identity $Identity -FakeFilesystem $FakeFilesystem)
}

# Read-only cleanup SQL is strictly journal/daemon/container-ID bound.
# Any admission rejection, unknown stage or changed health/port/label
# returns UNKNOWN without even attempting the SQL-idle query.
function Get-FfhSqlIdleAttestation {
  param($Identity,[scriptblock]$Fake)
  try {
    $j=Read-FfhJournal -Identity $Identity
    if ($j.sqlBoundary.phase -cnotin @('GATE_A','GATE_B') -or
        $j.sqlBoundary.status -cne 'COMPLETE' -or
        $j.sqlBoundary.containerId -cnotmatch '^[a-f0-9]{64}$' -or
        $j.sqlBoundary.sha -cne $Identity.sha -or
        $j.sqlBoundary.token -cne $Identity.token -or
        $j.sqlBoundary.daemon -cne $j.daemon) {
      return 'UNKNOWN'
    }
    $owned=@(Assert-FfhExactInventory -Identity $Identity -Journal $j -Fake $Fake)
    $containers=@($owned | Where-Object {$_.kind -ceq 'containers'})
    $db=@($containers | Where-Object {
      $_.id -ceq $j.sqlBoundary.containerId -and
      $_.name -ceq ('/'+$Identity.container)
    })
    # After an individually verified exact container deletion, the journal
    # removes its recorded ID and cleanup may continue to unattached volumes
    # and isolated networks. Never issue SQL against a missing container.
    if ($containers.Count -eq 0 -and $j.state -ceq 'CLEANUP_RUNNING' -and
        @($j.resources | Where-Object {$_.kind -ceq 'containers'}).Count -eq 0) {
      Test-FfhExactAbsent -Kind containers -Id $j.sqlBoundary.containerId -Fake $Fake
      return 'VERIFIED_DAEMON_SQL_IDLE'
    }
    if ($db.Count -ne 1 -or $containers.Count -ne 1) {return 'UNKNOWN'}
    if (-not $db[0].running) {
      return 'VERIFIED_DAEMON_SQL_IDLE'
    }
    $cid=Assert-FfhJournaledSqlAdmission -Identity $Identity -Phase $j.sqlBoundary.phase -ForCleanup -Fake $Fake
    if ($cid -cne $j.sqlBoundary.containerId) {return 'UNKNOWN'}
    $again=Assert-FfhJournaledSqlAdmission -Identity $Identity -Phase $j.sqlBoundary.phase -ForCleanup -Fake $Fake
    if ($again -cne $cid) {return 'UNKNOWN'}
    $query="SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()"
    $values=@(Invoke-FfhDockerRead -Arguments @('exec','-i',$cid,
      'psql','-U','postgres','-d','postgres','-t','-A','-c',$query) -Fake $Fake)
    if ($values.Count -eq 1 -and ([string]$values[0]).Trim() -ceq '0') {
      return 'VERIFIED_DAEMON_SQL_IDLE'
    }
  } catch { }
  return 'UNKNOWN'
}
function Invoke-FfhVerifiedCleanup {
  param($Identity,[string]$SqlIdleAttestation,[scriptblock]$Fake,
    [scriptblock]$FakeFilesystem)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.state -ceq 'GATE_A_PRESERVED') { return 'PRESERVED_FOR_GATE_B' }
  if ($FakeFilesystem -and -not $Fake) { throw 'BLOCKED: fake filesystem requires fake Docker' }
  if ($j.state -cnotin @('GATE_A_FAILED','GATE_B_COMPLETE','GATE_B_FAILED') -or
      -not $j.evidenceSaved -or $SqlIdleAttestation -cne 'VERIFIED_DAEMON_SQL_IDLE' -or
      $j.cleanupResult -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') {
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
    return 'CLEANUP_BLOCKED_MANUAL_REVIEW'
  }
  try {
    $j=Set-FfhRunState -Identity $Identity -State 'CLEANUP_RUNNING' -CleanupResult 'CLEANUP_PENDING'
    # A missing recorded resource after crash is not silently adopted. The
    # per-mutation action intent remains durable until verified completion.
    foreach ($kind in @('containers','volumes','networks')) {
      if ((Get-FfhSqlIdleAttestation -Identity $Identity -Fake $Fake) -cne 'VERIFIED_DAEMON_SQL_IDLE') {
        throw 'BLOCKED: SQL state changed before mutation'
      }
      $entries=@($j.resources | Where-Object kind -eq $kind)
      foreach ($r in $entries) {
        if ((Get-FfhSqlIdleAttestation -Identity $Identity -Fake $Fake) -cne 'VERIFIED_DAEMON_SQL_IDLE') {
          throw 'BLOCKED: SQL state unknown before exact resource mutation'
        }
        $observed=@(Assert-FfhExactInventory -Identity $Identity -Journal $j -Fake $Fake)
        $match=@($observed | Where-Object { $_.kind -ceq $kind -and $_.id -ceq $r.id })
        if ($match.Count -ne 1) {throw 'BLOCKED: expected resource unexpectedly missing'}
        $entry=$match[0]
        if ($kind -eq 'containers' -and $entry.running) {
          [void](Set-FfhRunState -Identity $Identity -State 'MUTATION_IN_FLIGHT')
          Invoke-FfhExactDockerCommand -Arguments @('stop','--time=-1',$r.id) -Fake $Fake
          $j=Set-FfhRunState -Identity $Identity -State 'CLEANUP_RUNNING'
          $observed=@(Assert-FfhExactInventory -Identity $Identity -Journal $j -Fake $Fake)
          $entry=@($observed | Where-Object { $_.id -ceq $r.id })[0]
          if ($entry.running) {throw 'BLOCKED: container still running'}
        }
        $verb=if ($kind -eq 'containers') {'rm'} else {'rm'}
        $command=switch ($kind) {
          'containers' { @('rm',$r.id) }
          'volumes' { @('volume','rm',$r.name) }
          'networks' { @('network','rm',$r.id) }
        }
        [void](Set-FfhRunState -Identity $Identity -State 'MUTATION_IN_FLIGHT')
        Invoke-FfhExactDockerCommand -Arguments $command -Fake $Fake
        Test-FfhExactAbsent -Kind $kind -Id $(if($kind -eq 'volumes'){$r.name}else{$r.id}) -Fake $Fake
        $j=Read-FfhJournal -Identity $Identity
        $j.resources=@($j.resources | Where-Object { -not ($_.kind -ceq $r.kind -and $_.id -ceq $r.id) })
        $j.state='CLEANUP_RUNNING';$j.sequence=[int]$j.sequence+1
        Write-FfhJournal -Identity $Identity -Journal $j
      }
    }
    $remaining=@(Assert-FfhExactInventory -Identity $Identity -Journal $j -Fake $Fake)
    if ($remaining.Count -ne 0) { throw 'BLOCKED: resource remains before root retirement' }
    if ((Get-FfhSqlIdleAttestation -Identity $Identity -Fake $Fake) -cne 'VERIFIED_DAEMON_SQL_IDLE') {
      throw 'BLOCKED: daemon or SQL uncertainty before filesystem retirement'
    }
    Confirm-FfhBaseline -Journal $j -Fake $Fake
    Invoke-FfhOwnedRootRetirement -Identity $Identity -Journal $j -FakeFilesystem $FakeFilesystem
    Confirm-FfhBaseline -Journal (Read-FfhJournal -Identity $Identity) -Fake $Fake
    [void](Test-FfhVerifiedRootAbsent -Identity $Identity -FakeFilesystem $FakeFilesystem)
    $j=Set-FfhRunState -Identity $Identity -State 'CLEANUP_VERIFIED' -CleanupResult 'CLEANUP_VERIFIED'
    return $j.cleanupResult
  } catch {
    if ($Fake) {
      # Synthetic adapters only: expose sanitized mock failure category to
      # the offline test harness, never raw owner-host native exceptions.
      $script:FfhMockLastCleanupFailure=[string]$_.Exception.Message
    }
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
    return 'CLEANUP_BLOCKED_MANUAL_REVIEW'
  }
}


# Once Gate B SQL has completed (or failed after RUNNING), preserve its own
# durable result independently of Gate A and cleanup. Injected adapters are
# ONLY for offline WinPS mocks; owner scripts never supply either fake.
function Complete-FfhGateB {
  param($Identity,[ValidateSet('PASS','FAIL')][string]$GateBResult,
    [scriptblock]$Fake,[scriptblock]$FakeFilesystem)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.gateAResult -cne 'PASS' -or
      $j.gateBResult -cne 'RUNNING' -or
      $j.state -cne 'GATE_B_RUNNING') {
    throw 'BLOCKED: Gate B cannot finalize without independent RUNNING receipt'
  }
  if ($j.sqlBoundary.phase -cne 'GATE_B' -or
      $j.sqlBoundary.status -cne 'COMPLETE' -or
      $j.sqlBoundary.containerId -cnotmatch '^[a-f0-9]{64}$') {
    throw 'BLOCKED: Gate B never executed a durably admitted SQL stage'
  }
  $phaseState=if ($GateBResult -ceq 'PASS') {'GATE_B_COMPLETE'} else {'GATE_B_FAILED'}
  [void](Set-FfhRunState -Identity $Identity -State $phaseState -GateBResult $GateBResult -TestResult $GateBResult)
  Write-FfhRedactedEvidence -Identity $Identity -Phase 'GATE_B' -Result $GateBResult -Category $(if($GateBResult -ceq 'PASS'){'NONE'}else{'GATE_B_FAILURE'})
  [void](Register-FfhOwnedResources -Identity $Identity -Fake $Fake)
  [void](Set-FfhRunState -Identity $Identity -State $phaseState)
  $idle=Get-FfhSqlIdleAttestation -Identity $Identity -Fake $Fake
  return Invoke-FfhVerifiedCleanup -Identity $Identity -SqlIdleAttestation $idle -Fake $Fake -FakeFilesystem $FakeFilesystem
}

# This exact function is used by the actual Gate B entrypoint and offline
# process-exit contract tests. A valid Gate B PASS cannot mask cleanup BLOCKED.
function Assert-FfhGateBSuccessfulExit {
  param($Identity,[string]$CleanupResult)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.gateAResult -cne 'PASS' -or $j.gateBResult -cne 'PASS' -or
      $CleanupResult -cne 'CLEANUP_VERIFIED' -or
      $j.cleanupResult -cne 'CLEANUP_VERIFIED') {
    throw 'BLOCKED: Gate B success/cleanup receipts not both verified'
  }
  return $true
}
