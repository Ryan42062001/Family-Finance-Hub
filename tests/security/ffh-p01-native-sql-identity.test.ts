// Production SQL-runner and Gate A/B admission exercise REAL WinPS5.1
// function bodies, synthetic resource metadata and stubbed native Job Object.
// No Docker, SQL, private data or owner entrypoint execution.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import test from "node:test";

test("RLS-AC-07/08: real WinPS production SQL validator permits only exact journal-bound immutable ID",()=>{
  const exe=process.platform==="win32"?"powershell.exe":"pwsh";
  const out=spawnSync(exe,["-NoLogo","-NoProfile","-NonInteractive","-File",
    "tests/security/fixtures/ffh-p01-native-sql-identity.ps1"],
    {encoding:"utf8",windowsHide:true,timeout:75000});
  assert.ifError(out.error);
  assert.equal(out.status,0,
    "Real WinPS validator rejected fixture or native command escaped:\n"+out.stdout+"\n"+out.stderr);
  const expected=[
    "NATIVE-PREFLIGHT-ID PASS","NATIVE-MATRIX-ID PASS","NATIVE-GATE-A-ID PASS",
    "NATIVE-OLD-NAME PASS","NATIVE-OTHER-TOKEN PASS","NATIVE-MALFORMED-NAME PASS",
    "NATIVE-OTHER-ID PASS","NATIVE-SAME-NAME-SWAPPED-ID PASS",
    "NATIVE-DUAL-LABEL PASS","NATIVE-DAEMON-DRIFT PASS",
    "NATIVE-FOREIGN-NETWORK PASS","NATIVE-DYNAMIC-PORT-CONFLICT PASS",
    "NATIVE-NONLOOPBACK PASS","NATIVE-HEALTH PASS",
    "NATIVE-WRONG-SOURCE-SHA PASS","NATIVE-WRONG-JOURNAL-TOKEN PASS",
    "NATIVE-REMOTE-BINDING PASS","NATIVE-ADMISSION-ALL PASS"];
  const observed=out.stdout.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.endsWith(" PASS"));
  assert.deepEqual(observed,expected);
  assert.doesNotMatch(out.stdout,/private key|password|connection string|service.role/i);
});
test("RLS-AC-08: production Gate B reattests exact ID BEFORE each real SQL invocation",()=>{
  const owner=readFileSync("scripts/rls-local/run-owner.ps1","utf8").replace(/\r\n/g,"\n");
  const preflight=owner.indexOf("Invoke-FfhOwnedLocalPsql -Mode Preflight -Container $container");
  const matrix=owner.indexOf("Invoke-FfhOwnedLocalPsql -Mode Matrix -Container $container");
  const admission="Assert-FfhJournaledSqlAdmission -Identity $identity -Phase 'GATE_B'";
  const first=owner.indexOf(admission),second=owner.indexOf(admission,first+1);
  assert.ok(first>=0&&second>first&&preflight>first&&preflight<second&&matrix>second);
  assert.match(owner,/Invoke-FfhOwnedLocalPsql -Mode Preflight -Container \$container[\s\S]*?-ContainerId \$admittedContainerId/);
  assert.match(owner,/Invoke-FfhOwnedLocalPsql -Mode Matrix -Container \$container[\s\S]*?-ContainerId \$admittedContainerId/);
  const gateA=readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
  assert.match(gateA,/Assert-FfhJournaledSqlAdmission -Identity \$identity -Phase 'GATE_A'/);
  assert.match(gateA,/Invoke-FfhOwnedLocalPsql -Mode Preflight -Container \$containerName[\s\S]*?-ContainerId \$admittedContainerId/);
  const runner=readFileSync("scripts/rls-local/source-provenance.ps1","utf8");
  assert.doesNotMatch(runner,/\$Container -cnotmatch '\^supabase_db_ffh_p01_rls_fresh_/);
  assert.match(runner,/' exec -i ' \+ \$ContainerId/);
  assert.match(runner,/Assert-FfhJournaledSqlAdmission -Identity \$Identity -Phase \$phase -Fake \$FakeDocker/g);
});
