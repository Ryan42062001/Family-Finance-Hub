// RLS-NVP-01: REAL Windows PowerShell 5.1/Win32 Job Object regression.
// Evaluates ONLY the AST-extracted shared runner with synthetic stock cmd.exe
// and PowerShell echo/sleep descendants. No owner entrypoint, npx, Docker,
// Supabase, SQL, network, process-name kills, or database/filesystem mutations.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const guard=readFileSync("scripts/rls-local/source-provenance.ps1","utf8");
const prepare=readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
const matrix=readFileSync("scripts/rls-local/run-owner.ps1","utf8");
const cases=[
 "benign_stderr_exact_version","clean_exact_version","nonzero_with_stderr",
 "wrong_version","missing_version","duplicate_version","stderr_only",
 "missing_launcher","grandchild_timeout_confirmed"
];

const ps=String.raw`
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$sourcePath=[IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'scripts/rls-local/source-provenance.ps1'))
$tokens=$null;$parseErrors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($sourcePath,[ref]$tokens,[ref]$parseErrors)
if($null -eq $ast -or ($null -ne $parseErrors -and $parseErrors.Count -gt 0)){throw 'BLOCKED: parser failed'}
$func=@($ast.FindAll({
 param($n)
 $n -is [Management.Automation.Language.FunctionDefinitionAst] -and
 $n.Name -ceq 'Invoke-FfhNativeJobChild'
},$true))
if($func.Count -ne 1){throw 'BLOCKED: shared runner missing or duplicated'}
. ([scriptblock]::Create($func[0].Extent.Text))
$script:Emitter=Join-Path ([Environment]::SystemDirectory) 'cmd.exe'
$script:Missing=Join-Path $env:TEMP 'FFH-NVP-IMPOSSIBLE-SYNTHETIC-PROCESS.exe'
if(-not (Test-Path -LiteralPath $script:Emitter -PathType Leaf) -or
    (Test-Path -LiteralPath $script:Missing)){throw 'BLOCKED: synthetic host preconditions'}
function New-Info {
 param([string]$Command,[string]$Exe=$script:Emitter)
 $p=[Diagnostics.ProcessStartInfo]::new()
 $p.FileName=$Exe
 $p.Arguments='/d /s /c "'+$Command+'"'
 $p.WorkingDirectory=(Get-Location).Path
 $p.UseShellExecute=$false
 $p.CreateNoWindow=$true
 foreach($key in @($p.EnvironmentVariables.Keys)){
  if([string]$key -match '^(?i:DOCKER_)'){$p.EnvironmentVariables.Remove([string]$key)}
 }
 return $p
}
function Check {
 param([string]$Label,[string]$Command,[string]$Expected,
  [int]$Budget=6000,[int]$Verify=800,[string]$Exe=$script:Emitter)
 $p=New-Info -Command $Command -Exe $Exe
 $watch=[Diagnostics.Stopwatch]::StartNew()
 $outcome=[FfhRlsJobRunner]::RunVersion(
  $p.FileName,$p.Arguments,$p.WorkingDirectory,
  $p.EnvironmentVariables,$Budget,$Verify)
 $watch.Stop()
 if($outcome -cne $Expected){throw ('Unexpected contained status '+$Label+': '+$outcome)}
 if($watch.ElapsedMilliseconds -gt ($Budget+$Verify+8000)){throw ('Unbounded native call '+$Label)}
 [Console]::Out.WriteLine('WINPS51_NVP_NATIVE_PASS '+$Label)
}
# Execute the actual Windows Add-Type/PInvoke path once through the public
# wrapper, which chooses RunVersion and its fixed 60-second owner budget.
$p=New-Info -Command 'echo 2.122.0 & echo npm notice 1>&2 & exit /b 0'
$outcome=Invoke-FfhNativeJobChild -StartInfo $p -VersionProbe
if($outcome -cne 'EXIT_ZERO'){throw ('Version wrapper failed: '+$outcome)}
[Console]::Out.WriteLine('WINPS51_NVP_NATIVE_PASS benign_stderr_exact_version')
Check 'clean_exact_version' 'echo 2.122.0 & exit /b 0' 'EXIT_ZERO'
Check 'nonzero_with_stderr' 'echo 2.122.0 & echo npm notice 1>&2 & exit /b 7' 'BLOCKED_NONZERO_EXIT'
Check 'wrong_version' 'echo 2.122.1 & exit /b 0' 'BLOCKED_VERSION_OUTPUT_INVALID'
Check 'missing_version' 'exit /b 0' 'BLOCKED_VERSION_OUTPUT_INVALID'
Check 'duplicate_version' 'echo 2.122.0 & echo 2.122.0 & exit /b 0' 'BLOCKED_VERSION_OUTPUT_INVALID'
Check 'stderr_only' 'echo npm notice 1>&2 & exit /b 0' 'BLOCKED_VERSION_OUTPUT_INVALID'
Check 'missing_launcher' 'echo 2.122.0' 'BLOCKED_PROCESS_START_FAILED' 1000 800 $script:Missing
# cmd root -> second cmd -> sleeping PowerShell grandchild, no network/files.
Check 'grandchild_timeout_confirmed' 'echo 2.122.0 & cmd.exe /d /c powershell.exe -NoLogo -NoProfile -NonInteractive -Command Start-Sleep -Seconds 8' 'BLOCKED_TIMEOUT_TREE_TERMINATED' 750 2000
[Console]::Out.WriteLine('WINPS51_NVP_NATIVE_CONTAINMENT=PASS')
`;

