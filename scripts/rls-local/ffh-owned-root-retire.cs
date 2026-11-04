// FFH-P01 #83. Win32 handle-held, exact-owned root disposal.
// No wildcard, recursive path delete, link traversal, or legacy deletion.
using System;
using System.IO;
using System.Text;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class FfhP01OwnedRoot {
  const uint READ=0x81, DELETE=0x10000, SHARE_READ=1, SHARE_WRITE=2, OPEN=3;
  const uint BACKUP=0x02000000, OPEN_LINK=0x00200000, DIR=0x10, LINK=0x400;
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
  static void Fail(string code) {throw new InvalidOperationException("BLOCKED_ROOT_"+code);}
  static SafeFileHandle OpenPath(string path,bool delete,bool allowMissing) {
    // No FILE_SHARE_DELETE on parent, root or child: no rename/swap while held.
    SafeFileHandle h=CreateFile(path,READ|(delete?DELETE:0),SHARE_READ|SHARE_WRITE,
      IntPtr.Zero,OPEN,BACKUP|OPEN_LINK,IntPtr.Zero);
    if(h.IsInvalid) {
      int err=Marshal.GetLastWin32Error();h.Dispose();
      if(allowMissing && (err==2 || err==3))return null;
      Fail("OPEN_"+err);
    }
    return h;
  }
  static Info Describe(SafeFileHandle h,bool dir) {
    Info i;
    if(!GetFileInformationByHandle(h,out i)) Fail("INFO");
    if((i.attr&LINK)!=0 || ((i.attr&DIR)!=0)!=dir)Fail("REPARSE_OR_TYPE");
    if(i.hi==0 && i.lo==0)Fail("ID_UNKNOWN");
    if(!dir && i.links!=1)Fail("HARDLINK");
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
       !System.Text.RegularExpressions.Regex.IsMatch(leaf,@"^FFH-P01-RLS-Fresh-[a-f0-9]{12}-[a-f0-9]{24}$"))
      Fail("PATH_IDENTITY");
    return Path.Combine(home,leaf);
  }
  static void Acl(string path,bool dir,bool protectedDacl) {
    FileSystemSecurity a=dir?(FileSystemSecurity)Directory.GetAccessControl(path):
      (FileSystemSecurity)File.GetAccessControl(path);
    string who=WindowsIdentity.GetCurrent().User.Value;
    string owner=a.GetOwner(typeof(SecurityIdentifier)).Value;
    // Root and marker must be owned by the invoking user; Windows may
    // create child directories under Administrators/SYSTEM default-owner
    // tokens. Permit only these two additional trusted child owners.
    if((protectedDacl && owner!=who) ||
       (!protectedDacl && owner!=who && owner!="S-1-5-18" &&
        owner!="S-1-5-32-544") ||
       (protectedDacl && !a.AreAccessRulesProtected))Fail("ACL_OWNER");
    foreach(FileSystemAccessRule rule in a.GetAccessRules(true,true,typeof(SecurityIdentifier))) {
      string sid=rule.IdentityReference.Value;
      if((sid!=who && sid!="S-1-5-18" && sid!="S-1-5-32-544") ||
         rule.AccessControlType!=AccessControlType.Allow)Fail("ACL_FOREIGN");
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
          if(!String.Equals(r.ReadToEnd(),marker,StringComparison.Ordinal))
            Fail("MARKER_MISMATCH");
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
      using(SafeFileHandle r=OpenPath(root,false,true)) {
        return r==null?"ABSENT":FileId(Describe(r,true));
      }
    }
  }
  static void DisposeExact(SafeFileHandle h) {
    byte yes=1;
    if(!SetFileInformationByHandle(h,4,ref yes,1))
      Fail("DISPOSITION_"+Marshal.GetLastWin32Error());
  }
  static void Children(string path,uint vol,int depth,ref int count) {
    if(depth>20)Fail("DEPTH");
    string[] entries=Directory.GetFileSystemEntries(path);
    if(entries.Length>2048)Fail("FOLDER_SIZE");
    Array.Sort(entries,StringComparer.Ordinal);
    foreach(string e in entries) {
      count++;if(count>4096)Fail("TOTAL_SIZE");
      string childName=Path.GetFileName(e);
      if(!String.Equals(Path.GetDirectoryName(e),path,StringComparison.OrdinalIgnoreCase) ||
         childName.IndexOf("FFH-RLS-Test",StringComparison.OrdinalIgnoreCase)>=0)
        Fail("FOREIGN_CHILD");
      // Never adopt unexpected top-level files/folders as disposable, even
      // when a same-user process planted them beneath an owned root.
      if(depth==0 && childName!=".ffh-p01-owned-root" &&
         childName!="supabase" && childName!="ffh-p01-local-provenance.json" &&
         childName!="ffh-p01-local-provenance.sha256")Fail("FOREIGN_ROOT_ENTRY");
      if(depth==1 && Path.GetFileName(path)=="supabase" &&
         childName!="config.toml" && childName!="migrations" &&
         childName!=".temp")Fail("FOREIGN_SUPABASE_ENTRY");
      using(SafeFileHandle h=OpenPath(e,true,false)) {
        Info i;
        if(!GetFileInformationByHandle(h,out i) || (i.attr&LINK)!=0 ||
           i.vol!=vol || (i.hi==0 && i.lo==0))Fail("CHILD_IDENTITY");
        bool dir=(i.attr&DIR)!=0;
        if(!dir && i.links!=1)Fail("CHILD_HARDLINK");
        Acl(e,dir,false);
        if(dir)Children(e,vol,depth+1,ref count);
        DisposeExact(h);
      }
    }
  }
  public static string Retire(string parent,string leaf,string expected,string marker) {
    string root=Full(parent,leaf);
    using(SafeFileHandle p=OpenPath(parent,false,false)) {
      Info parentInfo=Describe(p,true);
      using(SafeFileHandle r=OpenPath(root,true,true)) {
        if(r==null)Fail("ROOT_DISAPPEARED_BEFORE_RETIRE");
        string actual=Check(root,r,marker);
        if(!String.Equals(actual,expected,StringComparison.Ordinal))Fail("ID_DRIFT");
        Info i=Describe(r,true);
        if(i.vol!=parentInfo.vol)Fail("VOLUME");
        int count=0;Children(root,i.vol,0,ref count);DisposeExact(r);
      }
      using(SafeFileHandle verify=OpenPath(root,false,true)) {
        if(verify!=null)Fail("POST_DELETE_PRESENT");
      }
    }
    return "RETIRED";
  }
}
