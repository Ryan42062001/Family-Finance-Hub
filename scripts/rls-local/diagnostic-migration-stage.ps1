# FFH-P01 #83 NONFORMAL: immutable migration file copies AFTER db start.
# Dot-source only. No SQL executed, no resets and no formal Gate A/B receipt.
Set-StrictMode -Version Latest
function Complete-FfhDiagnosticMigrationStaging {
  param($Identity,$Source)
  $j=Read-FfhJournal -Identity $Identity
  if ($j.runKind -cne 'ONE_SHOT_DIAGNOSTIC' -or
      $j.diagnosticStatus -cne 'START_IN_FLIGHT' -or
      $j.sqlBoundary.status -cne 'NOT_STARTED' -or
      @($Source.migration_files).Count -ne 15) {
    throw 'BLOCKED_DIAG_AFTER_START_MIGRATION_STAGING_INVALID'
  }
  $m=Join-Path $Identity.root 'supabase/migrations'
  Assert-FfhNoReparsePath -Path $m
  if (@(Get-ChildItem -LiteralPath $m -Force).Count -ne 0) {
    throw 'BLOCKED_DIAG_MIGRATIONS_NOT_EMPTY_AFTER_START'
  }
  foreach($file in @($Source.migration_files | Sort-Object path)) {
    if ($file.path -cnotmatch '^supabase/migrations/(0001|[0-9]{14})_[a-z0-9_]+\.sql$' -or
        $file.sha256 -cnotmatch '^[a-f0-9]{64}$') {
      throw 'BLOCKED_DIAG_SOURCE_MIGRATION_NOT_CANONICAL'
    }
    $sourceFile=Join-Path $Source.repo $file.path
    Assert-FfhNoReparsePath -Path $sourceFile
    $bytes=[IO.File]::ReadAllBytes($sourceFile)
    $hasher=[Security.Cryptography.SHA256]::Create()
    try {$digest=[BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}
    finally {$hasher.Dispose()}
    if ($digest -cne $file.sha256) {throw 'BLOCKED_DIAG_SOURCE_MIGRATION_CHANGED'}
    $destination=Join-Path $Identity.root ($file.path -replace '/','\')
    $stream=[IO.FileStream]::new($destination,[IO.FileMode]::CreateNew,
      [IO.FileAccess]::Write,[IO.FileShare]::None)
    try {$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}
    finally {$stream.Dispose()}
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -cne $file.sha256) {
      throw 'BLOCKED_DIAG_CREATED_MIGRATION_HASH_DRIFT'
    }
  }
  if (@(Get-ChildItem -LiteralPath $m -Force).Count -ne 15) {
    throw 'BLOCKED_DIAG_SOURCE_MIGRATION_SET_INCOMPLETE'
  }
  $j=Read-FfhJournal -Identity $Identity
  if ($j.diagnosticStatus -cne 'START_IN_FLIGHT') {
    throw 'BLOCKED_DIAG_MIGRATION_STAGE_CHANGED'
  }
  $j | Add-Member -MemberType NoteProperty -Name postStartMigrationCopies -Value 15 -Force
  $j.sequence=[int]$j.sequence+1
  Write-FfhJournal -Identity $Identity -Journal $j
}
