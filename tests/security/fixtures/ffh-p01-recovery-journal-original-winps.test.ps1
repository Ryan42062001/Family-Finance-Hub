# FFH-P01 #83: native Windows PowerShell 5.1 production journal-reader regression.
# Runs ONLY on ephemeral GitHub Windows CI. No Owner-host Plan/Run, Docker, SQL,
# retirement or protected FFH-RLS-Test. Only own synthetic journal is writable.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    [Environment]::GetEnvironmentVariable('GITHUB_ACTIONS') -cne 'true' -or
    [Environment]::GetEnvironmentVariable('RUNNER_OS') -cne 'Windows') {
  throw 'JR_CI_WINDOWS_ONLY'
}
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
. (Join-Path $repo 'scripts/rls-local/source-provenance.ps1')
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
. (Join-Path $repo 'scripts/rls-local/diagnostic-recovery-readonly.ps1')
function Receipt([int]$n) {Write-Output ('JR-'+$n.ToString('00')+' PASS')}
function MustBlock([string]$category,[scriptblock]$action) {
  $blocked=$false
  try {[void](& $action)} catch {
    if ($_.Exception.Message -cne $category) {
      throw ('JR_UNEXPECTED_BLOCK_CATEGORY_'+$category)
    }
    $blocked=$true
  }
  if (-not $blocked) {throw ('JR_EXPECTED_BLOCK_MISSING_'+$category)}
}
$profileRoot=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
$evidence=Join-Path $profileRoot 'FFH-P01-RLS-Evidence'
Assert-FfhNoReparsePath -Path $profileRoot
$identity=Get-FfhRunIdentity -SourceSha ('e'*40) -RunToken ('b'*24)
if ($identity.evidence -cne $evidence -or
    $identity.root -cne (Join-Path $profileRoot ('FFH-P01-RLS-Fresh-'+('e'*12)+'-'+('b'*24))) -or
    $evidence -match '(?i)FFH-RLS-Test') {
  throw 'JR_SYNTHETIC_IDENTITY_SCOPE'
}
# Fail closed if ANY evidence already exists; CI owns only a newly created
# profile evidence folder, never an Owner directory or another test's fixture.
if ([IO.Directory]::Exists($evidence) -or [IO.File]::Exists($evidence)) {
  throw 'JR_EXISTING_EVIDENCE_UNTOUCHABLE'
}
$journalPath=Get-FfhJournalPath -Identity $identity
$created=$false
$productionFn=(Get-Command Assert-FfhRecoveryExistingDirectory -CommandType Function).ScriptBlock
$productionPath=Join-Path $repo 'scripts/rls-local/diagnostic-recovery-readonly.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($productionPath,[ref]$tokens,[ref]$errors)
$node=@($ast.FindAll({param($a)
  $a -is [Management.Automation.Language.FunctionDefinitionAst] -and
  $a.Name -ceq 'Assert-FfhRecoveryExistingDirectory'
},$false))
if (@($errors).Count -ne 0 -or $node.Count -ne 1) {
  throw 'JR_PRODUCTION_FUNCTION_UNAVAILABLE'
}
# The original frozen production implementation is this EXACT function with
# its three local profileRoot references restored to home. Comparing the
# complete body proves baseline execution is not a mocked directory checker.
$expectedOriginal=@'
function Assert-FfhRecoveryExistingDirectory {
  param($Identity)
  $home=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')
  $expected=Join-Path $home 'FFH-P01-RLS-Evidence'
  if ([IO.Path]::GetFullPath([string]$Identity.evidence) -cne $expected -or
      $Identity.root -cne (Join-Path $home ('FFH-P01-RLS-Fresh-'+$Identity.sha.Substring(0,12)+'-'+$Identity.token)) -or
      $Identity.root -match '(?i)FFH-RLS-Test') {
    throw 'BLOCKED_RECOVERY_EVIDENCE_SCOPE'
  }
  if (-not [IO.Directory]::Exists($expected)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING'
  }
  Assert-FfhNoReparsePath -Path $expected
  Assert-FfhPrivateEvidenceAcl -Path $expected
  if (-not [IO.Directory]::Exists($expected)) {
    throw 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_DRIFT'
  }
  return $true
}
'@
$reverse=$node[0].Extent.Text.Replace('$profileRoot','$home')
$normalizedReverse=$reverse.Replace([Environment]::NewLine,[string][char]10).Trim()
$normalizedOriginal=$expectedOriginal.Replace([Environment]::NewLine,[string][char]10).Trim()
if ($normalizedReverse -cne $normalizedOriginal -or
    ([regex]::Matches($node[0].Extent.Text,[regex]::Escape('$profileRoot'))).Count -ne 3 -or
    $node[0].Extent.Text -match '(?i)\$home\b') {
  throw 'JR_FROZEN_SOURCE_NOT_EXACT_RENAME'
}
# Execute the pre-fix production body, then restore the actual current
# production function. Collision must be Windows readonly HOME, never a stub.
try {
  Invoke-Expression $expectedOriginal
  $caught=$false
  try {[void](Assert-FfhRecoveryExistingDirectory -Identity $identity)} catch {
    if ($_.FullyQualifiedErrorId -notmatch 'VariableNotWritable') {
      throw 'JR_OLD_FUNCTION_DID_NOT_COLLIDE_WITH_HOME'
    }
    $caught=$true
  }
  if (-not $caught) {throw 'JR_OLD_FUNCTION_UNEXPECTED_PASS'}
} finally {
  Set-Item -Path Function:\Assert-FfhRecoveryExistingDirectory -Value $productionFn
}
Receipt 1
try {
  # Missing directory: real fixed checker reaches original scope/path checks.
  MustBlock 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING' {
    Assert-FfhRecoveryExistingDirectory -Identity $identity
  }
  Receipt 2
  MustBlock 'BLOCKED_RECOVERY_EVIDENCE_DIRECTORY_MISSING' {
    Read-FfhRecoveryJournal -Identity $identity
  }
  if ([IO.Directory]::Exists($evidence) -or [IO.File]::Exists($journalPath)) {
    throw 'JR_MISSING_EVIDENCE_WAS_CREATED'
  }
  Receipt 3

  # Create the CI-owned fixed-scope evidence directory only if absent.
  [void][IO.Directory]::CreateDirectory($evidence)
  $created=$true
  Initialize-FfhPrivateEvidenceAcl -Path $evidence -NewlyCreated
  if (-not (Assert-FfhRecoveryExistingDirectory -Identity $identity)) {
    throw 'JR_PRODUCTION_DIRECTORY_CHECK_REFUSED'
  }
  Assert-FfhPrivateEvidenceAcl -Path $evidence
  Receipt 4
  MustBlock 'BLOCKED_RECOVERY_EVIDENCE_ENTRY_MISSING' {
    Read-FfhRecoveryJournal -Identity $identity
  }
  if ([IO.File]::Exists($journalPath)) {
    throw 'JR_ABSENT_JOURNAL_WAS_CREATED'
  }
  Receipt 5

  # Actual Read-FfhRecoveryJournal -> existing-only JSON -> entry -> directory
  # check, real private ACL, bounded FileMode.Open and identity verification.
  $journal=[ordered]@{
    version=2
    sha=$identity.sha
    token=$identity.token
    project=$identity.project
  }
  $json=$journal | ConvertTo-Json -Depth 4 -Compress
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes($json)
  $writer=[IO.FileStream]::new($journalPath,[IO.FileMode]::CreateNew,
    [IO.FileAccess]::Write,[IO.FileShare]::None)
  try {
    $writer.Write($bytes,0,$bytes.Length)
    $writer.Flush($true)
  } finally {$writer.Dispose()}
  Initialize-FfhPrivateEvidenceAcl -Path $journalPath -NewlyCreated
  $before=[Convert]::ToBase64String([IO.File]::ReadAllBytes($journalPath))
  $beforeTime=[IO.File]::GetLastWriteTimeUtc($journalPath)
  $read=Read-FfhRecoveryJournal -Identity $identity
  if ($read.version -ne 2 -or $read.sha -cne $identity.sha -or
      $read.token -cne $identity.token -or $read.project -cne $identity.project) {
    throw 'JR_PRODUCTION_JOURNAL_READBACK_INVALID'
  }
  Receipt 6
  $again=Read-FfhRecoveryJournal -Identity $identity
  if ($again.sha -cne $identity.sha -or
      [Convert]::ToBase64String([IO.File]::ReadAllBytes($journalPath)) -cne $before -or
      [IO.File]::GetLastWriteTimeUtc($journalPath) -ne $beforeTime -or
      @([IO.Directory]::GetFileSystemEntries($evidence)).Count -ne 1) {
    throw 'JR_JOURNAL_READER_WROTE_EVIDENCE'
  }
  Assert-FfhPrivateEvidenceAcl -Path $evidence
  Assert-FfhPrivateEvidenceAcl -Path $journalPath
  Receipt 7
} finally {
  # Only remove entries created by this CI fixture; never recursive deletion.
  if ($created) {
    if (-not [IO.Directory]::Exists($evidence)) {
      throw 'JR_OWNED_FIXTURE_DIRECTORY_MISSING'
    }
    Assert-FfhNoReparsePath -Path $evidence
    Assert-FfhPrivateEvidenceAcl -Path $evidence
    $entries=@([IO.Directory]::GetFileSystemEntries($evidence))
    if ($entries.Count -gt 1 -or
        ($entries.Count -eq 1 -and
         -not $entries[0].Equals($journalPath,[StringComparison]::OrdinalIgnoreCase))) {
      throw 'JR_FIXTURE_FOREIGN_ENTRY_NO_CLEANUP'
    }
    if ([IO.File]::Exists($journalPath)) {
      Assert-FfhPrivateEvidenceAcl -Path $journalPath
      [IO.File]::Delete($journalPath)
    }
    [IO.Directory]::Delete($evidence,$false)
  }
}
if ([IO.Directory]::Exists($evidence)) {throw 'JR_FIXTURE_CLEANUP_INCOMPLETE'}
Receipt 8
