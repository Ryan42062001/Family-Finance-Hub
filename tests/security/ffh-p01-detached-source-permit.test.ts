import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 real detached immutable SHA source-to-native-permit and read-only Plan WinPS5.1 integration",()=>{
  if(process.platform!=="win32"){return;}
  const run=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive",
    "-ExecutionPolicy","Bypass","-File","tests/security/fixtures/ffh-p01-detached-source-permit.test.ps1"],{
    encoding:"utf8",windowsHide:true,timeout:120_000,maxBuffer:3_000_000
  });
  assert.ifError(run.error);
  assert.equal(run.status,0,(run.stdout??"")+"\n"+(run.stderr??""));
  const lines=(run.stdout??"").split(/\r?\n/).map(s=>s.trim()).filter(s=>/^PI-\d{2} PASS$/.test(s));
  const expected=Array.from({length:12},(_,i)=>"PI-"+String(i+1).padStart(2,"0")+" PASS");
  assert.deepEqual(lines,expected);
  for(const receipt of lines)console.log(receipt);
});