test("RLS-NVP-01 WinPS5.1 actually compiles native Job Object and exercises safe version/timeout cases",()=>{
 assert.equal(process.platform,"win32","must be actual Windows PS5.1");
 const result=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",ps],
 {cwd:process.cwd(),encoding:"utf8",windowsHide:true,timeout:45_000});
 assert.ifError(result.error);
 assert.equal(result.status,0,"Native Windows Job Object version test failed:\n"+result.stdout+"\n"+result.stderr);
 const receipts=result.stdout.split(/\r?\n/);
 for(const label of cases)assert.equal(receipts.filter(x=>x==="WINPS51_NVP_NATIVE_PASS "+label).length,1,label);
 assert.equal(receipts.filter(x=>x==="WINPS51_NVP_NATIVE_CONTAINMENT=PASS").length,1);
});

test("RLS-NVP-01 source enforces bounded owned pipe and exact version/exit with closed handles",()=>{
 for(const frag of [
  "public static string RunVersion(", "CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT",
  "AssignProcessToJobObject(job, owned.hProcess)", "ResumeThread(owned.hThread)",
  "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE", "PROC_THREAD_ATTRIBUTE_HANDLE_LIST",
  "EXTENDED_STARTUPINFO_PRESENT", "SetHandleInformation(pipeRead, HANDLE_FLAG_INHERIT, 0)",
  "DrainVersionPipe(pipeRead, captured, ref overflow, out drained)",
  "if (overall.ElapsedMilliseconds >= executionMilliseconds)",
  "if (afterRoot != null && afterRoot.ElapsedMilliseconds >= verificationMilliseconds)",
  'if (exitCode != 0) return "BLOCKED_NONZERO_EXIT";',
  "IsExactVersionOutput(captured, overflow)",
  '"BLOCKED_VERSION_OUTPUT_INVALID"',
  '"BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING"',
  "if (attributesInitialized) DeleteProcThreadAttributeList(attributes)",
  "CloseHandle(pipeRead)","CloseHandle(pipeWrite)","CloseHandle(job)",
  "return [FfhRlsJobRunner]::RunVersion(", "60000, 10000",
 ])assert.ok(guard.includes(frag),frag);
 for(const frag of [
  "function Assert-FfhExactNativeVersion {",
  "$outcome = Invoke-FfhNativeJobChild -StartInfo $startInfo -VersionProbe",
  "switch -CaseSensitive ($outcome)",
  "supabase@2.122.0 --version",
  "Resolve-FfhTrustedNpxCmd",
  "Assert-FfhDockerEndpointValue -Endpoint $DockerEndpoint"
 ])assert.ok(prepare.includes(frag),frag);
 assert.doesNotMatch(prepare,/\$stdoutLines = @\(& \$Executable/);
 assert.doesNotMatch(prepare,/\$version = @\(& npx/);
 assert.match(prepare,/^\$ErrorActionPreference = 'Stop'$/m);
 assert.match(guard,/public static string Run\(/);
 assert.match(guard,/900000, 10000/);
 assert.match(matrix,/OWNER_OPERATED_SYNTHETIC_MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW/);
});

test("RLS-NVP-01 remaining descendants/indeterminate outcome never allow Gate B",()=>{
 const statuses=[
  "BLOCKED_NONZERO_EXIT","BLOCKED_VERSION_OUTPUT_INVALID",
  "BLOCKED_PROCESS_START_FAILED","BLOCKED_TIMEOUT_TREE_TERMINATED",
  "BLOCKED_DESCENDANTS_AFTER_EXIT_TREE_TERMINATED",
  "BLOCKED_WAIT_FAILURE_TREE_TERMINATED","BLOCKED_RUNNER_FAILURE_TREE_TERMINATED",
  "BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING"
 ];
 for(const status of statuses)assert.ok(prepare.includes(status),status);
 assert.match(prepare,/default \{\s+throw 'BLOCKED_INDETERMINATE_CHILD_MAY_STILL_BE_RUNNING/);
 assert.doesNotMatch(prepare,/\b(?:Stop-Process|taskkill|Get-Process\s+node)\b/i);
});
