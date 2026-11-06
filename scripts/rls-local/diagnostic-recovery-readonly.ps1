# FFH-P01 #83 consumed one-shot recovery: READ-ONLY evidence gate only.
# No Docker exec/SQL, no Docker stop/rm, no native Retire, no journal writes,
# no one-shot ledger changes. All real recovery remains separately authorized.
# REC-AUD-02: exclusively existing-only evidence reads. NEVER use the
# normal creating writer/admission helpers in this recovery path.
function Assert-FfhRecoveryExistingDirectory {
  param($Identity)
  $profileRoot=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $expected=Join-Path $profileRoot 'FFH-P01-RLS-Evidence'
  if ([IO.Path]::GetFullPath([string]$Identity.evidence) -cne $expected -or
      $Identity.root -cne (Join-Path $profileRoot ('FFH-P01-RLS-Fresh-'+$Identity.sha.Substring(0,12)+'-'+$Identity.token)) -or
      $Identity.root -match '(?i)FFH-RLS-Test') {
    throw 'BLOCKED_RECOVERY_EVIDENCE_SCOPE'
  }
  if (-not [IO.Directory]::Exists($expected)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING'
  }
  Assert-FfhNoReparsePath -Path $expected
  Assert-FfhPrivateEvidenceAcl -Path $expected
  if (-not [IO.Directory]::Exists($expected)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_DRIFT'
  }
  return $true
}
function Assert-FfhRecoveryExistingEntry {
  param($Identity,[string]$Path,[switch]$Optional)
  [void](Assert-FfhRecoveryExistingDirectory -Identity $Identity)
  $entry=[IO.Path]::GetFullPath($Path)
  if (-not ([IO.Path]::GetDirectoryName($entry)).Equals(
      [IO.Path]::GetFullPath($Identity.evidence),[StringComparison]::OrdinalIgnoreCase)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_ENTRY_SCOPE'
  }
  if (-not [IO.File]::Exists($entry)) {
    if ($Optional) {return $false}
    throw 'BLOCKED_RECOVERY_EVIDENCE_ENTRY_MISSING'
  }
  Assert-FfhNoReparsePath -Path $entry
  Assert-FfhPrivateEvidenceAcl -Path $entry
  if (-not [IO.File]::Exists($entry) -or
      -not [IO.Directory]::Exists($Identity.evidence)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_ENTRY_DRIFT'
  }
  return $true
}
function Read-FfhRecoveryExistingJson {
  param($Identity,[string]$Path)
  [void](Assert-FfhRecoveryExistingEntry -Identity $Identity -Path $Path)
  $file=$null
  try {
    # FileMode.Open: missing or swapped evidence can NEVER create a file.
    $file=[IO.FileStream]::new($Path,[IO.FileMode]::Open,
      [IO.FileAccess]::Read,[IO.FileShare]::Read)
    if ($file.Length -lt 2 -or $file.Length -gt 131072) {
      throw 'BLOCKED_RECOVERY_EVIDENCE_SIZE'
    }
    $size=[int]$file.Length
    $bytes=[byte[]]::new($size)
    $offset=0
    while ($offset -lt $size) {
      $n=$file.Read($bytes,$offset,$size-$offset)
      if ($n -le 0) {throw 'BLOCKED_RECOVERY_EVIDENCE_SHORT_READ'}
      $offset+=$n
    }
    if ($file.Length -ne $size -or $file.ReadByte() -ne -1) {
      throw 'BLOCKED_RECOVERY_EVIDENCE_DRIFT'
    }
    $utf8=[Text.UTF8Encoding]::new($false,$true)
    $json=$utf8.GetString($bytes) | ConvertFrom-Json -ErrorAction Stop
  } finally {
    if ($null -ne $file) {$file.Dispose()}
  }
  [void](Assert-FfhRecoveryExistingEntry -Identity $Identity -Path $Path)
  return $json
}
function Read-FfhRecoveryJournal {
  param($Identity)
  $j=Read-FfhRecoveryExistingJson -Identity $Identity -Path (Get-FfhJournalPath -Identity $Identity)
  if ($j.sha -cne $Identity.sha -or $j.token -cne $Identity.token -or
      $j.project -cne $Identity.project -or $j.version -ne 2) {
    throw 'BLOCKED_RECOVERY_JOURNAL_READBACK_IDENTITY'
  }
  return $j
}
function Assert-FfhRecoveryFields {
  param($Object,[string[]]$Fields)
  if ($null -eq $Object) {throw 'BLOCKED_RECOVERY_JOURNAL_REQUIRED_FIELD'}
  foreach($field in $Fields) {
    if ($Object.PSObject.Properties.Name -cnotcontains $field) {
      throw 'BLOCKED_RECOVERY_JOURNAL_REQUIRED_FIELD'
    }
  }
}

