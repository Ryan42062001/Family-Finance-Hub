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
# Evidence is a security boundary: never read or write a shared/inherited DACL.
function Assert-FfhPrivateEvidenceAcl {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { throw 'BLOCKED: evidence entry absent' }
  Assert-FfhNoReparsePath -Path $Path
  $item=Get-Item -LiteralPath $Path -Force -ErrorAction Stop
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'BLOCKED: evidence entry reparse point'
  }
  $acl=Get-Acl -LiteralPath $Path -ErrorAction Stop
  $who=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $owner=$acl.GetOwner([Security.Principal.SecurityIdentifier])
  if (-not $owner.Equals($who) -or -not $acl.AreAccessRulesProtected) {
    throw 'BLOCKED: evidence ACL owner or inheritance unsafe'
  }
  $allowed=@($who.Value,'S-1-5-18','S-1-5-32-544')
  foreach ($rule in $acl.GetAccessRules($true,$false,[Security.Principal.SecurityIdentifier])) {
    if ($allowed -cnotcontains $rule.IdentityReference.Value) {
      throw 'BLOCKED: evidence ACL contains foreign access principal'
    }
    if ($rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow) {
      throw 'BLOCKED: evidence ACL contains ambiguous deny entry'
    }
  }
}
function Initialize-FfhPrivateEvidenceAcl {
  param([string]$Path)
  $who=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl=Get-Acl -LiteralPath $Path -ErrorAction Stop
  if (-not $acl.GetOwner([Security.Principal.SecurityIdentifier]).Equals($who)) {
    throw 'BLOCKED: evidence path owner is not current user'
  }
  $acl.SetAccessRuleProtection($true,$false)
  foreach($rule in @($acl.GetAccessRules($true,$false,[Security.Principal.SecurityIdentifier]))) {
    [void]$acl.RemoveAccessRuleSpecific($rule)
  }
  foreach($sid in @($who.Value,'S-1-5-18','S-1-5-32-544')) {
    $rights=[Security.AccessControl.FileSystemRights]::FullControl
    $inherit=[Security.AccessControl.InheritanceFlags]::None
    if ((Get-Item -LiteralPath $Path -Force).PSIsContainer) {
      $inherit=[Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
        [Security.AccessControl.InheritanceFlags]::ObjectInherit
    }
    $newRule=[Security.AccessControl.FileSystemAccessRule]::new(
      [Security.Principal.SecurityIdentifier]::new($sid),$rights,$inherit,
      [Security.AccessControl.PropagationFlags]::None,
      [Security.AccessControl.AccessControlType]::Allow)
    $acl.AddAccessRule($newRule)
  }
  Set-Acl -LiteralPath $Path -AclObject $acl -ErrorAction Stop
  Assert-FfhPrivateEvidenceAcl -Path $Path
}
function Assert-FfhEvidenceEntry {
  param($Identity,[string]$Path,[switch]$Optional)
  Assert-FfhEvidencePath -Identity $Identity
  $expected=[IO.Path]::GetFullPath($Path)
  if (-not ([IO.Path]::GetDirectoryName($expected)).Equals(
    [IO.Path]::GetFullPath($Identity.evidence),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: evidence entry outside isolated directory'
  }
  if (-not (Test-Path -LiteralPath $expected -PathType Leaf)) {
    if ($Optional) { return }
    throw 'BLOCKED: evidence entry missing'
  }
  Assert-FfhPrivateEvidenceAcl -Path $expected
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
    Initialize-FfhPrivateEvidenceAcl -Path $Identity.evidence
  }
  Assert-FfhPrivateEvidenceAcl -Path $Identity.evidence
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
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest -Optional
  $tmp=Join-Path $Identity.evidence ('.'+$Identity.token+'.'+(New-FfhRunToken)+'.tmp')
  $payload=[Text.UTF8Encoding]::new($false).GetBytes(($Journal | ConvertTo-Json -Depth 30))
  $f=$null
  try {
    $f=[IO.FileStream]::new($tmp,[IO.FileMode]::CreateNew,
      [IO.FileAccess]::Write,[IO.FileShare]::None)
    $f.Write($payload,0,$payload.Length)
    $f.Flush($true)
    $f.Dispose();$f=$null
    Initialize-FfhPrivateEvidenceAcl -Path $tmp
    if (Test-Path -LiteralPath $dest -PathType Leaf) {
      [IO.File]::Replace($tmp,$dest,$null)
    } else {
      [IO.File]::Move($tmp,$dest)
    }
    Assert-FfhEvidenceEntry -Identity $Identity -Path $dest
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
  Assert-FfhEvidenceEntry -Identity $Identity -Path $path
  $j=Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($j.sha -cne $Identity.sha -or $j.token -cne $Identity.token -or
      $j.project -cne $Identity.project -or $j.version -ne 2 -or
      -not ($j.PSObject.Properties.Name -ccontains 'gateAResult') -or
      -not ($j.PSObject.Properties.Name -ccontains 'gateBResult') -or
      $j.gateAResult -cnotin @('NOT_STARTED','RUNNING','PASS','FAIL','UNKNOWN') -or
      $j.gateBResult -cnotin @('NOT_STARTED','RUNNING','PASS','FAIL','UNKNOWN') -or
      $j.sequence -lt 0) { throw 'BLOCKED: journal invalid or changed' }
  return $j
}
function Set-FfhRunState {
  param($Identity,[string]$State,[string]$TestResult,[string]$CleanupResult,
    [string]$GateAResult,[string]$GateBResult)
  $j=Read-FfhJournal -Identity $Identity
  $j.sequence=[int]$j.sequence+1
  $j.state=$State
  if ($TestResult) {$j.testResult=$TestResult}
  if ($GateAResult) {
    if ($GateAResult -cnotin @('RUNNING','PASS','FAIL','UNKNOWN')) {
      throw 'BLOCKED: invalid Gate A result'
    }
    if ($j.gateAResult -ceq 'PASS' -and $GateAResult -cne 'PASS') {
      throw 'BLOCKED: committed Gate A PASS immutable'
    }
    $j.gateAResult=$GateAResult
  }
  if ($GateBResult) {
    if ($GateBResult -cnotin @('RUNNING','PASS','FAIL','UNKNOWN')) {
      throw 'BLOCKED: invalid Gate B result'
    }
    if ($j.gateBResult -ceq 'PASS' -and $GateBResult -cne 'PASS') {
      throw 'BLOCKED: committed Gate B PASS immutable'
    }
    $j.gateBResult=$GateBResult
  }
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
      Assert-FfhEvidenceEntry -Identity $Identity -Path $f.FullName
      $j=Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($j.version -ne 2 -or $j.cleanupResult -cne 'CLEANUP_VERIFIED') {
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
      if ($candidate -gt 59998 -or $used.Contains([int]$candidate) -or
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
    version=2; sha=$Identity.sha; token=$Identity.token; project=$Identity.project
    root=$Identity.root; container=$Identity.container; evidence=$Identity.evidence
    ports=@([int]$Ports[0],[int]$Ports[1]); cliVersion='2.122.0'
    daemon=$daemon; protected=$protected; state='PRECREATION_COMMITTED'; sequence=0
    gateAResult='NOT_STARTED'; gateBResult='NOT_STARTED'
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
  if ($Phase -cnotin @('GATE_A','GATE_B') -or
      $Result -cnotin @('PASS','FAIL','UNKNOWN') -or
      $Category -cnotmatch '^[A-Z0-9_]{1,60}$') {
    throw 'BLOCKED: redacted evidence category invalid'
  }
  if ($Phase -ceq 'GATE_A' -and $j.gateAResult -ceq 'PASS' -and $Result -cne 'PASS') {
    throw 'BLOCKED: Gate A PASS immutable'
  }
  if ($Phase -ceq 'GATE_B' -and $j.gateBResult -ceq 'PASS' -and $Result -cne 'PASS') {
    throw 'BLOCKED: Gate B PASS immutable'
  }
  $receipt=[pscustomobject]@{
    schema=2; sha=$Identity.sha; runToken=$Identity.token
    phase=$Phase; testResult=$Result; failureCategory=$Category
    atUtc=[DateTime]::UtcNow.ToString('o'); project=$Identity.project
  }
  $dest=Join-Path $Identity.evidence ($Identity.token+'.'+$Phase+'.result.json')
  $temp=$dest+'.tmp-'+(New-FfhRunToken)
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($receipt | ConvertTo-Json -Depth 5))
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest -Optional
  if (Test-Path -LiteralPath $dest) { throw 'BLOCKED: gate evidence already exists' }
  $fs=[IO.FileStream]::new($temp,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try { $fs.Write($bytes,0,$bytes.Length); $fs.Flush($true) } finally { $fs.Dispose() }
  Initialize-FfhPrivateEvidenceAcl -Path $temp
  [IO.File]::Move($temp,$dest)
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest
  if ($Phase -ceq 'GATE_A') { $j.gateAResult=$Result } else { $j.gateBResult=$Result }
  $j.evidenceSaved=$true
  $j.testResult=$Result
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
}
# Exact verified retirement is exclusively implemented by cleanup-executor.ps1.
