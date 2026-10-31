// RLS-PF-01: REAL Windows PowerShell 5.1 native Job Object regression.
// Only AST-extracted Job Object helper and harmless synthetic cmd.exe/PowerShell
// children. No Docker, SQL, network, owner entrypoint or fixture writes.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import test from "node:test";
const shared=readFileSync("scripts/rls-local/source-provenance.ps1","utf8");
const prepare=readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
const gateB=readFileSync("scripts/rls-local/run-owner.ps1","utf8");
const preflight=readFileSync("scripts/rls-local/preflight.sql","utf8");
const matrix=readFileSync("scripts/rls-local/matrix.sql","utf8");
const labels=[
 "notice_stdin_success","clean_stdin_success","nonzero","wrong_marker",
 "missing_marker","duplicate_marker","not_last_marker","stdin_wrong",
 "launcher_missing","root_timeout","grandchild_timeout","stderr_saturation",
 "stdout_saturation","large_stdin_timeout","matrix_success",
 "matrix_wrong_count","matrix_missing_rollback","matrix_missing_zero",
 "invalid_payload","indeterminate_invalid_job"
];
const ps=String.raw`
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$path=[IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'scripts/rls-local/source-provenance.ps1'))
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
if($null -eq $ast -or ($null -ne $errors -and $errors.Count -gt 0)){throw 'BLOCKED: AST failed'}
$functions=@($ast.FindAll({
 param($n)
 $n -is [Management.Automation.Language.FunctionDefinitionAst] -and
 $n.Name -ceq 'Invoke-FfhNativeJobChild'
},$true))
if($functions.Count -ne 1){throw 'BLOCKED: native runner missing'}
. ([scriptblock]::Create($functions[0].Extent.Text))
$script:Cmd=Join-Path ([Environment]::SystemDirectory) 'cmd.exe'
$script:Missing=Join-Path $env:TEMP 'FFH-PF-01-NO-SYNTHETIC-NATIVE.exe'
if(-not (Test-Path -LiteralPath $script:Cmd -PathType Leaf) -or
    (Test-Path -LiteralPath $script:Missing)){throw 'BLOCKED: invalid synthetic preconditions'}
$script:Mark='PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1'
$script:Sql=[Text.Encoding]::ASCII.GetBytes(('FFH_PF_OWNED_STDIN'+[char]13+[char]10))
$global:LASTEXITCODE=47281
function StartInfo([string]$Command,[string]$Exe=$script:Cmd) {
 $s=[Diagnostics.ProcessStartInfo]::new()
 $s.FileName=$Exe
 $s.Arguments='/d /s /c "'+$Command+'"'
 $s.WorkingDirectory=(Get-Location).Path
 $s.UseShellExecute=$false
 $s.CreateNoWindow=$true
 foreach($key in @($s.EnvironmentVariables.Keys)){
  if([string]$key -match '^(?i:DOCKER_)'){$s.EnvironmentVariables.Remove([string]$key)}
 }
 return $s
}
function Check {
 param([string]$Label,[string]$Command,[string]$Expected,
   [int]$Budget=7000,[int]$Verify=1200,
   [bool]$Matrix=$false,[string]$Exe=$script:Cmd,[byte[]]$Payload=$script:Sql)
 $s=StartInfo -Command $Command -Exe $Exe
 $watch=[Diagnostics.Stopwatch]::StartNew()
 $out=[FfhRlsJobRunner]::RunPsql($s.FileName,$s.Arguments,
   $s.WorkingDirectory,$s.EnvironmentVariables,$Payload,$Matrix,$Budget,$Verify)
 $watch.Stop()
 if($out -cne $Expected){throw ('Wrong bounded native outcome '+$Label+': '+$out)}
 if($watch.ElapsedMilliseconds -gt ($Budget+$Verify+8000)){throw ('Unbounded case '+$Label)}
 if($ErrorActionPreference -cne 'Stop' -or $global:LASTEXITCODE -ne 47281){
   throw ('Parent PowerShell state modified '+$Label)
 }
 [Console]::Out.WriteLine('WINPS51_SQL_JOB_PASS '+$Label)
}
$reader='findstr /x /c:FFH_PF_OWNED_STDIN >NUL'
$pass='echo '+$script:Mark
Check 'notice_stdin_success' ($reader+' && echo synthetic_NOTICE 1>&2 & '+$pass+' & exit /b 0') 'EXIT_ZERO'
Check 'clean_stdin_success' ($reader+' && '+$pass+' & exit /b 0') 'EXIT_ZERO'
Check 'nonzero' ($reader+' && '+$pass+' & exit /b 7') 'BLOCKED_SQL_NATIVE_NONZERO_DAEMON_UNVERIFIED'
Check 'wrong_marker' ($reader+' && echo PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=1 NO_FIXTURES=1 & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED'
Check 'missing_marker' ($reader+' && echo NO_MARKER & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED'
Check 'duplicate_marker' ($reader+' && '+$pass+' & '+$pass+' & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED'
Check 'not_last_marker' ($reader+' && '+$pass+' & echo EXTRA_AFTER & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED'
Check 'stdin_wrong' ($reader+' && '+$pass+' & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED' 7000 1200 $false $script:Cmd ([Text.Encoding]::ASCII.GetBytes(('WRONG'+[char]13+[char]10)))
Check 'launcher_missing' ($reader+' && '+$pass) 'BLOCKED_SQL_PROCESS_START_FAILED' 1500 600 $false $script:Missing
Check 'root_timeout' 'powershell.exe -NoLogo -NoProfile -NonInteractive -Command Start-Sleep -Seconds 5' 'BLOCKED_SQL_TIMEOUT_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED' 700 1200
Check 'grandchild_timeout' 'cmd.exe /d /c powershell.exe -NoLogo -NoProfile -NonInteractive -Command Start-Sleep -Seconds 7' 'BLOCKED_SQL_TIMEOUT_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED' 700 1200
Check 'stderr_saturation' ($reader+' && for /l %i in (1,1,2000) do @echo harmless_NOTICE 1>&2 & '+$pass+' & exit /b 0') 'EXIT_ZERO' 15000 1200
Check 'stdout_saturation' ($reader+' && for /l %i in (1,1,2500) do @echo 0123456789abcdef0123456789abcdef & '+$pass+' & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED' 15000 1200
Check 'large_stdin_timeout' 'powershell.exe -NoLogo -NoProfile -NonInteractive -Command Start-Sleep -Seconds 7' 'BLOCKED_SQL_TIMEOUT_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED' 800 1600 $false $script:Cmd ([Text.Encoding]::ASCII.GetBytes(('F'*190000)))
$matrixPass='echo MATRIX_ASSERTIONS_PASS=913 & echo MATRIX_ROLLBACK_COMPLETE & echo MATRIX_ZERO_RESIDUE_PASS'
Check 'matrix_success' ($reader+' && '+$matrixPass+' & exit /b 0') 'EXIT_ZERO' 7000 1200 $true
Check 'matrix_wrong_count' ($reader+' && echo MATRIX_ASSERTIONS_PASS=909 & echo MATRIX_ROLLBACK_COMPLETE & echo MATRIX_ZERO_RESIDUE_PASS & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED' 7000 1200 $true
Check 'matrix_missing_rollback' ($reader+' && echo MATRIX_ASSERTIONS_PASS=913 & echo MATRIX_ZERO_RESIDUE_PASS & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED' 7000 1200 $true
Check 'matrix_missing_zero' ($reader+' && echo MATRIX_ASSERTIONS_PASS=913 & echo MATRIX_ROLLBACK_COMPLETE & exit /b 0') 'BLOCKED_SQL_MARKER_INVALID_DAEMON_UNVERIFIED' 7000 1200 $true
Check 'invalid_payload' ($reader+' && '+$pass) 'BLOCKED_SQL_PAYLOAD_OR_BUDGET_INVALID' 1200 600 $false $script:Cmd ([byte[]]@())
$method=[FfhRlsJobRunner].GetMethod('StopSqlJob', [Reflection.BindingFlags]::Static -bor [Reflection.BindingFlags]::NonPublic)
if($null -eq $method){throw 'BLOCKED: missing failure classification'}
$fail=$method.Invoke($null,[object[]]@([IntPtr]::Zero,$null,150,'BLOCKED_SQL_TIMEOUT_CLIENT_TREE_TERMINATED_DAEMON_UNVERIFIED'))
if($fail -cne 'BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED'){throw 'Invalid accounting did not block'}
[Console]::Out.WriteLine('WINPS51_SQL_JOB_PASS indeterminate_invalid_job')
[Console]::Out.WriteLine('WINPS51_SQL_JOB_GLOBAL_STOP=PASS')
`;

