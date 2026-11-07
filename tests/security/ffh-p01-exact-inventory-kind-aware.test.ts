// FFH-P01 #83: actual production PowerShell 5.1 exact global Docker namespace.
// All metadata is synthetic, fake Docker adapter only, zero Owner-host effects.
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 real WinPS5.1 kind-aware global inventory and downstream guards",()=>{
  if(process.platform!=="win32")return;
  const result=spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
    "-File","tests/security/fixtures/ffh-p01-exact-inventory-kind-aware.test.ps1",
  ],{encoding:"utf8",windowsHide:true,timeout:120_000,maxBuffer:2_000_000});
  assert.ifError(result.error);
  assert.equal(result.status,0,(result.stdout??"")+"\n"+(result.stderr??""));
  assert.equal(result.stderr??"","");
  const lines=(result.stdout??"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  assert.deepEqual(lines,Array.from({length:25},
    (_,i)=>"KI-"+String(i+1).padStart(2,"0")+" PASS"));
  for(const line of lines)console.log(line);
});
