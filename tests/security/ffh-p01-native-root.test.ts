// Real WinPS5.1 ephemeral runner-only, native handle-root test receipts.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";
const fixture="tests/security/fixtures/ffh-p01-native-root.test.ps1";
test("FFH-P01 native Windows root identity/reparse/ACL/absence tests",()=>{
  const interpreter=process.platform==="win32"?"powershell.exe":"pwsh";
  const r=spawnSync(interpreter,["-NoLogo","-NoProfile","-NonInteractive","-File",fixture],
    {encoding:"utf8",windowsHide:true,timeout:120_000});
  assert.ifError(r.error);
  assert.equal(r.status,0,r.stdout+"\n"+r.stderr);
  const lines=r.stdout.split(/\r?\n/).filter(x=>/^FS-\d\d PASS$/.test(x.trim())).map(x=>x.trim());
  assert.deepEqual(lines,[...Array.from({length:20},(_,i)=>"FS-"+String(i+1).padStart(2,"0")+" PASS"),"FS-22 PASS"]);
  for(const receipt of lines) console.log(receipt);
});

test("FFH-RR-04 rejects an already-loaded stale FfhP01OwnedRoot class before native disposal",()=>{
  const interpreter=process.platform==="win32"?"powershell.exe":"pwsh";
  const r=spawnSync(interpreter,["-NoLogo","-NoProfile","-NonInteractive","-File",
    "tests/security/fixtures/ffh-p01-native-preloaded-type.ps1"],
    {encoding:"utf8",windowsHide:true,timeout:30_000});
  assert.ifError(r.error);
  assert.equal(r.status,0,r.stdout+"\n"+r.stderr);
  assert.match(r.stdout,/^FS-21 PASS$/m);
  console.log("FS-21 PASS");
});
