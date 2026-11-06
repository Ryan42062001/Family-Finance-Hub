# FFH-P01 #83 consumed one-shot recovery: READ-ONLY evidence gate only.
# No Docker exec/SQL, no Docker stop/rm, no native Retire, no journal writes,
# no one-shot ledger changes. All real recovery remains separately authorized.
function Assert-FfhConsumedRecoveryJournal {
  param($Identity,$Journal,[string]$ConsumedHead,[string]$CliSha256)
  if ($ConsumedHead -cne 'cba20f7fecea8b7dfdbcb10fb245765825ef97c0' -or
      $Identity.sha -cne $ConsumedHead -or
      $CliSha256 -cnotmatch '^[a-f0-9]{64}$' -or
      $Journal.version -ne 2 -or
      $Journal.sha -cne $Identity.sha -or
      $Journal.token -cne $Identity.token -or
      $Journal.project -cne $Identity.project -or
      $Journal.root -cne $Identity.root -or
      $Journal.evidence -cne $Identity.evidence -or
      $Journal.container -cne $Identity.container -or
      $Journal.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $Journal.cliVersion -cne '2.122.0' -or
      $Journal.diagnosticCliSha256 -cne $CliSha256 -or
      $Journal.state -cne 'MANUAL_REVIEW' -or
      $Journal.diagnosticStatus -cne 'MANUAL_REVIEW' -or
      $Journal.testResult -cne 'UNKNOWN' -or
      $Journal.cleanupResult -cne 'CLEANUP_BLOCKED_MANUAL_REVIEW' -or
      $Journal.gateAResult -cne 'NOT_STARTED' -or
      $Journal.gateBResult -cne 'NOT_STARTED' -or
      $Journal.sqlBoundary.phase -cne 'NONE' -or
      $Journal.sqlBoundary.status -cne 'NOT_STARTED' -or
      @($Journal.ports).Count -ne 2 -or
      [int]$Journal.ports[0] -lt 20000 -or
      [int]$Journal.ports[0] -gt 59998 -or
      [int]$Journal.ports[1] -ne ([int]$Journal.ports[0]+1) -or
      [int]$Journal.ports[0] -in @(54332,54333) -or
      [int]$Journal.ports[1] -in @(54332,54333) -or
      $Journal.postStartMigrationCopies -ne 15 -or
      $Journal.rootOwnership.markerVersion -ne 1 -or
      $Journal.rootOwnership.fileId -cnotmatch '^[a-f0-9]{8}:[a-f0-9]{16}$' -or
      $Journal.rootRetirement.status -cne 'NOT_STARTED' -or
      @($Journal.resources).Count -ne 3) {
    throw 'BLOCKED_RECOVERY_JOURNAL_IDENTITY_OR_STATE'
  }
  foreach ($kind in @('containers','volumes','networks')) {
    $matches=@($Journal.resources | Where-Object { $_.kind -ceq $kind })
    if ($matches.Count -ne 1) {throw 'BLOCKED_RECOVERY_RESOURCE_CARDINALITY'}
    $r=$matches[0]
    if ($kind -ceq 'containers' -and
        ($r.id -cnotmatch '^[a-f0-9]{64}$' -or
         $r.name -cne ('/'+$Identity.container))) {
      throw 'BLOCKED_RECOVERY_CONTAINER_IDENTITY'
    }
    if ($kind -ceq 'networks' -and $r.id -cnotmatch '^[a-f0-9]{64}$') {
      throw 'BLOCKED_RECOVERY_NETWORK_IDENTITY'
    }
    if ($kind -ceq 'volumes' -and ($r.id -cne $r.name -or
        $r.name -cnotmatch ('^supabase_db_'+[regex]::Escape($Identity.project)+'_data$'))) {
      throw 'BLOCKED_RECOVERY_VOLUME_IDENTITY'
    }
  }
  $ledger=Join-Path $Identity.evidence '.ffh-p01-one-shot-diagnostic.json'
  Assert-FfhEvidenceEntry -Identity $Identity -Path $ledger
  $saved=Get-Content -LiteralPath $ledger -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($saved.schema -ne 1 -or
      $saved.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $saved.sha -cne $ConsumedHead -or
      $saved.token -cne $Identity.token -or
      $saved.cliVersion -cne '2.122.0' -or
      $saved.cliSha256 -cne $CliSha256 -or
      $saved.state -cne 'CONSUMED_BEFORE_ANY_PROJECT_CREATION') {
    throw 'BLOCKED_RECOVERY_CONSUMED_LEDGER_INVALID'
  }
  $final=Join-Path $Identity.evidence ($Identity.token+'.DIAG_FINAL.json')
  $test=Join-Path $Identity.evidence ($Identity.token+'.DIAG_TEST.json')
  Assert-FfhEvidenceEntry -Identity $Identity -Path $final
  Assert-FfhEvidenceEntry -Identity $Identity -Path $test -Optional
  if (Test-Path -LiteralPath $test) {throw 'BLOCKED_RECOVERY_UNEXPECTED_TEST_RECEIPT'}
  $receipt=Get-Content -LiteralPath $final -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($receipt.schema -ne 1 -or
      $receipt.kind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $receipt.stage -cne 'FINAL' -or
      $receipt.sourceSha -cne $ConsumedHead -or
      $receipt.runToken -cne $Identity.token -or
      $receipt.testResult -cne 'UNKNOWN' -or
      $receipt.cleanupResult -cne 'CLEANUP_BLOCKED_MANUAL_REVIEW' -or
      $receipt.category -cne 'FAIL_CLOSED' -or
      $receipt.gateA -cne 'NOT_STARTED' -or
      $receipt.gateB -cne 'NOT_STARTED') {
    throw 'BLOCKED_RECOVERY_FINAL_RECEIPT_DRIFT'
  }
  return $true
}
function Get-FfhRecoveryCacheEvidence {
  param([string]$Root,[string]$ExpectedSha256)
  if ($ExpectedSha256 -and $ExpectedSha256 -cnotmatch '^[a-f0-9]{64}$') {
    throw 'BLOCKED_RECOVERY_CACHE_DIGEST_FORMAT'
  }
  $dir=Join-Path $Root 'supabase\.temp'
  $path=Join-Path $dir 'cli-latest'
  if (-not (Test-Path -LiteralPath $dir -PathType Container) -or
      -not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw 'BLOCKED_RECOVERY_CACHE_FILE_MISSING'
  }
  # Check every ancestor BEFORE reading any bytes; native held-handle
  # revalidation later remains mandatory and detects subsequent races.
  Assert-FfhNoReparsePath -Path $path
  foreach ($item in @($dir,$path)) {
    if (([IO.File]::GetAttributes($item) -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'BLOCKED_RECOVERY_CACHE_REPARSE'
    }
  }
  $children=@(Get-ChildItem -LiteralPath $dir -Force)
  if ($children.Count -ne 1 -or $children[0].Name -cne 'cli-latest' -or
      $children[0].PSIsContainer -or
      ($children[0].Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'BLOCKED_RECOVERY_CACHE_FOREIGN_CHILD'
  }
  $bytes=[IO.File]::ReadAllBytes($path)
  if ($bytes.Length -gt 96) {throw 'BLOCKED_RECOVERY_CACHE_SIZE'}
  $strictUtf8=[Text.UTF8Encoding]::new($false,$true)
  try {$tag=$strictUtf8.GetString($bytes)}
  catch {throw 'BLOCKED_RECOVERY_CACHE_ENCODING'}
  # This pinned release writes either an empty fetch-failure backoff or one
  # exact version tag; never interpret arbitrary content as a known cache.
  if ($tag -cnotmatch '^(|v[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}(?:-[0-9A-Za-z.-]{1,32})?)$') {
    throw 'BLOCKED_RECOVERY_CACHE_CONTENT'
  }
  $sha=[Security.Cryptography.SHA256]::Create()
  try {$hash=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}
  finally {$sha.Dispose()}
  if ($ExpectedSha256 -and $hash -cne $ExpectedSha256) {
    throw 'BLOCKED_RECOVERY_CACHE_HASH_DRIFT'
  }
  return [pscustomobject]@{sha256=$hash;bytes=[int]$bytes.Length;shape='CLI_TAG_OR_EMPTY'}
}
# Cross-SHA permit binds old immutable migration blobs to a NEW audited,
# clean checkout. Never weaken the normal Get-FfhRootPermitSpec or adopt a
# discovered child into automatic cleanup.
function Get-FfhRecoveryReadOnlyPermit {
  param($Identity,$Journal,$Source,[string]$AuditedHead,[string]$CacheSha256)
  if ($Identity.sha -cne 'cba20f7fecea8b7dfdbcb10fb245765825ef97c0' -or
      $Source.head -cne $AuditedHead -or
      $CacheSha256 -cnotmatch '^[a-f0-9]{64}$' -or
      @($Source.migration_files).Count -ne 15 -or
      $Journal.rootReceiptSha256 -cnotmatch '^[a-f0-9]{64}$' -or
      $Journal.rootReceiptCheckSha256 -cnotmatch '^(|[a-f0-9]{64})$') {
    throw 'BLOCKED_RECOVERY_SOURCE_PERMIT_INVALID'
  }
  $repo=[string]$Source.repo
  $prior=@(& git -C $repo rev-parse --verify ($Identity.sha+':scripts/rls-local/source-provenance.ps1') 2>$null)
  $present=@(& git -C $repo rev-parse --verify ($AuditedHead+':scripts/rls-local/source-provenance.ps1') 2>$null)
  if ($prior.Count -ne 1 -or $present.Count -ne 1 -or
      $prior[0] -cne $present[0]) {
    throw 'BLOCKED_RECOVERY_CONFIG_SOURCE_DRIFT'
  }
  $hasher=[Security.Cryptography.SHA256]::Create()
  $enc=[Text.UTF8Encoding]::new($false)
  try {
    $marker=[BitConverter]::ToString($hasher.ComputeHash(
      $enc.GetBytes((Get-FfhRootMarker -Identity $Identity)))).Replace('-','').ToLowerInvariant()
    $config=Get-FfhFreshConfig -ExpectedHead $Identity.sha -RunToken $Identity.token -DbPort ([int]$Journal.ports[0]) -ShadowPort ([int]$Journal.ports[1])
    $configDigest=[BitConverter]::ToString($hasher.ComputeHash(
      $enc.GetBytes($config))).Replace('-','').ToLowerInvariant()
  } finally {$hasher.Dispose()}
  $rows=@(
    ('F|.ffh-p01-owned-root|'+$marker)
    'D|supabase|-'
    'D|supabase\migrations|-'
    'O|supabase\.temp|-'
    ('F|supabase\config.toml|'+$configDigest)
    ('F|ffh-p01-local-provenance.json|'+$Journal.rootReceiptSha256)
  )
  foreach ($file in @($Source.migration_files | Sort-Object path)) {
    if ($file.path -cnotmatch '^supabase/migrations/(0001|[0-9]{14})_[a-z0-9_]+\.sql$' -or
        $file.sha256 -cnotmatch '^[a-f0-9]{64}$') {
      throw 'BLOCKED_RECOVERY_MIGRATION_FILE_SHAPE'
    }
    $oldObj=@(& git -C $repo rev-parse --verify ($Identity.sha+':'+$file.path) 2>$null)
    $newObj=@(& git -C $repo rev-parse --verify ($AuditedHead+':'+$file.path) 2>$null)
    if ($oldObj.Count -ne 1 -or $newObj.Count -ne 1 -or $oldObj[0] -cne $newObj[0]) {
      throw 'BLOCKED_RECOVERY_MIGRATION_GIT_OBJECT_DRIFT'
    }
    $rows+=('F|'+($file.path -replace '/','\')+'|'+$file.sha256)
  }
  if ($Journal.rootReceiptCheckSha256) {
    $rows+=('F|ffh-p01-local-provenance.sha256|'+$Journal.rootReceiptCheckSha256)
  }
  # Exact cache is required, not a recursive .temp wildcard. Its SHA is an
  # observation for read-only preflight, NEVER an authorization to delete.
  $rows+=('F|supabase\.temp\cli-latest|'+$CacheSha256)
  return ($rows -join [char]10)
}
