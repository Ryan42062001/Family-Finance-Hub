# FFH-P01 #83: ONE OWNER-APPROVED, NONFORMAL disposable Docker/Supabase check.
# Separate from formal prepare-fresh-owner.ps1 (Gate A) and run-owner.ps1 (Gate B).
# PLAN is read-only. RUN creates exactly one new project and refuses retries.
# Owner invokes on Windows only after independent exact-head security audit.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('Plan','Run')][string]$Mode,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedHead,
  [string]$CliExecutable,
  [string]$CliSha256,
  [ValidateSet('FFH-P01-ONE-SHOT-DIAGNOSTIC-GO')][string]$ExplicitAuthorization
)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/source-provenance.ps1"
. "$PSScriptRoot/automatic-cleanup.ps1"
. "$PSScriptRoot/cleanup-executor.ps1"
. "$PSScriptRoot/diagnostic-lifecycle.ps1"

function Assert-FfhDiagnosticApprovedCheckout {
  param($Source)
  $profile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $approved=Join-Path $profile 'Family-Finance-Hub-P01-Audit'
  if (-not ([IO.Path]::GetFullPath($Source.repo)).Equals(
      [IO.Path]::GetFullPath($approved),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED_DIAG_ONLY_SEPARATE_AUDIT_CHECKOUT'
  }
  Assert-FfhNoReparsePath -Path $Source.repo
}

function New-FfhDiagnosticOneShotLedger {
  param($Identity,$Cli)
  $path=Join-Path $Identity.evidence '.ffh-p01-one-shot-diagnostic.json'
  if (Test-Path -LiteralPath $path) {throw 'BLOCKED_DIAG_RUN_ALREADY_CONSUMED'}
  $payload=[ordered]@{
    schema=1; runKind='ONE_SHOT_DIAGNOSTIC'
    sha=$Identity.sha;token=$Identity.token
    cliVersion='2.122.0';cliSha256=$Cli.Sha256
    state='CONSUMED_BEFORE_ANY_PROJECT_CREATION'
    atUtc=[DateTime]::UtcNow.ToString('o')
  }
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($payload | ConvertTo-Json -Depth 4))
  $fs=[IO.FileStream]::new($path,[IO.FileMode]::CreateNew,
    [IO.FileAccess]::Write,[IO.FileShare]::None)
  try {$fs.Write($bytes,0,$bytes.Length);$fs.Flush($true)} finally {$fs.Dispose()}
  Initialize-FfhPrivateEvidenceAcl -Path $path -NewlyCreated
  Assert-FfhEvidenceEntry -Identity $Identity -Path $path
}

function Start-FfhDiagnosticPinnedDb {
  param($Identity,$Cli,[scriptblock]$FakeStart)
  Assert-FfhNoRemoteConfiguration
  Assert-FfhDockerEnvironment
  $docker=Assert-FfhLocalDockerDesktop
  if ($docker.Endpoint -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'BLOCKED_DIAG_DOCKER_ENDPOINT_CHANGED'
  }
  if ($FakeStart) {
    $answer=@(& $FakeStart $Identity $Cli)
    if ($answer.Count -ne 1 -or $answer[0] -cne 'EXIT_ZERO') {
      throw 'BLOCKED_DIAG_START_UNVERIFIED'
    }
    return
  }
  $info=[Diagnostics.ProcessStartInfo]::new()
  $info.FileName=$Cli.Path
  $info.Arguments='db start'
  $info.WorkingDirectory=$Identity.root
  $info.UseShellExecute=$false
  $info.CreateNoWindow=$true
  foreach($key in @($info.EnvironmentVariables.Keys)) {
    if ([string]$key -match '^(?i:DOCKER_)') {$info.EnvironmentVariables.Remove($key)}
  }
  $info.EnvironmentVariables['DOCKER_HOST']=$docker.Endpoint
  $info.EnvironmentVariables['DO_NOT_TRACK']='1'
  if ((Invoke-FfhNativeJobChild -StartInfo $info) -cne 'EXIT_ZERO') {
    throw 'BLOCKED_DIAG_START_NONZERO_TIMEOUT_OR_INDETERMINATE'
  }
  Assert-FfhDockerEnvironment
}

