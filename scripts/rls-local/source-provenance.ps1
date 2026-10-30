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
function Invoke-FfhNativeJobChild {
  param([Parameter(Mandatory=$true)][Diagnostics.ProcessStartInfo]$StartInfo)
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

  [StructLayout(LayoutKind.Sequential)]
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
    public uint dwYFillAttribute;
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
  $npxCli = Get-Command npx.cmd -CommandType Application -ErrorAction SilentlyContinue
  if (-not $npxCli -or [IO.Path]::GetFileName($npxCli.Source) -cne 'npx.cmd' -or
      -not (Test-Path -LiteralPath $npxCli.Source -PathType Leaf) -or
      $npxCli.Source -match '[&|<>^%!"\r\n]') {
    throw 'BLOCKED: native npx.cmd launcher unavailable or unsafe for child invocation'
  }
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
