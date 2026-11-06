# FFH-P01 #83: one-shot NONFORMAL diagnostic guards. Dot-source only.
# Does not execute Gate A/B, reset migrations, or authorize hosted operations.
Set-StrictMode -Version Latest
$script:FfhDiagnosticGo='FFH-P01-ONE-SHOT-DIAGNOSTIC-GO'

function Resolve-FfhDiagnosticCachedCli {
  param([string]$CliExecutable,[string]$CliSha256,[scriptblock]$FakeVersion)
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'BLOCKED_DIAG_WINDOWS_ONLY'
  }
  $home=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $local=[IO.Path]::GetFullPath([Environment]::GetFolderPath('LocalApplicationData')).TrimEnd('\')
  $cache=[IO.Path]::GetFullPath((Join-Path $local 'npm-cache\_npx')).TrimEnd('\')
  if (-not $CliExecutable) {
    # No npx/npm installation or invocation. Only already extracted CLI binaries.
    $candidates=@()
    if (Test-Path -LiteralPath $cache -PathType Container) {
      foreach($dir in @(Get-ChildItem -LiteralPath $cache -Directory -Force)) {
        if ($dir.Name -notmatch '^[a-f0-9]{8,64}$') {continue}
        $candidate=Join-Path $dir.FullName 'node_modules\supabase\bin\supabase.exe'
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {$candidates+= $candidate}
      }
    }
    if ($candidates.Count -ne 1) {throw 'BLOCKED_DIAG_PINNED_CACHE_EXE_MISSING_OR_AMBIGUOUS'}
    $CliExecutable=$candidates[0]
  }
  $exe=[IO.Path]::GetFullPath($CliExecutable)
  # A caller-chosen path cannot grant arbitrary code execution. Must be in the
  # known existing per-user npm _npx package cache with exact package layout.
  if (-not $exe.StartsWith(($cache+'\'),[StringComparison]::OrdinalIgnoreCase) -or
      $exe -cnotmatch '(?i)\\_npx\\[a-f0-9]{8,64}\\node_modules\\supabase\\bin\\supabase\.exe$' -or
      -not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw 'BLOCKED_DIAG_CLI_LOCATION_UNTRUSTED'
  }
  Assert-FfhNoReparsePath -Path $exe
  $package=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($exe)) '..\package.json'))
  if (-not (Test-Path -LiteralPath $package -PathType Leaf)) {
    throw 'BLOCKED_DIAG_CLI_PACKAGE_MISSING'
  }
  Assert-FfhNoReparsePath -Path $package
  $metadata=Get-Content -LiteralPath $package -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($metadata.name -cne 'supabase' -or $metadata.version -cne '2.122.0') {
    throw 'BLOCKED_DIAG_CLI_PACKAGE_VERSION'
  }
  $observedHash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($CliSha256 -and ($CliSha256 -cnotmatch '^[a-f0-9]{64}$' -or
      $CliSha256 -cne $observedHash)) {throw 'BLOCKED_DIAG_CLI_HASH_DRIFT'}
  if ($FakeVersion) {
    if (@(& $FakeVersion $exe).Count -ne 1 -or
        (& $FakeVersion $exe) -cne '2.122.0') {throw 'BLOCKED_DIAG_CLI_VERSION'}
  } else {
    $p=[Diagnostics.ProcessStartInfo]::new()
    $p.FileName=$exe;$p.Arguments='--version'
    $p.WorkingDirectory=$home;$p.UseShellExecute=$false;$p.CreateNoWindow=$true
    foreach ($key in @($p.EnvironmentVariables.Keys)) {
      if ([string]$key -match '^(?i:DOCKER_)') {$p.EnvironmentVariables.Remove($key)}
    }
    $p.EnvironmentVariables['DOCKER_HOST']='npipe:////./pipe/dockerDesktopLinuxEngine'
    if ((Invoke-FfhNativeJobChild -StartInfo $p -VersionProbe) -cne 'EXIT_ZERO') {
      throw 'BLOCKED_DIAG_CLI_VERSION'
    }
  }
  return [pscustomobject]@{Path=$exe;Sha256=$observedHash;Version='2.122.0'}
}

