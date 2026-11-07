# FFH-P01 #83: metadata-only operator inventory (FUTURE OWNER-HOST GO).
# Not authorized for current execution; no npx, SQL, Docker mutation, file
# deletion, deployment or remote endpoint. Prints redacted JSON to stdout.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedHead,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{24}$')][string]$RunToken,
  [Parameter(Mandatory=$true)][ValidateSet('FFH-P01-READ-ONLY-METADATA-GO')][string]$ExplicitAuthorization
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. "$PSScriptRoot/source-provenance.ps1"
. "$PSScriptRoot/automatic-cleanup.ps1"
. "$PSScriptRoot/cleanup-executor.ps1"
Assert-FfhNoRemoteConfiguration
$source=Assert-FfhSourceCheckout -ExpectedHead $ExpectedHead
$identity=Get-FfhRunIdentity -SourceSha $ExpectedHead -RunToken $RunToken
# Source guard requires a clean exact checkout and 15 immutable migrations.
# This endpoint validates the local named pipe before any metadata query.
$binding=Assert-FfhLocalDockerDesktop
if ($binding.Endpoint -cne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
  throw 'BLOCKED_METADATA_NOT_LOCAL_DOCKER_DESKTOP'
}
$daemon=Get-FfhObservedDaemon
$protectedBefore=@(Get-FfhProtectedInventory)
$names=@(Get-FfhFullResourceNamespace)
$owned=@(Get-FfhResourceSnapshot -Identity $identity)
$portOk=$true
$portBindingCount=0
$mountCount=0
$networkCount=0
foreach ($item in $owned) {
  if ($item.kind -cne 'containers') {continue}
  $mountCount+=@($item.mounts).Count
  $networkCount+=@($item.networks.PSObject.Properties.Name).Count
  $portsRaw=@(Invoke-FfhDockerRead -Arguments @(
    'inspect',[string]$item.id,'--format','{{json .NetworkSettings.Ports}}'))
  if ($portsRaw.Count -ne 1) {throw 'BLOCKED_METADATA_PORT_INSPECT_MISSING'}
  $ports=([string]$portsRaw[0] | ConvertFrom-Json)
  foreach ($property in @($ports.PSObject.Properties)) {
    foreach ($bind in @($property.Value)) {
      $portBindingCount++
      if ([string]$bind.HostIp -cnotin @('127.0.0.1','::1')) {$portOk=$false}
    }
  }
}
$protectedAfter=@(Get-FfhProtectedInventory)
$daemonAfter=Get-FfhObservedDaemon
if ($daemonAfter -cne $daemon -or
    ($protectedBefore -join [char]10) -cne ($protectedAfter -join [char]10)) {
  throw 'BLOCKED_METADATA_DAEMON_OR_PROTECTED_BASELINE_CHANGED'
}
$namespace=@($names | Where-Object {$_ -match [regex]::Escape($identity.project)})
$checksum=[Security.Cryptography.SHA256]::Create()
try {
  $bytes=[Text.Encoding]::UTF8.GetBytes(($protectedBefore -join [char]10))
  $fingerprint=[BitConverter]::ToString($checksum.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
} finally {$checksum.Dispose()}
# No resource names/IDs, mount paths, labels, environment or connection data
# leave the process. Labels are verified by Get-FfhResourceSnapshot, which
# checks BOTH CLI and Compose project labels on each recognized resource.
$summary=[ordered]@{
  schema=1; kind='FFH_P01_READ_ONLY_HOST_METADATA'; sourceSha=$ExpectedHead
  runTokenSuffix=$RunToken.Substring(18,6); expectedCliVersion='2.122.0'
  observedCliVersion='NOT_EXECUTED_IN_READ_ONLY_INVENTORY'
  endpoint='LOCAL_DOCKER_DESKTOP_LINUX_NAMED_PIPE'
  daemonStable=$true; protectedBaselineStable=$true
  protectedBaselineCount=$protectedBefore.Count;protectedBaselineSha256=$fingerprint
  dualLabeledOwnedContainers=@($owned | Where-Object {$_.kind -ceq 'containers'}).Count
  dualLabeledOwnedVolumes=@($owned | Where-Object {$_.kind -ceq 'volumes'}).Count
  dualLabeledOwnedNetworks=@($owned | Where-Object {$_.kind -ceq 'networks'}).Count
  projectNamespaceCount=$namespace.Count
  exactProjectNamespaceComplete=($namespace.Count -eq $owned.Count)
  inspectedContainerMountCount=$mountCount
  inspectedContainerNetworkCount=$networkCount
  inspectedPublishedBindingCount=$portBindingCount
  publishedBindingsAllLoopback=$portOk
  note='METADATA_ONLY_NOT_OWNER_HOST_GATE_A_OR_GATE_B_NOT_CLEANUP_AUTHORIZATION'
}
$summary | ConvertTo-Json -Depth 5
