// FFH-P01 owner Gate A/Gate B read-only PostgreSQL preflight native stderr.
// REAL Windows PowerShell 5.1, but ONLY the isolated AST-extracted result
// helper and harmless cmd.exe stdout/stderr synthetic emitters execute.
// Never dot-source/run owner procedures, Docker, Supabase, SQL or database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const guard=readFileSync("scripts/rls-local/source-provenance.ps1","utf8");
const prepare=readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
const matrix=readFileSync("scripts/rls-local/run-owner.ps1","utf8");
const sql=readFileSync("scripts/rls-local/preflight.sql","utf8");
const marker="PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1";
const labels=[
 "notice_then_valid_final",
 "valid_final_only",
 "nonzero_with_notice",
 "wrong_roles",
 "missing_final",
 "incomplete_final",
 "duplicate_final",
 "wrong_then_valid",
 "valid_then_extra_output",
 "marker_only_on_stderr",
 "failed_launcher",
 "indeterminate_exit",
 "capture_exception"
];

const ps=String.raw`
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$path=[IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'scripts/rls-local/source-provenance.ps1'))
$tokens=$null;$parseErrors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$parseErrors)
if($null -eq $ast -or ($null -ne $parseErrors -and $parseErrors.Count -gt 0)){
 throw 'BLOCKED: preflight helper AST parse failed'
}
$functions=@($ast.FindAll({
 param($n)
 $n -is [Management.Automation.Language.FunctionDefinitionAst] -and
 $n.Name -ceq 'Assert-FfhReadOnlyPsqlPreflightReceipt'
},$true))
if($functions.Count -ne 1){throw 'BLOCKED: unique preflight helper missing'}
. ([scriptblock]::Create($functions[0].Extent.Text))
$script:Marker='PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1'
$script:Cmd=Join-Path ([Environment]::SystemDirectory) 'cmd.exe'
$script:Missing=Join-Path $env:TEMP 'FFH-P01-PREFLIGHT-MISSING-SYNTHETIC-LAUNCHER.exe'
if(-not (Test-Path -LiteralPath $script:Cmd -PathType Leaf) -or
    (Test-Path -LiteralPath $script:Missing)){
 throw 'BLOCKED: synthetic preflight emitter missing'
}
$script:Command=''
$script:Launcher=$script:Cmd
function Check {
 param([string]$Label,[string]$Command,[bool]$ExpectedPass,[string]$Launcher=$script:Cmd)
 $script:Command=$Command
 $script:Launcher=$Launcher
 $blocked=$false
 $receiptOutput=@()
 $nativeCapture={
  # This is the exact local native stderr scope pattern of the two owner
  # callsites, but the executable is harmless Windows cmd.exe, never Docker.
  $ErrorActionPreference = 'Continue'
  $LASTEXITCODE = $null
  $stdout=@(& $script:Launcher '/d' '/c' $script:Command 2>$null)
  $nativeExit=$LASTEXITCODE  # Immediate, before ANY other native calls.
  [pscustomobject]@{ ExitCode=$nativeExit; Stdout=@($stdout) }
 }
 try{
  $receiptOutput=@(Assert-FfhReadOnlyPsqlPreflightReceipt -NativeCapture $nativeCapture)
 } catch {
  if($_.Exception.Message -notmatch '^BLOCKED:'){
   throw ('Unexpected preflight exception for '+$Label)
  }
  $blocked=$true
 }
 if($ExpectedPass -eq $blocked){throw ('Wrong preflight disposition '+$Label)}
 if($receiptOutput.Count -ne 0){throw ('Raw preflight stdout escaped helper in '+$Label)}
 if($ErrorActionPreference -cne 'Stop'){throw ('Native stderr scope escaped in '+$Label)}
 [Console]::Out.WriteLine('WINPS51_PSQL_PREFLIGHT_PASS '+$Label)
}
Check 'notice_then_valid_final' ('echo '+$script:Marker+' & echo NOTICE: PREFLIGHT_SOURCE_MIGRATIONS=15 FINANCIAL_RLS_TABLES=13 POLICY_CASES=52 FOUNDATION_TABLES=3 1>&2 & exit /b 0') $true
Check 'valid_final_only' ('echo '+$script:Marker+' & exit /b 0') $true
Check 'nonzero_with_notice' ('echo '+$script:Marker+' & echo NOTICE: partial preflight 1>&2 & exit /b 7') $false
Check 'wrong_roles' 'echo PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=1 NO_FIXTURES=1 & exit /b 0' $false
Check 'missing_final' 'echo PREFLIGHT_SOURCE_MIGRATIONS=15 & exit /b 0' $false
Check 'incomplete_final' 'echo PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 & exit /b 0' $false
Check 'duplicate_final' ('echo '+$script:Marker+' & echo '+$script:Marker+' & exit /b 0') $false
Check 'wrong_then_valid' ('echo PREFLIGHT_PASS LOCAL_ONLY=0 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1 & echo '+$script:Marker+' & exit /b 0') $false
Check 'valid_then_extra_output' ('echo '+$script:Marker+' & echo UNEXPECTED_AFTER_MARKER & exit /b 0') $false
Check 'marker_only_on_stderr' ('echo '+$script:Marker+' 1>&2 & exit /b 0') $false
Check 'failed_launcher' ('echo '+$script:Marker+' & exit /b 0') $false $script:Missing

# Additional indeterminate/throw behavior uses harmless in-memory capture only.
$blocked=$false
try{
 Assert-FfhReadOnlyPsqlPreflightReceipt -NativeCapture {
  [pscustomobject]@{ExitCode=$null;Stdout=@($script:Marker)}
 }
}catch{if($_.Exception.Message -notmatch '^BLOCKED:'){throw};$blocked=$true}
if(-not $blocked){throw 'Indeterminate exit was accepted'}
[Console]::Out.WriteLine('WINPS51_PSQL_PREFLIGHT_PASS indeterminate_exit')
$blocked=$false
try{
 Assert-FfhReadOnlyPsqlPreflightReceipt -NativeCapture {throw 'synthetic forbidden detail'}
}catch{if($_.Exception.Message -notmatch '^BLOCKED:'){throw};$blocked=$true}
if(-not $blocked){throw 'Native invocation exception was accepted'}
[Console]::Out.WriteLine('WINPS51_PSQL_PREFLIGHT_PASS capture_exception')
[Console]::Out.WriteLine('WINPS51_PSQL_PREFLIGHT_GLOBAL_STOP=PASS')
`;

