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
  $acl=if ($item.PSIsContainer) {
    [IO.Directory]::GetAccessControl($Path)
  } else {
    [IO.File]::GetAccessControl($Path)
  }
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
  param([string]$Path,[switch]$NewlyCreated)
  $who=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $item=Get-Item -LiteralPath $Path -Force -ErrorAction Stop
  $acl=if ($item.PSIsContainer) {
    [IO.Directory]::GetAccessControl($Path)
  } else {
    [IO.File]::GetAccessControl($Path)
  }
  if (-not $acl.GetOwner([Security.Principal.SecurityIdentifier]).Equals($who)) {
    if (-not $NewlyCreated) {throw 'BLOCKED: preexisting evidence owner differs'}
    # A Windows admin session may initially assign Administrators as owner to
    # a freshly created file. Bind only explicitly just-created evidence to
    # the actual user SID; never take ownership of a preexisting path.
    $acl.SetOwner($who)
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
  if ($item.PSIsContainer) {
    [IO.Directory]::SetAccessControl($Path,$acl)
  } else {
    [IO.File]::SetAccessControl($Path,$acl)
  }
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
    Initialize-FfhPrivateEvidenceAcl -Path $Identity.evidence -NewlyCreated
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
  $backup=Join-Path $Identity.evidence ('.'+$Identity.token+'.'+(New-FfhRunToken)+'.backup')
  $payload=[Text.UTF8Encoding]::new($false).GetBytes(($Journal | ConvertTo-Json -Depth 30))
  $f=$null
  try {
    $f=[IO.FileStream]::new($tmp,[IO.FileMode]::CreateNew,
      [IO.FileAccess]::Write,[IO.FileShare]::None)
    $f.Write($payload,0,$payload.Length)
    $f.Flush($true)
    $f.Dispose();$f=$null
    Initialize-FfhPrivateEvidenceAcl -Path $tmp -NewlyCreated
    if (Test-Path -LiteralPath $dest -PathType Leaf) {
      if (Test-Path -LiteralPath $backup) {throw 'BLOCKED: journal backup already exists'}
      [IO.File]::Replace($tmp,$dest,$backup)
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
    if (Test-Path -LiteralPath $backup -PathType Leaf) {
      Assert-FfhEvidenceEntry -Identity $Identity -Path $backup
      [IO.File]::Delete($backup)
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
      -not ($j.PSObject.Properties.Name -ccontains 'sqlBoundary') -or
      $null -eq $j.sqlBoundary -or
      $j.sqlBoundary.sha -cne $Identity.sha -or
      $j.sqlBoundary.token -cne $Identity.token -or
      $j.sqlBoundary.status -cnotin @('NOT_STARTED','PENDING','ADMITTED','EXECUTING','COMPLETE','REJECTED') -or
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
# Write-through, immutable source/daemon/container identity for each SQL stage.
# No SQL may execute unless EXECUTING was first durably journaled.
function Set-FfhSqlBoundary {
  param(
    [Parameter(Mandatory=$true)]$Identity,
    [ValidateSet('GATE_A','GATE_B')][string]$Phase,
    [ValidateSet('Preflight','Matrix')][string]$Mode,
    [ValidateSet('PENDING','ADMITTED','EXECUTING','COMPLETE','REJECTED')][string]$Status,
    [string]$ContainerId
  )
  $j=Read-FfhJournal -Identity $Identity
  $previous=$j.sqlBoundary
  $requiredGate=if($Phase -ceq 'GATE_A'){$j.gateAResult}else{$j.gateBResult}
  if ($requiredGate -cne 'RUNNING' -or
      $previous.sha -cne $Identity.sha -or $previous.token -cne $Identity.token -or
      $previous.daemon -cne $j.daemon -or
      ($Phase -ceq 'GATE_A' -and $Mode -cne 'Preflight')) {
    throw 'BLOCKED_SQL_BOUNDARY_IDENTITY_OR_GATE_INVALID'
  }
  if ($Status -ceq 'PENDING') {
    if ($previous.status -cnotin @('NOT_STARTED','COMPLETE') -or
        ($Phase -ceq 'GATE_B' -and $Mode -ceq 'Matrix' -and
          ($previous.phase -cne 'GATE_B' -or $previous.mode -cne 'Preflight' -or
            $previous.status -cne 'COMPLETE'))) {
      throw 'BLOCKED_SQL_BOUNDARY_PREVIOUS_STAGE_NOT_COMPLETE'
    }
    $ContainerId=''
  } elseif ($Status -ceq 'REJECTED') {
    if ($previous.phase -cne $Phase -or $previous.mode -cne $Mode -or
        $previous.status -cnotin @('PENDING','ADMITTED')) {
      throw 'BLOCKED_SQL_BOUNDARY_REJECTION_NOT_PENDING'
    }
    $ContainerId=[string]$previous.containerId
  } else {
    $prior= switch ($Status) {
      'ADMITTED' {'PENDING'}
      'EXECUTING' {'ADMITTED'}
      'COMPLETE' {'EXECUTING'}
    }
    if ($previous.phase -cne $Phase -or $previous.mode -cne $Mode -or
        $previous.status -cne $prior -or
        $ContainerId -cnotmatch '^[a-f0-9]{64}$' -or
        ($prior -cne 'PENDING' -and $ContainerId -cne $previous.containerId)) {
      throw 'BLOCKED_SQL_BOUNDARY_INVALID_TRANSITION_OR_CONTAINER'
    }
  }
  $j.sqlBoundary=[pscustomobject]@{
    phase=$Phase;mode=$Mode;status=$Status
    sha=$Identity.sha;token=$Identity.token;daemon=$j.daemon
    containerId=$ContainerId
  }
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}


# No source-loaded invocation performs deletion. Only a SHA-pinned C# adapter
# uses handle-held FileDispositionInfo once the cleanup executor authorizes it.
function Get-FfhOwnedRootNative {
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'BLOCKED_ROOT_WINDOWS_REQUIRED'
  }
  $type='FfhP01OwnedRoot' -as [type]
  if ($null -eq $type) {
    $path=Join-Path $PSScriptRoot 'ffh-owned-root-retire.cs'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      throw 'BLOCKED_ROOT_NATIVE_SOURCE_MISSING'
    }
    Add-Type -Path $path -ErrorAction Stop
    $type='FfhP01OwnedRoot' -as [type]
  }
  if ($null -eq $type) {throw 'BLOCKED_ROOT_NATIVE_TYPE_MISSING'}
  return $type
}
function Get-FfhRootMarker {
  param($Identity)
  return ($Identity.sha+"`n"+$Identity.token+"`n"+$Identity.project+"`n")
}
function Initialize-FfhOwnedRoot {
  param($Identity)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.state -cne 'PRECREATION_COMMITTED' -or $null -ne $j.rootOwnership -or
      @($j.resources).Count -ne 0 -or $j.root -cne $Identity.root) {
    throw 'BLOCKED_ROOT_INITIALIZATION_JOURNAL_INVALID'
  }
  $root=[IO.Path]::GetFullPath($Identity.root)
  $parent=[IO.Path]::GetDirectoryName($root)
  $leaf=[IO.Path]::GetFileName($root)
  Assert-FfhNoReparsePath -Path $root
  if (@(Get-ChildItem -LiteralPath $root -Force).Count) {
    throw 'BLOCKED_ROOT_NOT_NEW_AND_EMPTY'
  }
  Initialize-FfhPrivateEvidenceAcl -Path $root -NewlyCreated
  $marker=Join-Path $root '.ffh-p01-owned-root'
  $payload=[Text.UTF8Encoding]::new($false).GetBytes((Get-FfhRootMarker -Identity $Identity))
  $file=[IO.FileStream]::new($marker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try {$file.Write($payload,0,$payload.Length);$file.Flush($true)}
  finally {$file.Dispose()}
  Initialize-FfhPrivateEvidenceAcl -Path $marker -NewlyCreated
  $native=Get-FfhOwnedRootNative
  $fileId=$native::Inspect($parent,$leaf,(Get-FfhRootMarker -Identity $Identity))
  if ($fileId -cnotmatch '^[a-f0-9]{8}:[a-f0-9]{16}
  param($Identity)
  Assert-FfhEvidencePath -Identity $Identity
  foreach ($file in @(Get-ChildItem -LiteralPath $Identity.evidence -Filter '*.json' -File)) {
    if ($file.Name -cnotmatch '^[a-f0-9]{24}\.json$') { continue }
    if ($file.Name -cne ($Identity.token+'.json')) {
      Assert-FfhEvidenceEntry -Identity $Identity -Path $file.FullName
      $prior=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($prior.version -ne 2 -or $prior.cleanupResult -cne 'CLEANUP_VERIFIED') {
        throw 'BLOCKED: prior run incomplete or legacy journal'
      }
      $old=Get-FfhRunIdentity -SourceSha ([string]$prior.sha) -RunToken ([string]$prior.token)
      if ($prior.root -cne $old.root -or $prior.project -cne $old.project -or
          $prior.rootRetirement.status -cne 'ABSENT_VERIFIED') {
        throw 'BLOCKED: prior root identity or absence journal invalid'
      }
      [void](Test-FfhVerifiedRootAbsent -Identity $old)
    }
  }
  $incomplete=@(Get-ChildItem -LiteralPath $Identity.evidence -Force -File |
    Where-Object { $_.Name -match '^\.[a-f0-9]{24}\.[a-f0-9]{24}\.(tmp|backup)$' })
  if ($incomplete.Count) {throw 'BLOCKED: incomplete journal write residue'}
  $roots=@(Get-ChildItem -LiteralPath (Split-Path $Identity.evidence -Parent) -Directory -Filter 'FFH-P01-RLS-Fresh-*')
  if ($roots.Count) {throw 'BLOCKED: existing fresh root requires manual review'}
}
function Select-FfhRunPorts {
  param($Identity,[scriptblock]$FakeCandidate,[scriptblock]$FakeProbe,[int[]]$FakeUsedPorts)
  # Docker may race this probe; a later exact-bind and locality check is mandatory.
  $used=New-Object 'System.Collections.Generic.HashSet[int]'
  if ($FakeUsedPorts) {
    foreach ($p in $FakeUsedPorts) { [void]$used.Add([int]$p) }
  } else {
    foreach ($entry in @(Get-NetTCPConnection -ErrorAction Stop)) { [void]$used.Add([int]$entry.LocalPort) }
  }
  foreach ($port in @(54332,54333)) { [void]$used.Add($port) }
  $random=[Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $bytes=New-Object byte[] 4
    for ($attempt=0;$attempt -lt 128;$attempt++) {
      $random.GetBytes($bytes)
      $candidate=20000+([BitConverter]::ToUInt32($bytes,0) % 40000)
      if ($FakeCandidate) { $candidate=[int](& $FakeCandidate $attempt) }
      if ($candidate -gt 59998 -or $used.Contains([int]$candidate) -or
          $used.Contains([int]($candidate+1))) { continue }
      if ($FakeProbe) {
        if ([bool](& $FakeProbe $candidate ([int]($candidate+1)))) {
          return @([int]$candidate,[int]($candidate+1))
        }
        continue
      }
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
  param($Identity,$Ports,[scriptblock]$Fake)
  Assert-FfhNoOtherLiveRuns -Identity $Identity
  Assert-FfhPrecreationNamespace -Identity $Identity -Fake $Fake
  $daemon=Get-FfhObservedDaemon -Fake $Fake
  $protected=@(Get-FfhProtectedInventory -Fake $Fake)
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
    sqlBoundary=[pscustomobject]@{phase='NONE';mode='NONE';status='NOT_STARTED';
      sha=$Identity.sha;token=$Identity.token;containerId='';daemon=$daemon}
    resources=@(); gates=@(); evidenceSaved=$false
    rootOwnership=$null;rootRetirement=[pscustomobject]@{status='NOT_STARTED';fileId='';atUtc=''}
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
  Initialize-FfhPrivateEvidenceAcl -Path $temp -NewlyCreated
  [IO.File]::Move($temp,$dest)
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest
  if ($Phase -ceq 'GATE_A') { $j.gateAResult=$Result } else { $j.gateBResult=$Result }
  $j.evidenceSaved=$true
  $j.testResult=$Result
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
}
# Exact verified retirement is exclusively implemented by cleanup-executor.ps1.
) {
    throw 'BLOCKED_ROOT_IDENTITY_INVALID'
  }
  $j.rootOwnership=[pscustomobject]@{fileId=$fileId;markerVersion=1}
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  if ((Read-FfhJournal -Identity $Identity).rootOwnership.fileId -cne $fileId) {
    throw 'BLOCKED_ROOT_IDENTITY_READBACK'
  }
}
function Assert-FfhNoOtherLiveRuns {
  param($Identity)
  Assert-FfhEvidencePath -Identity $Identity
  foreach ($file in @(Get-ChildItem -LiteralPath $Identity.evidence -Filter '*.json' -File)) {
    if ($file.Name -cnotmatch '^[a-f0-9]{24}\.json$') { continue }
    if ($file.Name -cne ($Identity.token+'.json')) {
      Assert-FfhEvidenceEntry -Identity $Identity -Path $file.FullName
      $prior=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($prior.version -ne 2 -or $prior.cleanupResult -cne 'CLEANUP_VERIFIED') {
        throw 'BLOCKED: prior run incomplete or legacy journal'
      }
    }
  }
  $incomplete=@(Get-ChildItem -LiteralPath $Identity.evidence -Force -File |
    Where-Object { $_.Name -match '^\.[a-f0-9]{24}\.[a-f0-9]{24}\.(tmp|backup)$' })
  if ($incomplete.Count) {throw 'BLOCKED: incomplete journal write residue'}
  $roots=@(Get-ChildItem -LiteralPath (Split-Path $Identity.evidence -Parent) -Directory -Filter 'FFH-P01-RLS-Fresh-*')
  if ($roots.Count) {throw 'BLOCKED: existing fresh root requires manual review'}
}
function Select-FfhRunPorts {
  param($Identity,[scriptblock]$FakeCandidate,[scriptblock]$FakeProbe,[int[]]$FakeUsedPorts)
  # Docker may race this probe; a later exact-bind and locality check is mandatory.
  $used=New-Object 'System.Collections.Generic.HashSet[int]'
  if ($FakeUsedPorts) {
    foreach ($p in $FakeUsedPorts) { [void]$used.Add([int]$p) }
  } else {
    foreach ($entry in @(Get-NetTCPConnection -ErrorAction Stop)) { [void]$used.Add([int]$entry.LocalPort) }
  }
  foreach ($port in @(54332,54333)) { [void]$used.Add($port) }
  $random=[Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $bytes=New-Object byte[] 4
    for ($attempt=0;$attempt -lt 128;$attempt++) {
      $random.GetBytes($bytes)
      $candidate=20000+([BitConverter]::ToUInt32($bytes,0) % 40000)
      if ($FakeCandidate) { $candidate=[int](& $FakeCandidate $attempt) }
      if ($candidate -gt 59998 -or $used.Contains([int]$candidate) -or
          $used.Contains([int]($candidate+1))) { continue }
      if ($FakeProbe) {
        if ([bool](& $FakeProbe $candidate ([int]($candidate+1)))) {
          return @([int]$candidate,[int]($candidate+1))
        }
        continue
      }
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
  param($Identity,$Ports,[scriptblock]$Fake)
  Assert-FfhNoOtherLiveRuns -Identity $Identity
  Assert-FfhPrecreationNamespace -Identity $Identity -Fake $Fake
  $daemon=Get-FfhObservedDaemon -Fake $Fake
  $protected=@(Get-FfhProtectedInventory -Fake $Fake)
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
    sqlBoundary=[pscustomobject]@{phase='NONE';mode='NONE';status='NOT_STARTED';
      sha=$Identity.sha;token=$Identity.token;containerId='';daemon=$daemon}
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
  Initialize-FfhPrivateEvidenceAcl -Path $temp -NewlyCreated
  [IO.File]::Move($temp,$dest)
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest
  if ($Phase -ceq 'GATE_A') { $j.gateAResult=$Result } else { $j.gateBResult=$Result }
  $j.evidenceSaved=$true
  $j.testResult=$Result
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
}
# Exact verified retirement is exclusively implemented by cleanup-executor.ps1.