test("RLS-PF-01 WinPS5.1 real native owned-stdin Job Object synthetic tests",()=>{
 assert.equal(process.platform,"win32","Real WinPS5.1 required");
 const out=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",ps],
   {cwd:process.cwd(),encoding:"utf8",windowsHide:true,timeout:65_000});
 assert.ifError(out.error);
 assert.equal(out.status,0,"WinPS5.1 SQL Job Object behavior failed:\n"+out.stdout+"\n"+out.stderr);
 const receipts=out.stdout.split(/\r?\n/);
 for(const label of labels)assert.equal(receipts.filter(x=>x==="WINPS51_SQL_JOB_PASS "+label).length,1,label);
 assert.equal(receipts.filter(x=>x==="WINPS51_SQL_JOB_GLOBAL_STOP=PASS").length,1);
});

test("RLS-PF-01 bounded native source preserves prior VERSION/START/RESET and both Gate preflights",()=>{
 for(const frag of ["public static string RunPsql(","public static string RunVersion(",
  "public static string Run(","CreateJobObjectW(IntPtr.Zero, null)",
  "EnableKillOnClose(job)","AssignProcessToJobObject(job, owned.hProcess)",
  "ResumeThread(owned.hThread)","PROC_THREAD_ATTRIBUTE_HANDLE_LIST",
  "WriteFile(writerHandle, block","DrainVersionPipe(stdoutRead",
  "DrainVersionPipe(stderrRead","MAX_SQL_INPUT_BYTES = 262144",
  "MAX_SQL_STDOUT_BYTES = 65536","TerminateAndConfirmJob(job, verificationMilliseconds)",
  "BLOCKED_INDETERMINATE_CLIENT_OR_DAEMON_UNVERIFIED",
  "MATRIX_ASSERTIONS_PASS=913","MATRIX_ROLLBACK_COMPLETE",
  "MATRIX_ZERO_RESIDUE_PASS","PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1",
  "Invoke-FfhOwnedLocalPsql","Assert-FfhLocalDockerDesktop",
  "psql -X -q -v ON_ERROR_STOP=1","npipe:////./pipe/dockerDesktopLinuxEngine",
  "900000","120000","10000"]) assert.ok(shared.includes(frag),frag);
 assert.match(prepare,/Invoke-FfhOwnedLocalPsql -Mode Preflight -Container \$containerName/);
 assert.match(gateB,/Invoke-FfhOwnedLocalPsql -Mode Preflight -Container \$container/);
 assert.match(gateB,/Invoke-FfhOwnedLocalPsql -Mode Matrix -Container \$container/);
 assert.doesNotMatch(prepare+gateB,/\& \$dockerBinding\.Executable --host \$dockerBinding\.Endpoint exec -i/);
 assert.match(gateB,/OWNER_OPERATED_SYNTHETIC_MATRIX_COMPLETE=PASS_PENDING_INDEPENDENT_REVIEW/);
});

test("RLS-PF-01 preserves exact SQL completion markers and no SQL changes",()=>{
 assert.equal(preflight.trimEnd().endsWith("\\echo PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1"),true);
 assert.match(matrix,/^BEGIN;$/m);
 assert.match(matrix,/^ROLLBACK;$/m);
 assert.match(matrix,/\\echo MATRIX_ROLLBACK_COMPLETE/);
 assert.equal(matrix.trimEnd().endsWith("\\echo MATRIX_ZERO_RESIDUE_PASS"),true);
 assert.match(matrix,/SELECT 'MATRIX_ASSERTIONS_PASS='/);
 assert.match(shared,/\[IO\.File\]::ReadAllBytes\(\$SqlPath\)/);
 assert.doesNotMatch(shared,/\bWrite-Output[^\n]*\$payload/);
});
