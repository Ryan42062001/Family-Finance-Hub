// RLS-AC-02: verify native Windows PowerShell 5.1 exit codes for the
// same final success gate used by the actual Gate B owner entrypoint.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

for (const [caseName,expectedExit] of [
  ["PASS_PASS",0],
  ["PASS_BLOCKED",1],
  ["FAIL_PASS",1],
] as const) {
  test("RLS-AC-02 real WinPS Gate B result "+caseName+" exit="+expectedExit,()=>{
    const interpreter=process.platform==="win32"?"powershell.exe":"pwsh";
    const run=spawnSync(interpreter,
      ["-NoLogo","-NoProfile","-NonInteractive","-File",
       "tests/security/fixtures/ffh-p01-gate-exit.ps1","-Case",caseName],
      {encoding:"utf8",windowsHide:true,timeout:30_000});
    assert.ifError(run.error);
    assert.equal(run.status,expectedExit,
      "Unexpected process exit for "+caseName+":\n"+run.stdout+"\n"+run.stderr);
  });
}
