# SEC-STAGE-01: genuine Windows PowerShell 5.1 -File script-level binding.
# ONLY synthetic arguments; never invokes Owner-host recovery or Docker/SQL.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$plan=Join-Path $repo 'scripts/rls-local/owner-disposable-recovery-plan.ps1'
$errors=$null;$tokens=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($plan,[ref]$tokens,[ref]$errors)
if (@($errors).Count -ne 0 -or $null -ne $ast.ParamBlock) {
  throw 'SYNTH_AR_SCRIPT_BINDER_OR_PARSER_UNSAFE'
}
$source=[IO.File]::ReadAllText($plan)
$entry=$source.IndexOf('Invoke-FfhRecoveryPlanEntry -Action {',[StringComparison]::Ordinal)
$guard=$source.IndexOf("Set-FfhRecoveryStage -Stage 'ARGUMENTS'",$entry,[StringComparison]::Ordinal)
$parse=$source.IndexOf('Read-FfhRecoveryPlanArguments -RawArgs',$guard,[StringComparison]::Ordinal)
$import=$source.IndexOf("Set-FfhRecoveryStage -Stage 'MODULE_IMPORT'",$parse,[StringComparison]::Ordinal)
if ($entry -lt 0 -or $guard -le $entry -or $parse -le $guard -or
    $import -le $parse -or
    $source.Substring(0,$entry) -match '(?m)^\s*\.\s+"\$PSScriptRoot/') {
  throw 'SYNTH_AR_VALIDATION_NOT_BEFORE_ALL_IMPORTS'
}
# AST guards in addition to actual child execution: malformed tokens must
# never reach host, filesystem, Docker or an import.
$parserFunc=@($ast.FindAll({param($n)
  $n -is [Management.Automation.Language.FunctionDefinitionAst] -and
  $n.Name -ceq 'Read-FfhRecoveryPlanArguments'
},$false))
if ($parserFunc.Count -ne 1 -or
    $parserFunc[0].Extent.Text -match '(?i)\b(?:git|docker|sql|Invoke-FfhDockerRead|Get-Content|New-Item|Add-Type|Set-FfhRunState)\b') {
  throw 'SYNTH_AR_PARSER_NOT_PURE'
}
$goodHead='a'*40
$badConsumed='e'*40
$goodToken='b'*24
$goodCli='c'*64
$baseArgs=@(
  '-ExpectedAuditedHead',$goodHead,
  '-ConsumedHead',$badConsumed,
  '-RunToken',$goodToken,
  '-CliSha256',$goodCli
)
# Every test uses harmless synthetic hex; even a successful ARGUMENTS
# parse is stopped by the immutable CONSUMED_HEAD guard before environment.
$cases=@(
  [pscustomobject]@{Name='NO_ARGS';Tokens=@();Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_MISSING'}
  [pscustomobject]@{Name='MISSING_ONE';Tokens=@($baseArgs[0..5]);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_MISSING'}
  [pscustomobject]@{Name='INVALID_TOKEN';Tokens=@('-ExpectedAuditedHead',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken','BAD_NEVER_PRINT_ME','-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='SHORT_TOKEN';Tokens=@('-ExpectedAuditedHead',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken',('b'*23),'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='BAD_AUDIT_SHA';Tokens=@('-ExpectedAuditedHead',('A'*40),'-ConsumedHead',$badConsumed,'-RunToken',$goodToken,'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='BAD_CONSUMED_SHA';Tokens=@('-ExpectedAuditedHead',$goodHead,'-ConsumedHead',('z'*40),'-RunToken',$goodToken,'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='BAD_CLI_SHA';Tokens=@('-ExpectedAuditedHead',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken',$goodToken,'-CliSha256',('c'*63));Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='UNKNOWN_KEY';Tokens=@('-ExpectedAuditedHead',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken',$goodToken,'-UnknownKey',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_UNKNOWN'}
  [pscustomobject]@{Name='DUPLICATE';Tokens=@($baseArgs)+@('-RunToken',$goodToken);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_DUPLICATE'}
  [pscustomobject]@{Name='POSITIONAL';Tokens=@('POS_NEVER_PRINT_ME',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken',$goodToken,'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_POSITIONAL'}
  [pscustomobject]@{Name='TRAILING_GARBAGE';Tokens=@($baseArgs)+@('TRAIL_NEVER_PRINT_ME');Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_COUNT'}
  [pscustomobject]@{Name='TRAILING_PAIR';Tokens=@($baseArgs)+@('-UnknownKey','NEVER_PRINT_ME');Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_UNKNOWN'}
  [pscustomobject]@{Name='PRIVATE_VALUE';Tokens=@('-ExpectedAuditedHead',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken','C:\PRIVATE_NEVER_PRINT_ME','-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='MISSING_VALUE';Tokens=@($baseArgs[0..6]);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_COUNT'}
  [pscustomobject]@{Name='OPTIONAL_BAD';Tokens=@($baseArgs)+@('-PreapprovedCacheSha256','NEVER_PRINT_ME');Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_VALUE'}
  [pscustomobject]@{Name='TOO_MANY';Tokens=@($baseArgs)+@('-RunToken',$goodToken,'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_COUNT'}
  [pscustomobject]@{Name='UNKNOWN_CASE';Tokens=@('-expectedauditedhead',$goodHead,'-ConsumedHead',$badConsumed,'-RunToken',$goodToken,'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_UNKNOWN'}
  [pscustomobject]@{Name='COLON_SYNTAX';Tokens=@('-ExpectedAuditedHead:'+$goodHead,'-ConsumedHead',$badConsumed,'-RunToken',$goodToken,'-CliSha256',$goodCli);Stage='ARGUMENTS';Category='BLOCKED_RECOVERY_ARGUMENTS_MISSING'}
  [pscustomobject]@{Name='VALID_FORMAT_GUARDED';Tokens=@($baseArgs);Stage='CONSUMED_HEAD';Category='BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD'}
  [pscustomobject]@{Name='VALID_WITH_PIN_GUARDED';Tokens=@($baseArgs)+@('-PreapprovedCacheSha256',('d'*64));Stage='CONSUMED_HEAD';Category='BLOCKED_RECOVERY_WRONG_CONSUMED_HEAD'}
)
$expectedNames=@($cases | ForEach-Object {$_.Name})
if (@($cases).Count -ne 20 -or @($expectedNames | Select-Object -Unique).Count -ne 20) {
  throw 'SYNTH_AR_CASE_CARDINALITY'
}
# A test-owned GUID temp marker is never a real root/evidence/ledger.
$base=Join-Path ([IO.Path]::GetTempPath()) ('ffh-p01-arguments-fixture-'+[guid]::NewGuid().ToString('N'))
if ([IO.Directory]::Exists($base)) {throw 'SYNTH_AR_TEMP_COLLISION'}
[void][IO.Directory]::CreateDirectory($base)
$marker=Join-Path $base 'synthetic-ledger-marker.txt'
$receipt=Join-Path $base 'synthetic-final-marker.txt'
[IO.File]::WriteAllText($marker,'SYNTHETIC_LEDGER_UNCHANGED',[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($receipt,'SYNTHETIC_FINAL_UNCHANGED',[Text.UTF8Encoding]::new($false))
try {
  $num=0
  foreach($testCase in $cases) {
    $psi=[Diagnostics.ProcessStartInfo]::new()
    $psi.FileName=Join-Path $PSHOME 'powershell.exe'
    # Quoting preserves one argument per synthetic token. No token contains ".
    $quoted=@(foreach($token in @($testCase.Tokens)) {
      $v=[string]$token
      if ($v -match '"') {throw 'SYNTH_AR_QUOTE_UNEXPECTED'}
      '"'+$v+'"'
    })
    $psi.Arguments='-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
      $plan+'" '+($quoted -join ' ')
    $psi.UseShellExecute=$false
    $psi.RedirectStandardOutput=$true
    $psi.RedirectStandardError=$true
    $psi.CreateNoWindow=$true
    # If source admission were accidentally reached, these invalid ambient
    # settings would block it before any Docker connection.
    $psi.EnvironmentVariables['SUPABASE_ACCESS_TOKEN']='NEVER_PRINT_ME'
    $psi.EnvironmentVariables['DOCKER_HOST']='NEVER_PRINT_ME'
    $p=[Diagnostics.Process]::new()
    try {
      $p.StartInfo=$psi
      if (-not $p.Start()) {throw 'SYNTH_AR_CHILD_START_FAILED'}
      if (-not $p.WaitForExit(25000)) {
        $p.Kill()
        throw 'SYNTH_AR_CHILD_TIMEOUT'
      }
      $out=$p.StandardOutput.ReadToEnd().Trim()
      $err=$p.StandardError.ReadToEnd().Trim()
      $expected='RECOVERY_PLAN=BLOCKED STAGE='+$testCase.Stage+
        ' CATEGORY='+$testCase.Category+
        ' SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED NO_MUTATION=YES'
      if ($p.ExitCode -ne 1 -or $out -cne $expected -or $err.Length -ne 0 -or
          ($out+$err) -match 'NEVER_PRINT_ME|PRIVATE_|SYNTHETIC_|ffh-p01-arguments-fixture') {
        # Error reporting deliberately includes no captured stdout/stderr or
        # arguments. Use only bounded case name, booleans and numeric exit.
        # Diagnostic only: bounded enum tokens, never untrusted output.
        $bounded='^RECOVERY_PLAN=BLOCKED STAGE=([A-Z_]{1,32}) CATEGORY=([A-Z_]{1,64}) SQL_IDLE=NOT_AUTHORIZED DELETION=BLOCKED NO_MUTATION=YES$'
        $stageObserved='UNRECOGNIZED';$categoryObserved='UNRECOGNIZED'
        if ($out -cmatch $bounded) {
          $stageObserved=[string]$Matches[1]
          $categoryObserved=[string]$Matches[2]
        }
        throw ('SYNTH_AR_FAILED_'+$testCase.Name+
          '_EXIT_'+$p.ExitCode+'_OUTEQ_'+($out -ceq $expected)+
          '_ERREMPTY_'+($err.Length -eq 0)+
          '_PRIVATE_'+(($out+$err) -match 'NEVER_PRINT_ME|PRIVATE_|SYNTHETIC_')+
          '_STAGE_'+$stageObserved+'_CATEGORY_'+$categoryObserved)
      }
    } finally {$p.Dispose()}
    $num++
    Write-Output ('AR-'+$num.ToString('00')+' PASS')
  }
  if ([IO.File]::ReadAllText($marker) -cne 'SYNTHETIC_LEDGER_UNCHANGED' -or
      [IO.File]::ReadAllText($receipt) -cne 'SYNTHETIC_FINAL_UNCHANGED') {
    throw 'SYNTH_AR_EVIDENCE_WRITTEN'
  }
  Write-Output 'AR-21 PASS'
} finally {
  $canonical=[IO.Path]::GetFullPath($base)
  $parent=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if (-not ([IO.Path]::GetDirectoryName($canonical)).Equals(
      $parent,[StringComparison]::OrdinalIgnoreCase) -or
      [IO.Path]::GetFileName($canonical) -cnotmatch '^ffh-p01-arguments-fixture-[a-f0-9]{32}$') {
    throw 'SYNTH_AR_TEMP_SCOPE_FAILED'
  }
  if ([IO.Directory]::Exists($canonical)) {[IO.Directory]::Delete($canonical,$true)}
}