function New-FfhDiagnosticTree {
  param($Identity,$Source,$Ports,$Cli)
  $root=Assert-FfhFreshRoot -FreshRoot $Identity.root -RepoRoot $Source.repo -ExpectedHead $Identity.sha -RunToken $Identity.token
  if (Test-Path -LiteralPath $root) {throw 'BLOCKED_DIAG_NEW_ROOT_ALREADY_EXISTS'}
  [void](New-Item -ItemType Directory -Path $root -ErrorAction Stop)
  Initialize-FfhOwnedRoot -Identity $Identity
  $s=Join-Path $root 'supabase'
  $m=Join-Path $s 'migrations'
  [void](New-Item -ItemType Directory -Path $s -ErrorAction Stop)
  [void](New-Item -ItemType Directory -Path $m -ErrorAction Stop)
  foreach($file in @($Source.migration_files)) {
    $src=Join-Path $Source.repo $file.path
    $dest=Join-Path $root ($file.path -replace '/','\')
    Copy-Item -LiteralPath $src -Destination $dest -ErrorAction Stop
    if ((Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant() -cne $file.sha256) {
      throw 'BLOCKED_DIAG_COPIED_MIGRATION_DRIFT'
    }
  }
  if (@(Get-ChildItem -LiteralPath $m -File -Filter '*.sql').Count -ne 15) {
    throw 'BLOCKED_DIAG_NOT_EXACTLY_15_MIGRATIONS'
  }
  $config=(Get-FfhFreshConfig -ExpectedHead $Identity.sha -RunToken $Identity.token -DbPort ([int]$Ports[0]) -ShadowPort ([int]$Ports[1]))
  [IO.File]::WriteAllText((Join-Path $s 'config.toml'),$config,[Text.UTF8Encoding]::new($false))
  $receipt=[ordered]@{
    kind='NONFORMAL_ONE_SHOT_DIAGNOSTIC'
    source_sha=$Identity.sha;run_token=$Identity.token
    project_id=$Identity.project;cli_version='2.122.0'
    cli_sha256=$Cli.Sha256;db_port=[int]$Ports[0];shadow_port=[int]$Ports[1]
    migrations_copied=15;gateA='NOT_EXECUTED';gateB='NOT_EXECUTED'
    sql_migration_reset='NEVER_INVOKED'
  }
  $receiptJson=($receipt | ConvertTo-Json -Depth 6)
  Set-FfhRootReceiptPermit -Identity $Identity -Kind Receipt -Content $receiptJson
  [IO.File]::WriteAllText((Join-Path $root 'ffh-p01-local-provenance.json'),$receiptJson,[Text.UTF8Encoding]::new($false))
  Assert-FfhFreshTree -FreshRoot $root
  return $root
}

# Assert all test observations BEFORE claiming diagnostic PASS; result and
# cleanup receipts stay distinct, and no formal SQL COMPLETE is ever written.
function Confirm-FfhDiagnosticStarted {
  param($Identity,$Source,[scriptblock]$FakeDocker,[scriptblock]$FakeFilesystem)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.diagnosticStatus -cne 'START_IN_FLIGHT' -or
      $j.testResult -cne 'RUNNING') {throw 'BLOCKED_DIAG_START_STATE_CHANGED'}
  $dual=@(Assert-FfhDiagnosticLabelBijection -Identity $Identity -Fake $FakeDocker)
  $observed=@(Get-FfhResourceSnapshot -Identity $Identity -Fake $FakeDocker)
  if ($observed.Count -ne $dual.Count -or $observed.Count -lt 1 -or
      @($observed | Where-Object kind -eq containers).Count -ne 1 -or
      @($observed | Where-Object kind -eq networks).Count -gt 1 -or
      @($observed | Where-Object kind -eq volumes).Count -gt 3) {
    throw 'BLOCKED_DIAG_UNRECOGNIZED_RESOURCE_SHAPE'
  }
  foreach($entry in $observed) {
    if (@($dual | Where-Object { $_.kind -ceq $entry.kind -and $_.id -ceq $entry.id }).Count -ne 1) {
      throw 'BLOCKED_DIAG_LABEL_OR_KIND_MISMATCH'
    }
  }
  if ((Get-FfhObservedDaemon -Fake $FakeDocker) -cne $j.daemon) {
    throw 'BLOCKED_DIAG_DAEMON_DRIFT'
  }
  Confirm-FfhBaseline -Journal $j -Fake $FakeDocker
  $j.resources=@($observed | ForEach-Object {
    [pscustomobject]@{kind=$_.kind;id=$_.id;name=$_.name}
  })
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  $j=Set-FfhDiagnosticJournal -Identity $Identity -Status START_VERIFIED
  [void](Assert-FfhDiagnosticDatabase -Identity $Identity -Journal $j -Fake $FakeDocker)
  [void](Get-FfhDiagnosticSqlIdle -Identity $Identity -Journal $j -Fake $FakeDocker)
  # Any unexpected CLI-generated .temp/file, config/migration drift, foreign
  # ACL, junction or stale marker blocks BEFORE Docker cleanup or file removal.
  Assert-FfhOwnedRootPreflight -Identity $Identity -Journal $j -FakeFilesystem $FakeFilesystem
  $j.testResult='PASS'
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  [void](Write-FfhDiagnosticReceipt -Identity $Identity -Journal $j -Stage TEST -Category NONE)
  $j=Read-FfhJournal -Identity $Identity
  $j.evidenceSaved=$true
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
  return $j
}

function Invoke-FfhOwnerDisposableDiagnostic {
  param([string]$Mode,[string]$ExpectedHead,[string]$CliExecutable,
    [string]$CliSha256,[string]$ExplicitAuthorization)
  if ($Mode -ceq 'Run' -and $ExplicitAuthorization -cne 'FFH-P01-ONE-SHOT-DIAGNOSTIC-GO') {
    throw 'BLOCKED_DIAG_EXPLICIT_ONE_SHOT_GO_REQUIRED'
  }
  Assert-FfhNoRemoteConfiguration
  Assert-FfhDockerEnvironment
  [void](Assert-FfhLocalDockerDesktop)
  $source=Assert-FfhSourceCheckout -ExpectedHead $ExpectedHead -AllowDetachedHeadForDiagnostic
  Assert-FfhDiagnosticApprovedCheckout -Source $source
  $cli=Resolve-FfhDiagnosticCachedCli -CliExecutable $CliExecutable -CliSha256 $CliSha256
  $identity=Get-FfhRunIdentity -SourceSha $ExpectedHead -RunToken (New-FfhRunToken)
  $ports=@(Select-FfhRunPorts -Identity $identity)
  # PLAN and RUN independently verify no namespace collision; plan reserves
  # neither its displayed random token nor ports.
  Assert-FfhDiagnosticNoPriorAttempt -Identity $identity
  $daemon=Get-FfhObservedDaemon
  $legacy=@(Get-FfhProtectedInventory)
  if ((Get-FfhObservedDaemon) -cne $daemon) {throw 'BLOCKED_DIAG_DAEMON_DRIFT'}
  Write-Output ('DIAG_PREFLIGHT=PASS MODE='+$Mode+' SOURCE_SHA='+$ExpectedHead+
    ' CLI_VERSION=2.122.0 CLI_SHA256='+$cli.Sha256+
    ' PROTECTED_ENTRY_COUNT='+$legacy.Count+' DB_HOST_IP=127.0.0.1')
  if ($Mode -ceq 'Plan') {
    Write-Output ('PLAN_ONLY=NO_MUTATION PLANNED_PROJECT='+$identity.project+
      ' PLANNED_RUN_TOKEN='+$identity.token+
      ' PLANNED_ROOT='+$identity.root+
      ' TENTATIVE_DB_PORT='+$ports[0]+' TENTATIVE_SHADOW_PORT='+$ports[1]+
      ' PLANNED_COMMAND=db_start PLANNED_CLEANUP=EXACT_OWNED_ONLY')
    return
  }
  $lock=$null;$journalCreated=$false;$statusPersisted=$true
  try {
    $lock=Enter-FfhLifecycleLock -Identity $identity
    # Reattest under the exclusive lifecycle lock.
    Assert-FfhDiagnosticNoPriorAttempt -Identity $identity
    $j=New-FfhPrecreationJournal -Identity $identity -Ports $ports
    $journalCreated=$true
    if ($j.daemon -cne $daemon -or
        (@($j.protected) -join '|') -cne ($legacy -join '|')) {
      throw 'BLOCKED_DIAG_PREFLIGHT_STATE_CHANGED'
    }
    $j.runKind='ONE_SHOT_DIAGNOSTIC'
    $j | Add-Member -MemberType NoteProperty -Name 'runKind' -Value 'ONE_SHOT_DIAGNOSTIC' -Force
    $j | Add-Member -MemberType NoteProperty -Name 'diagnosticStatus' -Value 'PRECREATION_COMMITTED' -Force
    $j | Add-Member -MemberType NoteProperty -Name 'diagnosticCliSha256' -Value $cli.Sha256 -Force
    $j.sequence=[int]$j.sequence+1
    Write-FfhJournal -Identity $identity -Journal $j
    New-FfhDiagnosticOneShotLedger -Identity $identity -Cli $cli
    [void](New-FfhDiagnosticTree -Identity $identity -Source $source -Ports $ports -Cli $cli)
    $j=Set-FfhDiagnosticJournal -Identity $identity -Status ROOT_CREATED
    # Verify copied exact permit tree before the first CLI/Docker mutation.
    Assert-FfhOwnedRootPreflight -Identity $identity -Journal $j
    $j=Set-FfhDiagnosticJournal -Identity $identity -Status START_IN_FLIGHT -TestResult RUNNING
    Start-FfhDiagnosticPinnedDb -Identity $identity -Cli $cli
    $j=Confirm-FfhDiagnosticStarted -Identity $identity -Source $source
    $result=Invoke-FfhDiagnosticCleanup -Identity $identity
    if ($result -cne 'CLEANUP_VERIFIED') {throw 'BLOCKED_DIAG_CLEANUP_UNVERIFIED'}
    $j=Read-FfhJournal -Identity $identity
    [void](Write-FfhDiagnosticReceipt -Identity $identity -Journal $j -Stage FINAL -Category NONE)
    Write-Output ('DIAG_RESULT=PASS TEST_RESULT=PASS CLEANUP_RESULT=CLEANUP_VERIFIED '+
      'RUN_TOKEN='+$identity.token+' GATE_A=NOT_STARTED GATE_B=NOT_STARTED')
  } catch {
    # Fail closed; no retry and no opportunistic Docker/SQL/FS mutation.
    if ($journalCreated) {
      try {
        $j=Read-FfhJournal -Identity $identity
        if ($j.cleanupResult -cne 'CLEANUP_VERIFIED') {
          $j.state='MANUAL_REVIEW'
          $j.diagnosticStatus='MANUAL_REVIEW'
          if ($j.testResult -ceq 'RUNNING') {$j.testResult='UNKNOWN'}
          $j.cleanupResult='CLEANUP_BLOCKED_MANUAL_REVIEW'
          $j.sequence=[int]$j.sequence+1
          Write-FfhJournal -Identity $identity -Journal $j
        }
        if (-not (Test-Path -LiteralPath (Join-Path $identity.evidence ($identity.token+'.DIAG_FINAL.json')))) {
          [void](Write-FfhDiagnosticReceipt -Identity $identity -Journal $j -Stage FINAL -Category FAIL_CLOSED)
        }
      } catch {$statusPersisted=$false}
    }
    $cleanup=if($journalCreated){'CLEANUP_BLOCKED_MANUAL_REVIEW'}else{'NOT_ATTEMPTED'}
    if (-not $statusPersisted) {$cleanup='UNKNOWN_JOURNAL_UNVERIFIED'}
    Write-Output ('DIAG_RESULT=BLOCKED TEST_RESULT=UNKNOWN CLEANUP_RESULT='+$cleanup+
      ' RUN_TOKEN='+$identity.token+' MANUAL_REVIEW_REQUIRED=YES')
    throw 'BLOCKED_DIAG_NO_RETRY_INSPECT_PRIVATE_JOURNAL'
  } finally {
    if ($null -ne $lock) {$lock.Dispose()}
  }
}
Invoke-FfhOwnerDisposableDiagnostic -Mode $Mode -ExpectedHead $ExpectedHead -CliExecutable $CliExecutable -CliSha256 $CliSha256 -ExplicitAuthorization $ExplicitAuthorization
