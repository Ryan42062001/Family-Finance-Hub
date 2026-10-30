# FFH-P01 SOURCE-ONLY owner-operated procedure. DO NOT EXECUTE without a
# separate, fresh Manager/Owner authorization for disposable local SQL writes.
# Never use this against hosted Supabase or a nonempty database.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string] $ExpectedHead,

  [Parameter(Mandatory=$true)]
  [ValidateSet('FFH-P01-RLS-EXECUTION-GO')]
  [string] $ExplicitAuthorization,

  [string] $Container = 'supabase_db_FFH-RLS-Test'
)
$ErrorActionPreference = 'Stop'

if ($Container -cne 'supabase_db_FFH-RLS-Test') {
  throw 'BLOCKED: only the owner-identified disposable local DB is allowed'
}
foreach ($name in @('SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','DATABASE_URL',
                    'SUPABASE_URL','SUPABASE_PROJECT_ID','PGHOST','PGSERVICE')) {
  if ([Environment]::GetEnvironmentVariable($name)) {
    throw "BLOCKED: remote connection variable present ($name)"
  }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue) -or
    -not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'BLOCKED: git and Docker CLI are required'
}
$root = (git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'BLOCKED: no Git repository' }
$root = $root.Trim()
Push-Location $root
try {
  $branch = (git branch --show-current).Trim()
  $head = (git rev-parse HEAD).Trim()
  if ($branch -cne 'phase/ffh-p01-release-readiness' -or $head -cne $ExpectedHead) {
    throw 'BLOCKED: branch/immutable HEAD mismatch'
  }
  git diff --quiet HEAD -- scripts/rls-local/preflight.sql scripts/rls-local/matrix.sql
  if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: uncommitted SQL file change' }
  if (Test-Path 'supabase/.temp/project-ref') {
    throw 'BLOCKED: Supabase project link present in this checkout'
  }
  $data = docker inspect $Container 2>$null | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0 -or @($data).Count -ne 1) {
    throw 'BLOCKED: expected local Docker container was not found'
  }
  $db = @($data)[0]
  if (-not $db.State.Running -or $db.State.Health.Status -ne 'healthy') {
    throw 'BLOCKED: local PostgreSQL is not healthy'
  }
  $bindings = @($db.NetworkSettings.Ports.'5432/tcp')
  if ($bindings.Count -eq 0) { throw 'BLOCKED: no verified localhost DB port' }
  foreach ($binding in $bindings) {
    if ($binding.HostIp -cnotin @('127.0.0.1','::1') -or
        $binding.HostPort -cne '54322') {
      throw 'BLOCKED: PostgreSQL is not bound exclusively to localhost:54322'
    }
  }
  Write-Output "LOCAL_OWNER_GUARD=PASS SHA=$head DB=DOCKER_LOOPBACK_ONLY"
  # Postgres preflight is read-only. If it fails, absolutely NO fixture SQL.
  # Run over Docker's stdin (NOT through a URL, key, JWT or hosted client).
  Get-Content 'scripts/rls-local/preflight.sql' -Raw -Encoding UTF8 |
    docker exec -i $Container psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: PostgreSQL preflight failed; matrix not attempted' }
  Write-Output 'LOCAL_PREFLIGHT=PASS'
  # The SQL owns BEGIN/ROLLBACK and separate zero-residue validation.
  # Any SQL error causes psql ON_ERROR_STOP and connection rollback; do NOT retry.
  Get-Content 'scripts/rls-local/matrix.sql' -Raw -Encoding UTF8 |
    docker exec -i $Container psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) {
    throw 'BLOCKED: matrix failed; stop, preserve privacy-safe receipt, no retry or manual cleanup'
  }
  Write-Output 'OWNER_OPERATED_SYNTHETIC_MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW'
}
finally {
  Pop-Location
}
