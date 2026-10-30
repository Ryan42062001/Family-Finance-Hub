// FFH-P01 RLS-NVP-02: Windows PowerShell 5.1 trusted npx.cmd resolver.
// AST-extract ONLY the resolver; Get-Command, Test-Path and reparse checks
// are harmless mocks. Never invoke npx, Docker, Supabase or any owner procedure.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const guard = readFileSync("scripts/rls-local/source-provenance.ps1","utf8");
const prepare = readFileSync("scripts/rls-local/prepare-fresh-owner.ps1","utf8");
const labels=[
 "standard_installer","standard_installer_ps1_sibling",
 "standard_installer_both_siblings","alias_shadow","function_shadow",
 "cmdlet_shadow","foreign_script_shadow","foreign_path_before",
 "foreign_path_after","duplicate_npx_cmd","missing_npx_cmd",
 "missing_node_exe","forged_source","forged_definition",
 "unexpected_wrapper","reparse_denied","untrusted_node_location"
];

const ps = String.raw`
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$sourceFile = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'scripts/rls-local/source-provenance.ps1'))
$tokens=$null
$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($sourceFile,[ref]$tokens,[ref]$errors)
if ($null -eq $ast -or ($null -ne $errors -and $errors.Count -gt 0)) {throw 'BLOCKED: bad resolver source AST'}
$func=@($ast.FindAll({
 param($n)
 $n -is [Management.Automation.Language.FunctionDefinitionAst] -and
 $n.Name -ceq 'Resolve-FfhTrustedNpxCmd'
},$true))
if($func.Count -ne 1){throw 'BLOCKED: resolver definition missing or duplicate'}
. ([scriptblock]::Create($func[0].Extent.Text))
$script:Install=Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles)) 'nodejs'
$script:Npx=Join-Path $script:Install 'npx.cmd'
$script:Node=Join-Path $script:Install 'node.exe'
$script:Shell=Join-Path $script:Install 'npx'
$script:Ps1=Join-Path $script:Install 'npx.ps1'
$script:Evil=Join-Path $env:TEMP 'npx.cmd'
$script:HasNpx=$true
$script:HasNode=$true
$script:ReparseBlocked=$false
$script:Native=@()
$script:Exact=@()
$script:Bare=@()
function App([string]$Name,[string]$File,[string]$Definition=$File,[string]$Path=$File){
 [pscustomobject]@{Name=$Name;CommandType=[Management.Automation.CommandTypes]::Application;Source=$File;Path=$Path;Definition=$Definition}
}
function ScriptApp([string]$Name,[string]$File){
 [pscustomobject]@{Name=$Name;CommandType=[Management.Automation.CommandTypes]::ExternalScript;Source=$File;Path=$File;Definition=$File}
}
function Hostile([string]$Type,[string]$Name) {
 [pscustomobject]@{Name=$Name;CommandType=[Enum]::Parse([Management.Automation.CommandTypes],$Type);Source='evil';Path='evil';Definition='evil'}
}
function Get-Command {
 param([string]$Name,[string]$CommandType,[switch]$All,[string]$ErrorAction)
 if(-not $All){throw 'MOCK_MISSING_ALL'}
 if($Name -ceq 'npx.cmd'){
  if($CommandType -ceq 'Application'){return $script:Native}
  if([string]::IsNullOrEmpty($CommandType)){return $script:Exact}
 }
 if($Name -ceq 'npx' -and [string]::IsNullOrEmpty($CommandType)){
  return $script:Bare
 }
 throw 'MOCK_UNEXPECTED_COMMAND_QUERY'
}
function Test-Path {
 param([string]$LiteralPath,[string]$PathType)
 if($PathType -cne 'Leaf'){throw 'MOCK_PATH_TYPE'}
 if($LiteralPath -ceq $script:Npx){return $script:HasNpx}
 if($LiteralPath -ceq $script:Node){return $script:HasNode}
 if($LiteralPath -ceq $script:Ps1 -or $LiteralPath -ceq $script:Shell){return $true}
 throw 'BLOCKED: synthetic trusted sibling path mismatch'
}
function Assert-FfhNoReparsePath {
 param([string]$Path)
 if($Path -cne $script:Install -and $Path -cne $script:Npx -and
    $Path -cne $script:Node){throw 'MOCK_UNEXPECTED_REPARSE_CHECK'}
 if($script:ReparseBlocked){throw 'BLOCKED: mock untrusted reparse'}
}
$good=App 'npx.cmd' $script:Npx
$ps1=ScriptApp 'npx.ps1' $script:Ps1
$shell=App 'npx' $script:Shell
$bad=App 'npx.cmd' $script:Evil
function Case {
 param([string]$Label,[object[]]$Native,[object[]]$Exact,[object[]]$Bare,
  [bool]$Accept,[bool]$HasNpx=$true,[bool]$HasNode=$true,[bool]$Reparse=$false)
 $script:Native=$Native;$script:Exact=$Exact;$script:Bare=$Bare
 $script:HasNpx=$HasNpx
 $script:HasNode=$HasNode
 $script:ReparseBlocked=$Reparse
 $blocked=$false;$value=$null;$reason='none'
 try{$value=Resolve-FfhTrustedNpxCmd}
 catch{
  if($_.Exception.Message -notmatch '^BLOCKED:'){throw ('Unexpected exception in '+$Label+': '+$_.Exception.GetType().Name)}
  $blocked=$true
  $reason=$_.Exception.Message # Synthetic classification only; no paths/creds.
 }
 if($Accept){
  if($blocked -or $null -eq $value -or $value.Name -cne 'npx.cmd' -or
     $value.Source -cne $script:Npx){throw ('Trusted npx was not accepted: '+$Label+' reason='+$reason)}
 } elseif(-not $blocked){throw ('Untrusted npx accepted: '+$Label)}
 [Console]::Out.WriteLine('WINPS51_TRUSTED_NPX_PASS '+$Label)
}
Case 'standard_installer' @($good) @($good) @($good) $true
Case 'standard_installer_ps1_sibling' @($good) @($good) @($ps1,$good) $true
Case 'standard_installer_both_siblings' @($good) @($good) @($ps1,$good,$shell) $true
Case 'alias_shadow' @($good) @($good) @((Hostile 'Alias' 'npx'),$good) $false
Case 'function_shadow' @($good) @($good) @((Hostile 'Function' 'npx'),$good) $false
Case 'cmdlet_shadow' @($good) @($good) @((Hostile 'Cmdlet' 'npx'),$good) $false
Case 'foreign_script_shadow' @($good) @($good) @((ScriptApp 'npx.ps1' $script:Evil),$good) $false
Case 'foreign_path_before' @($bad,$good) @($bad,$good) @($bad,$good) $false
Case 'foreign_path_after' @($good,$bad) @($good,$bad) @($good,$bad) $false
Case 'duplicate_npx_cmd' @($good,$good) @($good,$good) @($good) $false
Case 'missing_npx_cmd' @() @() @($ps1) $false
Case 'missing_node_exe' @($good) @($good) @($good) $false $true $false
Case 'forged_source' @((App 'npx.cmd' $script:Evil -Path $script:Npx -Definition $script:Npx)) @($good) @($good) $false
Case 'forged_definition' @((App 'npx.cmd' $script:Npx -Definition $script:Evil)) @($good) @($good) $false
Case 'unexpected_wrapper' @($good) @($good) @((App 'npx.exe' $script:Npx),$good) $false
Case 'reparse_denied' @($good) @($good) @($good) $false $true $true $true
Case 'untrusted_node_location' @($bad) @($bad) @($bad) $false
`;

