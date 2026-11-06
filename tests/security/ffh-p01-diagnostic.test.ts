import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 one-shot diagnostic actual WinPS5.1 fake Docker/FS 29-case matrix",()=>{
  if(process.platform!=="win32"){return;}
  const run=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive",
    "-ExecutionPolicy","Bypass","-File","tests/security/fixtures/ffh-p01-diagnostic.test.ps1"],{
    encoding:"utf8",windowsHide:true,timeout:90_000,maxBuffer:3_000_000
  });
  assert.ifError(run.error);
  assert.equal(run.status,0,(run.stdout??"")+"\n"+(run.stderr??""));
  const lines=(run.stdout??"").split(/\r?\n/).map(s=>s.trim()).filter(s=>/^DG-\d{2} PASS$/.test(s));
  const expected=Array.from({length:29},(_,i)=>"DG-"+String(i+1).padStart(2,"0")+" PASS");
  assert.deepEqual(lines,expected);
  for(const receipt of lines)console.log(receipt);
});
