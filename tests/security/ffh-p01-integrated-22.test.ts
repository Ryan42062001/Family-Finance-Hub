// Windows PowerShell 5.1 integration fault receipts for AC-01..AC-22.
// Runs real lifecycle/journal/cleanup functions with synthetic Docker +
// ephemeral private evidence directory; never invokes owner SQL or Docker.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {readFileSync} from "node:fs";

const fixture = "tests/security/fixtures/ffh-p01-integrated-22.ps1";
const expected = Array.from({length:22},(_,i)=>"AC-"+String(i+1).padStart(2,"0"));
test("RLS-AC-06: all 22 WinPS lifecycle fake-Docker adversarial scenarios execute independently",()=>{
  const interpreter=process.platform==="win32"?"powershell.exe":"pwsh";
  const result=spawnSync(interpreter,
    ["-NoLogo","-NoProfile","-NonInteractive","-File",fixture],
    {encoding:"utf8",windowsHide:true,timeout:180_000});
  assert.ifError(result.error);
  assert.equal(result.status,0,
    "WinPS22 integration blocked:\n"+result.stdout+"\n"+result.stderr);
  const receipts=result.stdout.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^AC-\d\d PASS$/.test(x));
  assert.deepEqual(receipts,expected.map(x=>x+" PASS"),
    "Every case requires a distinct executable PASS receipt");
  assert.doesNotMatch(result.stdout,/password|private key|service.role|connection string/i);
});
test("RLS-AC-06: owner entrypoints reference Gate B independent finalizer and no root path delete",()=>{
  const owner=readFileSync("scripts/rls-local/run-owner.ps1","utf8");
  const prep=readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
  const exec=readFileSync("scripts/rls-local/cleanup-executor.ps1","utf8");
  assert.match(owner,/Complete-FfhGateB -Identity \$identity -GateBResult 'PASS'/);
  assert.match(owner,/Complete-FfhGateB -Identity \$identity -GateBResult 'FAIL'/);
  assert.match(owner,/Assert-FfhGateBSuccessfulExit -Identity \$identity -CleanupResult \$cleanup/);
  assert.match(owner,/GateBResult 'RUNNING'/);
  assert.match(prep,/GateAResult 'RUNNING'/);
  assert.match(exec,/Test-FfhVerifiedRootAbsent/);
  assert.doesNotMatch(exec,/Remove-Item -LiteralPath \$item\.path|Remove-Item -LiteralPath \$child\.FullName/);
});
