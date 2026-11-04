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
  return $id
}
function FileId($id) {
  return [FfhP01OwnedRoot]::Inspect($profileHome,(Split-Path $id.root -Leaf),(Get-FfhRootMarker -Identity $id))
}
function NativeRetire($id,[string]$fileId) {
  return [FfhP01OwnedRoot]::Retire($profileHome,(Split-Path $id.root -Leaf),$fileId,(Get-FfhRootMarker -Identity $id))
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
  [void](New-Item -ItemType Directory -Path $dir)
  [IO.File]::WriteAllText((Join-Path $dir 'config.toml'),'synthetic')
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
  MustBlock {NativeRetire $id $stale}
  if (-not (Test-Path -Path $id.root)) {throw 'SYNTH_FOREIGN_REPLACEMENT_DELETED'}
  FileReceipt '02'
  Stop-NativeRoot $id;$id=$null
  # FS-03: Tampered SHA/token marker is fail closed.
  $id=New-NativeRoot
  $recorded=FileId $id
  [IO.File]::WriteAllText((Join-Path $id.root '.ffh-p01-owned-root'),'wrong-identity')
  MustBlock {NativeRetire $id $recorded}
  FileReceipt '03'
  Stop-NativeRoot $id;$id=$null
  # FS-04: Reparse/junction inside owned directory cannot be followed.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreign=Join-Path $profileHome ('FFH-P01-Synthetic-Foreign-'+(New-FfhRunToken))
  [void](New-Item -ItemType Directory -Path $foreign)
  $proof=Join-Path $foreign 'never-delete.txt'
  [IO.File]::WriteAllText($proof,'preserved')
  $junction=Join-Path $id.root 'aa-junction'
  $linkCmd=Start-Process -FilePath (Join-Path $env:WINDIR 'System32/cmd.exe') -ArgumentList ('/d /c mklink /J "'+$junction+'" "'+$foreign+'"') -WindowStyle Hidden -PassThru -Wait
  if ($linkCmd.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $junction)) {
    throw 'SYNTH_JUNCTION_CREATION_FAILED'
  }
  MustBlock {NativeRetire $id $recorded}
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
  MustBlock {NativeRetire $id $recorded}
  FileReceipt '05'
  Stop-NativeRoot $id;$id=$null
  # FS-06: Missing root is an absence proof, never a deletion of another path.
  $id=New-NativeRoot;$recorded=FileId $id
  if ((NativeRetire $id $recorded) -cne 'RETIRED') {throw 'SYNTH_EMPTY_RETIRE'}
  CheckAbsent $id
  MustBlock {NativeRetire $id $recorded}
  CheckAbsent $id
  FileReceipt '06'
  # FS-07: A same-user foreign top-level folder may not be adopted.
  $id=New-NativeRoot;$recorded=FileId $id
  $foreignChild=Join-Path $id.root 'unrelated-folder'
  [void](New-Item -ItemType Directory -Path $foreignChild)
  [IO.File]::WriteAllText((Join-Path $foreignChild 'foreign-data.txt'),'preserve')
  MustBlock {NativeRetire $id $recorded}
  if (-not (Test-Path -LiteralPath (Join-Path $foreignChild 'foreign-data.txt'))) {
    throw 'SYNTH_FOREIGN_FOLDER_DELETED'
  }
  FileReceipt '07'
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
