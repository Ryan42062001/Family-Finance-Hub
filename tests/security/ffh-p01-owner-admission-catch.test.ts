// Windows PowerShell 5.1: actual owner Gate A/B admission/catch excerpts,
// injected synthetic Docker/native/filesystem, no owner-host operations.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

test("RLS-AC-10: owner admission failures yield zero cleanup SQL or deletion and durable terminal UNKNOWN",()=>{
  const exe=process.platform==="win32"?"powershell.exe":"pwsh";
  const result=spawnSync(exe,["-NoLogo","-NoProfile","-NonInteractive","-File",
    "tests/security/fixtures/ffh-p01-owner-admission-catch.ps1"],
    {encoding:"utf8",windowsHide:true,timeout:90_000});
  assert.ifError(result.error);
  assert.equal(result.status,0,
    "Owner WinPS admission/catch fixture failed:\n"+result.stdout+"\n"+result.stderr);
  const faults=["PORT","NONLOOPBACK","HEALTH","ID","LABEL","DAEMON","BASELINE"];
  const expected=[
    ...faults.map(f=>"OWNER-B-PREFLIGHT-"+f+" PASS"),
    ...faults.map(f=>"OWNER-B-MATRIX-"+f+" PASS"),
    ...faults.map(f=>"OWNER-A-"+f+" PASS"),
    "OWNER-A-TERMINAL-PERSISTENCE-FAILED PASS",
    "OWNER-B-TERMINAL-PERSISTENCE-FAILED PASS",
    "OWNER-ADMISSION-AND-CATCH-ALL PASS"
  ];
  const actual=result.stdout.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.endsWith(" PASS"));
  assert.deepEqual(actual,expected);
  assert.doesNotMatch(result.stdout,/password|service.role|private key|connection string/i);
});