test("RLS-NVP-02 actual Windows PowerShell 5.1 resolver rejects hostile and ambiguous PATH choices",()=>{
 assert.equal(process.platform,"win32","WinPS5.1 required and never skipped");
 const result=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",ps],{
  cwd:process.cwd(),encoding:"utf8",windowsHide:true,timeout:45_000
 });
 assert.ifError(result.error);
 assert.equal(result.status,0,"Windows trusted npx behavior failed:\n"+result.stdout+"\n"+result.stderr);
 const receipts=result.stdout.split(/\r?\n/);
 for(const label of labels)assert.equal(receipts.filter(x=>x==="WINPS51_TRUSTED_NPX_PASS "+label).length,1,label);
});

test("RLS-NVP-02 source enforces single shared npx.cmd resolver and protected Node install",()=>{
 assert.match(guard,/function Resolve-FfhTrustedNpxCmd \{/);
 assert.match(guard,/Get-Command npx\.cmd -CommandType Application -All/);
 assert.match(guard,/Get-Command npx\.cmd -All/);
 assert.match(guard,/Get-Command npx -All/);
 assert.match(guard,/\$nativeCandidates\.Count -ne 1/);
 assert.match(guard,/Assert-FfhNoReparsePath -Path \$trustedNpx/);
 assert.match(guard,/Assert-FfhNoReparsePath -Path \$trustedNode/);
 assert.match(guard,/\$npxCli = Resolve-FfhTrustedNpxCmd/);
 assert.match(prepare,/\$npxCli = Resolve-FfhTrustedNpxCmd/);
 assert.doesNotMatch(guard+prepare,/\$npxCli = Get-Command npx\.cmd/);
 assert.match(prepare,/supabase@2\.122\.0 --version/);
 assert.match(guard,/--yes supabase@2\.122\.0/);
});
