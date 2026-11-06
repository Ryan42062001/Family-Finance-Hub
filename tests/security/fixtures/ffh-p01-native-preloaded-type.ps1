# Isolated Windows PowerShell 5.1 stale-native-type refusal. No root, SQL or Docker.
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Add-Type -TypeDefinition 'public static class FfhP01OwnedRoot { public static string Retire() { return "UNTRUSTED"; } }'
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
$blocked=$false
try {[void](Get-FfhOwnedRootNative)}
catch {
  if ([string]$_.Exception.Message -ceq 'BLOCKED_ROOT_NATIVE_PRELOADED_OR_STALE') {
    $blocked=$true
  } else {throw}
}
if (-not $blocked) {throw 'SYNTH_PRELOADED_CLASS_WAS_ACCEPTED'}
Write-Output 'FS-19 PASS'
