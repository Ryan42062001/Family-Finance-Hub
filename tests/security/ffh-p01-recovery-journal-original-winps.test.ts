// FFH-P01 #83: original production existing-only journal reader on WinPS5.1.
// Never invokes an Owner-host Plan, diagnostic Run, Docker, SQL or Retire.
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 actual WinPS5.1 journal reader avoids readonly HOME and never creates missing evidence",()=>{
  if(process.platform!=="win32")return;
  const run=spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
    "-File","tests/security/fixtures/ffh-p01-recovery-journal-original-winps.test.ps1",
  ],{encoding:"utf8",windowsHide:true,timeout:90_000,maxBuffer:2_000_000});
  assert.ifError(run.error);
  assert.equal(run.status,0,(run.stdout??"")+"\n"+(run.stderr??""));
  assert.equal(run.stderr??"","");
  const receipts=(run.stdout??"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  assert.deepEqual(receipts,Array.from({length:8},
    (_,i)=>"JR-"+String(i+1).padStart(2,"0")+" PASS"));
  assert.doesNotMatch(run.stdout??"",/HOME|VariableNotWritable|BLOCKED|PRIVATE_|SYNTHETIC|FFH-RLS-Test/i);
  for(const line of receipts)console.log(line);
});
