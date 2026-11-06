# CI-only real WinPS5.1 native filesystem test. No Docker, SQL, or owner-root.
# Every mutable path is a new SHA+token direct-child of the runner profile.
[CmdletBinding()]param()
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../'))
. (Join-Path $repo 'scripts/rls-local/source-provenance.ps1')
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
[void](Get-FfhOwnedRootNative)
$profileHome=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile'))
$sha='b'*40
function New-NativeRoot {
  $id=Get-FfhRunIdentity -SourceSha $sha -RunToken (New-FfhRunToken)
  if (Test-Path -Path $id.root) {throw 'SYNTH_COLLISION'}
  [void](New-Item -ItemType Directory -Path $id.root -ErrorAction Stop)
  Initialize-FfhPrivateEvidenceAcl -Path $id.root -NewlyCreated
  $marker=Join-Path $id.root '.ffh-p01-owned-root'
  [IO.File]::WriteAllText($marker,(Get-FfhRootMarker -Identity $id),[Text.UTF8Encoding]::new($false))
  Initialize-FfhPrivateEvidenceAcl -Path $marker -NewlyCreated
  [void](New-Item -ItemType Directory -Path (Join-Path $id.root 'supabase'))
  [void](New-Item -ItemType Directory -Path (Join-Path $id.root 'supabase/migrations'))
  [IO.File]::WriteAllText((Join-Path $id.root 'supabase/config.toml'),'synthetic',[Text.UTF8Encoding]::new($false))
  return $id
}
function FileId($id) {
  return [FfhP01OwnedRoot]::Inspect($profileHome,(Split-Path $id.root -Leaf),(Get-FfhRootMarker -Identity $id))
}
function ShaText([string]$text) {
  $h=[Security.Cryptography.SHA256]::Create()
  try {
    return [BitConverter]::ToString($h.ComputeHash([Text.UTF8Encoding]::new($false).GetBytes($text))).Replace('-','').ToLowerInvariant()
  } finally {$h.Dispose()}
}
function Manifest($id) {
  return (@(
    ('F|.ffh-p01-owned-root|'+(ShaText (Get-FfhRootMarker -Identity $id)))
    'D|supabase|-'
    'D|supabase\migrations|-'
    'O|supabase\.temp|-'
    ('F|supabase\config.toml|'+(ShaText 'synthetic'))
  ) -join [char]10)
}
function FailureCategory([scriptblock]$action) {
  try {[void](& $action)} catch {
    $err=$_.Exception
    while ($null -ne $err.InnerException) {$err=$err.InnerException}
    return [string]$err.Message
  }
  return 'SYNTH_NO_BLOCK'
}
function ExpectCategory([scriptblock]$action,[string]$category) {
  $observed=FailureCategory $action
  if ($observed -notmatch ('^BLOCKED_ROOT_'+[regex]::Escape($category)+'(?:$|_)')) {
    throw ('SYNTH_CATEGORY_MISMATCH expected='+$category+' observed='+$observed)
  }
  if ([FfhP01OwnedRoot]::DispositionAttempts -ne 0) {
    throw 'SYNTH_PREMATURE_NATIVE_DISPOSITION'
  }
}
function MarkerExists($id) {
  if (-not (Test-Path -LiteralPath (Join-Path $id.root '.ffh-p01-owned-root') -PathType Leaf)) {
    throw 'SYNTH_OWNERSHIP_MARKER_REMOVED_ON_PREFLIGHT_FAILURE'
  }
}
function NativeRetire($id,[string]$fileId) {
  return [FfhP01OwnedRoot]::Retire($profileHome,(Split-Path $id.root -Leaf),$fileId,(Get-FfhRootMarker -Identity $id),(Manifest $id))
}
function MustBlock([scriptblock]$action) {
  $did=$false
  try {[void](& $action)} catch {$did=$true}
  if (-not $did) {throw 'SYNTH_EXPECTED_NATIVE_BLOCK'}
}
function FileReceipt([string]$name) {Write-Output ('FS-'+$name+' PASS')}
function CheckAbsent($id) {
  if ([FfhP01OwnedRoot]::Probe($profileHome,(Split-Path $id.root -Leaf)) -cne 'ABSENT') {
    throw 'SYNTH_NATIVE_ROOT_REMAINS'
  }
}
# Test harness cleanup is NOT the production implementation and can only
# target a freshly generated exact root. Blocked fixtures are retired manually
# by this ephemeral CI fixture without any owner or historical path.
function Stop-NativeRoot($id) {
  if ($null -eq $id) {return}
  $root=[IO.Path]::GetFullPath($id.root)
  if (-not ([IO.Path]::GetDirectoryName($root)).Equals($profileHome,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($root) -cnotmatch '^FFH-P01-RLS-Fresh-b{12}-[a-f0-9]{24}$') {
    throw 'SYNTH_REFUSED_TO_REMOVE_FOREIGN_ROOT'
  }
  if ([IO.Directory]::Exists($root)) {[IO.Directory]::Delete($root,$true)}
}
$id=$null;$foreign=$null
try {
  # FS-01: Native load, exact owned marker, ACL, two ordinary child levels.
  $id=New-NativeRoot
  $dir=Join-Path $id.root 'supabase'
  $recorded=FileId $id
  if ($recorded -cnotmatch '^[a-f0-9]{8}:[a-f0-9]{16}$') {throw 'SYNTH_NO_FILESYSTEM_ID'}
  if ((NativeRetire $id $recorded) -cne 'RETIRED') {throw 'SYNTH_RETIRE_FAILED'}
  CheckAbsent $id
  FileReceipt '01'
  $id=$null
  # FS-02: Existing foreign root ID at exact name is blocked.
  $id=New-NativeRoot
  $stale=FileId $id
  if ((NativeRetire $id $stale) -cne 'RETIRED') {throw 'SYNTH_FIRST_RETIRE'}
  $new=New-Object psobject -Property @{root=$id.root;sha=$id.sha;token=$id.token;project=$id.project}
  [void](New-Item -ItemType Directory -Path $id.root)
  Initialize-FfhPrivateEvidenceAcl -Path $id.root -NewlyCreated
  $marker=Join-Path $id.root '.ffh-p01-owned-root'
  [IO.File]::WriteAllText($marker,(Get-FfhRootMarker -Identity $new),[Text.UTF8Encoding]::new($false))
  Initialize-FfhPrivateEvidenceAcl -Path $marker -NewlyCreated
  ExpectCategory {NativeRetire $id $stale} 'ID_DRIFT'
  if (-not (Test-Path -Path $id.root)) {throw 'SYNTH_FOREIGN_REPLACEMENT_DELETED'}
  FileReceipt '02'
  Stop-NativeRoot $id;$id=$null
  # FS-03: Tampered SHA/token marker is fail closed.
  $id=New-NativeRoot
  $recorded=FileId $id
  [IO.File]::WriteAllText((Join-Path $id.root '.ffh-p01-owned-root'),'wrong-identity')
  ExpectCategory {NativeRetire $id $recorded} 'MARKER_MISMATCH'
  FileReceipt '03'
  Stop-NativeRoot $id;$id=$null
  # FS-04: Reparse/junction inside owned directory cannot be followed.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreign=Join-Path $profileHome ('FFH-P01-Synthetic-Foreign-'+(New-FfhRunToken))
  [void](New-Item -ItemType Directory -Path $foreign)
  $proof=Join-Path $foreign 'never-delete.txt'
  [IO.File]::WriteAllText($proof,'preserved')
  $junction=Join-Path $id.root 'supabase/.temp'
  $linkCmd=Start-Process -FilePath (Join-Path $env:WINDIR 'System32/cmd.exe') -ArgumentList ('/d /c mklink /J "'+$junction+'" "'+$foreign+'"') -WindowStyle Hidden -PassThru -Wait
  if ($linkCmd.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $junction)) {
    throw 'SYNTH_JUNCTION_CREATION_FAILED'
  }
  ExpectCategory {NativeRetire $id $recorded} 'REPARSE_OR_TYPE'
  if (-not (Test-Path -LiteralPath $proof)) {throw 'SYNTH_JUNCTION_FOREIGN_DELETED'}
  FileReceipt '04'
  [IO.Directory]::Delete($junction)
  Stop-NativeRoot $id;$id=$null
  [IO.Directory]::Delete($foreign,$true);$foreign=$null
  # FS-05: Inherited ACL on root blocks even if marker is unchanged.
  $id=New-NativeRoot;$recorded=FileId $id
  $acl=[IO.Directory]::GetAccessControl($id.root)
  $acl.SetAccessRuleProtection($false,$true)
  [IO.Directory]::SetAccessControl($id.root,$acl)
  ExpectCategory {NativeRetire $id $recorded} 'ACL_OWNER'
  FileReceipt '05'
  Stop-NativeRoot $id;$id=$null
  # FS-06: Missing root is an absence proof, never a deletion of another path.
  $id=New-NativeRoot;$recorded=FileId $id
  if ((NativeRetire $id $recorded) -cne 'RETIRED') {throw 'SYNTH_EMPTY_RETIRE'}
  CheckAbsent $id
  ExpectCategory {NativeRetire $id $recorded} 'ROOT_DISAPPEARED_BEFORE_RETIRE'
  CheckAbsent $id
  FileReceipt '06'
  # FS-07: A same-user foreign top-level folder may not be adopted.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreignChild=Join-Path $id.root 'unrelated-folder'
  [void](New-Item -ItemType Directory -Path $foreignChild)
  [IO.File]::WriteAllText((Join-Path $foreignChild 'foreign-data.txt'),'preserve')
  ExpectCategory {NativeRetire $id $recorded} 'UNPERMITTED_PATH'
  if (-not (Test-Path -LiteralPath (Join-Path $foreignChild 'foreign-data.txt'))) {
    throw 'SYNTH_FOREIGN_FOLDER_DELETED'
  }
  FileReceipt '07'
  Stop-NativeRoot $id;$id=$null

  # FS-08: an ordinary, lexicographically late foreign migration cannot cause
  # the earlier permitted marker/config/migrations to be disposed.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreignChild=Join-Path $id.root 'supabase/migrations/zz_foreign.sql'
  [IO.File]::WriteAllText($foreignChild,'nonowned')
  ExpectCategory {NativeRetire $id $recorded} 'UNPERMITTED_PATH'
  MarkerExists $id
  if (-not (Test-Path -LiteralPath (Join-Path $id.root 'supabase/config.toml'))) {throw 'SYNTH_EARLY_FILE_DISPOSED'}
  if (-not (Test-Path -LiteralPath $foreignChild)) {throw 'SYNTH_FOREIGN_FILE_REMOVED'}
  FileReceipt '08'
  Stop-NativeRoot $id;$id=$null

  # FS-09: nested foreign ordinary directory + sentinel.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreignChild=Join-Path $id.root 'supabase/migrations/zz_foreign_dir'
  [void](New-Item -ItemType Directory -Path $foreignChild)
  [IO.File]::WriteAllText((Join-Path $foreignChild 'private.txt'),'preserve')
  ExpectCategory {NativeRetire $id $recorded} 'UNPERMITTED_PATH'
  MarkerExists $id
  if (-not (Test-Path -LiteralPath (Join-Path $foreignChild 'private.txt'))) {throw 'SYNTH_FOREIGN_DIR_REMOVED'}
  FileReceipt '09'
  Stop-NativeRoot $id;$id=$null

  # FS-10: unknown CLI-style content inside a permitted .temp directory.
  $id=New-NativeRoot;$recorded=FileId $id
  $temp=Join-Path $id.root 'supabase/.temp'
  [void](New-Item -ItemType Directory -Path $temp)
  [IO.File]::WriteAllText((Join-Path $temp 'local-cli-surprise'),'nonowned')
  ExpectCategory {NativeRetire $id $recorded} 'UNPERMITTED_PATH'
  MarkerExists $id
  FileReceipt '10'
  Stop-NativeRoot $id;$id=$null

  # FS-11: a valid optional directory is a reparse junction to an outside sentinel.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreign=Join-Path $profileHome ('FFH-P01-Synthetic-Foreign-'+(New-FfhRunToken))
  [void](New-Item -ItemType Directory -Path $foreign)
  $proof=Join-Path $foreign 'never-delete.txt'
  [IO.File]::WriteAllText($proof,'stay')
  $junction=Join-Path $id.root 'supabase/.temp'
  $linkCmd=Start-Process -FilePath (Join-Path $env:WINDIR 'System32/cmd.exe') -ArgumentList ('/d /c mklink /J "'+$junction+'" "'+$foreign+'"') -WindowStyle Hidden -PassThru -Wait
  if ($linkCmd.ExitCode -ne 0) {throw 'SYNTH_NESTED_JUNCTION_CREATE_FAILED'}
  ExpectCategory {NativeRetire $id $recorded} 'REPARSE_OR_TYPE'
  MarkerExists $id
  if (-not (Test-Path -LiteralPath $proof)) {throw 'SYNTH_JUNCTION_SENTINEL_REMOVED'}
  FileReceipt '11'
  [IO.Directory]::Delete($junction)
  Stop-NativeRoot $id;$id=$null
  [IO.Directory]::Delete($foreign,$true);$foreign=$null

  # FS-12: an exact expected file linked to an outside file is never adopted.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreign=Join-Path $profileHome ('FFH-P01-Synthetic-Foreign-'+(New-FfhRunToken))
  [void](New-Item -ItemType Directory -Path $foreign)
  $proof=Join-Path $foreign 'config-sentinel.txt'
  [IO.File]::WriteAllText($proof,'synthetic',[Text.UTF8Encoding]::new($false))
  $target=Join-Path $id.root 'supabase/config.toml'
  [IO.File]::Delete($target)
  $cmd=Start-Process -FilePath (Join-Path $env:WINDIR 'System32/cmd.exe') -ArgumentList ('/d /c fsutil hardlink create "'+$target+'" "'+$proof+'"') -PassThru -Wait -WindowStyle Hidden
  if ($cmd.ExitCode -ne 0) {throw 'SYNTH_HARDLINK_CREATE_FAILED'}
  ExpectCategory {NativeRetire $id $recorded} 'HARDLINK'
  MarkerExists $id
  if (-not (Test-Path -LiteralPath $proof)) {throw 'SYNTH_HARDLINK_SENTINEL_REMOVED'}
  FileReceipt '12'
  Stop-NativeRoot $id;$id=$null
  [IO.Directory]::Delete($foreign,$true);$foreign=$null

  # FS-13: unexpected ACL principal on permitted file blocks without disposal.
  $id=New-NativeRoot;$recorded=FileId $id
  $config=Join-Path $id.root 'supabase/config.toml'
  $acl=[IO.File]::GetAccessControl($config)
  $everyone=[Security.Principal.SecurityIdentifier]::new('S-1-1-0')
  $rule=[Security.AccessControl.FileSystemAccessRule]::new(
    $everyone,[Security.AccessControl.FileSystemRights]::ReadData,
    [Security.AccessControl.AccessControlType]::Allow)
  $acl.AddAccessRule($rule)
  [IO.File]::SetAccessControl($config,$acl)
  ExpectCategory {NativeRetire $id $recorded} 'ACL_FOREIGN'
  MarkerExists $id
  FileReceipt '13'
  Stop-NativeRoot $id;$id=$null

  # FS-14: immutable expected hash mismatch is not merely a filename check.
  $id=New-NativeRoot;$recorded=FileId $id
  [IO.File]::WriteAllText((Join-Path $id.root 'supabase/config.toml'),'tampered')
  ExpectCategory {NativeRetire $id $recorded} 'MANIFEST_HASH'
  MarkerExists $id
  FileReceipt '14'
  Stop-NativeRoot $id;$id=$null

  # FS-15: injected unapproved manifest path cannot authorize any file.
  $id=New-NativeRoot;$recorded=FileId $id
  $bad=(Manifest $id)+[char]10+'F|supabase\migrations\not-actually-owned.txt|'+('0'*64)
  ExpectCategory {[FfhP01OwnedRoot]::Retire($profileHome,(Split-Path $id.root -Leaf),$recorded,(Get-FfhRootMarker -Identity $id),$bad)} 'MANIFEST_UNKNOWN_PATH'
  MarkerExists $id
  FileReceipt '15'
  Stop-NativeRoot $id;$id=$null

  # FS-16: legacy four-argument destructive call is explicitly disabled.
  $id=New-NativeRoot;$recorded=FileId $id
  ExpectCategory {[FfhP01OwnedRoot]::Retire($profileHome,(Split-Path $id.root -Leaf),$recorded,(Get-FfhRootMarker -Identity $id))} 'MANIFEST_REQUIRED'
  MarkerExists $id
  FileReceipt '16'
  Stop-NativeRoot $id;$id=$null

  # FS-17: excessive descendants must fail before marker removal or disposition.
  $id=New-NativeRoot;$recorded=FileId $id
  $migs=Join-Path $id.root 'supabase/migrations'
  foreach($n in 1..2050) {
    [IO.File]::WriteAllText((Join-Path $migs ('noise'+$n+'.txt')),'x')
  }
  ExpectCategory {NativeRetire $id $recorded} 'LIMIT_SIBLINGS'
  MarkerExists $id
  FileReceipt '17'
  Stop-NativeRoot $id;$id=$null

  # FS-18: a fully verified tree with optional EMPTY CLI directory is retired.
  $id=New-NativeRoot;$recorded=FileId $id
  [void](New-Item -ItemType Directory -Path (Join-Path $id.root 'supabase/.temp'))
  if ((NativeRetire $id $recorded) -cne 'RETIRED') {throw 'SYNTH_VALID_TREE_RETIRE_FAIL'}
  CheckAbsent $id
  FileReceipt '18'
  $id=$null

  # FS-19: the exact fifteen real immutable migration files are accepted only
  # with an explicit byte-hash entry EACH (no blanket migrations permission).
  $id=New-NativeRoot;$recorded=FileId $id
  $migrationSources=@(Get-ChildItem -LiteralPath (Join-Path $repo 'supabase/migrations') -Filter '*.sql' -File | Sort-Object Name)
  if ($migrationSources.Count -ne 15) {throw 'SYNTH_CANONICAL_15_MISSING'}
  $extraRows=@()
  foreach($original in $migrationSources) {
    $destination=Join-Path $id.root ('supabase/migrations/'+$original.Name)
    Copy-Item -LiteralPath $original.FullName -Destination $destination
    $hasher=[Security.Cryptography.SHA256]::Create()
    $stream=[IO.File]::OpenRead($original.FullName)
    try {
      $hash=[BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant()
    } finally {$stream.Dispose();$hasher.Dispose()}
    $extraRows+=('F|supabase\migrations\'+$original.Name+'|'+$hash)
  }
  $complete=(Manifest $id)+[char]10+($extraRows -join [char]10)
  if ([FfhP01OwnedRoot]::Preflight($profileHome,(Split-Path $id.root -Leaf),$recorded,(Get-FfhRootMarker -Identity $id),$complete) -cne 'PREFLIGHT_OK') {
    throw 'SYNTH_CANONICAL_15_PREFLIGHT_FAIL'
  }
  if (([FfhP01OwnedRoot]::Retire($profileHome,(Split-Path $id.root -Leaf),$recorded,(Get-FfhRootMarker -Identity $id),$complete)) -cne 'RETIRED') {
    throw 'SYNTH_CANONICAL_15_RETIRE_FAIL'
  }
  CheckAbsent $id
  FileReceipt '19'
  $id=$null

  # FS-20: a manifest-declared canonical file MISSING from disk blocks all
  # deletion, including the earlier marker and valid migrations.
  $id=New-NativeRoot;$recorded=FileId $id
  $source=$migrationSources[0]
  $hasher=[Security.Cryptography.SHA256]::Create()
  $stream=[IO.File]::OpenRead($source.FullName)
  try {$hash=[BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}
  finally {$stream.Dispose();$hasher.Dispose()}
  $required=(Manifest $id)+[char]10+('F|supabase\migrations\'+$source.Name+'|'+$hash)
  ExpectCategory {[FfhP01OwnedRoot]::Retire($profileHome,(Split-Path $id.root -Leaf),$recorded,(Get-FfhRootMarker -Identity $id),$required)} 'MANIFEST_INCOMPLETE'
  MarkerExists $id
  FileReceipt '20'
  Stop-NativeRoot $id;$id=$null

  # FS-22: a valid independently accepted tree is altered between separate
  # read-only preflight and retirement. Retire MUST re-preflight and reject
  # before the first disposition, even with the same root filesystem ID.
  $id=New-NativeRoot;$recorded=FileId $id
  if ([FfhP01OwnedRoot]::Preflight($profileHome,(Split-Path $id.root -Leaf),$recorded,(Get-FfhRootMarker -Identity $id),(Manifest $id)) -cne 'PREFLIGHT_OK') {
    throw 'SYNTH_RACE_SETUP_PREFLIGHT_NOT_VALID'
  }
  [IO.File]::WriteAllText((Join-Path $id.root 'supabase/config.toml'),'post-preflight replacement')
  ExpectCategory {NativeRetire $id $recorded} 'MANIFEST_HASH'
  MarkerExists $id
  FileReceipt '22'
} finally {
  if ($null -ne $id) {Stop-NativeRoot $id}
  if ($null -ne $foreign -and [IO.Directory]::Exists($foreign)) {
    $path=[IO.Path]::GetFullPath($foreign)
    if (([IO.Path]::GetDirectoryName($path)).Equals($profileHome,[StringComparison]::OrdinalIgnoreCase) -and
        [IO.Path]::GetFileName($path) -cmatch '^FFH-P01-Synthetic-Foreign-[a-f0-9]{24}$') {
      [IO.Directory]::Delete($path,$true)
    }
  }
}