function Assert-FfhConsumedRecoveryJournal {
  param($Identity,$Journal,[string]$ConsumedHead,[string]$CliSha256)
  Assert-FfhRecoveryFields -Object $Journal -Fields @(
    'version','sha','token','project','root','evidence','container','runKind',
    'cliVersion','diagnosticCliSha256','state','diagnosticStatus','sequence',
    'testResult','cleanupResult','gateAResult','gateBResult','sqlBoundary',
    'ports','postStartMigrationCopies','rootOwnership','rootRetirement',
    'resources','daemon','evidenceSaved'
  )
  Assert-FfhRecoveryFields -Object $Journal.sqlBoundary -Fields @(
    'phase','mode','status','sha','token','containerId','daemon'
  )
  Assert-FfhRecoveryFields -Object $Journal.rootOwnership -Fields @('markerVersion','fileId')
  Assert-FfhRecoveryFields -Object $Journal.rootRetirement -Fields @('status','fileId','atUtc')
  if ($Journal.sequence -isnot [int] -and $Journal.sequence -isnot [long]) {
    throw 'BLOCKED_RECOVERY_JOURNAL_SEQUENCE'
  }
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
      $Journal.sequence -ne 11 -or
      $Journal.sqlBoundary.phase -cne 'NONE' -or
      $Journal.sqlBoundary.mode -cne 'NONE' -or
      $Journal.sqlBoundary.status -cne 'NOT_STARTED' -or
      $Journal.sqlBoundary.sha -cne $Identity.sha -or
      $Journal.sqlBoundary.token -cne $Identity.token -or
      $Journal.sqlBoundary.containerId -cne '' -or
      $Journal.sqlBoundary.daemon -cne $Journal.daemon -or
      $Journal.evidenceSaved -ne $false -or
      $Journal.rootRetirement.fileId -cne '' -or
      $Journal.rootRetirement.atUtc -cne '' -or
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
  $saved=Read-FfhRecoveryExistingJson -Identity $Identity -Path $ledger
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
  if (Assert-FfhRecoveryExistingEntry -Identity $Identity -Path $test -Optional) {
    throw 'BLOCKED_RECOVERY_UNEXPECTED_TEST_RECEIPT'
  }
  $receipt=Read-FfhRecoveryExistingJson -Identity $Identity -Path $final
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
# REC-AUD-04: the Manager has NOT independently approved the Owner cache
# digest. An operator-supplied value can never certify its own provenance.
# Only a separately authorized, immutable, exact-SHA-audited source change
# may set this literal to a Manager-approved 64-hex cache digest.
# Empty = fail closed for ANY purported pinned-cache approval.
function Assert-FfhRecoveryAuditedCacheApproval {
  param([string]$ExpectedSha256)
  $approvedInAuditedSource=''
  if ($ExpectedSha256) {
    if ($ExpectedSha256 -cnotmatch '^[a-f0-9]{64}$' -or
        $approvedInAuditedSource -cnotmatch '^[a-f0-9]{64}$' -or
        $ExpectedSha256 -cne $approvedInAuditedSource) {
      throw 'BLOCKED_RECOVERY_CACHE_PIN_NOT_PREAPPROVED'
    }
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
  Assert-FfhNoReparsePath -Path $path
  $children=@(Get-ChildItem -LiteralPath $dir -Force -ErrorAction Stop)
  if ($children.Count -ne 1 -or $children[0].Name -cne 'cli-latest' -or
      $children[0].PSIsContainer -or
      ($children[0].Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'BLOCKED_RECOVERY_CACHE_FOREIGN_CHILD'
  }
  # Metadata-only first probe; Open with FileShare.Read denies concurrent
  # writers/removers. An initially huge/sparse file is never read into memory.
  $before=[IO.FileInfo]::new($path)
  $before.Refresh()
  if (-not $before.Exists -or
      ($before.Attributes -band [IO.FileAttributes]::Directory) -ne 0 -or
      ($before.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'BLOCKED_RECOVERY_CACHE_FILE_KIND'
  }
  if ($before.Length -gt 96 -or $before.Length -lt 0) {
    throw 'BLOCKED_RECOVERY_CACHE_SIZE'
  }
  $fs=$null
  try {
    $fs=[IO.FileStream]::new($path,[IO.FileMode]::Open,
      [IO.FileAccess]::Read,[IO.FileShare]::Read)
    $length=[long]$fs.Length
    if ($length -gt 96 -or $length -lt 0 -or $length -ne $before.Length) {
      throw 'BLOCKED_RECOVERY_CACHE_SIZE'
    }
    # Allocate at most 97 bytes ONLY after the stable handle length check.
    $buffer=[byte[]]::new(97)
    $count=0
    while ($count -lt 97) {
      $n=$fs.Read($buffer,$count,97-$count)
      if ($n -eq 0) {break}
      $count+=$n
    }
    if ($count -gt 96) {throw 'BLOCKED_RECOVERY_CACHE_SIZE'}
    if ($count -ne $length -or $fs.Length -ne $length -or
        $fs.ReadByte() -ne -1) {
      throw 'BLOCKED_RECOVERY_CACHE_DRIFT'
    }
    $bytes=[byte[]]::new($count)
    if ($count -gt 0) {[Array]::Copy($buffer,$bytes,$count)}
    $strictUtf8=[Text.UTF8Encoding]::new($false,$true)
    try {$tag=$strictUtf8.GetString($bytes)}
    catch {throw 'BLOCKED_RECOVERY_CACHE_ENCODING'}
    if ($tag -cnotmatch '^(|v[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}(?:-[0-9A-Za-z.-]{1,32})?)$') {
      throw 'BLOCKED_RECOVERY_CACHE_CONTENT'
    }
    $sha=[Security.Cryptography.SHA256]::Create()
    try {
      $hash=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    } finally {$sha.Dispose()}
    $after=[IO.FileInfo]::new($path)
    $after.Refresh()
    if (-not $after.Exists -or $after.Length -ne $length -or
        $after.LastWriteTimeUtc -ne $before.LastWriteTimeUtc -or
        $after.CreationTimeUtc -ne $before.CreationTimeUtc -or
        $after.Attributes -ne $before.Attributes -or
        $fs.Length -ne $length) {
      throw 'BLOCKED_RECOVERY_CACHE_DRIFT'
    }
  } finally {
    if ($null -ne $fs) {$fs.Dispose()}
  }
  # Self-observed digest can drive ONLY non-disposing native preflight.
  # A stronger label requires an independently preapproved expected SHA-256
  # supplied before the file is read; neither is deletion authorization.
  $status=if ($ExpectedSha256) {'CACHE_PINNED_VERIFIED'} else {'CACHE_OBSERVED_UNPINNED'}
  if ($ExpectedSha256 -and $hash -cne $ExpectedSha256) {
    throw 'BLOCKED_RECOVERY_CACHE_HASH_DRIFT'
  }
  return [pscustomobject]@{
    sha256=$hash; bytes=[int]$count; shape='CLI_TAG_OR_EMPTY'; status=$status
  }
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
