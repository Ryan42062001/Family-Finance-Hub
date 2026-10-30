# FFH-P01 local-only SOURCE guard shared by the future owner-operated
# fresh-database preparation and matrix execution. Importing this file
# defines functions only. No Docker/SQL/hosted access or mutations occur.
Set-StrictMode -Version Latest

function Assert-FfhNoRemoteConfiguration {
  foreach ($name in @(
    'SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_PROJECT_ID',
    'SUPABASE_URL','DATABASE_URL','PGHOST','PGSERVICE','PGPORT',
    'PGDATABASE','PGUSER','PGPASSWORD','SUPABASE_DB_URL'
  )) {
    if ([Environment]::GetEnvironmentVariable($name)) {
      throw "BLOCKED: external database configuration variable present ($name)"
    }
  }
}

function Assert-FfhSourceCheckout {
  param([Parameter(Mandatory=$true)][string]$ExpectedHead)
  if ($ExpectedHead -cnotmatch '^[0-9a-f]{40}$') { throw 'BLOCKED: full immutable SHA required' }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'BLOCKED: Git unavailable' }
  $root = (& git rev-parse --show-toplevel 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'BLOCKED: no Git checkout' }
  $root = [IO.Path]::GetFullPath(([string]$root).Trim())
  $head = (& git -C $root rev-parse HEAD).Trim()
  $branch = (& git -C $root branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $head -cne $ExpectedHead -or
      $branch -cne 'phase/ffh-p01-release-readiness') {
    throw 'BLOCKED: source HEAD or original phase branch mismatch'
  }
  # Entire checkout, not just two SQL files. Includes tracked modifications,
  # staged modifications and untracked/non-ignored files. Ignored files are
  # separately gated below for a linked project/config.
  $status = @(& git -C $root status --porcelain=v1 --untracked-files=all)
  if ($LASTEXITCODE -ne 0 -or $status.Count -ne 0) {
    throw 'BLOCKED: full source checkout is not clean'
  }
  foreach ($extra in @('supabase/config.toml','supabase/config.json',
                       'supabase/.temp/project-ref','supabase/.temp/pooler-url')) {
    if (Test-Path -LiteralPath (Join-Path $root $extra)) {
      throw 'BLOCKED: repository has unexpected local config or hosted link'
    }
  }
  $migrationNames = @(& git -C $root ls-files -- 'supabase/migrations/*.sql' | Sort-Object)
  if ($LASTEXITCODE -ne 0 -or $migrationNames.Count -ne 15 -or
      (@($migrationNames | Select-Object -Unique)).Count -ne 15) {
    throw 'BLOCKED: expected exactly 15 tracked canonical migration files'
  }
  $otherNames = @(
    'scripts/rls-local/matrix.sql',
    'scripts/rls-local/preflight.sql',
    'scripts/rls-local/run-owner.ps1',
    'scripts/rls-local/prepare-fresh-owner.ps1',
    'scripts/rls-local/source-provenance.ps1',
    'scripts/rls-local/run.sh'
  )
  $files = @($migrationNames) + $otherNames
  $hashRows = @(
    foreach ($relative in $files) {
      $absolute = Join-Path $root $relative
      if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) {
        throw 'BLOCKED: immutable source file missing'
      }
      # Git filtered object ID ties each tracked file back to immutable HEAD.
      # SHA-256 additionally fingerprints the exact local bytes that will be
      # copied and passed to the isolated container (including CRLF variants).
      $refName = '{0}:{1}' -f $ExpectedHead,$relative
      $expectedObject = (& git -C $root rev-parse --verify $refName 2>$null)
      if ($LASTEXITCODE -ne 0 -or -not $expectedObject) {
        throw 'BLOCKED: file absent from immutable commit'
      }
      $actualObject = (& git -C $root hash-object -- $relative)
      if ($LASTEXITCODE -ne 0 -or ([string]$actualObject).Trim() -cne ([string]$expectedObject).Trim()) {
        throw 'BLOCKED: worktree file differs from immutable Git object'
      }
      [pscustomobject]@{
        path = ($relative -replace '\\','/')
        git_blob = ([string]$expectedObject).Trim()
        sha256 = (Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant()
      }
    }
  )
  return [pscustomobject]@{
    head = $ExpectedHead
    repo = $root
    migration_count = 15
    migration_files = @($hashRows | Where-Object { $_.path -like 'supabase/migrations/*.sql' })
    all_files = @($hashRows)
  }
}

function Get-FfhFreshProjectId {
  param([Parameter(Mandatory=$true)][string]$ExpectedHead)
  return 'ffh_p01_rls_fresh_' + $ExpectedHead.Substring(0,12)
}

function Get-FfhFreshConfig {
  param([Parameter(Mandatory=$true)][string]$ExpectedHead)
  $projectId = Get-FfhFreshProjectId -ExpectedHead $ExpectedHead
  return @"
project_id = "$projectId"
[db]
port = 54332
shadow_port = 54333
major_version = 17
[api]
enabled = false
[auth]
enabled = false
"@
}

function Assert-FfhFreshRoot {
  param(
    [Parameter(Mandatory=$true)][string]$FreshRoot,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$ExpectedHead
  )
  $root = [IO.Path]::GetFullPath($FreshRoot).TrimEnd('\','/')
  $repo = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
  $expectedName = 'FFH-P01-RLS-Fresh-' + $ExpectedHead.Substring(0,12)
  if ((Split-Path $root -Leaf) -cne $expectedName -or
      $root.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or
      $root.StartsWith($repo + [IO.Path]::DirectorySeparatorChar,
                       [StringComparison]::OrdinalIgnoreCase) -or
      $root -match '(?i)FFH-RLS-Test') {
    throw 'BLOCKED: fresh root must have exact new name outside repository/legacy DB'
  }
  return $root
}

function Assert-FfhDbLoopback {
  param([Parameter(Mandatory=$true)][string]$Container)
  $raw = & docker inspect $Container 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $raw) {
    throw 'BLOCKED: only expected disposable container may be accessed'
  }
  $d = @(($raw -join "`n" | ConvertFrom-Json))
  if ($d.Count -ne 1 -or -not $d[0].State.Running -or
      $d[0].State.Health.Status -cne 'healthy') {
    throw 'BLOCKED: fresh local database not running/healthy'
  }
  $bindings = @($d[0].NetworkSettings.Ports.'5432/tcp')
  if ($bindings.Count -eq 0) { throw 'BLOCKED: no direct DB port binding' }
  foreach ($binding in $bindings) {
    if ($binding.HostPort -cne '54332' -or
        $binding.HostIp -cnotin @('127.0.0.1','::1')) {
      throw 'BLOCKED: DB not loopback-only on fresh port 54332'
    }
  }
  return $true
}
