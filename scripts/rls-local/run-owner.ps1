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
try {
  $j=Read-FfhJournal -Identity $identity
  if ($j.state -cne 'GATE_A_PRESERVED' -or
      $j.cleanupResult -cne 'PRESERVED_FOR_GATE_B' -or
      -not $j.evidenceSaved -or $j.testResult -cne 'PASS') {
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
[void](Set-FfhRunState -Identity $identity -State 'GATE_B_RUNNING')
# Revalidate catalog and effective role/claim preflight over Docker-local stdin
# before ANY synthetic identities/transactions are attempted. No DB URL,
# database password, provider token, hosted Auth or service-role session.
Assert-FfhFreshTree -FreshRoot $root
$dockerBinding = Assert-FfhLocalDockerDesktop
# Gate B remains unapproved. When separately authorized, its read-only
# role preflight uses the identical bounded Job Object SQL-by-stdin path.
Invoke-FfhOwnedLocalPsql -Mode Preflight -Container $container `
  -SqlPath (Join-Path $source.repo 'scripts/rls-local/preflight.sql') `
  -DockerBinding $dockerBinding -Source $source
Write-Output 'FRESH_LOCAL_PREFLIGHT=PASS'

# All synthetic fixture operations are BEGIN/ROLLBACK protected in matrix.sql.
# Expected SQL errors use PL/pgSQL subtransactions. If psql returns nonzero,
# the session closes and PostgreSQL rolls back; never retry or manually clean
# without new approval. A matrix PASS remains OWNER-OBSERVED only.
Assert-FfhFreshTree -FreshRoot $root
$dockerBinding = Assert-FfhLocalDockerDesktop
# Separate finite 15-minute matrix window. Exact immutable matrix.sql is
# piped in memory with owned stdin and must emit both ROLLBACK and ZERO_RESIDUE
# completion markers after exactly 913 PASS receipts. Timeouts never imply
# daemon-side rollback, cleanup, retry permission or zero residue.
Invoke-FfhOwnedLocalPsql -Mode Matrix -Container $container `
  -SqlPath (Join-Path $source.repo 'scripts/rls-local/matrix.sql') `
  -DockerBinding $dockerBinding -Source $source
[void](Set-FfhRunState -Identity $identity -State 'GATE_B_COMPLETE' -TestResult 'PASS')
Write-FfhRedactedEvidence -Identity $identity -Phase 'GATE_B' -Result 'PASS' -Category 'NONE'
[void](Register-FfhOwnedResources -Identity $identity)
[void](Set-FfhRunState -Identity $identity -State 'GATE_B_COMPLETE')
$idleness=Get-FfhSqlIdleAttestation -Identity $identity
$cleanup=Invoke-FfhVerifiedCleanup -Identity $identity -SqlIdleAttestation $idleness
Write-Output "TEST_RESULT=PASS CLEANUP_RESULT=$cleanup RUN_TOKEN=$($identity.token) OWNER_OPERATED_SYNTHETIC_MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW"

}
catch {
  if ($gateBStarted) {
    try {
      $current=Read-FfhJournal -Identity $identity
      if ($current.testResult -cne 'PASS') {
        Write-FfhRedactedEvidence -Identity $identity -Phase 'GATE_B' -Result 'FAIL' -Category 'GATE_B_FAILURE'
        [void](Register-FfhOwnedResources -Identity $identity)
        [void](Set-FfhRunState -Identity $identity -State 'GATE_B_FAILED' -TestResult 'FAIL')
        $idle=Get-FfhSqlIdleAttestation -Identity $identity
        $cleanup=Invoke-FfhVerifiedCleanup -Identity $identity -SqlIdleAttestation $idle
        Write-Output "TEST_RESULT=FAIL CLEANUP_RESULT=$cleanup RUN_TOKEN=$($identity.token)"
      }
    } catch {
      [void](Set-FfhRunState -Identity $identity -State 'MANUAL_REVIEW' -CleanupResult 'CLEANUP_BLOCKED_MANUAL_REVIEW')
      Write-Output "TEST_RESULT=FAIL CLEANUP_RESULT=CLEANUP_BLOCKED_MANUAL_REVIEW RUN_TOKEN=$($identity.token)"
    }
  }
  throw 'BLOCKED: Gate B failed or cleanup uncertain; independent test result preserved in journal'
}
finally { $lock.Dispose() }
