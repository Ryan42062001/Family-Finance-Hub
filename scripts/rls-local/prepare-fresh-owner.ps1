# FFH-P01 FUTURE OWNER-ONLY FRESH DATABASE PREPARATION.
# DO NOT RUN without a new Manager/Owner GO AND a targeted independent
# read-only source re-audit of this exact SHA. This file never selects or
# resets the pre-existing FFH-RLS-Test local project/container.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedHead,

  [Parameter(Mandatory=$true)]
  [string]$FreshRoot,

  [Parameter(Mandatory=$true)]
  [ValidateSet('FFH-P01-FRESH-LOCAL-GO')]
  [string]$ExplicitAuthorization
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/source-provenance.ps1"
Assert-FfhNoRemoteConfiguration
# Mandatory BEFORE any Docker daemon command or CLI that can invoke Docker.
[void](Assert-FfhLocalDockerDesktop)
$source = Assert-FfhSourceCheckout -ExpectedHead $ExpectedHead
$root = Assert-FfhFreshRoot -FreshRoot $FreshRoot -RepoRoot $source.repo -ExpectedHead $ExpectedHead
$projectId = Get-FfhFreshProjectId -ExpectedHead $ExpectedHead
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
[void](Assert-FfhLocalDockerDesktop)
$otherContainers = @(& docker ps -a --format '{{.Names}}')
if ($LASTEXITCODE -ne 0 -or $otherContainers -ccontains $containerName) {
  throw 'BLOCKED: fresh project container name already exists'
}
$version = @(& npx --yes supabase@2.122.0 --version 2>$null)
if ($LASTEXITCODE -ne 0 -or $version.Count -ne 1 -or
    ([string]$version[0]).Trim() -cne '2.122.0') {
  throw 'BLOCKED: exact CLI 2.122.0 unavailable'
}
# All provenance hashes are computed from clean immutable repository files;
# the 15 migration FILE BYTES are copied without alteration into a different,
# brand-new config project. Do not point the CLI at the repository or legacy
# owner's separately initialized FFH-RLS-Test folder.
New-Item -ItemType Directory -Path (Join-Path $root 'supabase/migrations') -Force | Out-Null
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
[IO.File]::WriteAllText($configPath,(Get-FfhFreshConfig -ExpectedHead $ExpectedHead),
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
  db_port = 54332
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
  & npx --yes supabase@2.122.0 db start *> $null
  if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: fresh local DB startup failed' }
  [void](Assert-FfhDbLoopback -Container $containerName)
  if (Test-Path -LiteralPath 'supabase/.temp/project-ref') {
    throw 'BLOCKED: hosted Supabase link detected after fresh local startup'
  }
  # Reset applies the copied 15 migration files ONLY to this new, unique
  # localhost project. Does not address or reset old FFH-RLS-Test database.
  Assert-FfhFreshTree -FreshRoot $root
  [void](Assert-FfhLocalDockerDesktop)
  & npx --yes supabase@2.122.0 db reset --local --no-seed *> $null
  if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: fresh-local migration application failed' }
  [void](Assert-FfhDbLoopback -Container $containerName)
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
  [void](Assert-FfhLocalDockerDesktop)
  $readOnly = @(
    Get-Content -LiteralPath (Join-Path $source.repo 'scripts/rls-local/preflight.sql') -Raw -Encoding UTF8 |
      & docker exec -i $containerName psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres 2>&1
  )
  if ($LASTEXITCODE -ne 0 -or
      -not (($readOnly | Out-String) -match 'PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1')) {
    throw 'BLOCKED: fresh local catalog/role preflight failed'
  }
  $receipt.migration_application = 'OWNER_OPERATED_NEW_PROJECT_RESET_APPLIED_AND_PREFLIGHT_PASS'
  [IO.File]::WriteAllText($receiptPath,($receipt | ConvertTo-Json -Depth 8),
                          [Text.UTF8Encoding]::new($false))
  $receiptSha = (Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText((Join-Path $root 'ffh-p01-local-provenance.sha256'),
                          $receiptSha,[Text.UTF8Encoding]::new($false))
  Write-Output "FRESH_LOCAL_PREPARATION=PASS SOURCE_SHA=$ExpectedHead MIGRATIONS=15 PORT=LOOPBACK SHA256_MANIFEST=$receiptSha"
}
finally { Pop-Location }
# STOP: actual matrix fixture writes require a separate, fresh approval.
# Failure leaves no permission to retry or reset anything. Preserve only
# privacy-safe failure category for Manager and arrange an approved teardown
# of this NEW project if needed; never touch FFH-RLS-Test.
