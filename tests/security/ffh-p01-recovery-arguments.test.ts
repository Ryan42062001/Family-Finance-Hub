// SEC-STAGE-01: actual powershell.exe -File argument binding on Windows 5.1.
// No Owner Plan approval or Docker/SQL; fixture uses synthetic-only arguments.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

test("FFH-P01 actual WinPS5.1 -File entry rejects malformed recovery arguments before imports",()=>{
  if(process.platform!=="win32"){return;}
  const proc=spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
    "-File","tests/security/fixtures/ffh-p01-recovery-arguments.test.ps1",
  ],{encoding:"utf8",windowsHide:true,timeout:180_000,maxBuffer:2_000_000});
  assert.ifError(proc.error);
  assert.equal(proc.status,0,(proc.stdout??"")+"\n"+(proc.stderr??""));
  const receipts=(proc.stdout??"").split(/\r?\n/).map(s=>s.trim())
    .filter(s=>/^AR-\d{2} PASS$/.test(s));
  assert.deepEqual(receipts,Array.from({length:21},
    (_,i)=>"AR-"+String(i+1).padStart(2,"0")+" PASS"));
  assert.doesNotMatch((proc.stdout??"")+(proc.stderr??""),/NEVER_PRINT_ME|PRIVATE_|SYNTHETIC_/);
  for(const row of receipts)console.log(row);
});
