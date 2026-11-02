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
# No path-based deletion. A handle-bound Win32 implementation is NOT yet
# independently proved safe on owner hosts. Retain any present directory for
# controlled manual retirement; never call Remove-Item on the disposable root.
function Test-FfhVerifiedRootAbsent {
  param($Identity,[scriptblock]$FakeFilesystem)
  $home=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $expected='FFH-P01-RLS-Fresh-'+$Identity.sha.Substring(0,12)+'-'+$Identity.token
  $root=[IO.Path]::GetFullPath([string]$Identity.root)
  if ($Identity.sha -cnotmatch '^[a-f0-9]{40}$' -or
      $Identity.token -cnotmatch '^[a-f0-9]{24}$' -or
      -not ([IO.Path]::GetDirectoryName($root)).Equals(
        $home,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($root) -cne $expected -or
      $root -match '(?i)FFH-RLS-Test') {
    throw 'BLOCKED: root identity or direct parent mismatch'
  }
  if (-not $FakeFilesystem) {
    Assert-FfhNoReparsePath -Path $home
    if (Test-Path -LiteralPath $root) {
      # No deletion is authorized while any filesystem object exists at root.
      Assert-FfhNoReparsePath -Path $root
      throw 'BLOCKED: root retained, handle-bound retirement unverified'
    }
    if (Test-Path -LiteralPath $root) {
      throw 'BLOCKED: root appeared during final absence verification'
    }
  } else {
    $receipt=@(& $FakeFilesystem $root)
    if ($receipt.Count -ne 1 -or $receipt[0] -cne 'ABSENT') {
      throw 'BLOCKED: fake root present, changed or unknown'
    }
  }
  return $true
}

function Get-FfhSqlIdleAttestation {
  param($Identity,[scriptblock]$Fake)
  try {
    $running=@(Get-FfhResourceSnapshot -Identity $Identity -Fake $Fake |
      Where-Object { $_.kind -eq 'containers' -and $_.running })
    if (-not $running.Count) { return 'VERIFIED_DAEMON_SQL_IDLE' }
    $db=@($running | Where-Object { $_.name -ceq ('/'+$Identity.container) -or
      $_.name -ceq $Identity.container })
    if ($db.Count -ne 1) { return 'UNKNOWN' }
    # Only one bounded, local socket, read-only PostgreSQL activity query.
    # No credentials, database URL, household data or mutable SQL.
    $query="SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()"
    $values=@(Invoke-FfhDockerRead -Arguments @('exec','-i',$Identity.container,
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
    [void](Test-FfhVerifiedRootAbsent -Identity $Identity -FakeFilesystem $FakeFilesystem)
    Confirm-FfhBaseline -Journal $j -Fake $Fake
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
