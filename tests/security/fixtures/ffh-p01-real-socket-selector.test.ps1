# FFH-P01 #83 port selector: REAL Windows PowerShell 5.1 localhost sockets.
# Does not invoke an owner entrypoint, Docker, SQL, native deletion or hosted data.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../'))
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')

function Start-FixtureLoopback([int]$port) {
  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$port)
  $listener.Server.ExclusiveAddressUse=$true
  try { $listener.Start(); return $listener }
  catch { $listener.Stop(); throw }
}
function Stop-AllFixtureListeners($listeners) {
  foreach ($listener in @($listeners)) {
    if ($null -ne $listener) {$listener.Stop()}
  }
}
function Find-FixturePair {
  # Fixed, bounded test candidates; never use the Owner's Plan/Run identity.
  for ($candidate=22043;$candidate -le 59500;$candidate+=173) {
    $held=New-Object 'System.Collections.Generic.List[System.Net.Sockets.TcpListener]'
    $good=$false
    try {
      foreach ($p in @([int]$candidate,[int]($candidate + 1))) {
        $held.Add((Start-FixtureLoopback -port $p))
      }
      $good=$true
    } catch {
      $base=$_.Exception.GetBaseException()
      if ($base -isnot [Net.Sockets.SocketException]) {throw}
    } finally {
      Stop-AllFixtureListeners -listeners $held
    }
    if ($good) {return [int]$candidate}
  }
  throw 'PORT_FIXTURE_NO_UNOCCUPIED_LOCALHOST_PAIR'
}
function Assert-Fixture([bool]$condition,[string]$category) {
  if (-not $condition) {throw ('PORT_FIXTURE_ASSERT_'+$category)}
}

$candidate=[int](Find-FixturePair)
# This regression used to fail on the original unparenthesized enumeration,
# even though independent localhost binds to the same two ports succeeded.
$pair=@(Select-FfhRunPorts -Identity $null -FakeCandidate {param($attempt) $script:candidate})
Assert-Fixture ($pair.Count -eq 2) 'PAIR_COUNT'
Assert-Fixture ($pair[0] -is [int] -and $pair[1] -is [int]) 'INTEGER_PORTS'
Assert-Fixture ($pair[0] -eq $candidate -and $pair[1] -eq ($candidate + 1)) 'DISTINCT_ADJACENT'
[Console]::Out.WriteLine('PORT-01 PASS')

# After a successful selector probe, both listeners must already be closed.
$successListeners=New-Object 'System.Collections.Generic.List[System.Net.Sockets.TcpListener]'
try {
  $successListeners.Add((Start-FixtureLoopback -port $candidate))
  $successListeners.Add((Start-FixtureLoopback -port ($candidate + 1)))
  Assert-Fixture ($successListeners.Count -eq 2) 'SUCCESS_BOTH_RELEASED'
  [Console]::Out.WriteLine('PORT-02 PASS')
} finally {
  Stop-AllFixtureListeners -listeners $successListeners
}

# Force a live, genuine second-port conflict while bypassing only the
# inventory snapshot (FakeUsedPorts); the production socket branch is real.
# 128 attempts must fail closed, with a sanitized socket-conflict category.
$occupied=Start-FixtureLoopback -port ($candidate + 1)
try {
  $blocked=$false
  try {
    [void]@(Select-FfhRunPorts -Identity $null -FakeCandidate {param($attempt) $script:candidate} -FakeUsedPorts @(1))
  } catch {
    $blocked=$true
    Assert-Fixture ($_.Exception.Message -ceq 'BLOCKED_PORT_SELECTOR_NO_VERIFIED_PAIR CATEGORY=SOCKET_BIND_CONFLICT') 'CONFLICT_CATEGORY'
  }
  Assert-Fixture $blocked 'CONFLICT_DID_NOT_BLOCK'
  [Console]::Out.WriteLine('PORT-03 PASS')

  # The first listener was started before second-port conflict; it must be
  # released on every failed attempt while the external second remains held.
  $first=Start-FixtureLoopback -port $candidate
  try {Assert-Fixture ($null -ne $first) 'CONFLICT_FIRST_PORT_RELEASED'}
  finally {$first.Stop()}
  [Console]::Out.WriteLine('PORT-04 PASS')
} finally {
  $occupied.Stop()
}

# The occupied second port belongs to this fixture only, and is now freed.
$final=Start-FixtureLoopback -port ($candidate + 1)
try {[Console]::Out.WriteLine('PORT-05 PASS')}
finally {$final.Stop()}
