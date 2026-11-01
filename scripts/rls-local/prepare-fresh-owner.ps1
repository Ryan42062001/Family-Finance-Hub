# FFH-P01 FUTURE OWNER-ONLY FRESH DATABASE PREPARATION.
# DO NOT RUN without a new Manager/Owner GO AND a targeted independent
# read-only source re-audit of this exact SHA. This file never selects or
# resets the pre-existing FFH-RLS-Test local project/container.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedHead,

  [string]$FreshRoot,

  [Parameter(Mandatory=$true)]
  [ValidateSet('FFH-P01-FRESH-LOCAL-GO')]
  [string]$ExplicitAuthorization
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/source-provenance.ps1"
. "$PSScriptRoot/automatic-cleanup.ps1"
. "$PSScriptRoot/cleanup-executor.ps1"

# Isolated Windows PowerShell 5.1 native version probe. Native stderr notices
# may appear as NativeCommandError with the caller's ErrorActionPreference=Stop.
# Scope Continue to THIS native call only; never mask a nonzero native exit,
# ambiguous/missing stdout, launch failure, or a different Supabase version.
# Tests AST-extract only this function and supply harmless native emitters.
function Assert-FfhExactNativeVersion {
  param([Parameter(Mandatory=$true)][string]$DockerEndpoint)
  # The same trusted ProgramFiles/nodejs npx.cmd resolution is used by the
  # Job Object Start/Reset launcher. No PATH-selected or unpinned executable.
  Assert-FfhDockerEndpointValue -Endpoint $DockerEndpoint
  Assert-FfhDockerEnvironment
  $npxCli = Resolve-FfhTrustedNpxCmd
  $cmdPath = Join-Path ([Environment]::SystemDirectory) 'cmd.exe'
  if (-not (Test-Path -LiteralPath $cmdPath -PathType Leaf)) {
    throw 'BLOCKED_PROCESS_START_FAILED: native Windows command processor unavailable'
  }
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $cmdPath
  # Version only: stdout MUST go to the owned Job Object pipe, NOT NUL.
  # Stderr is inherited NUL, never captured or exposed to shared evidence.
  $startInfo.Arguments = '/d /s /c ""' + $npxCli.Source + '" --yes supabase@2.122.0 --version"'
  $startInfo.WorkingDirectory = (Get-Location).Path
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  foreach ($key in @($startInfo.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^(?i:DOCKER_)') {
      $startInfo.EnvironmentVariables.Remove([string]$key)
    }
  }
  $startInfo.EnvironmentVariables['DOCKER_HOST'] = $DockerEndpoint
  if ($startInfo.EnvironmentVariables.ContainsKey('DOCKER_CONTEXT') -or
      $startInfo.EnvironmentVariables.ContainsKey('DOCKER_TLS_VERIFY') -or
      $startInfo.EnvironmentVariables.ContainsKey('DOCKER_CONFIG') -or
      $startInfo.EnvironmentVariables['DOCKER_HOST'] -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'BLOCKED: conflicting version-probe Docker environment'
  }
  $outcome = Invoke-FfhNativeJobChild -StartInfo $startInfo -VersionProbe
  switch -CaseSensitive ($outcome) {
    'EXIT_ZERO' { break }
    'BLOCKED_NONZERO_EXIT' { throw 'BLOCKED_NONZERO_EXIT: native CLI version probe failed' }
    'BLOCKED_VERSION_OUTPUT_INVALID' { throw 'BLOCKED_VERSION_OUTPUT_INVALID: exact 2.122.0 version unavailable' }
    'BLOCKED_PROCESS_START_FAILED' { throw 'BLOCKED_PROCESS_START_FAILED: version launcher not started' }
    'BLOCKED_TIMEOUT_TREE_TERMINATED' { throw 'BLOCKED_TIMEOUT_TREE_TERMINATED: version probe timed out; no retry' }
    'BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED' { throw 'BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED: version probe descendants remained' }
    'BLOCKED_WAIT_FAILURE_TREE_TERMINATED' { throw 'BLOCKED_WAIT_FAILURE_TREE_TERMINATED: no retry' }
    'BLOCKED_RUNNER_FAILURE_TREE_TERMINATED' { throw 'BLOCKED_RUNNER_FAILURE_TREE_TERMINATED: no retry' }
    default {
      throw 'BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING: no retry, Gate B, reset or cleanup'
    }
  }
  Assert-FfhDockerEnvironment
}