function Assert-FfhDiagnosticNoPriorAttempt {
  param($Identity,[scriptblock]$Fake)
  $profile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  if (@(Get-ChildItem -LiteralPath $profile -Directory -Filter 'FFH-P01-RLS-Fresh-*').Count) {
    throw 'BLOCKED_DIAG_PRIOR_ROOT_PRESENT'
  }
  $e=$Identity.evidence
  if (Test-Path -LiteralPath $e) {
    Assert-FfhPrivateEvidenceAcl -Path $e
    if (Test-Path -LiteralPath (Join-Path $e '.ffh-p01-one-shot-diagnostic.json')) {
      throw 'BLOCKED_DIAG_ONE_SHOT_ALREADY_CONSUMED'
    }
    if (@(Get-ChildItem -LiteralPath $e -File -Filter '*.json').Count) {
      throw 'BLOCKED_DIAG_EXISTING_JOURNAL_REQUIRES_REVIEW'
    }
    if (@(Get-ChildItem -LiteralPath $e -Force -File |
      Where-Object { $_.Name -match '^\.[a-f0-9]{24}\.[a-f0-9]{24}\.(tmp|backup)$' }).Count) {
      throw 'BLOCKED_DIAG_JOURNAL_RESIDUE'
    }
  }
  Assert-FfhPrecreationNamespace -Identity $Identity -Fake $Fake
  # CLI-only labels are insufficient: detect Compose-only project name too.
  Assert-FfhDiagnosticLabelBijection -Identity $Identity -Fake $Fake -ExpectEmpty
}
function Get-FfhDiagnosticLabelledNames {
  param($Identity,[ValidateSet('containers','volumes','networks')]$Kind,
    [ValidateSet('cli','compose')][string]$Label,[scriptblock]$Fake)
  $key=if($Label -ceq 'cli'){'com.supabase.cli.project'}else{'com.docker.compose.project'}
  $filter='label='+$key+'='+$Identity.project
  switch ($Kind) {
    'containers' {$args=@('ps','-a','--no-trunc','--filter',$filter,'--format','{{.ID}}')}
    'volumes' {$args=@('volume','ls','--filter',$filter,'--format','{{.Name}}')}
    'networks' {$args=@('network','ls','--no-trunc','--filter',$filter,'--format','{{.ID}}')}
  }
  return @(Invoke-FfhDockerRead -Arguments $args -Fake $Fake)
}
function Assert-FfhDiagnosticLabelBijection {
  param($Identity,[scriptblock]$Fake,[switch]$ExpectEmpty)
  $results=@()
  foreach($kind in @('containers','volumes','networks')) {
    $cli=@(Get-FfhDiagnosticLabelledNames -Identity $Identity -Kind $kind -Label cli -Fake $Fake | Sort-Object)
    $compose=@(Get-FfhDiagnosticLabelledNames -Identity $Identity -Kind $kind -Label compose -Fake $Fake | Sort-Object)
    if (($cli -join '|') -cne ($compose -join '|') -or
        @($cli | Select-Object -Unique).Count -ne $cli.Count) {
      throw 'BLOCKED_DIAG_DUAL_LABEL_SET_DRIFT'
    }
    if ($ExpectEmpty -and $cli.Count) {throw 'BLOCKED_DIAG_PREEXISTING_PROJECT_RESOURCE'}
    foreach ($id in $cli) {$results+= [pscustomobject]@{kind=$kind;id=[string]$id}}
  }
  return @($results)
}
function Assert-FfhDiagnosticInventory {
  param($Identity,$Journal,[scriptblock]$Fake)
  if ($Journal.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $Journal.sqlBoundary.status -cne 'NOT_STARTED' -or
      $Journal.gateAResult -cne 'NOT_STARTED' -or
      $Journal.gateBResult -cne 'NOT_STARTED') {
    throw 'BLOCKED_DIAG_FORMAL_GATE_JOURNAL_CONTAMINATION'
  }
  $dual=@(Assert-FfhDiagnosticLabelBijection -Identity $Identity -Fake $Fake)
  $owned=@(Assert-FfhExactInventory -Identity $Identity -Journal $Journal -Fake $Fake)
  if ($dual.Count -ne $owned.Count) {throw 'BLOCKED_DIAG_LABEL_INVENTORY_MISMATCH'}
  foreach($r in $dual) {
    if (@($owned | Where-Object { $_.kind -ceq $r.kind -and $_.id -ceq $r.id -and
      $_.name -notmatch '(?i)FFH-RLS-Test' }).Count -ne 1) {
      throw 'BLOCKED_DIAG_LABEL_KIND_OR_ID_DRIFT'
    }
  }
  return @($owned)
}
function Assert-FfhDiagnosticDatabase {
  param($Identity,$Journal,[scriptblock]$Fake,[switch]$AllowStopped)
  $resources=@(Assert-FfhDiagnosticInventory -Identity $Identity -Journal $Journal -Fake $Fake)
  $db=@($resources | Where-Object { $_.kind -ceq 'containers' })
  if ($db.Count -ne 1 -or
      $db[0].name -cne ('/'+$Identity.container) -or
      $db[0].id -cnotmatch '^[a-f0-9]{64}$') {
    throw 'BLOCKED_DIAG_CONTAINER_CARDINALITY_OR_ID'
  }
  $cid=[string]$db[0].id
  $raw=@(Invoke-FfhDockerRead -Arguments @('inspect',$cid,'--format','{{json .State}}') -Fake $Fake)
  $bindings=@(Invoke-FfhDockerRead -Arguments @('inspect',$cid,'--format','{{json .NetworkSettings.Ports}}') -Fake $Fake)
  if ($raw.Count -ne 1 -or $bindings.Count -ne 1) {throw 'BLOCKED_DIAG_CONTAINER_INSPECT'}
  try {$state=([string]$raw[0] | ConvertFrom-Json);$ports=([string]$bindings[0] | ConvertFrom-Json)}
  catch {throw 'BLOCKED_DIAG_CONTAINER_INSPECT_JSON'}
  if (-not $state.Running) {
    if ($AllowStopped) {return $cid}
    throw 'BLOCKED_DIAG_CONTAINER_NOT_RUNNING'
  }
  if ($state.Health.Status -cne 'healthy') {throw 'BLOCKED_DIAG_DB_NOT_HEALTHY'}
  $portProperties=@($ports.PSObject.Properties)
  foreach($p in $portProperties) {
    $live=@($p.Value | Where-Object { $null -ne $_ })
    if ($p.Name -cne '5432/tcp' -and $live.Count) {throw 'BLOCKED_DIAG_OTHER_PUBLISHED_PORT'}
  }
  $dbports=@($ports.'5432/tcp' | Where-Object { $null -ne $_ })
  if ($dbports.Count -lt 1 -or $dbports.Count -gt 2) {throw 'BLOCKED_DIAG_DB_PORT_COUNT'}
  foreach($item in $dbports) {
    if ([string]$item.HostIp -cnotin @('127.0.0.1','::1') -or
        [string]$item.HostPort -cne [string]$Journal.ports[0]) {
      throw 'BLOCKED_DIAG_NONLOCAL_OR_DRIFTED_PORT'
    }
  }
  return $cid
}
function Get-FfhDiagnosticSqlIdle {
  param($Identity,$Journal,[scriptblock]$Fake)
  if ($Journal.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $Journal.sqlBoundary.status -cne 'NOT_STARTED' -or
      $Journal.gateAResult -cne 'NOT_STARTED' -or
      $Journal.gateBResult -cne 'NOT_STARTED' -or
      $Journal.diagnosticStatus -cnotin @('START_VERIFIED','CLEANUP_RUNNING')) {
    throw 'BLOCKED_DIAG_IDLE_STATE_INVALID'
  }
  $cid=Assert-FfhDiagnosticDatabase -Identity $Identity -Journal $Journal -Fake $Fake
  $sql="SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()"
  $v=@(Invoke-FfhDockerRead -Arguments @('exec','-i',$cid,'psql','-U','postgres','-d','postgres','-t','-A','-c',$sql) -Fake $Fake)
  if ($v.Count -ne 1 -or ([string]$v[0]).Trim() -cne '0') {
    throw 'BLOCKED_DIAG_SQL_IDLE_UNKNOWN'
  }
  if ((Get-FfhObservedDaemon -Fake $Fake) -cne $Journal.daemon) {
    throw 'BLOCKED_DIAG_DAEMON_DRIFT'
  }
  Confirm-FfhBaseline -Journal $Journal -Fake $Fake
  return $cid
}
function Write-FfhDiagnosticReceipt {
  param($Identity,$Journal,[ValidateSet('TEST','FINAL')][string]$Stage,
    [string]$Category)
  if ($Journal.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $Category -cnotmatch '^[A-Z0-9_]{1,55}$') {throw 'BLOCKED_DIAG_RECEIPT_INVALID'}
  $dest=Join-Path $Identity.evidence ($Identity.token+'.DIAG_'+$Stage+'.json')
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest -Optional
  if (Test-Path -LiteralPath $dest) {throw 'BLOCKED_DIAG_RECEIPT_ALREADY_EXISTS'}
  $receipt=[ordered]@{
    schema=1;kind='ONE_SHOT_DIAGNOSTIC';sourceSha=$Identity.sha
    runToken=$Identity.token;stage=$Stage
    testResult=$Journal.testResult;cleanupResult=$Journal.cleanupResult
    category=$Category;atUtc=[DateTime]::UtcNow.ToString('o')
    gateA='NOT_STARTED';gateB='NOT_STARTED'
  }
  $tmp=$dest+'.tmp-'+(New-FfhRunToken)
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($receipt | ConvertTo-Json -Depth 5))
  $fs=[IO.FileStream]::new($tmp,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try {$fs.Write($bytes,0,$bytes.Length);$fs.Flush($true)} finally {$fs.Dispose()}
  Initialize-FfhPrivateEvidenceAcl -Path $tmp -NewlyCreated
  [IO.File]::Move($tmp,$dest)
  Assert-FfhEvidenceEntry -Identity $Identity -Path $dest
  return $dest
}
function Set-FfhDiagnosticJournal {
  param($Identity,[string]$Status,[string]$TestResult,[string]$CleanupResult)
  $j=Read-FfhJournal -Identity $Identity
  $transitions=@{
    PRECREATION_COMMITTED=@('ROOT_CREATED')
    ROOT_CREATED=@('START_IN_FLIGHT')
    START_IN_FLIGHT=@('START_VERIFIED')
    START_VERIFIED=@('CLEANUP_RUNNING')
    CLEANUP_RUNNING=@('CLEANUP_VERIFIED')
  }
  if ($j.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $j.sqlBoundary.status -cne 'NOT_STARTED' -or
      $j.gateAResult -cne 'NOT_STARTED' -or
      $j.gateBResult -cne 'NOT_STARTED' -or
      $Status -cnotin @($transitions[[string]$j.diagnosticStatus])) {
    throw 'BLOCKED_DIAG_INVALID_STATE_TRANSITION'
  }
  $j.diagnosticStatus=$Status;$j.state='DIAG_'+$Status
  if ($TestResult) {$j.testResult=$TestResult}
  if ($CleanupResult) {$j.cleanupResult=$CleanupResult}
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}
function Invoke-FfhDiagnosticCleanup {
  param($Identity,[scriptblock]$Fake,[scriptblock]$FakeFilesystem)
  # Caller must have already persisted TEST receipt. No formal Gate A/B path.
  $j=Read-FfhJournal -Identity $Identity
  if ($j.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $j.diagnosticStatus -cne 'START_VERIFIED' -or
      $j.testResult -cne 'PASS' -or
      -not $j.evidenceSaved -or
      $j.rootRetirement.status -cne 'NOT_STARTED' -or
      $j.sqlBoundary.status -cne 'NOT_STARTED') {
    throw 'BLOCKED_DIAG_CLEANUP_ADMISSION_INVALID'
  }
  [void](Assert-FfhOwnedRootPreflight -Identity $Identity -Journal $j -FakeFilesystem $FakeFilesystem)
  $cid=Get-FfhDiagnosticSqlIdle -Identity $Identity -Journal $j -Fake $Fake
  $j=Set-FfhDiagnosticJournal -Identity $Identity -Status CLEANUP_RUNNING -CleanupResult CLEANUP_PENDING
  # A second independent idle attestation before first destructive Docker action.
  if ((Get-FfhDiagnosticSqlIdle -Identity $Identity -Journal $j -Fake $Fake) -cne $cid) {
    throw 'BLOCKED_DIAG_SQL_IDLE_CHANGED'
  }
  $db=@($j.resources | Where-Object { $_.kind -ceq 'containers' })
  if ($db.Count -ne 1 -or $db[0].id -cne $cid) {throw 'BLOCKED_DIAG_DOCKER_IDENTITY_CHANGED'}
  # Any ambiguous stop/timeout: no blind rm and no retry.
  $j.state='DIAG_MUTATION_IN_FLIGHT';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  Invoke-FfhExactDockerCommand -Arguments @('stop','--time=-1',$cid) -Fake $Fake
  $j=Read-FfhJournal -Identity $Identity
  $j.state='DIAG_CLEANUP_RUNNING';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  $verified=@(Assert-FfhDiagnosticInventory -Identity $Identity -Journal $j -Fake $Fake)
  $stopped=@($verified | Where-Object { $_.kind -ceq 'containers' })
  if ($stopped.Count -ne 1 -or $stopped[0].id -cne $cid -or $stopped[0].running) {
    throw 'BLOCKED_DIAG_STOP_NOT_VERIFIED'
  }
  foreach($kind in @('containers','volumes','networks')) {
    foreach ($r in @($j.resources | Where-Object { $_.kind -ceq $kind })) {
      $before=@(Assert-FfhDiagnosticInventory -Identity $Identity -Journal $j -Fake $Fake)
      $matching=@($before | Where-Object { $_.kind -ceq $kind -and $_.id -ceq $r.id -and $_.name -ceq $r.name })
      if ($matching.Count -ne 1 -or ($kind -ceq 'containers' -and $matching[0].running)) {
        throw 'BLOCKED_DIAG_RESOURCE_DRIFT_BEFORE_DELETE'
      }
      Confirm-FfhBaseline -Journal $j -Fake $Fake
      if ((Get-FfhObservedDaemon -Fake $Fake) -cne $j.daemon) {throw 'BLOCKED_DIAG_DAEMON_DRIFT'}
      $arguments=switch($kind) {
        'containers' {@('rm',$r.id)}
        'volumes' {@('volume','rm',$r.name)}
        'networks' {@('network','rm',$r.id)}
      }
      $j.state='DIAG_MUTATION_IN_FLIGHT';$j.sequence=[int]$j.sequence+1
      Write-FfhJournal -Identity $Identity -Journal $j
      Invoke-FfhExactDockerCommand -Arguments $arguments -Fake $Fake
      $probe=if ($kind -ceq 'volumes') {$r.name} else {$r.id}
      Test-FfhExactAbsent -Kind $kind -Id $probe -Fake $Fake
      $j=Read-FfhJournal -Identity $Identity
      $j.resources=@($j.resources | Where-Object {
        -not ($_.kind -ceq $r.kind -and $_.id -ceq $r.id -and $_.name -ceq $r.name)
      })
      $j.state='DIAG_CLEANUP_RUNNING';$j.sequence=[int]$j.sequence+1
      Write-FfhJournal -Identity $Identity -Journal $j
    }
  }
  if (@(Assert-FfhDiagnosticInventory -Identity $Identity -Journal $j -Fake $Fake).Count -ne 0) {
    throw 'BLOCKED_DIAG_RESIDUAL_DOCKER_RESOURCES'
  }
  Assert-FfhPrecreationNamespace -Identity $Identity -Fake $Fake
  Confirm-FfhBaseline -Journal $j -Fake $Fake
  # Existing immutable Win32/native implementation requires CLEANUP_RUNNING.
  # This state is diagnostic-only, never an admitted formal SQL gate.
  $j.state='CLEANUP_RUNNING';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  Invoke-FfhOwnedRootRetirement -Identity $Identity -Journal $j -FakeFilesystem $FakeFilesystem
  $j=Read-FfhJournal -Identity $Identity
  if ($j.rootRetirement.status -cne 'ABSENT_VERIFIED' -or
      @($j.resources).Count -ne 0) {throw 'BLOCKED_DIAG_ROOT_NOT_VERIFIED_ABSENT'}
  Confirm-FfhBaseline -Journal $j -Fake $Fake
  Assert-FfhPrecreationNamespace -Identity $Identity -Fake $Fake
  [void](Test-FfhVerifiedRootAbsent -Identity $Identity -FakeFilesystem $FakeFilesystem)
  $j=Set-FfhDiagnosticJournal -Identity $Identity -Status CLEANUP_VERIFIED -CleanupResult CLEANUP_VERIFIED
  $j.state='CLEANUP_VERIFIED';$j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  return 'CLEANUP_VERIFIED'
}
