// FFH-P01 #83: direct production port-selector socket regression on WinPS5.1.
// No owner Plan/Run, Docker, SQL, native deletion or external network.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("FFH-P01 port selector binds/releases real WinPS5.1 localhost sockets and fails closed on conflict",
  {skip: process.platform !== "win32" ? "Requires Windows PowerShell 5.1 and Windows loopback sockets" : false},
  () => {
    const run=spawnSync("powershell.exe",[
      "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
      "-File","tests/security/fixtures/ffh-p01-real-socket-selector.test.ps1",
    ],{encoding:"utf8",windowsHide:true,timeout:90_000,maxBuffer:1_000_000});
    assert.ifError(run.error);
    assert.equal(run.status,0, "Real-socket selector failed:\n"+run.stdout+"\n"+run.stderr);
    const receipts=(run.stdout??"").split(/\r?\n/).map(s=>s.trim())
      .filter(s=>/^PORT-\d{2} PASS$/.test(s));
    assert.deepEqual(receipts,Array.from({length:5},(_,i)=>"PORT-"+String(i+1).padStart(2,"0")+" PASS"));
    for(const receipt of receipts)console.log(receipt);
  });