Assert-FfhNoRemoteConfiguration
# Mandatory BEFORE any Docker daemon command or CLI that can invoke Docker.
[void](Assert-FfhLocalDockerDesktop)
$source = Assert-FfhSourceCheckout -ExpectedHead $ExpectedHead
$identity=Get-FfhRunIdentity -SourceSha $ExpectedHead -RunToken (New-FfhRunToken)
$lock=Enter-FfhLifecycleLock -Identity $identity
$journalCreated=$false
try {
  if ($FreshRoot -and
      -not ([IO.Path]::GetFullPath($FreshRoot)).Equals($identity.root,
        [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: requested root does not match random run identity'
  }
  $FreshRoot=$identity.root
  $ports=@(Select-FfhRunPorts -Identity $identity)
  $j=New-FfhPrecreationJournal -Identity $identity -Ports $ports
  $journalCreated=$true
  $root = Assert-FfhFreshRoot -FreshRoot $FreshRoot -RepoRoot $source.repo -ExpectedHead $ExpectedHead -RunToken $identity.token
  $projectId = Get-FfhFreshProjectId -ExpectedHead $ExpectedHead -RunToken $identity.token
$containerName = 'supabase_db_' + $projectId
if (Test-Path -LiteralPath $root) {
  throw 'BLOCKED: fresh root already exists; never reuse or reset an existing folder'
}
$parent = Split-Path $root -Parent
if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
  throw 'BLOCKED: fresh root parent must already exist; no broad directory creation'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue) -or
    -not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'BLOCKED: Docker and pinned Supabase CLI launcher required'
}
$dockerBinding = Assert-FfhLocalDockerDesktop
$otherContainers = @(& $dockerBinding.Executable --host $dockerBinding.Endpoint ps -a --format '{{.Names}}')
if ($LASTEXITCODE -ne 0 -or $otherContainers -ccontains $containerName) {
  throw 'BLOCKED: fresh project container name already exists'
}
# Source-verifiable 60-second owned Job Object version probe; no synchronous
# unbounded npx call, no creation of the SHA-specific DB project before PASS.
Assert-FfhExactNativeVersion -DockerEndpoint $dockerBinding.Endpoint
# All provenance hashes are computed from clean immutable repository files;
# the 15 migration FILE BYTES are copied without alteration into a different,
# brand-new config project. Do not point the CLI at the repository or legacy
# owner's separately initialized FFH-RLS-Test folder.
# No recursive creation: verify the new root before writing any child path.
Assert-FfhNoReparsePath -Path $parent
New-Item -ItemType Directory -Path $root -ErrorAction Stop | Out-Null
Assert-FfhNoReparsePath -Path $root
Assert-FfhFreshTree -FreshRoot $root
$supabaseDir = Join-Path $root 'supabase'
if (Test-Path -LiteralPath $supabaseDir) { throw 'BLOCKED: unexpected fresh supabase path exists' }
Assert-FfhNoReparsePath -Path $root
New-Item -ItemType Directory -Path $supabaseDir -ErrorAction Stop | Out-Null
Assert-FfhNoReparsePath -Path $supabaseDir
Assert-FfhFreshTree -FreshRoot $root
$migrationsDir = Join-Path $supabaseDir 'migrations'
if (Test-Path -LiteralPath $migrationsDir) { throw 'BLOCKED: unexpected migrations path exists' }
Assert-FfhNoReparsePath -Path $supabaseDir
New-Item -ItemType Directory -Path $migrationsDir -ErrorAction Stop | Out-Null
Assert-FfhNoReparsePath -Path $migrationsDir
Assert-FfhFreshTree -FreshRoot $root
foreach ($file in $source.migration_files) {
  Assert-FfhFreshTree -FreshRoot $root
  $original = Join-Path $source.repo $file.path
  $dest = Join-Path $root ($file.path -replace '/','\')
  Copy-Item -LiteralPath $original -Destination $dest -ErrorAction Stop
  $digest = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($digest -cne $file.sha256) {
    throw 'BLOCKED: copied migration SHA-256 does not match immutable checkout'
  }
}
$copyNames = @(Get-ChildItem -LiteralPath (Join-Path $root 'supabase/migrations') -File -Filter '*.sql')
if ($copyNames.Count -ne 15) { throw 'BLOCKED: fresh migration snapshot is incomplete' }
$configPath = Join-Path $root 'supabase/config.toml'
[IO.File]::WriteAllText($configPath,(Get-FfhFreshConfig -ExpectedHead $ExpectedHead -RunToken $identity.token -DbPort $ports[0] -ShadowPort $ports[1]),
                        [Text.UTF8Encoding]::new($false))
$configHash = (Get-FileHash -LiteralPath $configPath -Algorithm SHA256).Hash.ToLowerInvariant()
if (Test-Path -LiteralPath (Join-Path $root 'supabase/.temp/project-ref')) {
  throw 'BLOCKED: fresh project unexpectedly linked to hosted Supabase'
}
# Keep a local, nonsecret SHA-256 manifest separate from the repository.
# It is NOT cryptographic attestation of a preexisting DB's applied bytes.
$receipt = [ordered]@{
  source_sha = $ExpectedHead
  cli_version = '2.122.0'
  project_id = $projectId
  db_container = $containerName
  db_port = $ports[0]
  shadow_port = $ports[1]
  run_token = $identity.token
  migration_count = 15
  source_sha256 = @($source.all_files)
  config_sha256 = $configHash
  migration_application = 'NOT_YET_VERIFIED'
}
$receiptPath = Join-Path $root 'ffh-p01-local-provenance.json'
[IO.File]::WriteAllText($receiptPath,($receipt | ConvertTo-Json -Depth 8),
                        [Text.UTF8Encoding]::new($false))
# Only the explicitly new project is affected. Normal stdout and stderr of
# local CLI commands are suppressed because they can contain generated keys.
Push-Location $root
try {
  Assert-FfhFreshTree -FreshRoot $root
  [void](Assert-FfhLocalDockerDesktop)
  [void](Set-FfhRunState -Identity $identity -State 'GATE_A_RUNNING')
  Invoke-FfhPinnedLocalSupabase -Operation Start
  [void](Register-FfhOwnedResources -Identity $identity)
  [void](Assert-FfhDbLoopback -Container $containerName -DbPort $ports[0])
  if (Test-Path -LiteralPath 'supabase/.temp/project-ref') {
    throw 'BLOCKED: hosted Supabase link detected after fresh local startup'
  }
  # Reset applies the copied 15 migration files ONLY to this new, unique
  # localhost project. Does not address or reset old FFH-RLS-Test database.
  Assert-FfhFreshTree -FreshRoot $root
  [void](Assert-FfhLocalDockerDesktop)
  Invoke-FfhPinnedLocalSupabase -Operation Reset
  [void](Register-FfhOwnedResources -Identity $identity)
  [void](Assert-FfhDbLoopback -Container $containerName -DbPort $ports[0])
  foreach ($file in $source.migration_files) {
    $dest = Join-Path $root ($file.path -replace '/','\')
    $digest = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($digest -cne $file.sha256) {
      throw 'BLOCKED: fresh migration bytes changed during local reset'
    }
  }
  if ((Get-FileHash -LiteralPath $configPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne
      $configHash) {
    throw 'BLOCKED: fresh configuration changed during migration application'
  }
  # Read-only, source-SHA-bound catalog/role receipt after applying migrations.
  # Capture output only in memory; never print raw private SQL or service keys.
  Assert-FfhFreshTree -FreshRoot $root
  $dockerBinding = Assert-FfhLocalDockerDesktop
  # Finite native Windows Job Object operation: owned stdin and separate
  # stdout/stderr pipes, exit-zero + final marker, empty client process tree.
  # Any interruption/timeout leaves Docker daemon-side session UNVERIFIED.
  Invoke-FfhOwnedLocalPsql -Mode Preflight -Container $containerName `
    -SqlPath (Join-Path $source.repo 'scripts/rls-local/preflight.sql') `
    -DockerBinding $dockerBinding -Source $source
  $receipt.migration_application = 'OWNER_OPERATED_NEW_PROJECT_RESET_APPLIED_AND_PREFLIGHT_PASS'
  [IO.File]::WriteAllText($receiptPath,($receipt | ConvertTo-Json -Depth 8),
                          [Text.UTF8Encoding]::new($false))
  $receiptSha = (Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText((Join-Path $root 'ffh-p01-local-provenance.sha256'),
                          $receiptSha,[Text.UTF8Encoding]::new($false))
  [void](Set-FfhRunState -Identity $identity -State 'GATE_A_PRESERVED' -TestResult 'PASS' -CleanupResult 'PRESERVED_FOR_GATE_B')
  Write-FfhRedactedEvidence -Identity $identity -Phase 'GATE_A' -Result 'PASS' -Category 'NONE'
  Write-Output "FRESH_LOCAL_PREPARATION=PASS SOURCE_SHA=$ExpectedHead MIGRATIONS=15 PORT=LOOPBACK SHA256_MANIFEST=$receiptSha RUN_TOKEN=$($identity.token) CLEANUP_RESULT=PRESERVED_FOR_GATE_B"
}
finally { Pop-Location }
# STOP: actual matrix fixture writes require a separate, fresh approval.
# Failure leaves no permission to retry or reset anything. Preserve only
# privacy-safe failure category for Manager and arrange an approved teardown
# of this NEW project if needed; never touch FFH-RLS-Test.

}
catch {
  # Never emit unredacted native stderr, SQL, secrets or filesystem contents.
  if ($journalCreated) {
    try {
      $current=Read-FfhJournal -Identity $identity
      if ($current.state -cne 'GATE_A_PRESERVED') {
        Write-FfhRedactedEvidence -Identity $identity -Phase 'GATE_A' -Result 'FAIL' -Category 'GATE_A_FAILURE'
        [void](Register-FfhOwnedResources -Identity $identity)
        [void](Set-FfhRunState -Identity $identity -State 'GATE_A_FAILED' -TestResult 'FAIL')
        $idle=Get-FfhSqlIdleAttestation -Identity $identity
        $cleanup=Invoke-FfhVerifiedCleanup -Identity $identity -SqlIdleAttestation $idle
        Write-Output "TEST_RESULT=FAIL CLEANUP_RESULT=$cleanup RUN_TOKEN=$($identity.token)"
      }
    } catch {
      [void](Set-FfhRunState -Identity $identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
      Write-Output "TEST_RESULT=FAIL CLEANUP_RESULT=CLEANUP_BLOCKED_MANUAL_REVIEW RUN_TOKEN=$($identity.token)"
    }
  }
  throw 'BLOCKED: Gate A unsuccessful; original test failure is not converted to PASS'
}
finally { $lock.Dispose() }
