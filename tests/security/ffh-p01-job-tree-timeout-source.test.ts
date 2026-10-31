// FFH-P01 RLS-01A-01 process-tree timeout regressions: SOURCE/MODEL ONLY.
// Never start/kill processes, dot-source PowerShell, or call Docker/Supabase/SQL.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync("scripts/rls-local/source-provenance.ps1","utf8").replace(/\r\n/g,"\n");
const prepare = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8").replace(/\r\n/g,"\n");
const owner = readFileSync("scripts/rls-local/run-owner.ps1","utf8").replace(/\r\n/g,"\n");
const full = shared+prepare+owner;

function enforceContainmentContract(source: string) {
  // Target ONLY the historical Start/Reset Run(), not the new independent
  // version runner with similar job mechanics. Mutations must not be hidden
  // by a second intact implementation earlier in the same source file.
  const start = source.indexOf("public static string Run(");
  const end = source.indexOf("\n  }\n}", start);
  assert.ok(start >= 0 && end > start, "original Start/Reset Run() missing");
  const originalRun = source.slice(start, end + 5);
  const ordered = [
    "CreateJobObjectW(IntPtr.Zero, null)",
    "EnableKillOnClose(job)",
    "CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW",
    "created = true;",
    "AssignProcessToJobObject(job, owned.hProcess)",
    "assigned = true;",
    "ResumeThread(owned.hThread)",
    "WaitForSingleObject(owned.hProcess, (uint)executionMilliseconds)",
  ];
  const positions = ordered.map(k=>originalRun.indexOf(k));
  assert.ok(positions.every(i=>i>=0),"missing job containment prerequisite");
  assert.ok(positions.every((i,n)=>n===0||i>positions[n-1]),"child must be suspended and assigned before resuming");
  assert.match(source,/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000/);
  assert.match(source,/limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);
  assert.match(source,/SetInformationJobObject\(job, 9, memory, \(uint\)bytes\)/);
  assert.match(originalRun,/if \(!AssignProcessToJobObject\(job, owned.hProcess\)\) \{\s+return TerminateSuspendedRoot/);
  assert.match(source,/CloseHandle\(job\)/);
}

test("RLS-01A-01 native Win32 job is configured kill-on-close BEFORE child resume",()=>{
  enforceContainmentContract(shared);
  assert.match(shared,/Add-Type -TypeDefinition @'/);
  assert.match(shared,/CreateProcessW\(application, command, IntPtr.Zero, IntPtr.Zero, false,/);
  assert.match(shared,/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);
  assert.match(shared,/TerminateJobObject\(job, 1\)/);
  assert.match(shared,/QueryInformationJobObject\(job, 1, out accounting/);
  assert.match(shared,/accounting.ActiveProcesses == 0/);
});

test("RLS-01A-01 no unmanaged wrapper-only Kill, broad taskkill, or process-name targeting",()=>{
  assert.doesNotMatch(full,/\$child\.Kill\(\)/);
  assert.doesNotMatch(full,/\.Kill\(true\)/);
  assert.doesNotMatch(full,/\btaskkill(?:\.exe)?\b/i);
  assert.doesNotMatch(full,/Stop-Process\s/);
  assert.doesNotMatch(full,/Get-Process\s+(?:node|npm|npx|docker)/);
  assert.match(shared,/TerminateSuspendedRoot\(owned.hProcess\)/);
  assert.match(shared,/TerminateAndConfirmJob\(job, verificationMilliseconds\)/);
  assert.match(shared,/CloseHandle\(owned.hThread\)/);
  assert.match(shared,/CloseHandle\(owned.hProcess\)/);
  assert.match(shared,/Marshal.FreeHGlobal\(environment\)/);
});

test("RLS-01A-01 mutation rejects removing suspension or job assignment boundary",()=>{
  const mutateOriginal=(needle:string,replacement:string)=>{
    const at=shared.indexOf("public static string Run(");
    assert.ok(at>=0);
    const prefix=shared.slice(0,at);
    const tail=shared.slice(at);
    assert.ok(tail.includes(needle));
    return prefix+tail.replace(needle,replacement);
  };
  const mutations=[
    mutateOriginal("CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT", "CREATE_UNICODE_ENVIRONMENT"),
    mutateOriginal("AssignProcessToJobObject(job, owned.hProcess)", "true /* unsafe skip */"),
    shared.replace("limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;",
                   "limits.BasicLimitInformation.LimitFlags = 0;"),
    mutateOriginal("ResumeThread(owned.hThread)", "UnsafeResumeWithoutJob(owned.hThread)"),
  ];
  for (const m of mutations){
    assert.notEqual(m,shared);
    assert.throws(()=>enforceContainmentContract(m),assert.AssertionError);
  }
});

test("RLS-01A-01 timeout terminates exact owned job and only confirms zero active processes",()=>{
  assert.match(shared,/if \(wait == WAIT_TIMEOUT\) \{\s+return TerminateAndConfirmJob\(job, verificationMilliseconds\)/);
  assert.match(shared,/\? "BLOCKED_TIMEOUT_TREE_TERMINATED"\s+: "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING"/);
  assert.match(shared,/private static bool TerminateAndConfirmJob\(IntPtr job, int verificationMilliseconds\)/);
  assert.match(shared,/TerminateJobObject\(job, 1\);\s+return WaitForJobEmpty\(job, verificationMilliseconds\)/);
  assert.match(shared,/return accounting.ActiveProcesses == 0;/);
  assert.match(shared,/Stopwatch\.StartNew\(\)/);
  assert.match(shared,/timer.ElapsedMilliseconds < milliseconds/);
  assert.match(shared,/900000, 10000/);
});

test("RLS-01A-01 indeterminate result is distinct and denies retry, Gate B, reset, cleanup",()=>{
  assert.match(shared,/BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING: no retry, Gate B, reset or cleanup/);
  assert.match(shared,/default \{\s+# Unknown outcome or inconclusive kill\/verification is never a PASS/);
  assert.match(shared,/if \(assigned\)\s+return TerminateAndConfirmJob\(job, verificationMilliseconds\)[\s\S]*?"BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING"/);
  assert.match(shared,/KILL_ON_JOB_CLOSE is a final safety net, NOT confirmation of death/);
  assert.match(shared,/catch \{\s+throw 'BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING'/);
});

test("RLS-01A-01 process-start failure cannot execute uncontained CLI",()=>{
  assert.match(shared,/if \(job == IntPtr.Zero \|\| !EnableKillOnClose\(job\)\)\s+return "BLOCKED_PROCESS_START_FAILED"/);
  assert.match(shared,/if \(!CreateProcessW[\s\S]*?return "BLOCKED_PROCESS_START_FAILED"/);
  assert.match(shared,/if \(!AssignProcessToJobObject\(job, owned.hProcess\)\) \{\s+return TerminateSuspendedRoot\(owned.hProcess\)/);
  assert.match(shared,/TerminateProcess\(process, 1\);\s+return WaitForSingleObject\(process, 5000\) == WAIT_OBJECT_0/);
  assert.match(shared,/BLOCKED_PROCESS_START_FAILED: no CLI process permitted to continue/);
});

test("RLS-01A-01 zero, nonzero, start-fail, timeout-confirmed, timeout-unknown remain distinct",()=>{
  const projection=(rootExit: "zero"|"nonzero"|"start-fail"|"timeout",jobEmpty:boolean,terminationVerified:boolean)=>{
    if(rootExit==="start-fail")return "BLOCKED_PROCESS_START_FAILED";
    if(rootExit==="timeout")return terminationVerified ? "BLOCKED_TIMEOUT_TREE_TERMINATED":"BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
    if(!jobEmpty)return terminationVerified ? "BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED":"BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING";
    return rootExit==="zero" ? "EXIT_ZERO":"BLOCKED_NONZERO_EXIT";
  };
  const required=["EXIT_ZERO","BLOCKED_NONZERO_EXIT","BLOCKED_PROCESS_START_FAILED",
    "BLOCKED_TIMEOUT_TREE_TERMINATED","BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING",
    "BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED"];
  for(const s of required) assert.ok(shared.includes("'"+s+"'") || shared.includes('"'+s+'"'),s);
  assert.equal(projection("zero",true,true),"EXIT_ZERO");
  assert.equal(projection("nonzero",true,true),"BLOCKED_NONZERO_EXIT");
  assert.equal(projection("start-fail",false,false),"BLOCKED_PROCESS_START_FAILED");
  assert.equal(projection("timeout",false,true),"BLOCKED_TIMEOUT_TREE_TERMINATED");
  assert.equal(projection("timeout",false,false),"BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING");
  assert.equal(projection("zero",false,true),"BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED");
  assert.equal(projection("nonzero",false,false),"BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING");
});

test("RLS-01A-01 successful wrapper exit also requires all job descendants to exit",()=>{
  assert.match(shared,/if \(!WaitForJobEmpty\(job, verificationMilliseconds\)\) \{\s+return TerminateAndConfirmJob\(job, verificationMilliseconds\)/);
  assert.match(shared,/\? "BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED"\s+: "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING"/);
  assert.match(shared,/return exitCode == 0 \? "EXIT_ZERO" : "BLOCKED_NONZERO_EXIT"/);
  assert.match(shared,/if \(!GetExitCodeProcess\(owned.hProcess, out exitCode\)\)/);
});

test("RLS-01A-01 child-only Docker host, source binding, root defenses remain intact",()=>{
  assert.match(shared,/EnvironmentVariables\['DOCKER_HOST'\] = \$dockerBinding.Endpoint/);
  assert.match(shared,/EnvironmentVariables\.ContainsKey\('DOCKER_CONTEXT'\)/);
  assert.match(shared,/EnvironmentVariables\.ContainsKey\('DOCKER_TLS_VERIFY'\)/);
  assert.match(shared,/EnvironmentVariables\.ContainsKey\('DOCKER_CONFIG'\)/);
  assert.match(shared,/npipe:\/{4}\.\/pipe\/dockerDesktopLinuxEngine/);
  assert.match(shared,/SetEnvironmentVariable\('DOCKER_HOST',\$parentDockerHost,'Process'\)/);
  assert.match(shared,/\$dockerCli\.Source --host \$endpoint info/);
  assert.match(shared,/\$dockerBinding\.Executable --host \$dockerBinding\.Endpoint inspect \$Container/);
  assert.match(prepare,/Invoke-FfhPinnedLocalSupabase -Operation Start/);
  assert.match(prepare,/Invoke-FfhPinnedLocalSupabase -Operation Reset/);
  assert.match(prepare,/New-Item -ItemType Directory -Path \$root -ErrorAction Stop/);
  assert.match(prepare,/Assert-FfhNoReparsePath -Path \$root/);
  assert.match(owner,/receipt\.source_sha256/);
  assert.match(owner,/receipt\.config_sha256/);
});