test("FFH-P01 real Windows PowerShell 5.1 tolerates benign native NOTICE but requires exact completed stdout marker",()=>{
 assert.equal(process.platform,"win32","Real Windows PowerShell 5.1 required");
 const out=spawnSync("powershell.exe",
  ["-NoLogo","-NoProfile","-NonInteractive","-Command",ps],
  {cwd:process.cwd(),encoding:"utf8",windowsHide:true,timeout:45_000});
 assert.ifError(out.error);
 assert.equal(out.status,0,"Real WinPS5.1 synthetic preflight behavior failed:\n"+out.stdout+"\n"+out.stderr);
 const rows=out.stdout.split(/\r?\n/);
 for(const label of labels)assert.equal(rows.filter(x=>x==="WINPS51_PSQL_PREFLIGHT_PASS "+label).length,1,label);
 assert.equal(rows.filter(x=>x==="WINPS51_PSQL_PREFLIGHT_GLOBAL_STOP=PASS").length,1);
});

test("FFH-P01 both preflight owner callsites preserve isolated stderr, ON_ERROR_STOP and immediate exit capture",()=>{
 for(const [name,content,container] of [
  ["Gate A",prepare,"containerName"],["Gate B",matrix,"container"]
 ]){
  assert.match(content,/^\$ErrorActionPreference = 'Stop'$/m,name);
  assert.match(content,/Assert-FfhReadOnlyPsqlPreflightReceipt -NativeCapture \{/);
  assert.match(content,/\$ErrorActionPreference = 'Continue'/);
  assert.match(content,/\$LASTEXITCODE = \$null/);
  assert.match(content,/Get-Content -LiteralPath \(Join-Path \$source\.repo 'scripts\/rls-local\/preflight\.sql'\) -Raw -Encoding UTF8 -ErrorAction Stop/);
  assert.match(content,/\& \$dockerBinding\.Executable --host \$dockerBinding\.Endpoint exec -i \$container(?:Name)? psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres 2>\$null/);
  assert.match(content,/^\s*\$preflightExitCode = \$LASTEXITCODE/m);
  assert.match(content,/\[pscustomobject\]@\{ ExitCode = \$preflightExitCode; Stdout = @\(\$preflightStdout\) \}/);
  assert.doesNotMatch(content,/exec -i \$container(?:Name)? psql[^\n]*2>&1/);
  assert.match(content,/\bAssert-FfhLocalDockerDesktop\b/);
  assert.ok(content.includes("exec -i $"+container+" psql"),name);
 }
 assert.match(guard,/function Assert-FfhReadOnlyPsqlPreflightReceipt \{/);
 assert.match(guard,/\$result\.ExitCode -isnot \[int\] -or \$result\.ExitCode -ne 0/);
 assert.match(guard,/PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1/);
 assert.match(guard,/\$markerCount -ne 1 -or \$lastNonempty -cne \$expected/);
 assert.doesNotMatch(guard,/Write-Output[^\n]*\$result\.Stdout/);
 assert.match(prepare,/OWNER_OPERATED_NEW_PROJECT_RESET_APPLIED_AND_PREFLIGHT_PASS/);
 assert.match(matrix,/FRESH_LOCAL_PREFLIGHT=PASS/);
});

test("FFH-P01 SQL only echoes final success after both role checks and retains read-only error stop",()=>{
 assert.match(sql,/\\set ON_ERROR_STOP on/);
 assert.match(sql,/BEGIN;[\s\S]*?SET LOCAL ROLE authenticated;[\s\S]*?ROLLBACK;/);
 assert.match(sql,/BEGIN;[\s\S]*?SET LOCAL ROLE anon;[\s\S]*?ROLLBACK;/);
 const indexAuth=sql.indexOf("SET LOCAL ROLE authenticated;");
 const indexAnon=sql.indexOf("SET LOCAL ROLE anon;");
 const indexFinal=sql.indexOf("\\echo "+marker);
 const indexNotice=sql.indexOf("RAISE NOTICE 'PREFLIGHT_SOURCE_MIGRATIONS");
 assert.ok(indexNotice >=0 && indexNotice < indexAuth && indexAuth < indexAnon && indexAnon < indexFinal);
 assert.equal(sql.trimEnd().endsWith("\\echo "+marker),true);
});
