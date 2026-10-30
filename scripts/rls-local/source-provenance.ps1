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
    'scripts/rls-local/run.sh',
    '.github/workflows/ci.yml',
    'scripts/validate-release-candidate.mjs',
    'AGENTS.md',
    'docs/WORKFLOW.md'
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
  $home = [IO.Path]::GetFullPath($HOME).TrimEnd('\','/')
  $profile = [IO.Path]::GetFullPath([Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)).TrimEnd('\','/')
  $expectedName = 'FFH-P01-RLS-Fresh-' + $ExpectedHead.Substring(0,12)
  if ($home -cnotmatch '^[a-zA-Z]:\\' -or
      -not $home.Equals($profile,[StringComparison]::OrdinalIgnoreCase) -or
      -not (Split-Path $root -Parent).Equals($home,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: fresh project must be direct child of local Windows profile'
  }
  if (([IO.DriveInfo]::new($home.Substring(0,3))).DriveType -ne [IO.DriveType]::Fixed) {
    throw 'BLOCKED: fresh root parent must be local fixed drive'
  }
  Assert-FfhNoReparsePath -Path $home
  if (Test-Path -LiteralPath $root) { Assert-FfhFreshTree -FreshRoot $root }
  if ((Split-Path $root -Leaf) -cne $expectedName -or
      $root.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or
      $root.StartsWith($repo + [IO.Path]::DirectorySeparatorChar,
                       [StringComparison]::OrdinalIgnoreCase) -or
      $root -match '(?i)FFH-RLS-Test') {
    throw 'BLOCKED: fresh root must have exact new name outside repository/legacy DB'
  }
  return $root
}

# RLS-01: validate the effective Docker daemon, not the context name.
# The initial context show/inspect calls query read-only local CLI metadata.
# No daemon access is allowed until the endpoint URI passes this guard.
function Assert-FfhDockerEndpointValue {
  param([Parameter(Mandatory=$true)][string]$Endpoint)
  if ($Endpoint -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'BLOCKED: not the local Windows Docker Desktop Linux named pipe'
  }
}

function Assert-FfhDockerEnvironment {
  # Reject endpoint/context/TLS variables even if explicitly empty.
  $blocked = @(
    'DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','DOCKER_TLS',
    'DOCKER_TLS_VERIFY','DOCKER_CERT_PATH','DOCKER_TLS_CERTDIR',
    'DOCKER_SSH_COMMAND','DOCKER_API_VERSION','DOCKER_CUSTOM_HEADERS',
    'DOCKER_MACHINE_NAME','DOCKER_MACHINE_HOST','DOCKER_MACHINE_CERT_PATH',
    'DOCKER_MACHINE_TLS_VERIFY','DOCKER_ENDPOINT','DOCKER_SOCKET',
    'DOCKER_REMOTE'
  )
  $envNames = @([Environment]::GetEnvironmentVariables().Keys |
    ForEach-Object { [string]$_ })
  foreach ($name in $envNames) {
    if ($blocked -contains $name -or
        $name -match '^(?i:DOCKER_(HOST|CONTEXT|CONFIG|TLS.*|CERT.*|SSH.*|MACHINE.*|ENDPOINT.*|SOCKET.*|REMOTE.*))
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
) {
      throw "BLOCKED: Docker endpoint/environment override present ($name)"
    }
  }
}

function Assert-FfhLocalDockerDesktop {
  Assert-FfhDockerEnvironment
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'BLOCKED: locality guard requires native Windows host'
  }
  $dockerCli = Get-Command docker -CommandType Application -ErrorAction SilentlyContinue
  if (-not $dockerCli -or [IO.Path]::GetFileName($dockerCli.Source) -cne 'docker.exe') {
    throw 'BLOCKED: native Windows docker.exe unavailable'
  }
  # The scripts invoke "docker" directly. Verify PowerShell would resolve
  # that word to the SAME application, not a function/alias/wrapper.
  $resolved = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $resolved -or $resolved.CommandType -ne [Management.Automation.CommandTypes]::Application -or
      $resolved.Source -cne $dockerCli.Source) {
    throw 'BLOCKED: docker command alias/function/wrapper may redirect daemon'
  }
  # Never change global context. Validate its name only to avoid CLI injection.
  $selected = @(& $dockerCli.Source context show 2>$null)
  if ($LASTEXITCODE -ne 0 -or $selected.Count -ne 1) {
    throw 'BLOCKED: effective Docker context ambiguous'
  }
  $contextName = ([string]$selected[0]).Trim()
  if ($contextName -cnotmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}
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
) {
    throw 'BLOCKED: selected Docker context malformed'
  }
  $raw = @(& $dockerCli.Source context inspect $contextName 2>$null)
  if ($LASTEXITCODE -ne 0 -or $raw.Count -eq 0) {
    throw 'BLOCKED: Docker context metadata unavailable'
  }
  try {
    $contexts = @((($raw -join [Environment]::NewLine) | ConvertFrom-Json))
  } catch {
    throw 'BLOCKED: Docker context metadata malformed'
  }
  if ($contexts.Count -ne 1 -or $contexts[0].Name -cne $contextName -or
      -not $contexts[0].Endpoints -or -not $contexts[0].Endpoints.docker) {
    throw 'BLOCKED: Docker context endpoint missing or ambiguous'
  }
  $endpoint = [string]$contexts[0].Endpoints.docker.Host
  if ([string]::IsNullOrWhiteSpace($endpoint)) {
    throw 'BLOCKED: effective Docker endpoint missing'
  }
  Assert-FfhDockerEndpointValue -Endpoint $endpoint
  if ($contexts[0].Endpoints.docker.SkipTLSVerify -eq $true -or
      ($null -ne $contexts[0].TLSMaterial -and
       @($contexts[0].TLSMaterial.PSObject.Properties).Count -gt 0)) {
    throw 'BLOCKED: TLS context material incompatible with local named pipe'
  }
  $again = @(& $dockerCli.Source context show 2>$null)
  if ($LASTEXITCODE -ne 0 -or $again.Count -ne 1 -or
      ([string]$again[0]).Trim() -cne $contextName) {
    throw 'BLOCKED: Docker context changed before daemon verification'
  }
  # First daemon-touching command comes AFTER verified named-pipe endpoint.
  $server = @(& $dockerCli.Source info --format '{{.OSType}}|{{.OperatingSystem}}|{{.Name}}' 2>$null)
  if ($LASTEXITCODE -ne 0 -or $server.Count -ne 1) {
    throw 'BLOCKED: Docker Desktop Linux daemon could not be verified'
  }
  $parts = ([string]$server[0]).Split('|')
  if ($parts.Count -ne 3 -or $parts[0] -cne 'linux' -or
      $parts[1] -notmatch '^Docker Desktop(?:\b|$)' -or
      $parts[2] -cne 'docker-desktop') {
    throw 'BLOCKED: wrong Docker daemon OS/product/server'
  }
  Assert-FfhDockerEnvironment
  $end = @(& $dockerCli.Source context show 2>$null)
  if ($LASTEXITCODE -ne 0 -or $end.Count -ne 1 -or
      ([string]$end[0]).Trim() -cne $contextName) {
    throw 'BLOCKED: Docker context changed after daemon verification'
  }
  $rawEnd = @(& $dockerCli.Source context inspect $contextName 2>$null)
  if ($LASTEXITCODE -ne 0 -or $rawEnd.Count -eq 0) {
    throw 'BLOCKED: Docker endpoint changed or disappeared'
  }
  try {
    $finalContexts = @((($rawEnd -join [Environment]::NewLine) | ConvertFrom-Json))
  } catch {
    throw 'BLOCKED: Docker endpoint JSON changed or malformed'
  }
  if ($finalContexts.Count -ne 1 -or $finalContexts[0].Name -cne $contextName -or
      $finalContexts[0].Endpoints.docker.Host -cne $endpoint -or
      $finalContexts[0].Endpoints.docker.SkipTLSVerify -eq $true -or
      ($null -ne $finalContexts[0].TLSMaterial -and
       @($finalContexts[0].TLSMaterial.PSObject.Properties).Count -gt 0)) {
    throw 'BLOCKED: Docker endpoint or TLS selection changed after verification'
  }
  Assert-FfhDockerEnvironment
  return $true
}

