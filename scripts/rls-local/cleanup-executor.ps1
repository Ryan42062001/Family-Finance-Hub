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
  foreach ($entry in $owned) {
    if (@($records | Where-Object { $_.kind -ceq $entry.kind -and
          $_.id -ceq $entry.id -and $_.name -ceq $entry.name }).Count -ne 1) {
      throw 'BLOCKED: observed resource has no exact journal entry'
    }
  }
  foreach ($entry in $records) {
    if (@($owned | Where-Object { $_.kind -ceq $entry.kind -and
          $_.id -ceq $entry.id }).Count -gt 1) {
      throw 'BLOCKED: duplicate resource identity'
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
function Clear-FfhVerifiedRoot {
  param($Identity)
  # Never follow reparse points; no recursive deletion. Restrict to an exact
  # direct-child run root and verify every entry before a leaf-first operation.
  Assert-FfhNoReparsePath -Path $Identity.root
  if (-not (Test-Path -LiteralPath $Identity.root -PathType Container)) { return }
  $home=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  if (-not ([IO.Path]::GetFullPath((Split-Path $Identity.root -Parent))).Equals(
      $home,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: unsafe temporary root parent'
  }
  $stack=New-Object System.Collections.Stack
  $stack.Push([pscustomobject]@{path=$Identity.root;visited=$false})
  $count=0
  while ($stack.Count -gt 0) {
    if (++$count -gt 4000) { throw 'BLOCKED: root tree too large' }
    $item=$stack.Pop()
    Assert-FfhNoReparsePath -Path $item.path
    if ($item.visited) {
      Remove-Item -LiteralPath $item.path -Force -ErrorAction Stop
      continue
    }
    $stack.Push([pscustomobject]@{path=$item.path;visited=$true})
    foreach ($child in @(Get-ChildItem -LiteralPath $item.path -Force -ErrorAction Stop)) {
      Assert-FfhNoReparsePath -Path $child.FullName
      if ($child.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'BLOCKED: reparse point discovered'
      }
      if ($child.PSIsContainer) {
        $stack.Push([pscustomobject]@{path=$child.FullName;visited=$false})
      } else {
        Remove-Item -LiteralPath $child.FullName -Force -ErrorAction Stop
      }
    }
  }
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
  param($Identity,[string]$SqlIdleAttestation,[scriptblock]$Fake)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.state -ceq 'GATE_A_PRESERVED') { return 'PRESERVED_FOR_GATE_B' }
  if (-not $j.evidenceSaved -or $SqlIdleAttestation -cne 'VERIFIED_DAEMON_SQL_IDLE' -or
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
    if (-not $Fake) { Clear-FfhVerifiedRoot -Identity $Identity }
    $j=Set-FfhRunState -Identity $Identity -State 'CLEANUP_VERIFIED' -CleanupResult 'CLEANUP_VERIFIED'
    return $j.cleanupResult
  } catch {
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
    return 'CLEANUP_BLOCKED_MANUAL_REVIEW'
  }
}
