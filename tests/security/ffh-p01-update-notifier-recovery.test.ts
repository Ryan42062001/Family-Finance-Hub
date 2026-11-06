// Real Windows PowerShell 5.1: notifier subprocess environment and
// synthetic consumed-run forensic admission. No owner-host Run or cleanup.
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 pinned CLI notifier suppression and consumed recovery fail-closed WinPS5.1 fixtures",()=>{
  if(process.platform!=="win32"){return;}
  const run=spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
    "-File","tests/security/fixtures/ffh-p01-update-notifier-recovery.test.ps1",
  ],{encoding:"utf8",windowsHide:true,timeout:150_000,maxBuffer:2_000_000});
  assert.ifError(run.error);
  assert.equal(run.status,0,(run.stdout??"")+"\n"+(run.stderr??""));
  const lines=(run.stdout??"").split(/\r?\n/).map(s=>s.trim()).filter(s=>/^RC-\d{2} PASS$/.test(s));
  assert.deepEqual(lines,Array.from({length:44},(_,i)=>"RC-"+String(i+1).padStart(2,"0")+" PASS"));
  assert.doesNotMatch(run.stdout??"",/NEVER_PRINT_ME|SYNTHETIC_ONLY/);
  for(const receipt of lines)console.log(receipt);
});