function Assert-FfhNoReparsePath {
  param([Parameter(Mandatory=$true)][string]$Path)
  $absolute = [IO.Path]::GetFullPath($Path)
  $driveRoot = [IO.Path]::GetPathRoot($absolute)
  $cursor = if ($absolute.Equals($driveRoot,[StringComparison]::OrdinalIgnoreCase)) {
    $absolute
  } else {
    $absolute.TrimEnd('\','/')
  }
  while (-not [string]::IsNullOrEmpty($cursor)) {
    if (-not (Test-Path -LiteralPath $cursor)) {
      throw 'BLOCKED: fresh-root path/ancestor absent'
    }
    $item = Get-Item -LiteralPath $cursor -Force -ErrorAction Stop
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'BLOCKED: filesystem symlink/junction/reparse point forbidden'
    }
    $parent = Split-Path -Path $cursor -Parent
    if ([string]::IsNullOrEmpty($parent) -or $parent -eq $cursor) { break }
    $cursor = $parent
  }
}

function Assert-FfhFreshTree {
  param([Parameter(Mandatory=$true)][string]$FreshRoot)
  $paths = @(
    '', 'supabase', 'supabase/migrations', 'supabase/.temp',
    'supabase/config.toml','ffh-p01-local-provenance.json',
    'ffh-p01-local-provenance.sha256'
  )
  foreach ($relative in $paths) {
    $target = if ($relative) { Join-Path $FreshRoot $relative } else { $FreshRoot }
    if (Test-Path -LiteralPath $target) {
      Assert-FfhNoReparsePath -Path $target
    }
  }
  $migrations = Join-Path $FreshRoot 'supabase/migrations'
  if (Test-Path -LiteralPath $migrations -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $migrations -Force -ErrorAction Stop)) {
      Assert-FfhNoReparsePath -Path $file.FullName
    }
  }
}

function Assert-FfhDbLoopback {
  param([Parameter(Mandatory=$true)][string]$Container)
  [void](Assert-FfhLocalDockerDesktop)
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
