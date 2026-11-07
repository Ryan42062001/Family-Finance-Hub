# FFH-P01 #83: diagnostic-only pre-start loopback bridge / root staging.
# Dot-source only. This is NOT a formal Gate A/B SQL admission.
Set-StrictMode -Version Latest

# The released CLI also honors SUPABASE_NETWORK_ID / EXPERIMENTAL_STACK
# and DB_PORT overrides. Any ambient override could redirect the project
# away from our verified loopback bridge; never silently inherit it.
function Assert-FfhDiagnosticNoSupabaseOverrides {
  foreach($entry in @([Environment]::GetEnvironmentVariables('Process').Keys)) {
    if ([string]$entry -match '^(?i:SUPABASE_)') {
      throw 'BLOCKED_DIAG_UNTRUSTED_SUPABASE_ENV_OVERRIDE'
    }
  }
}

# Supabase CLI db start 2.122.0 omits HostIP in published DB port
# bindings. Docker bridge defaults to all interfaces unless created with
# a loopback default BEFORE startup.
function Assert-FfhDiagnosticLoopbackNetwork {
  param($Identity,$NetworkId,[scriptblock]$Fake)
  if ($NetworkId -cnotmatch '^[a-f0-9]{64}$') {
    throw 'BLOCKED_DIAG_NETWORK_ID_INVALID'
  }
  $name='supabase_network_'+$Identity.project
  $row=@(Invoke-FfhDockerRead -Arguments @('network','inspect',$NetworkId,'--format','{{.Name}}') -Fake $Fake)
  $opt=@(Invoke-FfhDockerRead -Arguments @('network','inspect',$NetworkId,'--format','{{json .Options}}') -Fake $Fake)
  $ipv6=@(Invoke-FfhDockerRead -Arguments @('network','inspect',$NetworkId,'--format','{{.EnableIPv6}}') -Fake $Fake)
  if ($row.Count -ne 1 -or $row[0] -cne $name -or
      $opt.Count -ne 1 -or $ipv6.Count -ne 1 -or $ipv6[0] -cne 'false') {
    throw 'BLOCKED_DIAG_NETWORK_READBACK_INCOMPLETE'
  }
  try {$options=([string]$opt[0] | ConvertFrom-Json)}
  catch {throw 'BLOCKED_DIAG_NETWORK_OPTIONS_MALFORMED'}
  if ($null -eq $options -or $options -isnot [pscustomobject]) {
    throw 'BLOCKED_DIAG_NETWORK_OPTIONS_MISSING'
  }
  $names=@($options.PSObject.Properties.Name)
  if ($names -cnotcontains 'com.docker.network.bridge.host_binding_ipv4') {
    throw 'BLOCKED_DIAG_NETWORK_BIND_OPTION_MISSING'
  }
  $gw4=if ($names -ccontains 'com.docker.network.bridge.gateway_mode_ipv4') {
    [string]$options.'com.docker.network.bridge.gateway_mode_ipv4'
  } else {'nat'}
  $gw6=if ($names -ccontains 'com.docker.network.bridge.gateway_mode_ipv6') {
    [string]$options.'com.docker.network.bridge.gateway_mode_ipv6'
  } else {'nat'}
  if ($options.'com.docker.network.bridge.host_binding_ipv4' -cne '127.0.0.1' -or
      $gw4 -cne 'nat' -or $gw6 -cne 'nat') {
    throw 'BLOCKED_DIAG_NETWORK_NOT_LOOPBACK_ONLY'
  }
  return $true
}

# At db start, the migration directory MUST be empty: CLI db start
# executes pending application migration SQL if present. The immutable
# 15 files are copied after startup without executing formal RLS SQL.
function Assert-FfhDiagnosticStagingRoot {
  param($Identity,$Journal,[scriptblock]$FakeFilesystem)
  if ($FakeFilesystem) {
    return (Assert-FfhOwnedRootPreflight -Identity $Identity -Journal $Journal -FakeFilesystem $FakeFilesystem)
  }
  [void](Get-FfhOwnedRootNative)
  $full=Get-FfhRootPermitSpec -Identity $Identity -Journal $Journal
  $reduced=@($full -split [char]10 | Where-Object {
    $_ -notmatch '^F\|supabase\\migrations\\'
  }) -join [char]10
  $profileHome=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $leaf='FFH-P01-RLS-Fresh-'+$Identity.sha.Substring(0,12)+'-'+$Identity.token
  Assert-FfhNoReparsePath -Path $profileHome
  if ([FfhP01OwnedRoot]::Preflight($profileHome,$leaf,$Journal.rootOwnership.fileId,
      (Get-FfhRootMarker -Identity $Identity),$reduced) -cne 'PREFLIGHT_OK') {
    throw 'BLOCKED_DIAG_STAGING_TREE_NOT_PROVEN'
  }
}

