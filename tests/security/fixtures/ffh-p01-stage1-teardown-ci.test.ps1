# FFH-P01 WinPS5.1 negative containment tests. Ephemeral CI runner ONLY.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_OS -cne 'Windows' -or
    $env:CI -cne 'true' -or
    [Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw 'STGC_CI_WINDOWS_ONLY'
}
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
if ([IO.Path]::GetFullPath($env:GITHUB_WORKSPACE) -cne $repo) {
  throw 'STGC_CI_CHECKOUT_SCOPE'
}
. (Join-Path $PSScriptRoot 'ffh-p01-stage1-ci-contained-teardown.ps1')
$head=(& git -C $repo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cnotmatch '^[a-f0-9]{40}$') {
  throw 'STGC_HEAD'
}
$base=Join-Path ([IO.Path]::GetFullPath($env:RUNNER_TEMP)) ('ffh-p01-contained-'+[Guid]::NewGuid().ToString('N'))
$wt=Join-Path $base 'checkout'
$root=Join-Path $base 'root'
$evidence=Join-Path $base 'evidence'
$ticket=Join-Path $base 'ticket'
$foreign=Join-Path $base 'outside-sentinel'
[void][IO.Directory]::CreateDirectory($base)
& git -C $repo worktree add --quiet --detach $wt HEAD 2>$null | Out-Null
if ($LASTEXITCODE -ne 0 -or -not [IO.Directory]::Exists($wt)) {throw 'STGC_WORKTREE_SETUP'}
[void][IO.Directory]::CreateDirectory($root)
[void][IO.Directory]::CreateDirectory($evidence)
[void][IO.Directory]::CreateDirectory((Join-Path $root 'supabase\migrations'))
[void][IO.Directory]::CreateDirectory((Join-Path $root 'supabase\.temp'))
[void][IO.Directory]::CreateDirectory($foreign)
$utf8=[Text.UTF8Encoding]::new($false)
function Write-TestFile([string]$P,[string]$Text) {[IO.File]::WriteAllText($P,$Text,$utf8)}
$meta=Join-Path $root 'meta.json'
$cache=Join-Path $root 'supabase\.temp\cli-latest'
$journal=Join-Path $evidence 'journal.json'
$receipt=Join-Path $evidence 'final.json'
$outside=Join-Path $foreign 'keep.txt'
Write-TestFile $ticket $head
Write-TestFile $meta '{"owned":true}'
Write-TestFile $cache 'v2.122.0'
Write-TestFile $journal '{"synthetic":true}'
Write-TestFile $receipt '{"final":"BLOCKED"}'
Write-TestFile $outside 'DO_NOT_DELETE_FOREIGN'
$tracked=@(& git -C $wt -c core.quotePath=false ls-files)
if ($LASTEXITCODE -ne 0 -or $tracked.Count -lt 10) {throw 'STGC_TRACKED_SET'}
$sourcePaths=@((Join-Path $wt '.git'))
foreach($name in $tracked) {
  if ($name -cnotmatch '^[A-Za-z0-9._/\-]+$') {throw 'STGC_UNSUPPORTED_TRACKED_NAME'}
  $sourcePaths+=(Join-Path $wt ($name -replace '/','\'))
}
$migrations=@(Get-ChildItem -LiteralPath (Join-Path $wt 'supabase\migrations') -File -Filter '*.sql')
if($migrations.Count -ne 15){throw 'STGC_MIGRATION_CARDINALITY'}
$migrationCopies=@()
foreach($m in $migrations) {
  $dest=Join-Path $root ('supabase\migrations\'+$m.Name)
  [IO.File]::Copy($m.FullName,$dest)
  $migrationCopies+=$dest
}
$expected=@($sourcePaths)+@($meta,$cache,$journal,$receipt)+@($migrationCopies)
$roots=@($wt,$root,$evidence)
$manifest=New-StgCiManifest -Roots $roots -Ticket $ticket -ExpectedFiles $expected -Worktree $wt -Head $head -Repository $repo
$files=@($journal,$receipt,$meta,$cache)+@($migrationCopies)
$dirs=@($evidence,(Join-Path $root 'supabase\.temp'),
  (Join-Path $root 'supabase\migrations'),(Join-Path $root 'supabase'),$root)
$sentinel='DO_NOT_DELETE_FOREIGN'
$tempTime=[IO.Directory]::GetLastWriteTimeUtc((Join-Path $root 'supabase\.temp'))
$migrationTime=[IO.Directory]::GetLastWriteTimeUtc((Join-Path $root 'supabase\migrations'))
function Assert-Preserved {
  Assert-StgCi ([IO.File]::Exists($meta) -and [IO.File]::Exists($journal) -and
    [IO.File]::Exists($receipt) -and [IO.File]::Exists($ticket) -and
    [IO.Directory]::Exists($wt))
  Assert-StgCi ([IO.File]::ReadAllText($outside) -ceq $sentinel)
  Assert-StgCi (@(Get-ChildItem -LiteralPath (Join-Path $root 'supabase\migrations') -File -Filter '*.sql').Count -ge 15)
}
function Expect-Blocked([int]$N,[string]$Reason,[int]$Interrupt=-1) {
  # Independently assert tree-shape rejection even when directory timestamps are
  # discounted, so an injected foreign name cannot merely trip mtime drift.
  if($N -in @(1,2,3)) {
    $shapeBlocked=$false
    try {Assert-StgCiManifest $manifest -AllowDirectoryModifiedTime $true}
    catch {if([string]$_.Exception.Message -notmatch 'STG_CLEANUP_BLOCKED'){throw};$shapeBlocked=$true}
    if(-not $shapeBlocked){throw 'STGC_SHAPE_ACCEPTED'}
  }
  $blocked=$false
  try {
    Invoke-StgCiContainedTeardown -Manifest $manifest -OwnedFiles $files -OwnedDirs $dirs -InterruptAfter $Interrupt
  } catch {
    if ([string]$_.Exception.Message -notmatch 'STG_CLEANUP_BLOCKED') {throw}
    $blocked=$true
  }
  if (-not $blocked) {throw 'STGC_UNSAFE_ACCEPTED'}
  if ($N -eq 8) {
    Assert-StgCi (-not [IO.File]::Exists($journal))
    Assert-StgCi ([IO.File]::Exists($receipt) -and [IO.File]::Exists($meta))
    Assert-StgCi ([IO.Directory]::Exists($wt) -and [IO.File]::Exists($ticket))
    Assert-StgCi ([IO.File]::ReadAllText($outside) -ceq $sentinel)
  } else {Assert-Preserved}
  Write-Output ('STGC-'+$N.ToString('00')+' PASS '+$Reason+' STG_CLEANUP_BLOCKED')
}
# 1: foreign nested content; injection/restoration are explicit and individually verified.
$nested=Join-Path $root 'supabase\.temp\foreign'
[void][IO.Directory]::CreateDirectory($nested)
$intruder=Join-Path $nested 'unknown.txt'
Write-TestFile $intruder $sentinel
Expect-Blocked 1 'NESTED_FOREIGN_FILE'
Assert-StgCi ([IO.File]::ReadAllText($intruder) -ceq $sentinel)
[IO.File]::Delete($intruder)
[IO.Directory]::Delete($nested,$false)
[IO.Directory]::SetLastWriteTimeUtc((Join-Path $root 'supabase\.temp'),$tempTime)
Assert-StgCiManifest $manifest
# 2: real NTFS directory junction; external target MUST survive rejection.
$link=Join-Path $root 'supabase\.temp\unexpected-junction'
New-Item -ItemType Junction -Path $link -Target $foreign -ErrorAction Stop | Out-Null
Expect-Blocked 2 'NESTED_JUNCTION'
Assert-StgCi (([IO.File]::GetAttributes($link) -band [IO.FileAttributes]::ReparsePoint) -ne 0)
Assert-StgCi ([IO.File]::ReadAllText($outside) -ceq $sentinel)
[IO.Directory]::Delete($link,$false)
[IO.Directory]::SetLastWriteTimeUtc((Join-Path $root 'supabase\.temp'),$tempTime)
Assert-StgCiManifest $manifest
# 3: migration directory is EXACT 15, no unexpected filename allowed.
$extra=Join-Path $root 'supabase\migrations\foreign-16.sql'
Write-TestFile $extra $sentinel
Expect-Blocked 3 'MIGRATION_FOREIGN_FILE'
Assert-StgCi ([IO.File]::ReadAllText($extra) -ceq $sentinel)
[IO.File]::Delete($extra)
[IO.Directory]::SetLastWriteTimeUtc((Join-Path $root 'supabase\migrations'),$migrationTime)
Assert-StgCiManifest $manifest
# 4: ACL inheritance identity drift without changing file bytes.
$originalAcl=[IO.File]::GetAccessControl($meta)
$changedAcl=[IO.File]::GetAccessControl($meta)
$changedAcl.SetAccessRuleProtection($true,$true)
[IO.File]::SetAccessControl($meta,$changedAcl)
Assert-StgCi ((Get-StgCiRow $meta).Acl -cne $manifest.Index[$meta].Acl)
Expect-Blocked 4 'ACL_DRIFT'
[IO.File]::SetAccessControl($meta,$originalAcl)
Assert-StgCiManifest $manifest
# 5: tracked checkout dirty; no Git --force removal.
$trackedFile=Join-Path $wt 'package.json'
$originalBytes=[IO.File]::ReadAllBytes($trackedFile)
$originalModified=[IO.File]::GetLastWriteTimeUtc($trackedFile)
[IO.File]::AppendAllText($trackedFile,'TEST_DIRTY_CHECKOUT',$utf8)
Expect-Blocked 5 'WORKTREE_DIRTY'
[IO.File]::WriteAllBytes($trackedFile,$originalBytes)
[IO.File]::SetLastWriteTimeUtc($trackedFile,$originalModified)
Assert-StgCiManifest $manifest
# 6: ticket replaced with SAME BYTES; immutable Windows object ID must reject.
$held=Join-Path $base 'original-ticket-held'
[IO.File]::Move($ticket,$held)
Write-TestFile $ticket $head
Assert-StgCi ((Get-StgCiRow $ticket).ObjectId -cne $manifest.Index[$ticket].ObjectId)
Expect-Blocked 6 'TICKET_REPLACED'
Assert-StgCi ([IO.File]::ReadAllText($ticket) -ceq $head)
[IO.File]::Delete($ticket)
[IO.File]::Move($held,$ticket)
Assert-StgCiManifest $manifest
# 7: same checkout files but changed detached HEAD must block without mutation.
$earlier=(& git -C $wt rev-parse HEAD^).Trim()
Assert-StgCi ($LASTEXITCODE -eq 0 -and $earlier -cne $head)
& git -C $wt update-ref HEAD $earlier
Assert-StgCi ($LASTEXITCODE -eq 0)
Expect-Blocked 7 'WORKTREE_HEAD_DRIFT'
& git -C $wt update-ref HEAD $head
Assert-StgCi ($LASTEXITCODE -eq 0)
Assert-StgCiManifest $manifest
# 8: simulated interruption after one verified disposition; remaining material
# stays INTACT for manual review, never auto-resumed or force-cleaned.
Expect-Blocked 8 'INTERRUPTED_TEARDOWN' 1
Write-Output 'STGC_SCOPE=CI_SYNTHETIC_ONLY OWNER_HOST=NOT_TOUCHED'
