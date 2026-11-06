// FFH-P01 #83: fail-closed immutable manifest-bound Windows directory retirement.
// RR-01/RR-02: exhaustive read-only preflight with held identities before ANY disposition.
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class FfhP01OwnedRoot {
  const uint READ=0x81, DELETE=0x10000, SHARE_READ=1, OPEN=3;
  const uint BACKUP=0x02000000, OPEN_LINK=0x00200000, DIR=0x10, LINK=0x400;
  const int MAX_DEPTH=20, MAX_ENTRIES=4096, MAX_SIBLINGS=2048;
  public static int DispositionAttempts { get; private set; }
  [StructLayout(LayoutKind.Sequential)] struct Ft {public uint lo,hi;}
  [StructLayout(LayoutKind.Sequential)] struct Info {
    public uint attr; public Ft created,accessed,written;
    public uint vol,sizeHi,sizeLo,links,hi,lo;
  }
  [DllImport("kernel32.dll",EntryPoint="CreateFileW",CharSet=CharSet.Unicode,SetLastError=true)]
  static extern SafeFileHandle CreateFile(string path,uint access,uint share,IntPtr sec,
    uint creation,uint flags,IntPtr template);
  [DllImport("kernel32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info i);
  [DllImport("kernel32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool SetFileInformationByHandle(SafeFileHandle h,int kind,ref byte value,uint length);
  [DllImport("kernel32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool SetFilePointerEx(SafeFileHandle h,long distance,out long next,uint origin);
  [DllImport("kernel32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool ReadFile(SafeFileHandle h,byte[] buffer,uint length,out uint received,IntPtr overlapped);
  static void Fail(string category) {throw new InvalidOperationException("BLOCKED_ROOT_"+category);}
  static SafeFileHandle OpenPath(string path,bool delete,bool allowMissing) {
    // No share-WRITE or share-DELETE: reject existing writers and hold namespace objects.
    SafeFileHandle h=CreateFile(path,READ|(delete?DELETE:0),SHARE_READ,
      IntPtr.Zero,OPEN,BACKUP|OPEN_LINK,IntPtr.Zero);
    if(h.IsInvalid) {
      int err=Marshal.GetLastWin32Error();h.Dispose();
      if(allowMissing && (err==2 || err==3))return null;
      Fail("OPEN_"+err);
    }
    return h;
  }
  static Info Describe(SafeFileHandle h,bool directory) {
    Info i;
    if(!GetFileInformationByHandle(h,out i)) Fail("INFO");
    if((i.attr&LINK)!=0 || ((i.attr&DIR)!=0)!=directory)Fail("REPARSE_OR_TYPE");
    if(i.hi==0 && i.lo==0)Fail("ID_UNKNOWN");
    if(!directory && i.links!=1)Fail("HARDLINK");
    return i;
  }
  static string FileId(Info i) {
    return i.vol.ToString("x8")+":"+i.hi.ToString("x8")+i.lo.ToString("x8");
  }
  static string Full(string parent,string leaf) {
    string home=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    if(String.IsNullOrEmpty(home) || !Path.IsPathRooted(home) ||
       !String.Equals(Path.GetFullPath(parent).TrimEnd('\\'),Path.GetFullPath(home).TrimEnd('\\'),
         StringComparison.OrdinalIgnoreCase) ||
       !Regex.IsMatch(leaf,@"^FFH-P01-RLS-Fresh-[a-f0-9]{12}-[a-f0-9]{24}$"))
      Fail("PATH_IDENTITY");
    return Path.Combine(home,leaf);
  }
  static void Acl(string path,bool dir,bool protectedDacl) {
    FileSystemSecurity a=dir?(FileSystemSecurity)Directory.GetAccessControl(path):
      (FileSystemSecurity)File.GetAccessControl(path);
    string who=WindowsIdentity.GetCurrent().User.Value;
    string owner=a.GetOwner(typeof(SecurityIdentifier)).Value;
    if((protectedDacl && owner!=who) ||
       (!protectedDacl && owner!=who && owner!="S-1-5-18" && owner!="S-1-5-32-544") ||
       (protectedDacl && !a.AreAccessRulesProtected))Fail("ACL_OWNER");
    foreach(FileSystemAccessRule rule in a.GetAccessRules(true,true,typeof(SecurityIdentifier))) {
      string sid=rule.IdentityReference.Value;
      if((sid!=who && sid!="S-1-5-18" && sid!="S-1-5-32-544") ||
         rule.AccessControlType!=AccessControlType.Allow)Fail("ACL_FOREIGN");
    }
  }
  const ulong MAX_CACHE_BYTES=96;
  static bool IsRecoveryCache(string relative) {
    return String.Equals(relative,@"supabase\.temp\cli-latest",StringComparison.Ordinal);
  }
  static ulong Length(Info i) {return ((ulong)i.sizeHi<<32)|i.sizeLo;}
  static void AssertCacheLength(Info i) {
    if(Length(i)>MAX_CACHE_BYTES)Fail("CACHE_SIZE");
  }
  static string Sha(SafeFileHandle h,bool recoveryCache=false) {
    // A held Windows handle denies concurrent WRITE/DELETE sharing. For the
    // exact recovery cache, validate kind/length BEFORE allocating or hashing;
    // a 97-byte sentinel limits even an unexpected mid-read growth.
    Info before=default(Info);
    if(recoveryCache) {before=Describe(h,false);AssertCacheLength(before);}
    long next;
    if(!SetFilePointerEx(h,0,out next,0))Fail("HASH_SEEK");
    using(SHA256 hash=SHA256.Create()) {
      byte[] buffer=new byte[recoveryCache?97:8192];
      ulong total=0;
      while(true) {
        uint received;
        if(!ReadFile(h,buffer,(uint)buffer.Length,out received,IntPtr.Zero))
          Fail("HASH_READ");
        if(received==0)break;
        total+=(ulong)received;
        if(recoveryCache && total>MAX_CACHE_BYTES)Fail("CACHE_SIZE");
        hash.TransformBlock(buffer,0,(int)received,buffer,0);
      }
      hash.TransformFinalBlock(new byte[0],0,0);
      if(!SetFilePointerEx(h,0,out next,0))Fail("HASH_SEEK");
      if(recoveryCache) {
        Info after=Describe(h,false);
        AssertCacheLength(after);
        if(total!=Length(before) || Length(after)!=Length(before) ||
           FileId(after)!=FileId(before) ||
           after.created.lo!=before.created.lo || after.created.hi!=before.created.hi ||
           after.written.lo!=before.written.lo || after.written.hi!=before.written.hi ||
           after.attr!=before.attr || after.links!=before.links)Fail("CACHE_DRIFT");
      }
      return BitConverter.ToString(hash.Hash).Replace("-","").ToLowerInvariant();
    }
  }
  static string Check(string root,SafeFileHandle h,string marker) {
    Info i=Describe(h,true);Acl(root,true,true);
    string markerPath=Path.Combine(root,".ffh-p01-owned-root");
    using(SafeFileHandle m=OpenPath(markerPath,false,false)) {
      Describe(m,false);Acl(markerPath,false,true);
      using(FileStream f=new FileStream(m,FileAccess.Read,4096,false)) {
        if(f.Length==0 || f.Length>256)Fail("MARKER_SIZE");
        using(StreamReader r=new StreamReader(f,new UTF8Encoding(false,true),false)) {
          if(!String.Equals(r.ReadToEnd(),marker,StringComparison.Ordinal))Fail("MARKER_MISMATCH");
        }
      }
    }
    return FileId(i);
  }
  public static string Inspect(string parent,string leaf,string marker) {
    string root=Full(parent,leaf);
    using(SafeFileHandle p=OpenPath(parent,false,false)) {
      Describe(p,true);
      using(SafeFileHandle r=OpenPath(root,false,false)) return Check(root,r,marker);
    }
  }
  public static string Probe(string parent,string leaf) {
    string root=Full(parent,leaf);
    using(SafeFileHandle p=OpenPath(parent,false,false)) {
      Describe(p,true);
      using(SafeFileHandle r=OpenPath(root,false,true))
        return r==null?"ABSENT":FileId(Describe(r,true));
    }
  }
  class Permit {
    public string kind, digest;
    public bool required;
  }
  class Entry : IDisposable {
    public string path, relative;
    public SafeFileHandle handle;
    public Info info;
    public bool directory;
    public int depth;
    public void Dispose() {if(handle!=null)handle.Dispose();}
  }
  static Dictionary<string,Permit> ParsePermit(string specification) {
    if(String.IsNullOrWhiteSpace(specification) || specification.Length>8192)Fail("MANIFEST_INVALID");
    var items=new Dictionary<string,Permit>(StringComparer.OrdinalIgnoreCase);
    foreach(string line in specification.Split(new[]{'\n'},StringSplitOptions.RemoveEmptyEntries)) {
      string[] v=line.TrimEnd('\r').Split('|');
      if(v.Length!=3 || (v[0]!="D" && v[0]!="O" && v[0]!="F") ||
         !Regex.IsMatch(v[1],@"^[a-zA-Z0-9_.\\-]+$") ||
         v[1].StartsWith("\\") || v[1].EndsWith("\\") || v[1].Contains("\\\\") ||
         v[1]=="." || v[1].Contains("..") || v[1].IndexOf("FFH-RLS-Test",StringComparison.OrdinalIgnoreCase)>=0 ||
         (v[0]=="F" && !Regex.IsMatch(v[2],@"^[a-f0-9]{64}$")) ||
         (v[0]!="F" && v[2]!="-") ||
         items.ContainsKey(v[1]))Fail("MANIFEST_INVALID");
      string rel=v[1];
      bool known=rel==".ffh-p01-owned-root" ||
        rel=="ffh-p01-local-provenance.json" ||
        rel=="ffh-p01-local-provenance.sha256" ||
        rel==@"supabase\config.toml" ||
        rel=="supabase" || rel==@"supabase\migrations" || rel==@"supabase\.temp" ||
        // A recovery-only manifest MAY declare this one exact file by its
        // independently authorized SHA-256. The normal permit never adds it.
        rel==@"supabase\.temp\cli-latest" ||
        Regex.IsMatch(rel,@"^supabase\\migrations\\(?:0001|[0-9]{14})_[a-z0-9_]+\.sql$");
      if(!known)Fail("MANIFEST_UNKNOWN_PATH");
      bool dir=(rel=="supabase" || rel==@"supabase\migrations" || rel==@"supabase\.temp");
      if((v[0]=="F")==dir || (v[0]=="O" && rel!=@"supabase\.temp"))Fail("MANIFEST_INVALID");
      if(rel==@"supabase\.temp\cli-latest" && v[0]!="F")Fail("MANIFEST_INVALID");
      items.Add(rel,new Permit{kind=v[0],digest=v[2],required=v[0]!="O"});
    }
    if(items.ContainsKey(@"supabase\.temp\cli-latest") &&
       (!items.ContainsKey(@"supabase\.temp") || items[@"supabase\.temp"].kind!="O"))
      Fail("MANIFEST_INCOMPLETE");
    if(items.Count<4 || items.Count>24 ||
       !items.ContainsKey(".ffh-p01-owned-root") ||
       !items.ContainsKey("supabase") || !items.ContainsKey(@"supabase\migrations") ||
       items[".ffh-p01-owned-root"].kind!="F" ||
       items["supabase"].kind!="D" ||
       items[@"supabase\migrations"].kind!="D")Fail("MANIFEST_INCOMPLETE");
    return items;
  }
  static void Scan(string path,string relative,int depth,uint volume,
    Dictionary<string,Permit> permit,Dictionary<string,Entry> seen,List<Entry> held) {
    if(depth>MAX_DEPTH)Fail("LIMIT_DEPTH");
    string[] paths=Directory.GetFileSystemEntries(path);
    if(paths.Length>MAX_SIBLINGS)Fail("LIMIT_SIBLINGS");
    Array.Sort(paths,StringComparer.Ordinal);
    foreach(string child in paths) {
      if(held.Count>=MAX_ENTRIES)Fail("LIMIT_TOTAL");
      string leaf=Path.GetFileName(child);
      string rel=relative.Length==0?leaf:relative+"\\"+leaf;
      Permit rule;
      if(!permit.TryGetValue(rel,out rule) || !String.Equals(rel,
        permitKey(permit,rel),StringComparison.Ordinal))Fail("UNPERMITTED_PATH");
      if(seen.ContainsKey(rel))Fail("DUPLICATE_ENTRY");
      bool dir=rule.kind!="F";
      SafeFileHandle h=OpenPath(child,true,false);
      var e=new Entry{path=child,relative=rel,handle=h,directory=dir,depth=depth};
      held.Add(e);
      e.info=Describe(h,dir);
      if(e.info.vol!=volume)Fail("VOLUME");
      Acl(child,dir,rel==".ffh-p01-owned-root");
      if(!dir) {
        bool cache=IsRecoveryCache(rel);
        if(cache)AssertCacheLength(e.info);
        if(Sha(h,cache)!=rule.digest)Fail("MANIFEST_HASH");
      }
      seen.Add(rel,e);
      if(dir)Scan(child,rel,depth+1,volume,permit,seen,held);
    }
  }
  static string permitKey(Dictionary<string,Permit> p,string requested) {
    foreach(string key in p.Keys) if(String.Equals(key,requested,StringComparison.OrdinalIgnoreCase))return key;
    return "";
  }
  static void ValidateComplete(Dictionary<string,Permit> permit,Dictionary<string,Entry> seen) {
    foreach(var item in permit)
      if(item.Value.required && !seen.ContainsKey(item.Key))Fail("MANIFEST_INCOMPLETE");
  }
  static void Recheck(Entry e,Dictionary<string,Permit> permit) {
    Info i=Describe(e.handle,e.directory);
    if(FileId(i)!=FileId(e.info) || i.vol!=e.info.vol)Fail("TREE_RACE");
    Acl(e.path,e.directory,e.relative==".ffh-p01-owned-root");
    if(!e.directory) {
      bool cache=IsRecoveryCache(e.relative);
      if(cache)AssertCacheLength(i);
      if(Sha(e.handle,cache)!=permit[e.relative].digest)Fail("TREE_RACE");
    }
  }
  static void DisposeExact(SafeFileHandle h) {
    DispositionAttempts++;
    byte yes=1;
    if(!SetFileInformationByHandle(h,4,ref yes,1))
      Fail("DISPOSITION_"+Marshal.GetLastWin32Error());
  }
  static string Execute(string parent,string leaf,string expected,string marker,string manifest,bool delete) {
    DispositionAttempts=0;
    string root=Full(parent,leaf);
    var permit=ParsePermit(manifest);
    var held=new List<Entry>();
    using(SafeFileHandle p=OpenPath(parent,false,false)) {
      Info parentInfo=Describe(p,true);
      try {
        SafeFileHandle r=OpenPath(root,delete,true);
        if(r==null)Fail("ROOT_DISAPPEARED_BEFORE_RETIRE");
        var top=new Entry{path=root,relative="",handle=r,directory=true,depth=-1};
        held.Add(top);
        string actual=Check(root,r,marker);
        if(actual!=expected)Fail("ID_DRIFT");
        top.info=Describe(r,true);
        if(top.info.vol!=parentInfo.vol)Fail("VOLUME");
        var seen=new Dictionary<string,Entry>(StringComparer.OrdinalIgnoreCase);
        Scan(root,"",0,top.info.vol,permit,seen,held);
        ValidateComplete(permit,seen);
        // No disposition occurred during Scan: all paths, hashes, ACLs and IDs
        // have been checked, and every entry handle is held against replacement.
        if(!delete)return "PREFLIGHT_OK";
        // Marker LAST of children; root last. Recheck identity and content from
        // the held handles and re-enumerate parents before each disposition.
        held.Sort((a,b)=>{
          if(a.relative=="")return 1;
          if(b.relative=="")return -1;
          if(a.relative==".ffh-p01-owned-root")return 1;
          if(b.relative==".ffh-p01-owned-root")return -1;
          int d=b.depth.CompareTo(a.depth);
          return d!=0?d:StringComparer.Ordinal.Compare(a.relative,b.relative);
        });
        foreach(Entry e in held) {
          if(e.relative=="") {
            Recheck(e,permit);
          } else {
            Recheck(e,permit);
            string[] children= e.directory?Directory.GetFileSystemEntries(e.path):new string[0];
            if(e.directory && children.Length!=0)Fail("TREE_RACE");
          }
          DisposeExact(e.handle);
          // FILE_DISPOSITION_INFO completes unlink only after final handle
          // closes. Release verified children before parent's emptiness check.
          e.Dispose();
        }
      } finally {
        foreach(Entry e in held)e.Dispose();
      }
      if(delete) {
        using(SafeFileHandle verify=OpenPath(root,false,true))
          if(verify!=null)Fail("POST_DELETE_PRESENT");
      }
    }
    return delete?"RETIRED":"PREFLIGHT_OK";
  }
  public static string Preflight(string parent,string leaf,string expected,string marker,string manifest) {
    return Execute(parent,leaf,expected,marker,manifest,false);
  }
  public static string Retire(string parent,string leaf,string expected,string marker,string manifest) {
    return Execute(parent,leaf,expected,marker,manifest,true);
  }
  // Old four-argument caller MUST NOT silently delete with no per-file manifest.
  public static string Retire(string parent,string leaf,string expected,string marker) {
    Fail("MANIFEST_REQUIRED");return "";
  }
}