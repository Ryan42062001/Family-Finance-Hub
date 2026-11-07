// Authentic Windows PowerShell 5.1 CI-only fixture containment negatives.
// Deliberately rejected ownership drift is NOT production/Owner-host evidence.
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 STGC-01..08: fail-closed fixture teardown with real WinPS5.1",()=>{
  if(process.platform!=="win32"||process.env.GITHUB_ACTIONS!=="true"||process.env.RUNNER_OS!=="Windows")return;
  const p=spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
    "-File","tests/security/fixtures/ffh-p01-stage1-teardown-ci.test.ps1"
  ],{encoding:"utf8",windowsHide:true,timeout:300_000,maxBuffer:1_000_000});
  assert.ifError(p.error);
  assert.equal(p.status,0,(p.stdout??"")+"\n"+(p.stderr??""));
  assert.equal(p.stderr??"","");
  const rows=(p.stdout??"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  assert.equal(rows.length,9,rows.join("\n"));
  for(let i=0;i<8;i++){
    assert.match(rows[i],new RegExp("^STGC-"+String(i+1).padStart(2,"0")+" PASS [A-Z_]+ STG_CLEANUP_BLOCKED$"));
    console.log(rows[i]);
  }
  assert.equal(rows[8],"STGC_SCOPE=CI_SYNTHETIC_ONLY OWNER_HOST=NOT_TOUCHED");
  console.log(rows[8]);
  assert.doesNotMatch((p.stdout??"")+(p.stderr??""),/DO_NOT_DELETE_FOREIGN|C:\\\\Users\\\\|D:\\\\a\\\\|--force|PRIVATE_NEVER_PRINT_CI_SECRET/);
});