function New-FfhDiagnosticOwnedLoopbackNetwork {
  param($Identity,[scriptblock]$Fake,[scriptblock]$FakeFilesystem)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $j.diagnosticStatus -cne 'ROOT_CREATED' -or
      @($j.resources).Count -ne 0 -or
      $j.rootOwnership.markerVersion -ne 1) {
    throw 'BLOCKED_DIAG_NETWORK_START_STATE_INVALID'
  }
  Assert-FfhDiagnosticStagingRoot -Identity $Identity -Journal $j -FakeFilesystem $FakeFilesystem
  Assert-FfhPrecreationNamespace -Identity $Identity -Fake $Fake
  [void](Assert-FfhDiagnosticLabelBijection -Identity $Identity -Fake $Fake -ExpectEmpty)
  Confirm-FfhBaseline -Journal $j -Fake $Fake
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {
    throw 'BLOCKED_DIAG_DAEMON_DRIFT'
  }
  $j.diagnosticStatus='NETWORK_CREATE_IN_FLIGHT'
  $j.state='DIAG_MUTATION_IN_FLIGHT'
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  $name='supabase_network_'+$Identity.project
  # Fixed/identity-bound args through existing pinned local Docker Job.
  $args=@(
    'network','create','--driver','bridge',
    '--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',
    '--label',('com.supabase.cli.project='+$Identity.project),
    '--label',('com.docker.compose.project='+$Identity.project),
    $name
  )
  Invoke-FfhExactDockerCommand -Arguments $args -Fake $Fake
  $observed=@(Get-FfhResourceSnapshot -Identity $Identity -Fake $Fake)
  $network=@($observed | Where-Object {$_.kind -ceq 'networks'})
  if ($observed.Count -ne 1 -or $network.Count -ne 1 -or
      $network[0].name -cne $name) {
    throw 'BLOCKED_DIAG_NETWORK_CREATION_IDENTITY_UNKNOWN'
  }
  [void](Assert-FfhDiagnosticLoopbackNetwork -Identity $Identity -NetworkId $network[0].id -Fake $Fake)
  $peers=@(Invoke-FfhDockerRead -Arguments @('network','inspect',$network[0].id,
    '--format','{{json .Containers}}') -Fake $Fake)
  if ($peers.Count -ne 1 -or $peers[0] -cnotin @('{}','null')) {
    throw 'BLOCKED_DIAG_CREATED_NETWORK_NOT_EMPTY'
  }
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {
    throw 'BLOCKED_DIAG_DAEMON_DRIFT_AFTER_NETWORK_CREATE'
  }
  Confirm-FfhBaseline -Journal $j -Fake $Fake
  $j=Read-FfhJournal -Identity $Identity
  if ($j.diagnosticStatus -cne 'NETWORK_CREATE_IN_FLIGHT' -or
      @($j.resources).Count -ne 0) {
    throw 'BLOCKED_DIAG_NETWORK_JOURNAL_DRIFT'
  }
  $j.resources=@([pscustomobject]@{kind='networks';id=$network[0].id;name=$network[0].name})
  $j.diagnosticStatus='NETWORK_READY'
  $j.state='DIAG_NETWORK_READY'
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}

# Last read-only barrier immediately before CLI creates a DB container.
# The cached executable, recorded loopback bridge, daemon and protected
# resources must still match exactly. No adoption or blind retry.
function Assert-FfhDiagnosticLaunchPreflight {
  param($Identity,$Cli,[scriptblock]$Fake,[scriptblock]$FakeFilesystem)
  if ($Cli.Sha256 -cnotmatch '^[a-f0-9]{64}$' -or
      -not (Test-Path -LiteralPath $Cli.Path -PathType Leaf) -or
      (Get-FfhFileSha256 -Path $Cli.Path) -cne $Cli.Sha256) {
    throw 'BLOCKED_DIAG_CLI_CHANGED_BEFORE_START'
  }
  $j=Read-FfhJournal -Identity $Identity
  if ($j.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $j.diagnosticStatus -cne 'START_IN_FLIGHT' -or
      $j.state -cne 'DIAG_START_IN_FLIGHT' -or
      $j.sqlBoundary.status -cne 'NOT_STARTED' -or
      @($j.resources).Count -ne 1 -or
      $j.resources[0].kind -cne 'networks') {
    throw 'BLOCKED_DIAG_PRESTART_IDENTITY_NOT_PROVEN'
  }
  Assert-FfhDiagnosticStagingRoot -Identity $Identity -Journal $j -FakeFilesystem $FakeFilesystem
  $owned=@(Assert-FfhDiagnosticInventory -Identity $Identity -Journal $j -Fake $Fake)
  if ($owned.Count -ne 1 -or $owned[0].kind -cne 'networks' -or
      $owned[0].id -cne $j.resources[0].id) {
    throw 'BLOCKED_DIAG_NETWORK_DRIFT_BEFORE_START'
  }
  $peers=@(Invoke-FfhDockerRead -Arguments @('network','inspect',$j.resources[0].id,
    '--format','{{json .Containers}}') -Fake $Fake)
  if ($peers.Count -ne 1 -or $peers[0] -cnotin @('{}','null')) {
    throw 'BLOCKED_DIAG_NETWORK_PEER_BEFORE_START'
  }
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {
    throw 'BLOCKED_DIAG_DAEMON_DRIFT_BEFORE_START'
  }
  Confirm-FfhBaseline -Journal $j -Fake $Fake
  return $true
}
