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
  $userHomePath = [IO.Path]::GetFullPath($HOME).TrimEnd('\','/')
  $userProfilePath = [IO.Path]::GetFullPath([Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)).TrimEnd('\','/')
  $expectedName = 'FFH-P01-RLS-Fresh-' + $ExpectedHead.Substring(0,12)
  if ($userHomePath -cnotmatch '^[a-zA-Z]:\\' -or
      -not $userHomePath.Equals($userProfilePath,[StringComparison]::OrdinalIgnoreCase) -or
      -not (Split-Path $root -Parent).Equals($userHomePath,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: fresh project must be direct child of local Windows profile'
  }
  if (([IO.DriveInfo]::new($userHomePath.Substring(0,3))).DriveType -ne [IO.DriveType]::Fixed) {
    throw 'BLOCKED: fresh root parent must be local fixed drive'
  }
  Assert-FfhNoReparsePath -Path $userHomePath
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
        $name -match '^(?i:DOCKER_(HOST|CONTEXT|CONFIG|TLS.*|CERT.*|SSH.*|MACHINE.*|ENDPOINT.*|SOCKET.*|REMOTE.*))$') {
      throw "BLOCKED: Docker endpoint/environment override present ($name)"
    }
  }
}

# Pure command-discovery and path validation. This function NEVER invokes Docker.
# Its exact-name and bare-name -All lookups are deliberately treated as arrays:
# Windows PowerShell 5.1 may return both docker.exe and its legitimate
# extensionless sibling from Docker Desktop's trusted resources/bin directory.
function Resolve-FfhNativeDockerDesktopExecutable {
  $programFiles = [string]$env:ProgramFiles
  $systemProgramFiles = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles)
  if ([string]::IsNullOrWhiteSpace($programFiles) -or
      [string]::IsNullOrWhiteSpace($systemProgramFiles) -or
      $programFiles -notmatch '^[A-Za-z]:\\' -or
      -not ([IO.Path]::GetFullPath($programFiles).TrimEnd('\')).Equals(
        [IO.Path]::GetFullPath($systemProgramFiles).TrimEnd('\'),
        [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: trusted Windows ProgramFiles path unavailable'
  }
  $trustedDir = Join-Path $systemProgramFiles 'Docker\Docker\resources\bin'
  $trustedExe = Join-Path $trustedDir 'docker.exe'
  $trustedSibling = Join-Path $trustedDir 'docker'

  # The application-only lookup must return EXACTLY ONE native docker.exe.
  # The unfiltered exact-name lookup additionally detects alias/function or
  # script shadowing that -CommandType Application would otherwise hide.
  $native = @(Get-Command -Name 'docker.exe' -CommandType Application -All -ErrorAction SilentlyContinue)
  $exactAll = @(Get-Command -Name 'docker.exe' -All -ErrorAction SilentlyContinue)
  $bareAll = @(Get-Command -Name 'docker' -All -ErrorAction SilentlyContinue)
  if ($native.Count -ne 1 -or $exactAll.Count -ne 1 -or
      $bareAll.Count -lt 1 -or $bareAll.Count -gt 2) {
    throw 'BLOCKED: native Windows docker.exe resolution missing or ambiguous'
  }

  $trustedExeCount = 0
  $trustedSiblingCount = 0
  foreach ($entry in @($native) + @($exactAll) + @($bareAll)) {
    if ($null -eq $entry -or
        $entry.CommandType -ne [Management.Automation.CommandTypes]::Application) {
      throw 'BLOCKED: docker command alias/function/wrapper may redirect daemon'
    }
    $entryName = [string]$entry.Name
    $entrySource = [string]$entry.Source
    $entryPath = [string]$entry.Path
    $entryDefinition = [string]$entry.Definition
    $expectedPath = if ($entryName -ceq 'docker.exe') { $trustedExe }
      elseif ($entryName -ceq 'docker') { $trustedSibling }
      else { throw 'BLOCKED: unexpected Docker command name' }
    if (-not $entrySource.Equals($expectedPath,[StringComparison]::OrdinalIgnoreCase) -or
        -not $entryPath.Equals($expectedPath,[StringComparison]::OrdinalIgnoreCase) -or
        -not $entryDefinition.Equals($expectedPath,[StringComparison]::OrdinalIgnoreCase)) {
      throw 'BLOCKED: Docker executable path or identity not trusted'
    }
  }
  # Independently require both exact-name resolutions to be the same trusted
  # application; no alias or lower-priority duplicate docker.exe is permitted.
  if ([string]$native[0].Name -cne 'docker.exe' -or
      [string]$exactAll[0].Name -cne 'docker.exe' -or
      -not ([string]$native[0].Source).Equals([string]$exactAll[0].Source,
        [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: exact docker.exe executable identity ambiguous'
  }
  foreach ($entry in $bareAll) {
    if ([string]$entry.Name -ceq 'docker.exe') { $trustedExeCount++ }
    elseif ([string]$entry.Name -ceq 'docker') { $trustedSiblingCount++ }
  }
  if ($trustedExeCount -ne 1 -or $trustedSiblingCount -gt 1 -or
      [string]$bareAll[0].Name -cne 'docker.exe' -or
      -not ([string]$bareAll[0].Source).Equals($trustedExe,[StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $trustedExe -PathType Leaf)) {
    throw 'BLOCKED: trusted docker.exe missing or PATH precedence unsafe'
  }
  # Never execute the sibling; return the single verified native app object.
  return $native[0]
}

function Assert-FfhLocalDockerDesktop {
  Assert-FfhDockerEnvironment
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'BLOCKED: locality guard requires native Windows host'
  }
  # Resolve the exact native executable once; all later daemon/context calls
  # remain absolute-path bound and cannot inherit bare docker resolution.
  $dockerCli = Resolve-FfhNativeDockerDesktopExecutable
  # Never change global context. Validate its name only to avoid CLI injection.
  $selected = @(& $dockerCli.Source context show 2>$null)
  if ($LASTEXITCODE -ne 0 -or $selected.Count -ne 1) {
    throw 'BLOCKED: effective Docker context ambiguous'
  }
  $contextName = ([string]$selected[0]).Trim()
  if ($contextName -cnotmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$') {
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
  $server = @(& $dockerCli.Source --host $endpoint info --format '{{.OSType}}|{{.OperatingSystem}}|{{.Name}}' 2>$null)
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
  return [pscustomobject]@{
    Executable = [string]$dockerCli.Source
    Endpoint = $endpoint
  }
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

# Child-only Docker endpoint for the two authorized local Supabase operations.
# ProcessStartInfo copies and sanitizes the child's environment, not the parent.
# Native Windows PowerShell 5.1 compatible source-only Job Object implementation.
# Its Add-Type compilation and child startup are NOT run by FAST/parser tests.
# Shared Windows Node.js MSI trust anchor for VERSION and db Start/Reset.
# Only C:\Program Files\nodejs\npx.cmd (under the verified OS ProgramFiles)
# is eligible. NVM/Volta/user-space shims need a separate Manager-approved
# trust anchor; we DO NOT silently trust the first PATH match.
function Resolve-FfhTrustedNpxCmd {
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'BLOCKED: native Node launcher requires Windows'
  }
  $osProgramFiles = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles)
  $envProgramFiles = [string]$env:ProgramFiles
  if ([string]::IsNullOrWhiteSpace($osProgramFiles) -or
      [string]::IsNullOrWhiteSpace($envProgramFiles) -or
      $osProgramFiles -cnotmatch '^[A-Za-z]:\\' -or
      -not ([IO.Path]::GetFullPath($osProgramFiles).TrimEnd('\')).Equals(
        [IO.Path]::GetFullPath($envProgramFiles).TrimEnd('\'),
        [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED: trusted Node ProgramFiles anchor unavailable'
  }
  $nodeDirectory = Join-Path $osProgramFiles 'nodejs'
  $trustedNpx = Join-Path $nodeDirectory 'npx.cmd'
  $trustedNode = Join-Path $nodeDirectory 'node.exe'
  $trustedNpxScript = Join-Path $nodeDirectory 'npx.ps1'
  $trustedNpxShell = Join-Path $nodeDirectory 'npx'
  if ($trustedNpx -match '[&|<>^%!"()\r\n]' -or
      -not (Test-Path -LiteralPath $trustedNpx -PathType Leaf) -or
      -not (Test-Path -LiteralPath $trustedNode -PathType Leaf)) {
    throw 'BLOCKED: trusted Node MSI launcher missing or shell-unsafe'
  }
  # No path-segment junction, symlink, or file reparse redirection to an
  # unrelated user-writable shim. This does not claim cryptographic integrity.
  Assert-FfhNoReparsePath -Path $nodeDirectory
  Assert-FfhNoReparsePath -Path $trustedNpx
  Assert-FfhNoReparsePath -Path $trustedNode

  $nativeCandidates = @(Get-Command npx.cmd -CommandType Application -All -ErrorAction SilentlyContinue)
  $exactCandidates = @(Get-Command npx.cmd -All -ErrorAction SilentlyContinue)
  $bareCandidates = @(Get-Command npx -All -ErrorAction SilentlyContinue)
  if ($nativeCandidates.Count -ne 1 -or $exactCandidates.Count -ne 1 -or
      $bareCandidates.Count -lt 1 -or $bareCandidates.Count -gt 3) {
    throw 'BLOCKED: native npx.cmd missing or command precedence ambiguous'
  }
  foreach ($entry in @($nativeCandidates) + @($exactCandidates)) {
    if ($null -eq $entry -or
        $entry.CommandType -ne [Management.Automation.CommandTypes]::Application -or
        [string]$entry.Name -cne 'npx.cmd' -or
        -not ([string]$entry.Source).Equals($trustedNpx,[StringComparison]::OrdinalIgnoreCase) -or
        -not ([string]$entry.Path).Equals($trustedNpx,[StringComparison]::OrdinalIgnoreCase) -or
        -not ([string]$entry.Definition).Equals($trustedNpx,[StringComparison]::OrdinalIgnoreCase)) {
      throw 'BLOCKED: npx.cmd executable identity or installation path untrusted'
    }
  }
  $seen = @{}
  $cmdCount = 0
  foreach ($entry in $bareCandidates) {
    if ($null -eq $entry) { throw 'BLOCKED: npx command discovery invalid' }
    $name = [string]$entry.Name
    $expected = $null
    $type = $entry.CommandType
    if ($name -ceq 'npx.cmd' -and
        $type -eq [Management.Automation.CommandTypes]::Application) {
      $expected = $trustedNpx
      $cmdCount++
    } elseif ($name -ceq 'npx.ps1' -and
        $type -eq [Management.Automation.CommandTypes]::ExternalScript) {
      # Standard Node Windows installers include this *unexecuted* sibling.
      $expected = $trustedNpxScript
    } elseif ($name -ceq 'npx' -and
        $type -eq [Management.Automation.CommandTypes]::Application) {
      # Standard Node may include an extensionless POSIX-shell sibling.
      $expected = $trustedNpxShell
    } else {
      throw 'BLOCKED: alias, function, cmdlet or PATH-shadow npx command'
    }
    if ($seen.ContainsKey($name)) {
      throw 'BLOCKED: duplicate native npx discovery name'
    }
    if (-not ([string]$entry.Path).Equals($expected,[StringComparison]::OrdinalIgnoreCase)) {
      throw 'BLOCKED: native npx sibling path untrusted'
    }
    if (-not ([string]$entry.Definition).Equals($expected,[StringComparison]::OrdinalIgnoreCase)) {
      throw 'BLOCKED: native npx sibling definition untrusted'
    }
    if (-not (Test-Path -LiteralPath $expected -PathType Leaf)) {
      throw 'BLOCKED: expected native npx sibling missing'
    }
    $seen[$name] = $true
  }
  if ($cmdCount -ne 1) {
    throw 'BLOCKED: exact native npx.cmd not found in bare-name discovery'
  }
  return $nativeCandidates[0]
}

function Invoke-FfhNativeJobChild {
  param(
    [Parameter(Mandatory=$true)][Diagnostics.ProcessStartInfo]$StartInfo,
    [switch]$VersionProbe,
    [switch]$SqlMode,
    [byte[]]$SqlBytes,
    [switch]$Matrix
  )
  if (-not ('FfhRlsJobRunner' -as [type])) {
    try {
      Add-Type -TypeDefinition @'
// Native Win32 Job Object runner. Compiled only during separately approved
// owner execution; AST/source tests never execute this class.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class FfhRlsJobRunner {
  private const uint CREATE_SUSPENDED = 0x00000004;
  private const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
  private const uint CREATE_NO_WINDOW = 0x08000000;
  private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
  private const uint WAIT_OBJECT_0 = 0;
  private const uint WAIT_TIMEOUT = 258;
  private const uint WAIT_FAILED = 0xFFFFFFFF;

  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  private struct STARTUPINFO {
    public uint cb;
    public string lpReserved;
    public string lpDesktop;
    public string lpTitle;
    public uint dwX;
    public uint dwY;
    public uint dwXSize;
    public uint dwYSize;
    public uint dwXCountChars;
    public uint dwYCountChars;
    public uint dwFillAttribute;
    public uint dwFlags;
    public ushort wShowWindow;
    public ushort cbReserved2;
    public IntPtr lpReserved2;
    public IntPtr hStdInput;
    public IntPtr hStdOutput;
    public IntPtr hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  private struct PROCESS_INFORMATION {
    public IntPtr hProcess;
    public IntPtr hThread;
    public uint dwProcessId;
    public uint dwThreadId;
  }
  [StructLayout(LayoutKind.Sequential)]
  private struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)]
  private struct IO_COUNTERS {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }
  [StructLayout(LayoutKind.Sequential)]
  private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
  }
  [StructLayout(LayoutKind.Sequential)]
  private struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION {
    public long TotalUserTime;
    public long TotalKernelTime;
    public long ThisPeriodTotalUserTime;
    public long ThisPeriodTotalKernelTime;
    public uint TotalPageFaultCount;
    public uint TotalProcesses;
    public uint ActiveProcesses;
    public uint TotalTerminatedProcesses;
  }

  [DllImport("kernel32.dll", EntryPoint="CreateJobObjectW", ExactSpelling=true, CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr limits, uint length);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool QueryInformationJobObject(IntPtr job, int infoClass,
    out JOBOBJECT_BASIC_ACCOUNTING_INFORMATION information, uint length, IntPtr returnedLength);
  [DllImport("kernel32.dll", EntryPoint="CreateProcessW", ExactSpelling=true, CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern bool CreateProcessW(string application, StringBuilder commandLine,
    IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint flags,
    IntPtr environment, string workingDirectory, ref STARTUPINFO startup, out PROCESS_INFORMATION process);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool TerminateJobObject(IntPtr job, uint exitCode);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool TerminateProcess(IntPtr process, uint exitCode);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool CloseHandle(IntPtr handle);
  // Version probe only: bounded, non-blocking read of an owned anonymous pipe.
  // Stdout stays in memory; stderr/stdin are inherited NUL handles. No output
  // is ever returned except a privacy-safe classification token.
  private const uint STARTF_USESTDHANDLES = 0x00000100;
  private const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
  private const uint PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002;
  private const uint HANDLE_FLAG_INHERIT = 0x00000001;
  private const int ERROR_BROKEN_PIPE = 109;
  private const int ERROR_NO_DATA = 232;
  private const int MAX_VERSION_OUTPUT_BYTES = 256;

  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  private struct STARTUPINFOEX {
    public STARTUPINFO StartupInfo;
    public IntPtr lpAttributeList;
  }
  [StructLayout(LayoutKind.Sequential)]
  private struct SECURITY_ATTRIBUTES {
    public uint nLength;
    public IntPtr lpSecurityDescriptor;
    [MarshalAs(UnmanagedType.Bool)]
    public bool bInheritHandle;
  }
  [DllImport("kernel32.dll", EntryPoint="CreateProcessW", ExactSpelling=true,
    CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern bool CreateProcessWEx(string application, StringBuilder commandLine,
    IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint flags,
    IntPtr environment, string workingDirectory, ref STARTUPINFOEX startup,
    out PROCESS_INFORMATION process);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags,
    ref IntPtr size);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags,
    IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returned);
  [DllImport("kernel32.dll")]
  private static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool CreatePipe(out IntPtr reader, out IntPtr writer,
    ref SECURITY_ATTRIBUTES attributes, uint size);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool PeekNamedPipe(IntPtr pipe, IntPtr buffer, uint size,
    IntPtr bytesRead, out uint available, IntPtr bytesLeft);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool ReadFile(IntPtr file, [Out] byte[] buffer, uint bytes,
    out uint read, IntPtr overlapped);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool WriteFile(IntPtr file, [In] byte[] buffer, uint bytes,
    out uint written, IntPtr overlapped);


  private static bool DrainVersionPipe(IntPtr reader, List<byte> captured, ref bool overflow,
    out bool empty, bool discard = false, int maxCaptureBytes = MAX_VERSION_OUTPUT_BYTES) {
    empty = true;
    // PeekNamedPipe makes each subsequent ReadFile bounded to available bytes;
    // there is no blocking pipe read or waiting for a descendant to close stdout.
    for (int i=0; i<64; i++) {
      uint available;
      if (!PeekNamedPipe(reader, IntPtr.Zero, 0, IntPtr.Zero, out available, IntPtr.Zero)) {
        int error = Marshal.GetLastWin32Error();
        return error == ERROR_BROKEN_PIPE || error == ERROR_NO_DATA;
      }
      if (available == 0) return true;
      empty = false;
      uint count = Math.Min(available, (uint)4096);
      byte[] data = new byte[(int)count];
      uint got;
      if (!ReadFile(reader, data, count, out got, IntPtr.Zero) || got == 0)
        return false;
      if (!discard) {
        if (captured.Count + got > maxCaptureBytes) {
          overflow = true;
        } else if (!overflow) {
          for (int k=0; k<got; k++) captured.Add(data[k]);
        }
      }
      empty = false;
    }
    return true;
  }

  private static bool IsExactVersionOutput(List<byte> data, bool overflow) {
    if (overflow || data.Count == 0) return false;
    // Restrict the only acceptable stdout to a single ASCII version line.
    foreach (byte ch in data) if (ch > 127 || ch == 0) return false;
    string output = Encoding.ASCII.GetString(data.ToArray()).Replace("\r\n", "\n");
    if (output.EndsWith("\n", StringComparison.Ordinal))
      output = output.Substring(0, output.Length-1);
    if (output.IndexOf('\n') >= 0 || output.IndexOf('\r') >= 0) return false;
    return output.Trim(' ', '\t') == "2.122.0";
  }

  // Reuses the SAME private Job Object limits and accounting helpers as Run.
  // No change to the proven-source Start/Reset Run implementation.
  // This is an isolated new native VERSION path with stdout capture.
  public static string RunVersion(string application, string arguments, string workingDirectory,
    StringDictionary childEnvironment, int executionMilliseconds, int verificationMilliseconds) {
    IntPtr job = IntPtr.Zero;
    IntPtr environment = IntPtr.Zero;
    IntPtr pipeRead = IntPtr.Zero;
    IntPtr pipeWrite = IntPtr.Zero;
    IntPtr stderrRead = IntPtr.Zero;
    IntPtr stderrWrite = IntPtr.Zero;
    IntPtr stdinRead = IntPtr.Zero;
    IntPtr stdinWrite = IntPtr.Zero;
    IntPtr attributes = IntPtr.Zero;
    IntPtr handles = IntPtr.Zero;
    bool attributesInitialized = false;
    PROCESS_INFORMATION owned = new PROCESS_INFORMATION();
    bool created = false;
    bool assigned = false;
    List<byte> captured = new List<byte>();
    List<byte> stderrDiscard = new List<byte>();
    bool overflow = false;
    bool stderrOverflow = false;
    try {
      if (executionMilliseconds <= 0 || verificationMilliseconds <= 0)
        return "BLOCKED_PROCESS_START_FAILED";
      job = CreateJobObjectW(IntPtr.Zero, null);
      if (job == IntPtr.Zero || !EnableKillOnClose(job))
        return "BLOCKED_VERSION_JOB_SETUP_FAILED";
      SECURITY_ATTRIBUTES attrs = new SECURITY_ATTRIBUTES();
      attrs.nLength = (uint)Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
      attrs.bInheritHandle = true;
      if (!CreatePipe(out pipeRead, out pipeWrite, ref attrs, 0) ||
          !SetHandleInformation(pipeRead, HANDLE_FLAG_INHERIT, 0) ||
          !CreatePipe(out stderrRead, out stderrWrite, ref attrs, 0) ||
          !SetHandleInformation(stderrRead, HANDLE_FLAG_INHERIT, 0) ||
          !CreatePipe(out stdinRead, out stdinWrite, ref attrs, 0) ||
          !SetHandleInformation(stdinWrite, HANDLE_FLAG_INHERIT, 0))
        return "BLOCKED_VERSION_PIPE_SETUP_FAILED";
      // All three inherited standard handles are genuine anonymous PIPE handles.
      // Windows restricted PROC_THREAD_ATTRIBUTE_HANDLE_LIST rejects CHAR (NUL)
      // handles with ERROR_INVALID_PARAMETER; stdin writer is closed before
      // resume, so the child's stdin read immediately receives EOF.

      environment = BuildChildEnvironment(childEnvironment);
      // STARTUPINFOEX allowlists only owned stdin/stdout/stderr pipe handles.
      // No ambient host/runner handles can be inherited by the child.
      IntPtr listSize = IntPtr.Zero;
      InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref listSize);
      if (listSize == IntPtr.Zero) return "BLOCKED_VERSION_HANDLE_ALLOWLIST_FAILED";
      attributes = Marshal.AllocHGlobal(listSize);
      if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref listSize))
        return "BLOCKED_VERSION_HANDLE_ALLOWLIST_FAILED";
      attributesInitialized = true;
      handles = Marshal.AllocHGlobal(IntPtr.Size * 3);
      Marshal.WriteIntPtr(handles, 0, pipeWrite);
      Marshal.WriteIntPtr(handles, IntPtr.Size, stderrWrite);
      Marshal.WriteIntPtr(handles, IntPtr.Size * 2, stdinRead);
      if (!UpdateProcThreadAttribute(attributes, 0,
          new IntPtr((long)PROC_THREAD_ATTRIBUTE_HANDLE_LIST), handles,
          new IntPtr(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero))
        return "BLOCKED_VERSION_HANDLE_ALLOWLIST_FAILED";
      STARTUPINFOEX startup = new STARTUPINFOEX();
      startup.StartupInfo.cb = (uint)Marshal.SizeOf(typeof(STARTUPINFOEX));
      startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
      startup.StartupInfo.hStdInput = stdinRead;
      startup.StartupInfo.hStdError = stderrWrite;
      startup.StartupInfo.hStdOutput = pipeWrite;
      startup.lpAttributeList = attributes;
      StringBuilder command = new StringBuilder("\"" + application + "\" " + arguments);
      // CREATE_SUSPENDED is essential: assign the real owned process handle
      // to the kill-on-close job BEFORE any cmd/npx/Node descendant can start.
      if (!CreateProcessWEx(application, command, IntPtr.Zero, IntPtr.Zero, true,
          CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW |
          EXTENDED_STARTUPINFO_PRESENT,
          environment, workingDirectory, ref startup, out owned)) {
        int code = Marshal.GetLastWin32Error();
        if (code == 87) return "BLOCKED_VERSION_CREATEPROCESS_INVALID_PARAMETER";
        if (code == 5) return "BLOCKED_VERSION_CREATEPROCESS_ACCESS_DENIED";
        if (code == 2 || code == 3) return "BLOCKED_PROCESS_START_FAILED";
        return "BLOCKED_VERSION_CREATEPROCESS_FAILED";
      }
      created = true;
      // Parent closes ONLY its extra child-side handles. Every child handle
      // was inherited from the explicit three-pipe allowlist during CREATE.
      bool closedChildEnds = true;
      if (CloseHandle(pipeWrite)) pipeWrite = IntPtr.Zero; else closedChildEnds = false;
      if (CloseHandle(stderrWrite)) stderrWrite = IntPtr.Zero; else closedChildEnds = false;
      if (CloseHandle(stdinRead)) stdinRead = IntPtr.Zero; else closedChildEnds = false;
      if (CloseHandle(stdinWrite)) stdinWrite = IntPtr.Zero; else closedChildEnds = false;
      if (!closedChildEnds)
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_VERSION_SUSPENDED_ROOT_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      if (!AssignProcessToJobObject(job, owned.hProcess)) {
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_VERSION_SUSPENDED_ROOT_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }
      assigned = true;
      if (ResumeThread(owned.hThread) == WAIT_FAILED) {
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_VERSION_RESUME_FAILED_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }
      Stopwatch overall = Stopwatch.StartNew();
      Stopwatch afterRoot = null;
      while (true) {
        bool drained;
        bool stderrDrained;
        if (!DrainVersionPipe(pipeRead, captured, ref overflow, out drained) ||
            !DrainVersionPipe(stderrRead, stderrDiscard, ref stderrOverflow,
              out stderrDrained, true)) {
          return TerminateAndConfirmJob(job, verificationMilliseconds)
            ? "BLOCKED_WAIT_FAILURE_TREE_TERMINATED"
            : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
        }
        uint wait = WaitForSingleObject(owned.hProcess, 0);
        if (wait == WAIT_FAILED || (wait != WAIT_OBJECT_0 && wait != WAIT_TIMEOUT)) {
          return TerminateAndConfirmJob(job, verificationMilliseconds)
            ? "BLOCKED_WAIT_FAILURE_TREE_TERMINATED"
            : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
        }
        if (wait == WAIT_OBJECT_0 && afterRoot == null)
          afterRoot = Stopwatch.StartNew();
        if (wait == WAIT_OBJECT_0 && JobEmpty(job) && drained && stderrDrained) {
          uint exitCode;
          if (!GetExitCodeProcess(owned.hProcess, out exitCode)) {
            return TerminateAndConfirmJob(job, verificationMilliseconds)
              ? "BLOCKED_WAIT_FAILURE_TREE_TERMINATED"
              : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
          }
          if (exitCode != 0) return "BLOCKED_NONZERO_EXIT";
          return IsExactVersionOutput(captured, overflow)
            ? "EXIT_ZERO" : "BLOCKED_VERSION_OUTPUT_INVALID";
        }
        if (afterRoot != null && afterRoot.ElapsedMilliseconds >= verificationMilliseconds) {
          return TerminateAndConfirmJob(job, verificationMilliseconds)
            ? "BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED"
            : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
        }
        if (overall.ElapsedMilliseconds >= executionMilliseconds) {
          return TerminateAndConfirmJob(job, verificationMilliseconds)
            ? "BLOCKED_TIMEOUT_TREE_TERMINATED"
            : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
        }
        Thread.Sleep(25);
      }
    } catch {
      if (assigned)
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_RUNNER_FAILURE_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      if (created)
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_VERSION_SUSPENDED_ROOT_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      return "BLOCKED_VERSION_PRESTART_FAILURE";
    } finally {
      // No stdout contents, command line, PIDs, native errors or environment
      // are exposed. KILL_ON_JOB_CLOSE is only a fallback, NEVER death proof.
      if (owned.hThread != IntPtr.Zero) CloseHandle(owned.hThread);
      if (owned.hProcess != IntPtr.Zero) CloseHandle(owned.hProcess);
      if (pipeWrite != IntPtr.Zero) CloseHandle(pipeWrite);
      if (pipeRead != IntPtr.Zero) CloseHandle(pipeRead);
      if (stderrWrite != IntPtr.Zero) CloseHandle(stderrWrite);
      if (stderrRead != IntPtr.Zero) CloseHandle(stderrRead);
      if (stdinRead != IntPtr.Zero) CloseHandle(stdinRead);
      if (stdinWrite != IntPtr.Zero) CloseHandle(stdinWrite);
      if (attributesInitialized) DeleteProcThreadAttributeList(attributes);
      if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      if (handles != IntPtr.Zero) Marshal.FreeHGlobal(handles);
      if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
      if (job != IntPtr.Zero) CloseHandle(job);
    }
  }


  // RLS-PF-01: bounded, contained SQL-by-owned-stdin for read-only PRE-FLIGHT
  // and separately authorized matrix. No changes to RunVersion / Run.
  private const int MAX_SQL_INPUT_BYTES = 262144;
  private const int MAX_SQL_STDOUT_BYTES = 65536;
  private sealed class SqlWriterState {
    public volatile bool Done;
    public volatile bool Ok;
  }

  private static bool SqlMarkersValid(List<byte> output, bool overflow, bool matrix) {
    if (overflow || output.Count == 0) return false;
    string text;
    try {
      text = new UTF8Encoding(false, true).GetString(output.ToArray())
        .Replace("\r\n", "\n").Replace('\r', '\n');
    } catch { return false; }
    string expectedLast = matrix
      ? "MATRIX_ZERO_RESIDUE_PASS"
      : "PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1";
    int preflightCount = 0, rollbackCount = 0, zeroCount = 0, assertionsCount = 0;
    string last = null;
    foreach (string raw in text.Split('\n')) {
      string line = raw.Trim();
      if (line.Length > 0) last = line;
      if (!matrix) {
        if (line.Contains("PREFLIGHT_PASS")) {
          if (line != expectedLast) return false;
          preflightCount++;
        }
      } else {
        if (line.Contains("MATRIX_ROLLBACK_COMPLETE")) {
          if (line != "MATRIX_ROLLBACK_COMPLETE") return false;
          rollbackCount++;
        }
        if (line.Contains("MATRIX_ZERO_RESIDUE_PASS")) {
          if (line != "MATRIX_ZERO_RESIDUE_PASS") return false;
          zeroCount++;
        }
        if (line.Contains("MATRIX_ASSERTIONS_PASS=")) {
          if (line != "MATRIX_ASSERTIONS_PASS=913") return false;
          assertionsCount++;
        }
      }
    }
    return last == expectedLast && (matrix
      ? rollbackCount == 1 && zeroCount == 1 && assertionsCount == 1
      : preflightCount == 1);
  }

  // Every ERROR / timeout from client process means container-side session
  // state is UNVERIFIED. Do not construe empty Windows job as server rollback.
  private static string StopSqlJob(IntPtr job, Thread writer,
    int verificationMilliseconds, string classification) {
    bool empty = TerminateAndConfirmJob(job, verificationMilliseconds);
    bool writerStopped = writer == null || writer.Join(2000);
    return empty && writerStopped ? classification
      : "BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED";
  }

  public static string RunPsql(string application, string arguments,
    string workingDirectory, StringDictionary childEnvironment, byte[] sql,
    bool matrix, int executionMilliseconds, int verificationMilliseconds) {
    IntPtr job = IntPtr.Zero, environment = IntPtr.Zero;
    IntPtr stdoutRead = IntPtr.Zero, stdoutWrite = IntPtr.Zero;
    IntPtr stderrRead = IntPtr.Zero, stderrWrite = IntPtr.Zero;
    IntPtr stdinRead = IntPtr.Zero, stdinWrite = IntPtr.Zero;
    IntPtr attributes = IntPtr.Zero, handles = IntPtr.Zero;
    bool attributesInitialized = false, created = false, assigned = false;
    PROCESS_INFORMATION owned = new PROCESS_INFORMATION();
    Thread writer = null;
    SqlWriterState writerState = new SqlWriterState();
    List<byte> captured = new List<byte>();
    List<byte> discarded = new List<byte>();
    bool overflow = false, ignoredOverflow = false;
    try {
      if (sql == null || sql.Length == 0 || sql.Length > MAX_SQL_INPUT_BYTES ||
          executionMilliseconds < 100 || verificationMilliseconds < 100)
        return "BLOCKED_SQL_PAYLOAD_OR_BUDGET_INVALID";
      job = CreateJobObjectW(IntPtr.Zero, null);
      if (job == IntPtr.Zero || !EnableKillOnClose(job))
        return "BLOCKED_SQL_JOB_SETUP_FAILED";
      SECURITY_ATTRIBUTES attrs = new SECURITY_ATTRIBUTES();
      attrs.nLength = (uint)Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
      attrs.bInheritHandle = true;
      if (!CreatePipe(out stdoutRead, out stdoutWrite, ref attrs, 0) ||
          !SetHandleInformation(stdoutRead, HANDLE_FLAG_INHERIT, 0) ||
          !CreatePipe(out stderrRead, out stderrWrite, ref attrs, 0) ||
          !SetHandleInformation(stderrRead, HANDLE_FLAG_INHERIT, 0) ||
          !CreatePipe(out stdinRead, out stdinWrite, ref attrs, 0) ||
          !SetHandleInformation(stdinWrite, HANDLE_FLAG_INHERIT, 0))
        return "BLOCKED_SQL_PIPE_SETUP_FAILED";
      environment = BuildChildEnvironment(childEnvironment);
      IntPtr size = IntPtr.Zero;
      InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
      if (size == IntPtr.Zero) return "BLOCKED_SQL_HANDLE_ALLOWLIST_FAILED";
      attributes = Marshal.AllocHGlobal(size);
      if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref size))
        return "BLOCKED_SQL_HANDLE_ALLOWLIST_FAILED";
      attributesInitialized = true;
      handles = Marshal.AllocHGlobal(IntPtr.Size * 3);
      Marshal.WriteIntPtr(handles, 0, stdinRead);
      Marshal.WriteIntPtr(handles, IntPtr.Size, stdoutWrite);
      Marshal.WriteIntPtr(handles, IntPtr.Size * 2, stderrWrite);
      if (!UpdateProcThreadAttribute(attributes, 0,
          new IntPtr((long)PROC_THREAD_ATTRIBUTE_HANDLE_LIST), handles,
          new IntPtr(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero))
        return "BLOCKED_SQL_HANDLE_ALLOWLIST_FAILED";
      STARTUPINFOEX startup = new STARTUPINFOEX();
      startup.StartupInfo.cb = (uint)Marshal.SizeOf(typeof(STARTUPINFOEX));
      startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
      startup.StartupInfo.hStdInput = stdinRead;
      startup.StartupInfo.hStdOutput = stdoutWrite;
      startup.StartupInfo.hStdError = stderrWrite;
      startup.lpAttributeList = attributes;
      StringBuilder cmd = new StringBuilder("\"" + application + "\" " + arguments);
      // Assign suspended root to private kill-on-close job BEFORE resume.
      if (!CreateProcessWEx(application, cmd, IntPtr.Zero, IntPtr.Zero, true,
          CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW |
          EXTENDED_STARTUPINFO_PRESENT,
          environment, workingDirectory, ref startup, out owned))
        return "BLOCKED_SQL_PROCESS_START_FAILED";
      created = true;
      bool closed = true;
      if (CloseHandle(stdinRead)) stdinRead = IntPtr.Zero; else closed = false;
      if (CloseHandle(stdoutWrite)) stdoutWrite = IntPtr.Zero; else closed = false;
      if (CloseHandle(stderrWrite)) stderrWrite = IntPtr.Zero; else closed = false;
      if (!closed)
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_SQL_SUSPENDED_ROOT_TERMINATED_DAEMON_UNVERIFIED"
          : "BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED";
      if (!AssignProcessToJobObject(job, owned.hProcess))
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_SQL_SUSPENDED_ROOT_TERMINATED_DAEMON_UNVERIFIED"
          : "BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED";
      assigned = true;
      if (ResumeThread(owned.hThread) == WAIT_FAILED)
        return StopSqlJob(job, null, verificationMilliseconds,
          "BLOCKED_SQL_RESUME_FAILED_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED");

      // One owned background writer pumps exact immutable SQL bytes to stdin.
      // The foreground polls BOTH stdout/stderr even if the writer blocks.
      // Only this writer can own/close stdinWrite; no other handle inherited.
      IntPtr writerHandle = stdinWrite;
      stdinWrite = IntPtr.Zero;
      writer = new Thread(() => {
        bool success = true;
        try {
          int offset = 0;
          while (offset < sql.Length) {
            int count = Math.Min(4096, sql.Length - offset);
            byte[] block = new byte[count];
            Buffer.BlockCopy(sql, offset, block, 0, count);
            uint sent;
            if (!WriteFile(writerHandle, block, (uint)count, out sent,
                IntPtr.Zero) || sent == 0 || sent > count) {
              success = false;
              break;
            }
            offset += (int)sent;
          }
        } catch { success = false; }
        finally {
          if (!CloseHandle(writerHandle)) success = false;
          writerState.Ok = success;
          writerState.Done = true;
        }
      });
      writer.IsBackground = true;
      try { writer.Start(); }
      catch {
        CloseHandle(writerHandle);
        writer = null;
        return StopSqlJob(job, null, verificationMilliseconds,
          "BLOCKED_SQL_WRITER_START_FAILED_DAEMON_UNVERIFIED");
      }

      Stopwatch clock = Stopwatch.StartNew();
      Stopwatch afterRoot = null;
      while (true) {
        bool stdoutEmpty, stderrEmpty;
        if (!DrainVersionPipe(stdoutRead, captured, ref overflow,
             out stdoutEmpty, false, MAX_SQL_STDOUT_BYTES) ||
            !DrainVersionPipe(stderrRead, discarded, ref ignoredOverflow,
             out stderrEmpty, true))
          return StopSqlJob(job, writer, verificationMilliseconds,
            "BLOCKED_SQL_PIPE_READ_FAILED_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED");
        uint wait = WaitForSingleObject(owned.hProcess, 0);
        if (wait != WAIT_OBJECT_0 && wait != WAIT_TIMEOUT)
          return StopSqlJob(job, writer, verificationMilliseconds,
            "BLOCKED_SQL_WAIT_FAILED_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED");
        if (wait == WAIT_OBJECT_0 && afterRoot == null)
          afterRoot = Stopwatch.StartNew();
        if (wait == WAIT_OBJECT_0 && writerState.Done && JobEmpty(job) &&
            stdoutEmpty && stderrEmpty) {
          if (!writer.Join(1000) || !writerState.Ok)
            return "BLOCKED_SQL_STDIN_INCOMPLETE_DAEMON_UNVERIFIED";
          uint exitCode;
          if (!GetExitCodeProcess(owned.hProcess, out exitCode))
            return "BLOCKED_SQL_EXIT_UNKNOWN_DAEMON_UNVERIFIED";
          if (exitCode != 0) return "BLOCKED_SQL_NATIVE_NONZERO_DAEMON_UNVERIFIED";
          return SqlMarkersValid(captured, overflow, matrix)
            ? "EXIT_ZERO" : "BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED";
        }
        if (afterRoot != null &&
            afterRoot.ElapsedMilliseconds >= verificationMilliseconds)
          return StopSqlJob(job, writer, verificationMilliseconds,
            "BLOCKED_SQL_DESCENDANTS_TERMINATED_DAEMON_UNVERIFIED");
        if (clock.ElapsedMilliseconds >= executionMilliseconds)
          return StopSqlJob(job, writer, verificationMilliseconds,
            "BLOCKED_SQL_TIMEOUT_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED");
        Thread.Sleep(25);
      }
    } catch {
      if (assigned)
        return StopSqlJob(job, writer, verificationMilliseconds,
          "BLOCKED_SQL_RUNNER_FAILED_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED");
      if (created)
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_SQL_SUSPENDED_ROOT_TERMINATED_DAEMON_UNVERIFIED"
          : "BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED";
      return "BLOCKED_SQL_PRESTART_FAILED";
    } finally {
      // KILL_ON_JOB_CLOSE is FALLBACK only, not death confirmation.
      // No raw SQL, stdout/stderr, process IDs or environment leave this method.
      if (owned.hThread != IntPtr.Zero) CloseHandle(owned.hThread);
      if (owned.hProcess != IntPtr.Zero) CloseHandle(owned.hProcess);
      if (stdinRead != IntPtr.Zero) CloseHandle(stdinRead);
      if (stdinWrite != IntPtr.Zero) CloseHandle(stdinWrite);
      if (stdoutRead != IntPtr.Zero) CloseHandle(stdoutRead);
      if (stdoutWrite != IntPtr.Zero) CloseHandle(stdoutWrite);
      if (stderrRead != IntPtr.Zero) CloseHandle(stderrRead);
      if (stderrWrite != IntPtr.Zero) CloseHandle(stderrWrite);
      if (attributesInitialized) DeleteProcThreadAttributeList(attributes);
      if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      if (handles != IntPtr.Zero) Marshal.FreeHGlobal(handles);
      if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
      if (job != IntPtr.Zero) CloseHandle(job);
    }
  }

  private static bool EnableKillOnClose(IntPtr job) {
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    int bytes = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
    IntPtr memory = Marshal.AllocHGlobal(bytes);
    try {
      Marshal.StructureToPtr(limits, memory, false);
      return SetInformationJobObject(job, 9, memory, (uint)bytes);
    } finally {
      Marshal.FreeHGlobal(memory);
    }
  }

  private static IntPtr BuildChildEnvironment(StringDictionary variables) {
    SortedDictionary<string,string> sorted = new SortedDictionary<string,string>(StringComparer.OrdinalIgnoreCase);
    foreach (DictionaryEntry pair in variables) {
      string name = Convert.ToString(pair.Key);
      string value = Convert.ToString(pair.Value) ?? "";
      if (String.IsNullOrEmpty(name) || name.IndexOf('=') >= 0 ||
          name.IndexOf('\0') >= 0 || value.IndexOf('\0') >= 0)
        throw new InvalidOperationException("invalid child environment");
      sorted[name] = value;
    }
    StringBuilder block = new StringBuilder();
    foreach (KeyValuePair<string,string> entry in sorted) {
      block.Append(entry.Key).Append('=').Append(entry.Value).Append('\0');
    }
    block.Append('\0');
    return Marshal.StringToHGlobalUni(block.ToString());
  }

  private static bool JobEmpty(IntPtr job) {
    JOBOBJECT_BASIC_ACCOUNTING_INFORMATION accounting;
    if (!QueryInformationJobObject(job, 1, out accounting,
        (uint)Marshal.SizeOf(typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION)), IntPtr.Zero))
      return false;
    return accounting.ActiveProcesses == 0;
  }

  private static bool WaitForJobEmpty(IntPtr job, int milliseconds) {
    Stopwatch timer = Stopwatch.StartNew();
    do {
      if (JobEmpty(job)) return true;
      Thread.Sleep(50);
    } while (timer.ElapsedMilliseconds < milliseconds);
    return JobEmpty(job);
  }

  private static bool TerminateAndConfirmJob(IntPtr job, int verificationMilliseconds) {
    // TerminateJobObject targets only processes admitted through our job handle.
    // Even if TerminateJobObject returns failure, verify the actual active count.
    TerminateJobObject(job, 1);
    return WaitForJobEmpty(job, verificationMilliseconds);
  }

  private static bool TerminateSuspendedRoot(IntPtr process) {
    // Assignment failure occurs BEFORE ResumeThread: no CLI descendants started.
    TerminateProcess(process, 1);
    return WaitForSingleObject(process, 5000) == WAIT_OBJECT_0;
  }

  public static string Run(string application, string arguments, string workingDirectory,
    StringDictionary childEnvironment, int executionMilliseconds, int verificationMilliseconds) {
    IntPtr job = IntPtr.Zero;
    IntPtr environment = IntPtr.Zero;
    PROCESS_INFORMATION owned = new PROCESS_INFORMATION();
    bool created = false;
    bool assigned = false;
    try {
      job = CreateJobObjectW(IntPtr.Zero, null);
      if (job == IntPtr.Zero || !EnableKillOnClose(job))
        return "BLOCKED_PROCESS_START_FAILED";

      environment = BuildChildEnvironment(childEnvironment);
      STARTUPINFO startup = new STARTUPINFO();
      startup.cb = (uint)Marshal.SizeOf(typeof(STARTUPINFO));
      StringBuilder command = new StringBuilder("\"" + application + "\" " + arguments);
      // The wrapper is SUSPENDED until it is inside the kill-on-close job.
      // No CLI/Node descendants can start during job assignment.
      if (!CreateProcessW(application, command, IntPtr.Zero, IntPtr.Zero, false,
          CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW,
          environment, workingDirectory, ref startup, out owned))
        return "BLOCKED_PROCESS_START_FAILED";
      created = true;

      if (!AssignProcessToJobObject(job, owned.hProcess)) {
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_PROCESS_START_FAILED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }
      assigned = true;
      if (ResumeThread(owned.hThread) == WAIT_FAILED) {
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_PROCESS_START_FAILED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }

      uint wait = WaitForSingleObject(owned.hProcess, (uint)executionMilliseconds);
      if (wait == WAIT_TIMEOUT) {
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_TIMEOUT_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }
      if (wait != WAIT_OBJECT_0) {
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_WAIT_FAILURE_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }

      uint exitCode;
      if (!GetExitCodeProcess(owned.hProcess, out exitCode)) {
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_WAIT_FAILURE_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }
      // cmd.exe's exit is insufficient: npx/Node descendants must also exit.
      if (!WaitForJobEmpty(job, verificationMilliseconds)) {
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      }
      return exitCode == 0 ? "EXIT_ZERO" : "BLOCKED_NONZERO_EXIT";
    } catch {
      if (assigned)
        return TerminateAndConfirmJob(job, verificationMilliseconds)
          ? "BLOCKED_RUNNER_FAILURE_TREE_TERMINATED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      if (created)
        return TerminateSuspendedRoot(owned.hProcess)
          ? "BLOCKED_PROCESS_START_FAILED"
          : "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
      return "BLOCKED_PROCESS_START_FAILED";
    } finally {
      // KILL_ON_JOB_CLOSE is a final safety net, NOT confirmation of death.
      // Never publish PID, child environment, command line or native errors.
      if (owned.hThread != IntPtr.Zero) CloseHandle(owned.hThread);
      if (owned.hProcess != IntPtr.Zero) CloseHandle(owned.hProcess);
      if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
      if (job != IntPtr.Zero) CloseHandle(job);
    }
  }
}
'@ -ErrorAction Stop
    } catch {
      throw 'BLOCKED_PROCESS_START_FAILED: native Windows Job Object runner unavailable'
    }
  }
  try {
    if ($SqlMode) {
      if ($VersionProbe -or $null -eq $SqlBytes) {
        throw 'BLOCKED_SQL_MODE_INVALID'
      }
      $milliseconds = if ($Matrix) { 900000 } else { 120000 }
      return [FfhRlsJobRunner]::RunPsql(
        $StartInfo.FileName, $StartInfo.Arguments, $StartInfo.WorkingDirectory,
        $StartInfo.EnvironmentVariables, $SqlBytes, [bool]$Matrix,
        $milliseconds, 10000
      )
    }
    if ($VersionProbe) {
      # 60s wall-clock job budget + 10s bounded descendant verification.
      # The native runner returns only redacted outcome classifications.
      return [FfhRlsJobRunner]::RunVersion(
        $StartInfo.FileName, $StartInfo.Arguments, $StartInfo.WorkingDirectory,
        $StartInfo.EnvironmentVariables, 60000, 10000
      )
    }
    # Win32 CreateProcessW begins SUSPENDED; AssignProcessToJobObject happens
    # BEFORE ResumeThread. Verification polls actual job ActiveProcesses.
    return [FfhRlsJobRunner]::Run(
      $StartInfo.FileName, $StartInfo.Arguments, $StartInfo.WorkingDirectory,
      $StartInfo.EnvironmentVariables, 900000, 10000
    )
  } catch {
    throw 'BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING'
  }
}

function Invoke-FfhPinnedLocalSupabase {
  param([Parameter(Mandatory=$true)][ValidateSet('Start','Reset')][string]$Operation)
  Assert-FfhNoRemoteConfiguration
  $dockerBinding = Assert-FfhLocalDockerDesktop
  Assert-FfhDockerEnvironment
  $npxCli = Resolve-FfhTrustedNpxCmd
  $cmdPath = Join-Path ([Environment]::SystemDirectory) 'cmd.exe'
  if (-not (Test-Path -LiteralPath $cmdPath -PathType Leaf)) {
    throw 'BLOCKED: native Windows command processor unavailable'
  }
  $supabaseCliArguments = if ($Operation -ceq 'Start') { 'db start' } else { 'db reset --local --no-seed' }
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $cmdPath
  $startInfo.Arguments = '/d /s /c ""' + $npxCli.Source + '" --yes supabase@2.122.0 ' + $supabaseCliArguments + ' 1>NUL 2>NUL"'
  $startInfo.WorkingDirectory = (Get-Location).Path
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  foreach ($key in @($startInfo.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^(?i:DOCKER_)') {
      $startInfo.EnvironmentVariables.Remove([string]$key)
    }
  }
  $startInfo.EnvironmentVariables['DOCKER_HOST'] = $dockerBinding.Endpoint
  if ($startInfo.EnvironmentVariables.ContainsKey('DOCKER_CONTEXT') -or
      $startInfo.EnvironmentVariables.ContainsKey('DOCKER_TLS_VERIFY') -or
      $startInfo.EnvironmentVariables.ContainsKey('DOCKER_CONFIG') -or
      $startInfo.EnvironmentVariables['DOCKER_HOST'] -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'BLOCKED: conflicting child Docker endpoint or TLS context'
  }
  $parentDockerHost = [Environment]::GetEnvironmentVariable('DOCKER_HOST','Process')
  try {
    $outcome = Invoke-FfhNativeJobChild -StartInfo $startInfo
    switch -CaseSensitive ($outcome) {
      'EXIT_ZERO' { break }
      'BLOCKED_NONZERO_EXIT' {
        throw 'BLOCKED_NONZERO_EXIT: pinned local Supabase CLI returned nonzero'
      }
      'BLOCKED_PROCESS_START_FAILED' {
        throw 'BLOCKED_PROCESS_START_FAILED: no CLI process permitted to continue'
      }
      'BLOCKED_TIMEOUT_TREE_TERMINATED' {
        throw 'BLOCKED_TIMEOUT_TREE_TERMINATED: do not retry or authorize Gate B'
      }
      'BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED' {
        throw 'BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED: no retry'
      }
      'BLOCKED_WAIT_FAILURE_TREE_TERMINATED' {
        throw 'BLOCKED_WAIT_FAILURE_TREE_TERMINATED: no retry'
      }
      'BLOCKED_RUNNER_FAILURE_TREE_TERMINATED' {
        throw 'BLOCKED_RUNNER_FAILURE_TREE_TERMINATED: no retry'
      }
      default {
        # Unknown outcome or inconclusive kill/verification is never a PASS.
        throw 'BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING: no retry, Gate B, reset or cleanup'
      }
    }
  }
  finally {
    [Environment]::SetEnvironmentVariable('DOCKER_HOST',$parentDockerHost,'Process')
  }
  Assert-FfhDockerEnvironment
}

function Assert-FfhDbLoopback {
  param([Parameter(Mandatory=$true)][string]$Container)
  $dockerBinding = Assert-FfhLocalDockerDesktop
  $raw = & $dockerBinding.Executable --host $dockerBinding.Endpoint inspect $Container 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $raw) {
    throw 'BLOCKED: only expected disposable container may be accessed'
  }
  $d = @(($raw -join "`n" | ConvertFrom-Json))
  if ($d.Count -ne 1 -or [string]$d[0].Name -cne ('/' + $Container) -or
      -not $d[0].State.Running -or
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

# FFH-P01 read-only psql preflight result gate. Supplied native capture is
# evaluated in memory only. It must capture LASTEXITCODE immediately after
# the Docker/psql native pipeline and return exactly one typed result.
# A PostgreSQL NOTICE is emitted on native stderr before the later role
# checks; only the FINAL literal stdout marker plus exit=0 can pass.
# RLS-PF-01: one contained local Docker/psql SQL-by-stdin launcher.
# The SQL file's exact source bytes are read in memory; the owner procedures
# already performed immutable Git-object/SHA256 source checkout validation.
# The only successful status is EXIT_ZERO after native Job Object empty and
# mode-specific completion markers; stdout/stderr/SQL are never returned.
function Invoke-FfhOwnedLocalPsql {
  param(
    [Parameter(Mandatory=$true)][ValidateSet('Preflight','Matrix')][string]$Mode,
    [Parameter(Mandatory=$true)][string]$Container,
    [Parameter(Mandatory=$true)][string]$SqlPath,
    [Parameter(Mandatory=$true)]$DockerBinding,
    [Parameter(Mandatory=$true)]$Source
  )
  Assert-FfhNoRemoteConfiguration
  Assert-FfhDockerEnvironment
  if ($Container -cnotmatch '^supabase_db_ffh_p01_rls_fresh_[a-f0-9]{12}$' -or
      [string]$DockerBinding.Endpoint -cne 'npipe:////./pipe/dockerDesktopLinuxEngine' -or
      [string]::IsNullOrWhiteSpace([string]$DockerBinding.Executable) -or
      -not [IO.Path]::IsPathRooted([string]$DockerBinding.Executable) -or
      -not (Test-Path -LiteralPath ([string]$DockerBinding.Executable) -PathType Leaf)) {
    throw 'BLOCKED_SQL_NATIVE_DOCKER_BINDING_INVALID: no retry/reset/cleanup'
  }
  # Independently reassert the trusted native Docker Desktop executable and
  # npipe locality before process creation, not merely a caller-provided name.
  $verified = Assert-FfhLocalDockerDesktop
  if ([string]$verified.Executable -cne [string]$DockerBinding.Executable -or
      [string]$verified.Endpoint -cne [string]$DockerBinding.Endpoint) {
    throw 'BLOCKED_SQL_NATIVE_DOCKER_IDENTITY_CHANGED: no retry/reset/cleanup'
  }
  $sqlRelative = if ($Mode -ceq 'Preflight') {
    'scripts/rls-local/preflight.sql'
  } else {
    'scripts/rls-local/matrix.sql'
  }
  $sqlExpected = Join-Path ([string]$Source.repo) $sqlRelative
  $manifestMatches = @($Source.all_files | Where-Object { $_.path -ceq $sqlRelative })
  if ($manifestMatches.Count -ne 1 -or
      $null -eq $manifestMatches[0].sha256 -or
      -not [IO.Path]::IsPathRooted($SqlPath) -or
      -not ([IO.Path]::GetFullPath($SqlPath)).Equals(
        [IO.Path]::GetFullPath($sqlExpected),[StringComparison]::OrdinalIgnoreCase) -or
      -not (Test-Path -LiteralPath $SqlPath -PathType Leaf)) {
    throw 'BLOCKED_SQL_SOURCE_PATH_OR_MANIFEST_INVALID: no retry/reset/cleanup'
  }
  # Hash the EXACT bytes sent on the owned stdin pipe immediately before use.
  # They must match the Git-object-verified SHA256 source manifest.
  $payload = [IO.File]::ReadAllBytes($SqlPath)
  if ($payload.Length -le 0 -or $payload.Length -gt 262144) {
    throw 'BLOCKED_SQL_SOURCE_BYTES_INVALID: no retry/reset/cleanup'
  }
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $actualSqlDigest = [BitConverter]::ToString($sha.ComputeHash($payload)).Replace('-','').ToLowerInvariant()
  } finally { $sha.Dispose() }
  if ($actualSqlDigest -cne [string]$manifestMatches[0].sha256) {
    throw 'BLOCKED_SQL_SOURCE_SHA256_MISMATCH: no retry/reset/cleanup'
  }
  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = [string]$verified.Executable
  # Every authorized daemon operation specifies the pinned Linux npipe.
  # Container is a strictly SHA-derived, metacharacter-free identifier.
  $start.Arguments = '--host ' + $verified.Endpoint +
    ' exec -i ' + $Container +
    ' psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres'
  $start.WorkingDirectory = (Get-Location).Path
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  foreach ($key in @($start.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^(?i:DOCKER_)') {
      $start.EnvironmentVariables.Remove([string]$key)
    }
  }
  $start.EnvironmentVariables['DOCKER_HOST'] = $verified.Endpoint
  if ($start.EnvironmentVariables.ContainsKey('DOCKER_CONTEXT') -or
      $start.EnvironmentVariables.ContainsKey('DOCKER_TLS_VERIFY') -or
      $start.EnvironmentVariables.ContainsKey('DOCKER_CONFIG') -or
      $start.EnvironmentVariables['DOCKER_HOST'] -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'BLOCKED_SQL_NATIVE_CHILD_ENVIRONMENT_INVALID: no retry/reset/cleanup'
  }
  # 120s Preflight or 900s Matrix, plus 10s descendant confirmation.
  # No PowerShell native pipeline, no LASTEXITCODE ambiguity; the C# runner
  # owns Win32 handles, finite stdin pumping and native exit retrieval.
  $outcome = Invoke-FfhNativeJobChild -StartInfo $start -SqlMode -SqlBytes $payload -Matrix:($Mode -ceq 'Matrix')
  if ($outcome -cne 'EXIT_ZERO') {
    $known = @(
      'BLOCKED_SQL_NATIVE_NONZERO_DAEMON_UNVERIFIED',
      'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED',
      'BLOCKED_SQL_TIMEOUT_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED',
      'BLOCKED_SQL_DESCENDANTS_TERMINATED_DAEMON_UNVERIFIED',
      'BLOCKED_SQL_STDIN_INCOMPLETE_DAEMON_UNVERIFIED',
      'BLOCKED_SQL_PROCESS_START_FAILED',
      'BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED'
    )
    $category = if ($known -ccontains $outcome) { $outcome } else {
      'BLOCKED_SQL_NATIVE_OR_DAEMON_STATE_UNVERIFIED'
    }
    throw ($category + ': no retry, cleanup, reset or Gate B; container-side SQL session UNKNOWN')
  }
  Assert-FfhDockerEnvironment
}

function Assert-FfhReadOnlyPsqlPreflightReceipt {
  param(
    [Parameter(Mandatory=$true)][scriptblock]$NativeCapture
  )
  $results = $null
  try {
    # Never disclose native error records or mixed output from the invocation.
    $results = @(& $NativeCapture 2>$null)
  } catch {
    throw 'BLOCKED: local PostgreSQL preflight native invocation failed'
  }
  if ($null -eq $results -or $results.Count -ne 1 -or
      $null -eq $results[0]) {
    throw 'BLOCKED: local PostgreSQL preflight result absent or ambiguous'
  }
  $result = $results[0]
  $fields = @($result.PSObject.Properties.Name)
  if ($fields -cnotcontains 'ExitCode' -or $fields -cnotcontains 'Stdout' -or
      $null -eq $result.ExitCode -or
      $result.ExitCode -isnot [int] -or $result.ExitCode -ne 0) {
    throw 'BLOCKED: local PostgreSQL preflight process failed or indeterminate'
  }
  if ($null -eq $result.Stdout) {
    throw 'BLOCKED: local PostgreSQL preflight final marker missing'
  }
  $expected = 'PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1'
  $allLines = New-Object 'System.Collections.Generic.List[string]'
  foreach ($piece in @($result.Stdout)) {
    if ($null -eq $piece -or $piece -isnot [string]) {
      throw 'BLOCKED: local PostgreSQL preflight stdout invalid'
    }
    $normalized = $piece.Replace("`r`n","`n").Replace("`r","`n")
    foreach ($line in $normalized.Split([char]"`n")) {
      [void]$allLines.Add($line)
    }
  }
  $markerCount = 0
  $lastNonempty = $null
  foreach ($line in $allLines) {
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $lastNonempty = $line
    }
    if ($line.Contains('PREFLIGHT_PASS')) {
      if ($line -cne $expected) {
        throw 'BLOCKED: local PostgreSQL preflight marker incorrect or ambiguous'
      }
      $markerCount++
    }
  }
  if ($markerCount -ne 1 -or $lastNonempty -cne $expected) {
    throw 'BLOCKED: local PostgreSQL preflight final marker absent or duplicated'
  }
  # Do not return raw stdout, stderr or the native capture object.
}
