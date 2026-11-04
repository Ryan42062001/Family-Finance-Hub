# FFH-P01 FUTURE OWNER-ONLY MATRIX EXECUTION (not authorized by source work).
# Requires a separate GO after targeted independent source re-audit AND fresh
# candidate-database setup through prepare-fresh-owner.ps1 at the SAME HEAD.
# Never runs on or resets the older FFH-RLS-Test container/project.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string]$ExpectedHead,

  [Parameter(Mandatory=$true)]
  [string]$FreshRoot,

  [Parameter(Mandatory=$true)]
  [ValidateSet('FFH-P01-RLS-EXECUTION-GO')]
  [string]$ExplicitAuthorization
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/source-provenance.ps1"
. "$PSScriptRoot/automatic-cleanup.ps1"
. "$PSScriptRoot/cleanup-executor.ps1"
Assert-FfhNoRemoteConfiguration
# Mandatory BEFORE any Docker daemon command or CLI that can invoke Docker.
[void](Assert-FfhLocalDockerDesktop)
$source = Assert-FfhSourceCheckout -ExpectedHead $ExpectedHead
$leaf=Split-Path $FreshRoot -Leaf
if ($leaf -cnotmatch '^FFH-P01-RLS-Fresh-[0-9a-f]{12}-([0-9a-f]{24})$') {
  throw 'BLOCKED: expected unique Gate A root name with full random token'
}
$identity=Get-FfhRunIdentity -SourceSha $ExpectedHead -RunToken $Matches[1]
if (-not ([IO.Path]::GetFullPath($FreshRoot)).Equals(
  $identity.root,[StringComparison]::OrdinalIgnoreCase)) {
  throw 'BLOCKED: Gate B root does not match preserved run identity'
}
$lock=Enter-FfhLifecycleLock -Identity $identity
$gateBStarted=$false
$gateBSqlStage='Preflight'
$terminalStatePersistenceFailed=$false
try {
  $j=Read-FfhJournal -Identity $identity
  if ($j.state -cne 'GATE_A_PRESERVED' -or
      $j.cleanupResult -cne 'PRESERVED_FOR_GATE_B' -or
      -not $j.evidenceSaved -or $j.gateAResult -cne 'PASS' -or
      $j.gateBResult -cne 'NOT_STARTED' -or $j.testResult -cne 'PASS') {
    throw 'BLOCKED: Gate A preservation receipt absent or already consumed'
  }
  $ports=@($j.ports)
  if ($ports.Count -ne 2) { throw 'BLOCKED: preserved port pair absent' }
  $root = Assert-FfhFreshRoot -FreshRoot $FreshRoot -RepoRoot $source.repo -ExpectedHead $ExpectedHead -RunToken $identity.token
Assert-FfhFreshTree -FreshRoot $root
if (-not (Test-Path -LiteralPath $root -PathType Container)) {
  throw 'BLOCKED: approved fresh isolated project folder absent; do not use old DB'
}
$projectId = Get-FfhFreshProjectId -ExpectedHead $ExpectedHead -RunToken $identity.token
$container = 'supabase_db_' + $projectId
$receiptPath = Join-Path $root 'ffh-p01-local-provenance.json'
$receiptHashPath = Join-Path $root 'ffh-p01-local-provenance.sha256'
if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $receiptHashPath -PathType Leaf)) {
  throw 'BLOCKED: fresh migration application SHA-256 receipt missing'
}
$receiptHash = (Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
$savedReceiptHash = ([IO.File]::ReadAllText($receiptHashPath)).Trim()
if ($receiptHash -cne $savedReceiptHash) {
  throw 'BLOCKED: locally saved application receipt changed after preparation'
}
$receipt = Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($receipt.source_sha -cne $ExpectedHead -or
    $receipt.cli_version -cne '2.122.0' -or
    $receipt.project_id -cne $projectId -or
    $receipt.db_container -cne $container -or
    $receipt.db_port -ne $ports[0] -or
    $receipt.shadow_port -ne $ports[1] -or
    $receipt.run_token -cne $identity.token -or
    $receipt.migration_count -ne 15 -or
    $receipt.migration_application -cne 'OWNER_OPERATED_NEW_PROJECT_RESET_APPLIED_AND_PREFLIGHT_PASS') {
  throw 'BLOCKED: new local DB initialization receipt invalid or wrong HEAD'
}
# Manifest covers all 15 migration files, SQL preflight/matrix, both owner
# procedures, shared hash guard and existing run.sh. Verify every immutable
# source row again, and verify all COPIED migration bytes remain unchanged.
if (@($receipt.source_sha256).Count -ne @($source.all_files).Count -or
    @($receipt.source_sha256 | Where-Object { $_.path -like 'supabase/migrations/*.sql' }).Count -ne 15) {
  throw 'BLOCKED: source SHA-256 manifest incomplete'
}
foreach ($expected in $source.all_files) {
  $matchingReceiptRows = @($receipt.source_sha256 | Where-Object { $_.path -ceq $expected.path })
  if ($matchingReceiptRows.Count -ne 1 -or $matchingReceiptRows[0].sha256 -cne $expected.sha256 -or
      $matchingReceiptRows[0].git_blob -cne $expected.git_blob) {
    throw 'BLOCKED: manifest source bytes do not match immutable checkout'
  }
}
$migrationsDir = Join-Path $root 'supabase/migrations'
if (@(Get-ChildItem -LiteralPath $migrationsDir -File -Filter '*.sql').Count -ne 15) {
  throw 'BLOCKED: fresh migration snapshot file count changed'
}
foreach ($expected in $source.migration_files) {
  $copy = Join-Path $root ($expected.path -replace '/','\')
  if (-not (Test-Path -LiteralPath $copy -PathType Leaf) -or
      (Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected.sha256) {
    throw 'BLOCKED: frozen migration bytes or copied snapshot mismatch'
  }
}
$configPath = Join-Path $root 'supabase/config.toml'
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf) -or
    (Get-FileHash -LiteralPath $configPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne
      $receipt.config_sha256 -or
    [IO.File]::ReadAllText($configPath) -cne (Get-FfhFreshConfig -ExpectedHead $ExpectedHead -RunToken $identity.token -DbPort $ports[0] -ShadowPort $ports[1])) {
  throw 'BLOCKED: fresh local-only configuration differs from SHA-bound template'
}
if (Test-Path -LiteralPath (Join-Path $root 'supabase/.temp/project-ref')) {
  throw 'BLOCKED: hosted Supabase project link present; do not run'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'BLOCKED: Docker unavailable'
}
Assert-FfhFreshTree -FreshRoot $root
[void](Assert-FfhLocalDockerDesktop)
[void](Assert-FfhDbLoopback -Container $container -DbPort $ports[0])
Write-Output "FRESH_MATRIX_GUARD=PASS SOURCE_SHA=$ExpectedHead MIGRATIONS=15 PORT=LOOPBACK MANIFEST=SHA256_MATCH"

$gateBStarted=$true
[void](Set-FfhRunState -Identity $identity -State 'GATE_B_RUNNING' -GateBResult 'RUNNING' -TestResult 'RUNNING')
# Revalidate catalog and effective role/claim preflight over Docker-local stdin
# before ANY synthetic identities/transactions are attempted. No DB URL,
# database password, provider token, hosted Auth or service-role session.
Assert-FfhFreshTree -FreshRoot $root
$dockerBinding = Assert-FfhLocalDockerDesktop
$gateBSqlStage='Preflight'
[void](Set-FfhSqlBoundary -Identity $identity -Phase 'GATE_B' -Mode 'Preflight' -Status 'PENDING')
$admittedContainerId=Assert-FfhJournaledSqlAdmission -Identity $identity -Phase 'GATE_B'
[void](Set-FfhSqlBoundary -Identity $identity -Phase 'GATE_B' -Mode 'Preflight' -Status 'ADMITTED' -ContainerId $admittedContainerId)
# Gate B remains unapproved. When separately authorized, its read-only
# role preflight uses the identical bounded Job Object SQL-by-stdin path.
Invoke-FfhOwnedLocalPsql -Mode Preflight -Container $container `
  -SqlPath (Join-Path $source.repo 'scripts/rls-local/preflight.sql') `
  -DockerBinding $dockerBinding -Source $source -Identity $identity `
  -ContainerId $admittedContainerId
Write-Output 'FRESH_LOCAL_PREFLIGHT=PASS'
$gateBSqlStage='Matrix'

# All synthetic fixture operations are BEGIN/ROLLBACK protected in matrix.sql.
# Expected SQL errors use PL/pgSQL subtransactions. If psql returns nonzero,
# the session closes and PostgreSQL rolls back; never retry or manually clean
# without new approval. A matrix PASS remains OWNER-OBSERVED only.
Assert-FfhFreshTree -FreshRoot $root
$dockerBinding = Assert-FfhLocalDockerDesktop
[void](Set-FfhSqlBoundary -Identity $identity -Phase 'GATE_B' -Mode 'Matrix' -Status 'PENDING')
$admittedContainerId=Assert-FfhJournaledSqlAdmission -Identity $identity -Phase 'GATE_B'
[void](Set-FfhSqlBoundary -Identity $identity -Phase 'GATE_B' -Mode 'Matrix' -Status 'ADMITTED' -ContainerId $admittedContainerId)
# Separate finite 15-minute matrix window. Exact immutable matrix.sql is
# piped in memory with owned stdin and must emit both ROLLBACK and ZERO_RESIDUE
# completion markers after exactly 913 PASS receipts. Timeouts never imply
# daemon-side rollback, cleanup, retry permission or zero residue.
Invoke-FfhOwnedLocalPsql -Mode Matrix -Container $container `
  -SqlPath (Join-Path $source.repo 'scripts/rls-local/matrix.sql') `
  -DockerBinding $dockerBinding -Source $source -Identity $identity `
  -ContainerId $admittedContainerId
$cleanup=Complete-FfhGateB -Identity $identity -GateBResult 'PASS'
[void](Assert-FfhGateBSuccessfulExit -Identity $identity -CleanupResult $cleanup)
Write-Output (Get-FfhDurableRunStatus -Identity $identity)
Write-Output "OWNER_OPERATED_SYNTHETIC_MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW"

}
catch {
  if ($gateBStarted) {
    try {
      $current=Read-FfhJournal -Identity $identity
      if ($current.gateBResult -ceq 'RUNNING') {
        $boundary=$current.sqlBoundary
        $admittedSqlActuallyStarted=($boundary.phase -ceq 'GATE_B' -and
          $boundary.mode -ceq $gateBSqlStage -and
          $boundary.status -ceq 'COMPLETE' -and
          $boundary.containerId -cmatch '^[a-f0-9]{64}$')
        if ($admittedSqlActuallyStarted) {
          # Only an actually executed, journaled SQL test may attempt bounded
          # cleanup. The idle query must independently reattest exact ID.
          [void](Complete-FfhGateB -Identity $identity -GateBResult 'FAIL')
        } else {
          # Rejected/UNKNOWN admission: absolutely NO SQL-idle probe and
          # absolutely NO Docker destructive operation.
          [void](Block-FfhRejectedSqlAdmission -Identity $identity -Phase 'GATE_B' -Mode $gateBSqlStage)
        }
      } elseif ($current.gateBResult -ceq 'PASS') {
        if ($current.cleanupResult -cne 'CLEANUP_VERIFIED') {
          [void](Set-FfhRunState -Identity $identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
        }
      } else {
        # An earlier independently committed FAIL/UNKNOWN is retained.
        if ($current.cleanupResult -cne 'CLEANUP_VERIFIED' -and
            $current.cleanupResult -cne 'CLEANUP_BLOCKED_MANUAL_REVIEW') {
          [void](Set-FfhRunState -Identity $identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
        }
      }
    } catch {
      try {
        $fallback=Read-FfhJournal -Identity $identity
        if ($fallback.gateBResult -ceq 'RUNNING') {
          [void](Set-FfhRunState -Identity $identity -State 'MANUAL_REVIEW' -GateBResult 'UNKNOWN' -TestResult 'UNKNOWN' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
        } else {
          [void](Set-FfhRunState -Identity $identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
        }
      } catch {
        $terminalStatePersistenceFailed=$true
      }
    }
  }
  # A readable older journal does not prove that the attempted terminal
  # transition was persisted. Make uncertainty explicit and exit nonzero.
  Write-Output (Get-FfhDurableRunStatus -Identity $identity -TerminalStatePersistenceFailed:$terminalStatePersistenceFailed)
  throw 'BLOCKED: Gate B failure/admission/cleanup uncertain; inspect durable state'
}
finally { $lock.Dispose() }
