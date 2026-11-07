# FFH-P01 CI-only exact-owned fixture manifest and contained teardown.
# Must never be imported by production Plan/Retire; runner-created objects only.
Set-StrictMode -Version Latest

if (-not ('FfhStgCiObject' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class FfhStgCiObject {
  [StructLayout(LayoutKind.Sequential)]
  public struct FT { public uint Low; public uint High; }
  [StructLayout(LayoutKind.Sequential)]
  public struct INFO {
    public uint Attributes; public FT Created; public FT Accessed; public FT Written;
    public uint Volume; public uint HighSize; public uint LowSize; public uint Links;
    public uint HighIndex; public uint LowIndex;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern SafeFileHandle CreateFile(string path, uint access, uint share,
    IntPtr security, uint creation, uint flags, IntPtr templateFile);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool GetFileInformationByHandle(SafeFileHandle h, out INFO info);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool SetFileInformationByHandle(SafeFileHandle h, int kind,
    ref FILE_DISPOSITION_INFO info, uint size);
  [StructLayout(LayoutKind.Sequential)]
  struct FILE_DISPOSITION_INFO { [MarshalAs(UnmanagedType.U1)] public bool DeleteFile; }
  const uint FLAGS = 0x02000000 | 0x00200000; // BACKUP_SEMANTICS | OPEN_REPARSE_POINT
  static SafeFileHandle Open(string path, bool delete) {
    // DELETE access is requested on the original object, never via recursive path removal.
    var h = CreateFile(path, delete ? 0x00010081u : 0x80u, 7,
      IntPtr.Zero, 3, FLAGS, IntPtr.Zero);
    if(h.IsInvalid) throw new IOException("STG_CLEANUP_BLOCKED");
    return h;
  }
  static INFO Read(SafeFileHandle handle) {
    INFO i;
    if(!GetFileInformationByHandle(handle, out i)) throw new IOException("STG_CLEANUP_BLOCKED");
    if((i.Attributes & 0x400u)!=0 || i.Links!=1)
      throw new IOException("STG_CLEANUP_BLOCKED");
    return i;
  }
  static string Identity(INFO i) {
    return i.Volume.ToString("x8")+":"+i.HighIndex.ToString("x8")+i.LowIndex.ToString("x8");
  }
  public static string Id(string path) {
    using(var h=Open(path,false)) return Identity(Read(h));
  }
  public static void DisposeExact(string path, string expectedId, bool directory) {
    using(var h=Open(path,true)) {
      INFO i=Read(h);
      if(Identity(i)!=expectedId || ((i.Attributes & 0x10u)!=0)!=directory)
        throw new IOException("STG_CLEANUP_BLOCKED");
      // FILE_DISPOSITION_INFO is nonrecursive, including for empty directories.
      var disposition=new FILE_DISPOSITION_INFO { DeleteFile=true };
      if(!SetFileInformationByHandle(h,4,ref disposition,1))
        throw new IOException("STG_CLEANUP_BLOCKED");
    }
  }
}
'@ -ErrorAction Stop
}
function Assert-StgCi([bool]$Valid) {
  if (-not $Valid) {throw 'STG_CLEANUP_BLOCKED'}
}
function Get-StgCiHash([byte[]]$Bytes) {
  $sha=[Security.Cryptography.SHA256]::Create()
  try {return [BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace('-','').ToLowerInvariant()}
  finally {$sha.Dispose()}
}
function Assert-StgCiAncestors([string]$Path) {
  $p=[IO.Path]::GetFullPath($Path)
  while ($p) {
    $attr=[IO.File]::GetAttributes($p)
    Assert-StgCi (($attr -band [IO.FileAttributes]::ReparsePoint) -eq 0)
    $parent=[IO.Path]::GetDirectoryName($p.TrimEnd('\'))
    if (-not $parent -or $parent -ceq $p) {break}
    $p=$parent
  }
}
function Get-StgCiRow([string]$Path) {
  Assert-StgCiAncestors $Path
  $a=[IO.File]::GetAttributes($Path)
  $dir=($a -band [IO.FileAttributes]::Directory) -ne 0
  Assert-StgCi (($a -band [IO.FileAttributes]::ReparsePoint) -eq 0)
  $acl=if($dir){[IO.Directory]::GetAccessControl($Path)}else{[IO.File]::GetAccessControl($Path)}
  $bytes=$acl.GetSecurityDescriptorBinaryForm()
  $sha='';$size=0L
  if (-not $dir) {
    $file=[IO.FileInfo]::new($Path)
    $size=$file.Length
    $sha=Get-StgCiHash ([IO.File]::ReadAllBytes($Path))
  }
  return [pscustomobject][ordered]@{
    Path=[IO.Path]::GetFullPath($Path)
    Kind=if($dir){'D'}else{'F'}
    Attr=[int]$a
    ObjectId=[FfhStgCiObject]::Id($Path)
    Acl=Get-StgCiHash $bytes
    Created=if($dir){[IO.Directory]::GetCreationTimeUtc($Path).Ticks}else{[IO.File]::GetCreationTimeUtc($Path).Ticks}
    Modified=if($dir){[IO.Directory]::GetLastWriteTimeUtc($Path).Ticks}else{[IO.File]::GetLastWriteTimeUtc($Path).Ticks}
    Length=$size
    Sha256=$sha
  }
}
function Get-StgCiRows([string[]]$Roots,[string]$Ticket) {
  $paths=New-Object 'System.Collections.Generic.List[string]'
  foreach($root in $Roots) {
    Assert-StgCi ([IO.Directory]::Exists($root))
    $paths.Add($root)
    $pending=New-Object 'System.Collections.Generic.Stack[string]'
    $pending.Push($root)
    while($pending.Count -gt 0) {
      $current=$pending.Pop()
      # Reparse points are inspected as entries, NEVER followed.
      foreach($child in [IO.Directory]::GetFileSystemEntries($current)) {
        $paths.Add($child)
        $attr=[IO.File]::GetAttributes($child)
        if (($attr -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
          throw 'STG_CLEANUP_BLOCKED'
        }
        if (($attr -band [IO.FileAttributes]::Directory) -ne 0) {$pending.Push($child)}
      }
    }
  }
  Assert-StgCi ([IO.File]::Exists($Ticket))
  $paths.Add($Ticket)
  $rows=@(foreach($path in $paths) {Get-StgCiRow $path})
  return @($rows | Sort-Object -Property Path)
}
function Assert-StgCiWorktree([string]$Worktree,[string]$ExpectedHead) {
  Assert-StgCi ([IO.Directory]::Exists($Worktree))
  $actual=[string]((& git -C $Worktree rev-parse --verify HEAD 2>$null) -join '')
  Assert-StgCi ($LASTEXITCODE -eq 0 -and $actual.Trim() -ceq $ExpectedHead)
  $top=[string]((& git -C $Worktree rev-parse --show-toplevel 2>$null) -join '')
  Assert-StgCi ($LASTEXITCODE -eq 0 -and
    [IO.Path]::GetFullPath($top.Trim()) -ceq [IO.Path]::GetFullPath($Worktree))
  $dirty=@(& git -C $Worktree status --porcelain=v1 --untracked-files=all 2>$null)
  Assert-StgCi ($LASTEXITCODE -eq 0 -and $dirty.Count -eq 0)
}
function New-StgCiManifest([string[]]$Roots,[string]$Ticket,
  [string[]]$ExpectedFiles,[string]$Worktree,[string]$Head,[string]$Repository) {
  Assert-StgCi ($Roots.Count -ge 1 -and $Head -cmatch '^[0-9a-f]{40}$')
  Assert-StgCi ([IO.Path]::GetFullPath($Worktree) -ceq $Worktree)
  Assert-StgCi ([IO.Path]::GetFullPath($Ticket) -ceq $Ticket)
  $expected=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
  foreach($root in $Roots) {
    Assert-StgCi ([IO.Path]::GetFullPath($root) -ceq $root)
    Assert-StgCi ($expected.Add($root))
  }
  foreach($file in @($ExpectedFiles)+@($Ticket)) {
    Assert-StgCi ([IO.Path]::GetFullPath($file) -ceq $file)
    $anchor=$null
    foreach($root in $Roots) {
      if($file.StartsWith($root+'\',[StringComparison]::Ordinal)) {$anchor=$root;break}
    }
    Assert-StgCi ($null -ne $anchor -or $file -ceq $Ticket)
    Assert-StgCi ($expected.Add($file))
    if($anchor) {
      $dir=[IO.Path]::GetDirectoryName($file)
      while ($dir -cne $anchor) {
        Assert-StgCi ($dir.StartsWith($anchor+'\',[StringComparison]::Ordinal))
        [void]$expected.Add($dir)
        $dir=[IO.Path]::GetDirectoryName($dir)
      }
    }
  }
  Assert-StgCiWorktree $Worktree $Head
  $rows=@(Get-StgCiRows -Roots $Roots -Ticket $Ticket)
  Assert-StgCi ($rows.Count -eq $expected.Count)
  $index=@{}
  foreach($row in $rows) {
    Assert-StgCi ($expected.Contains([string]$row.Path))
    Assert-StgCi (-not $index.ContainsKey([string]$row.Path))
    $index[[string]$row.Path]=$row
  }
  return [pscustomobject]@{
    Roots=@($Roots);Ticket=$Ticket;Worktree=$Worktree;Head=$Head;Repository=$Repository
    Rows=@($rows);Index=$index
  }
}
function Assert-StgCiManifest($Manifest,[string[]]$Removed=@(),
  [bool]$AllowDirectoryModifiedTime=$false,[bool]$IncludeWorktree=$true) {
  $removedSet=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
  foreach($x in $Removed){[void]$removedSet.Add($x)}
  $roots=@($Manifest.Roots | Where-Object { -not $removedSet.Contains($_) })
  $ticket=$Manifest.Ticket
  $actual=@()
  foreach($root in $roots) {
    $pending=New-Object 'System.Collections.Generic.Stack[string]'
    $pending.Push($root)
    while ($pending.Count -gt 0) {
      $p=$pending.Pop()
      $actual+=Get-StgCiRow $p
      foreach($child in [IO.Directory]::GetFileSystemEntries($p)) {
        $attr=[IO.File]::GetAttributes($child)
        Assert-StgCi (($attr -band [IO.FileAttributes]::ReparsePoint) -eq 0)
        if (($attr -band [IO.FileAttributes]::Directory) -ne 0) {$pending.Push($child)}
        else {$actual+=Get-StgCiRow $child}
      }
    }
  }
  if (-not $removedSet.Contains($ticket)) {$actual+=Get-StgCiRow $ticket}
  $needed=@($Manifest.Rows | Where-Object { -not $removedSet.Contains($_.Path) })
  Assert-StgCi ($actual.Count -eq $needed.Count)
  foreach($row in $actual) {
    Assert-StgCi ($Manifest.Index.ContainsKey([string]$row.Path))
    Assert-StgCi (-not $removedSet.Contains([string]$row.Path))
    $e=$Manifest.Index[[string]$row.Path]
    foreach($prop in @('Kind','Attr','ObjectId','Acl','Created','Length','Sha256')) {
      Assert-StgCi ($row.$prop -ceq $e.$prop)
    }
    if(-not ($AllowDirectoryModifiedTime -and $row.Kind -ceq 'D')) {
      Assert-StgCi ($row.Modified -ceq $e.Modified)
    }
  }
  if($IncludeWorktree) {Assert-StgCiWorktree $Manifest.Worktree $Manifest.Head}
}
function Invoke-StgCiContainedTeardown($Manifest,[string[]]$OwnedFiles,
  [string[]]$OwnedDirs,[int]$InterruptAfter=-1) {
  # A failed preflight makes ZERO dispositions. Do not retry automatically.
  Assert-StgCiManifest $Manifest
  $removed=New-Object 'System.Collections.Generic.List[string]'
  $dispositions=0
  $worktree=$Manifest.Worktree
  foreach($f in $OwnedFiles) {
    Assert-StgCi ($Manifest.Index.ContainsKey($f) -and
      $Manifest.Index[$f].Kind -ceq 'F' -and $f -cne $Manifest.Ticket -and
      -not $f.StartsWith($worktree+'\',[StringComparison]::Ordinal))
    Assert-StgCiManifest $Manifest -Removed @($removed) -AllowDirectoryModifiedTime $true
    [FfhStgCiObject]::DisposeExact($f,$Manifest.Index[$f].ObjectId,$false)
    $removed.Add($f);$dispositions++
    if($InterruptAfter -ge 0 -and $dispositions -ge $InterruptAfter) {
      throw 'STG_CLEANUP_BLOCKED'
    }
  }
  foreach($d in $OwnedDirs) {
    Assert-StgCi ($Manifest.Index.ContainsKey($d) -and
      $Manifest.Index[$d].Kind -ceq 'D' -and $d -cne $worktree -and
      -not $d.StartsWith($worktree+'\',[StringComparison]::Ordinal))
    Assert-StgCiManifest $Manifest -Removed @($removed) -AllowDirectoryModifiedTime $true
    Assert-StgCi ([IO.Directory]::GetFileSystemEntries($d).Count -eq 0)
    [FfhStgCiObject]::DisposeExact($d,$Manifest.Index[$d].ObjectId,$true)
    $removed.Add($d)
  }
  Assert-StgCiManifest $Manifest -Removed @($removed) -AllowDirectoryModifiedTime $true
  # Git owns its own exact clean checkout removal. NO --force, ever.
  Assert-StgCiWorktree $worktree $Manifest.Head
  & git -C $Manifest.Repository worktree remove $worktree 2>$null | Out-Null
  Assert-StgCi ($LASTEXITCODE -eq 0 -and -not [IO.Directory]::Exists($worktree))
  foreach($row in @($Manifest.Rows | Where-Object {
      $_.Path -ceq $worktree -or $_.Path.StartsWith($worktree+'\',[StringComparison]::Ordinal)
    })) {$removed.Add([string]$row.Path)}
  Assert-StgCiManifest $Manifest -Removed @($removed) -AllowDirectoryModifiedTime $true -IncludeWorktree $false
  Assert-StgCi ($Manifest.Index.ContainsKey($Manifest.Ticket) -and
    $Manifest.Index[$Manifest.Ticket].Kind -ceq 'F')
  [FfhStgCiObject]::DisposeExact($Manifest.Ticket,$Manifest.Index[$Manifest.Ticket].ObjectId,$false)
  $removed.Add($Manifest.Ticket)
  Assert-StgCiManifest $Manifest -Removed @($removed) -AllowDirectoryModifiedTime $true -IncludeWorktree $false
}
