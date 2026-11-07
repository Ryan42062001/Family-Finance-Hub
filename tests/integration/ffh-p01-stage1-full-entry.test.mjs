// Real production powershell.exe -File entry, CI-only synthetic Docker metadata.
// Runs separately from parallel security fixtures to avoid shared profile paths.
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("FFH-P01 integrated Stage 1: real WinPS5.1 -File, native Preflight, 43 synthetic Stage 1 receipts",()=>{
  if(process.platform!=="win32"||process.env.GITHUB_ACTIONS!=="true"||process.env.RUNNER_OS!=="Windows")return;
  const p=spawnSync("powershell.exe",[
    "-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
    "-File","tests/security/fixtures/ffh-p01-stage1-full-entry-ci.test.ps1"
  ],{encoding:"utf8",windowsHide:true,timeout:780_000,maxBuffer:1_000_000});
  assert.ifError(p.error);
  assert.equal(p.status,0,(p.stdout??"")+"\n"+(p.stderr??""));
  assert.equal(p.stderr??"","");
  const rows=(p.stdout??"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  assert.equal(rows.length,43,rows.join("\n"));
  for(let i=0;i<rows.length;i++){
    assert.match(rows[i],new RegExp("^STG-"+String(i+1).padStart(2,"0")+" PASS [A-Z_]+ STAGE=[A-Z_]+$"));
    console.log(rows[i]);
  }
  assert.doesNotMatch((p.stdout??"")+(p.stderr??""),/PRIVATE_NEVER_PRINT_CI_SECRET|D:\\\\a\\|C:\\\\Users\\|UNEXPECTED_EXCEPTION/);
});
