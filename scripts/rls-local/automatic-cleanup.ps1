# FFH-P01 #83: disposable local run lifecycle (Windows PowerShell 5.1).
# No operation is invoked merely by dot-sourcing this file.
Set-StrictMode -Version Latest
$script:FfhLabelCli = 'com.supabase.cli.project'
$script:FfhLabelCompose = 'com.docker.compose.project'
$script:FfhPipe = 'npipe:////./pipe/dockerDesktopLinuxEngine'

function New-FfhRunToken {
  $bytes = New-Object byte[] 12
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
}
function Get-FfhRunIdentity {
  param([string]$SourceSha,[string]$RunToken)
  if ($SourceSha -cnotmatch '^[a-f0-9]{40}$' -or $RunToken -cnotmatch '^[a-f0-9]{24}$') {
    throw 'BLOCKED: invalid full SHA or random run token'
  }
  $project = 'ffhp1_' + $SourceSha.Substring(0,8) + '_' + $RunToken
  if ($project.Length -ne 39) { throw 'BLOCKED: project id truncated' }
  $homePath = [IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  if ($homePath -cnotmatch '^[A-Za-z]:\\' -or
      [IO.DriveInfo]::new($homePath.Substring(0,3)).DriveType -ne [IO.DriveType]::Fixed) {
    throw 'BLOCKED: fixed local user profile required'
  }
  return [pscustomobject]@{
    sha=$SourceSha; token=$RunToken; project=$project
    root=(Join-Path $homePath ('FFH-P01-RLS-Fresh-'+$SourceSha.Substring(0,12)+'-'+$RunToken))
    evidence=(Join-Path $homePath 'FFH-P01-RLS-Evidence')
    container=('supabase_db_'+$project)
  }
}
function Assert-FfhEvidencePath {
  param([Parameter(Mandatory=$true)]$Identity)
  $profile = [IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  if ([IO.Path]::GetFullPath($Identity.evidence) -cne (Join-Path $profile 'FFH-P01-RLS-Evidence') -or
      $Identity.root -notlike (Join-Path $profile 'FFH-P01-RLS-Fresh-*') -or
      $Identity.root -match '(?i)FFH-RLS-Test') { throw 'BLOCKED: evidence/root destination invalid' }
  Assert-FfhNoReparsePath -Path $profile
  if (Test-Path -LiteralPath $Identity.evidence) {
    Assert-FfhNoReparsePath -Path $Identity.evidence
  } else {
    [void](New-Item -ItemType Directory -Path $Identity.evidence -ErrorAction Stop)
    Assert-FfhNoReparsePath -Path $Identity.evidence
  }
}
function Enter-FfhLifecycleLock {
  param($Identity)
  Assert-FfhEvidencePath -Identity $Identity
  $path=Join-Path $Identity.evidence '.ffh-p01.lock'
  try {
    return [IO.FileStream]::new($path,[IO.FileMode]::OpenOrCreate,
      [IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
  } catch { throw 'BLOCKED: concurrent or uncertain lifecycle owner' }
}
function Get-FfhJournalPath {
  param($Identity)
  return Join-Path $Identity.evidence ($Identity.token + '.json')
}
function Write-FfhJournal {
  param($Identity,$Journal)
  Assert-FfhEvidencePath -Identity $Identity
  if ($Journal.sha -cne $Identity.sha -or $Journal.token -cne $Identity.token -or
      $Journal.project -cne $Identity.project) { throw 'BLOCKED: journal identity drift' }
  $dest=Get-FfhJournalPath -Identity $Identity
  $tmp=Join-Path $Identity.evidence ('.'+$Identity.token+'.'+(New-FfhRunToken)+'.tmp')
  $payload=[Text.UTF8Encoding]::new($false).GetBytes(($Journal | ConvertTo-Json -Depth 30))
  $f=$null
  try {
    $f=[IO.FileStream]::new($tmp,[IO.FileMode]::CreateNew,
      [IO.FileAccess]::Write,[IO.FileShare]::None)
    $f.Write($payload,0,$payload.Length)
    $f.Flush($true)
    $f.Dispose();$f=$null
    if (Test-Path -LiteralPath $dest -PathType Leaf) {
      [IO.File]::Replace($tmp,$dest,$null)
    } else {
      [IO.File]::Move($tmp,$dest)
    }
    # Re-read identity and state; interrupted replace never grants permission.
    $check=Get-Content -LiteralPath $dest -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($check.sha -cne $Identity.sha -or $check.token -cne $Identity.token -or
        $check.state -cne $Journal.state -or $check.sequence -ne $Journal.sequence) {
      throw 'BLOCKED: journal readback mismatch'
    }
  } finally {
    if ($null -ne $f) {$f.Dispose()}
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
  }
}
function Read-FfhJournal {
  param($Identity)
  Assert-FfhEvidencePath -Identity $Identity
  $path=Get-FfhJournalPath -Identity $Identity
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'BLOCKED: durable journal missing' }
  $j=Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($j.sha -cne $Identity.sha -or $j.token -cne $Identity.token -or
      $j.project -cne $Identity.project -or $j.version -ne 1 -or
      $j.sequence -lt 0) { throw 'BLOCKED: journal invalid or changed' }
  return $j
}
function Set-FfhRunState {
  param($Identity,[string]$State,[string]$TestResult,[string]$CleanupResult)
  $j=Read-FfhJournal -Identity $Identity
  $j.sequence=[int]$j.sequence+1
  $j.state=$State
  if ($TestResult) {$j.testResult=$TestResult}
  if ($CleanupResult) {$j.cleanupResult=$CleanupResult}
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}
function Assert-FfhNoOtherLiveRuns {
  param($Identity)
  Assert-FfhEvidencePath -Identity $Identity
  foreach ($f in @(Get-ChildItem -LiteralPath $Identity.evidence -Filter '*.json' -File)) {
    if ($f.Name -cnotmatch '^[a-f0-9]{24}\.json$') { continue }
    if ($f.Name -cne ($Identity.token+'.json')) {
      $j=Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($j.cleanupResult -cne 'CLEANUP_VERIFIED') {
        throw 'BLOCKED: previous run retained or stale; read-only manual review'
      }
    }
  }
  $roots=@(Get-ChildItem -LiteralPath (Split-Path $Identity.evidence -Parent) -Directory -Filter 'FFH-P01-RLS-Fresh-*')
  if ($roots.Count) { throw 'BLOCKED: existing temporary root detected; manual review' }
}
function Select-FfhRunPorts {
  param($Identity)
  # Docker may race this probe; a later exact-bind and locality check is mandatory.
  $used=New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($entry in @(Get-NetTCPConnection -ErrorAction Stop)) { [void]$used.Add([int]$entry.LocalPort) }
  foreach ($port in @(54332,54333)) { [void]$used.Add($port) }
  $random=[Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $bytes=New-Object byte[] 4
    for ($attempt=0;$attempt -lt 128;$attempt++) {
      $random.GetBytes($bytes)
      $candidate=20000+([BitConverter]::ToUInt32($bytes,0) % 40000)
      if ($candidate -ge 60000 -or $used.Contains([int]$candidate) -or
          $used.Contains([int]($candidate+1))) { continue }
      $listeners=@()
      try {
        foreach ($p in @($candidate,$candidate+1)) {
          $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,[int]$p)
          $listener.Start()
          $listeners+= $listener
        }
        return @([int]$candidate,[int]($candidate+1))
      } catch { } finally {
        foreach ($listener in $listeners) { $listener.Stop() }
      }
    }
  } finally { $random.Dispose() }
  throw 'BLOCKED: no verified unoccupied port pair'
}
function New-FfhPrecreationJournal {
  param($Identity,$Ports)
  Assert-FfhNoOtherLiveRuns -Identity $Identity
  Assert-FfhPrecreationNamespace -Identity $Identity
  $daemon=Get-FfhObservedDaemon
  $protected=@(Get-FfhProtectedInventory)
  if (Test-Path -LiteralPath (Get-FfhJournalPath -Identity $Identity)) {
    throw 'BLOCKED: run token reused'
  }
  $j=[pscustomobject]@{
    version=1; sha=$Identity.sha; token=$Identity.token; project=$Identity.project
    root=$Identity.root; container=$Identity.container; evidence=$Identity.evidence
    ports=@([int]$Ports[0],[int]$Ports[1]); cliVersion='2.122.0'
    daemon=$daemon; protected=$protected; state='PRECREATION_COMMITTED'; sequence=0
    testResult='NOT_STARTED'; cleanupResult='NOT_ATTEMPTED'
    resources=@(); gates=@(); evidenceSaved=$false
  }
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}
# All supplied arguments must be fixed-format, validated metadata/dry-run arguments.
# This interface permits a fake adapter to be injected for offline fault tests.
function Invoke-FfhDockerRead {
  param([string[]]$Arguments,[scriptblock]$Fake)
  if ($Fake) { return @(& $Fake $Arguments) }
  $binding=Assert-FfhLocalDockerDesktop
  if ($binding.Endpoint -cne $script:FfhPipe) {throw 'BLOCKED: daemon endpoint drift'}
  $command=@('--host',$binding.Endpoint)+@($Arguments)
  $safe=@()
  foreach ($arg in $command) {
    if ([string]$arg -match '[\x00-\x1f"]' -or [string]$arg -match '\\$') {
      throw 'BLOCKED: malformed native read-only argument'
    }
    $safe+= ('"'+[string]$arg+'"')
  }
  $info=[Diagnostics.ProcessStartInfo]::new()
  $info.FileName=$binding.Executable
  $info.Arguments=($safe -join ' ')
  $info.UseShellExecute=$false
  $info.CreateNoWindow=$true
  $info.RedirectStandardOutput=$true
  $info.RedirectStandardError=$true
  $info.WorkingDirectory=[Environment]::GetFolderPath('UserProfile')
  foreach ($key in @($info.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^(?i:DOCKER_)') {
      $info.EnvironmentVariables.Remove($key)
    }
  }
  $info.EnvironmentVariables['DOCKER_HOST']=$script:FfhPipe
  $process=[Diagnostics.Process]::new()
  try {
    $process.StartInfo=$info
    if (-not $process.Start()) { throw 'BLOCKED: Docker metadata process did not start' }
    $stdout=$process.StandardOutput.ReadToEndAsync()
    $stderr=$process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(15000)) {
      try { $process.Kill() } catch {}
      throw 'BLOCKED: bounded metadata read timed out'
    }
    if ($process.ExitCode -ne 0) {throw 'BLOCKED: Docker metadata read returned nonzero'}
    $output=[string]$stdout.Result
    [void]$stderr.Result  # Never print Docker/native stderr.
    if ($output.Length -gt 131072) {throw 'BLOCKED: excessive metadata output'}
    return @($output -split '\r?\n' | Where-Object { $_ -ne '' })
  } finally { $process.Dispose() }
}
function Get-FfhObservedDaemon {
  param([scriptblock]$Fake)
  $id=@(Invoke-FfhDockerRead -Arguments @('info','--format','{{.ID}}') -Fake $Fake)
  if ($id.Count -ne 1 -or [string]::IsNullOrWhiteSpace([string]$id[0])) {
    throw 'BLOCKED: Docker daemon ID unknown'
  }
  return ([string]$id[0]).Trim()
}
function Get-FfhOwnedNames {
  param([string]$Project,[ValidateSet('containers','volumes','networks')]$Kind,[scriptblock]$Fake)
  $filter='label='+$script:FfhLabelCli+'='+$Project
  switch ($Kind) {
    'containers' { $args=@('ps','-a','--no-trunc','--filter',$filter,'--format','{{.ID}}') }
    'volumes' { $args=@('volume','ls','--filter',$filter,'--format','{{.Name}}') }
    'networks' { $args=@('network','ls','--no-trunc','--filter',$filter,'--format','{{.ID}}') }
  }
  return @(Invoke-FfhDockerRead -Arguments $args -Fake $Fake | Where-Object { $_ })
}
function Get-FfhResourceSnapshot {
  param($Identity,[scriptblock]$Fake)
  $result=@()
  foreach ($kind in @('containers','volumes','networks')) {
    foreach ($key in @(Get-FfhOwnedNames -Project $Identity.project -Kind $kind -Fake $Fake)) {
      switch ($kind) {
        'containers' {
          $prefix=@('inspect',[string]$key,'--format')
          $name=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.Name}}')) -Fake $Fake)[0]
          $id=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.Id}}')) -Fake $Fake)[0]
          $labels=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{json .Config.Labels}}')) -Fake $Fake)[0] | ConvertFrom-Json
          $mounts=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{json .Mounts}}')) -Fake $Fake)[0] | ConvertFrom-Json
          $nets=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{json .NetworkSettings.Networks}}')) -Fake $Fake)[0] | ConvertFrom-Json
          $running=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.State.Running}}')) -Fake $Fake)[0]
        }
        'volumes' {
          $prefix=@('volume','inspect',[string]$key,'--format')
          $name=$key;$id=$key
          $labels=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{json .Labels}}')) -Fake $Fake)[0] | ConvertFrom-Json
          $driver=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.Driver}}')) -Fake $Fake)[0]
          if ($driver -cne 'local') {throw 'BLOCKED: untrusted volume driver'}
          $mounts=@();$nets=$null;$running='false'
        }
        'networks' {
          $prefix=@('network','inspect',[string]$key,'--format')
          $name=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.Name}}')) -Fake $Fake)[0]
          $id=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.Id}}')) -Fake $Fake)[0]
          $labels=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{json .Labels}}')) -Fake $Fake)[0] | ConvertFrom-Json
          $driver=@(Invoke-FfhDockerRead -Arguments ($prefix+@('{{.Driver}}')) -Fake $Fake)[0]
          if ($driver -cne 'bridge') {throw 'BLOCKED: untrusted network driver'}
          $mounts=@();$nets=$null;$running='false'
        }
      }
      if ($labels.'com.supabase.cli.project' -cne $Identity.project -or
          $labels.'com.docker.compose.project' -cne $Identity.project -or
          ([string]$name) -notmatch [regex]::Escape($Identity.project) -or
          ([string]$name) -match '(?i)FFH-RLS-Test') {
        throw 'BLOCKED: contradictory or absent resource ownership labels'
      }
      if ($kind -ne 'volumes' -and ([string]$id) -cnotmatch '^[a-f0-9]{64}$') {
        throw 'BLOCKED: unverified exact Docker ID'
      }
      $result+= [pscustomobject]@{kind=$kind; id=[string]$id; name=[string]$name
        running=([string]$running -ceq 'true'); mounts=$mounts; networks=$nets}
    }
  }
  return @($result)
}
function Register-FfhOwnedResources {
  param($Identity,[scriptblock]$Fake)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.state -notin @('PRECREATION_COMMITTED','GATE_A_RUNNING','GATE_A_FAILED','GATE_B_RUNNING','GATE_B_FAILED','GATE_B_COMPLETE','INVENTORY_VERIFIED')) {
    throw 'BLOCKED: journal state does not permit inventory registration'
  }
  $observed=@(Get-FfhResourceSnapshot -Identity $Identity -Fake $Fake)
  # Before creation, an exclusive empty project-namespace check must be recorded.
  if ($j.state -ceq 'PRECREATION_COMMITTED' -and $observed.Count) {
    throw 'BLOCKED: resource exists before creation'
  }
  $old=@($j.resources)
  foreach ($r in $old) {
    if (@($observed | Where-Object { $_.kind -ceq $r.kind -and $_.id -ceq $r.id }).Count -ne 1) {
      throw 'BLOCKED: previously recorded owned resource drift'
    }
  }
  $j.resources=@($observed | ForEach-Object { [pscustomobject]@{kind=$_.kind; id=$_.id; name=$_.name} })
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {
    throw 'BLOCKED: daemon ID changed after precreation journal'
  }
  $j.sequence=[int]$j.sequence+1
  $j.state='INVENTORY_VERIFIED'
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}
function Write-FfhRedactedEvidence {
  param($Identity,[string]$Phase,[string]$Result,[string]$Category)
  $j=Read-FfhJournal -Identity $Identity
  $receipt=[pscustomobject]@{schema=1; sha=$Identity.sha; runToken=$Identity.token
    phase=$Phase; testResult=$Result; failureCategory=$Category
    atUtc=[DateTime]::UtcNow.ToString('o'); project=$Identity.project}
  $dest=Join-Path $Identity.evidence ($Identity.token+'.'+$Phase+'.result.json')
  $temp=$dest+'.tmp-'+(New-FfhRunToken)
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($receipt|ConvertTo-Json -Depth 5))
  $fs=[IO.FileStream]::new($temp,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try { $fs.Write($bytes,0,$bytes.Length);$fs.Flush($true) } finally { $fs.Dispose() }
  [IO.File]::Move($temp,$dest)
  $j.evidenceSaved=$true
  $j.testResult=$Result
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
}
# Strict safety: the adapter never claims the daemon's SQL state from a client exit.
# A separate, independently audited idle attestation must be supplied before deletion.
function Invoke-FfhOwnedCleanup {
  param($Identity,[string]$SqlIdleAttestation,[scriptblock]$Fake)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.state -ceq 'GATE_A_PRESERVED') { return 'PRESERVED_FOR_GATE_B' }
  if ($j.cleanupResult -ceq 'CLEANUP_BLOCKED_MANUAL_REVIEW') { return $j.cleanupResult }
  if (-not $j.evidenceSaved -or $SqlIdleAttestation -cne 'VERIFIED_DAEMON_SQL_IDLE') {
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
    return 'CLEANUP_BLOCKED_MANUAL_REVIEW'
  }
  try {
    if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {
      throw 'BLOCKED: daemon identity changed'
    }
    $observed=@(Get-FfhResourceSnapshot -Identity $Identity -Fake $Fake)
    foreach ($r in $observed) {
      if (@($j.resources | Where-Object { $_.kind -ceq $r.kind -and $_.id -ceq $r.id }).Count -ne 1) {
        throw 'BLOCKED: resource not journalled'
      }
    }
    # Actual removal is deliberately delegated to a separately verified exact-ID adapter.
    # Never delete an unconfirmed resource on the strength of a label alone.
    throw 'BLOCKED: exact-id removal requires independent attachment and filesystem validation'
  } catch {
    [void](Set-FfhRunState -Identity $Identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
    return 'CLEANUP_BLOCKED_MANUAL_REVIEW'
  }
}
