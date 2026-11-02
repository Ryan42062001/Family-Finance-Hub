# Real WinPS5.1 production SQL validator and owner admission, with fake reads/native job.
# No SQL execution, Docker daemon, private data or Owner host operations.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
. (Join-Path $repo 'scripts/rls-local/source-provenance.ps1')
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
. (Join-Path $repo 'scripts/rls-local/cleanup-executor.ps1')
$script:cid='c'*64
$script:legacyId='f'*64
$script:dockerExe=Join-Path ([Environment]::SystemDirectory) 'cmd.exe'
$script:identity=Get-FfhRunIdentity -SourceSha ('a'*40) -RunToken ('b'*24)
$script:journal=[pscustomobject]@{
  version=2;sha=$script:identity.sha;token=$script:identity.token
  project=$script:identity.project;root=$script:identity.root
  container=$script:identity.container;daemon='synthetic-local-daemon-1234'
  cliVersion='2.122.0';ports=@(42133,42134)
  state='GATE_B_RUNNING';gateAResult='PASS';gateBResult='RUNNING'
  cleanupResult='PRESERVED_FOR_GATE_B';protected=@(('C:'+$script:legacyId+' FFH-RLS-Test'))
  resources=@([pscustomobject]@{kind='containers';id=$script:cid;name=('/'+$script:identity.container)})
}
$script:nativeCalls=0
$script:nativeArg=''
$script:readCalls=0
$script:substitute=$false
$script:badCompose=$false
$script:badPort=$false
$script:badHost=$false
$script:badHealth=$false
$script:badDaemon=$false
$script:foreignNetwork=$false
$script:temp=Join-Path ([IO.Path]::GetTempPath()) ('ffh-sql-test-'+[Guid]::NewGuid().ToString('N'))
$script:sqlDir=Join-Path $script:temp 'scripts/rls-local'
[void](New-Item -ItemType Directory -Path $script:sqlDir -Force)
$rows=@()
foreach($file in @('preflight.sql','matrix.sql')) {
  $path=Join-Path $script:sqlDir $file
  [IO.File]::WriteAllText($path,'SELECT 1;',[Text.UTF8Encoding]::new($false))
  $rows+= [pscustomobject]@{
    path=('scripts/rls-local/'+$file)
    sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}
$script:source=[pscustomobject]@{head=$script:identity.sha;repo=$script:temp;all_files=@($rows)}
$script:binding=[pscustomobject]@{Endpoint='npipe:////./pipe/dockerDesktopLinuxEngine';Executable=$script:dockerExe}
# Replace environment/native edges while running the actual production functions.
function Read-FfhJournal {param($Identity) return $script:journal}
function Assert-FfhNoRemoteConfiguration { }
function Assert-FfhDockerEnvironment { }
function Assert-FfhLocalDockerDesktop {return $script:binding}
function Invoke-FfhNativeJobChild {
  param($StartInfo,[switch]$SqlMode,[byte[]]$SqlBytes,[switch]$Matrix)
  if (-not $SqlMode -or @($SqlBytes).Count -eq 0) {throw 'MOCK_JOB_CONTRACT'}
  $script:nativeCalls++
  $script:nativeArg=$StartInfo.Arguments
  return 'EXIT_ZERO'
}
$script:dockerRead={
  param([string[]]$argv)
  $script:readCalls++
  $joined=$argv -join ' '
  if($argv[0] -ceq 'info') {
    if($script:badDaemon) {return 'different-local-daemon'}
    return 'synthetic-local-daemon-1234'
  }
  if($argv[0] -ceq 'ps') {
    $filterIndex=[array]::IndexOf($argv,'--filter')
    if($filterIndex -ge 0) {
      $filter=[string]$argv[$filterIndex+1]
      if($filter.StartsWith('label=')) {return $script:cid}
      if($filter.StartsWith('volume=')) {return}
    }
    if($joined.Contains('{{.ID}} {{.Names}}')) {
      Write-Output ($script:cid+' '+$script:identity.container)
      Write-Output ($script:legacyId+' FFH-RLS-Test')
      return
    }
    if($joined.Contains('{{.ID}}')) {return $script:cid}
    throw 'MOCK_UNEXPECTED_PS'
  }
  if($argv[0] -ceq 'volume') {return}
  if($argv[0] -ceq 'network') {return}
  if($argv[0] -ceq 'inspect') {
    $fmt=[string]$argv[$argv.Count-1]
    $activeId=if($script:substitute){'e'*64}else{$script:cid}
    if($fmt -ceq '{{.Id}}') {return $activeId}
    if($fmt -ceq '{{.Name}}') {return ('/'+$script:identity.container)}
    if($fmt -ceq '{{json .Config.Labels}}') {
      $compose=if($script:badCompose){'wrong-project'}else{$script:identity.project}
      return (ConvertTo-Json -InputObject @{
        'com.supabase.cli.project'=$script:identity.project
        'com.docker.compose.project'=$compose} -Compress)
    }
    if($fmt -ceq '{{json .Mounts}}') {return '[]'}
    if($fmt -ceq '{{json .NetworkSettings.Networks}}') {
      if($script:foreignNetwork) {return '{"rogue":{"NetworkID":"1111111111111111111111111111111111111111111111111111111111111111"}}'}
      return '{}'
    }
    if($fmt -ceq '{{.State.Running}}') {return 'true'}
    if($fmt -ceq '{{json .State}}') {
      if($script:badHealth) {return '{"Running":true,"Health":{"Status":"unhealthy"}}'}
      return '{"Running":true,"Health":{"Status":"healthy"}}'
    }
    if($fmt -ceq '{{json .NetworkSettings.Ports}}') {
      $ip=if($script:badHost){'0.0.0.0'}else{'127.0.0.1'}
      $port=if($script:badPort){42135}else{42133}
      return ('{"5432/tcp":[{"HostIp":"'+$ip+'","HostPort":"'+$port+'"}]}')
    }
  }
  throw ('MOCK_UNEXPECTED_DOCKER_READ '+$joined)
}
function Reset-Mock {
  $script:nativeCalls=0;$script:nativeArg='';$script:readCalls=0
  $script:substitute=$false;$script:badCompose=$false
  $script:badPort=$false;$script:badHost=$false;$script:badHealth=$false
  $script:badDaemon=$false;$script:foreignNetwork=$false
  $script:journal.sha=$script:identity.sha;$script:journal.token=$script:identity.token
  $script:journal.project=$script:identity.project
  $script:journal.gateAResult='PASS';$script:journal.gateBResult='RUNNING'
  $script:journal.state='GATE_B_RUNNING';$script:journal.cleanupResult='PRESERVED_FOR_GATE_B'
  $script:source.head=$script:identity.sha
  $script:binding=[pscustomobject]@{Endpoint='npipe:////./pipe/dockerDesktopLinuxEngine';Executable=$script:dockerExe}
}
function Run-RealNative([string]$Mode='Preflight',[string]$Container='',[string]$Id='') {
  if(-not $Container) {$Container=$script:identity.container}
  if(-not $Id) {$Id=$script:cid}
  return (Invoke-FfhOwnedLocalPsql -Mode $Mode -Container $Container -ContainerId $Id -Identity $script:identity -FakeDocker $script:dockerRead -SqlPath (Join-Path $script:sqlDir ($Mode.ToLowerInvariant()+'.sql')) -Source $script:source -DockerBinding $script:binding)
}
function Must-Block($description,[scriptblock]$action) {
  $script:nativeCalls=0
  $denied=$false
  try {& $action | Out-Null} catch {$denied=$true}
  if(-not $denied -or $script:nativeCalls -ne 0) {
    throw ('MOCK_NATIVE_ADMISSION_FAILED_'+$description+'_calls='+$script:nativeCalls)
  }
  Write-Output ($description+' PASS')
}
try {
  Reset-Mock
  Run-RealNative | Out-Null
  $expected='--host npipe:////./pipe/dockerDesktopLinuxEngine exec -i '+$script:cid+' psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres'
  if($script:nativeCalls -ne 1 -or $script:nativeArg -cne $expected -or
     $script:nativeArg.Contains($script:identity.container)) {throw 'MOCK_NATIVE_EXACT_VECTOR_FAIL'}
  Write-Output 'NATIVE-PREFLIGHT-ID PASS'
  Reset-Mock
  Run-RealNative -Mode Matrix | Out-Null
  if($script:nativeCalls -ne 1 -or $script:nativeArg -cne $expected) {throw 'MOCK_NATIVE_MATRIX_VECTOR_FAIL'}
  Write-Output 'NATIVE-MATRIX-ID PASS'
  Reset-Mock
  $script:journal.gateAResult='RUNNING'
  $script:journal.gateBResult='NOT_STARTED'
  $script:journal.state='INVENTORY_VERIFIED'
  Run-RealNative | Out-Null
  if($script:nativeCalls -ne 1) {throw 'MOCK_GATE_A_VALID_FAIL'}
  Write-Output 'NATIVE-GATE-A-ID PASS'
  Reset-Mock;Must-Block 'NATIVE-OLD-NAME' {Run-RealNative -Container 'supabase_db_ffh_p01_rls_fresh_aaaaaaaa'}
  Reset-Mock;Must-Block 'NATIVE-OTHER-TOKEN' {Run-RealNative -Container ('supabase_db_ffhp1_aaaaaaaa_'+('d'*24))}
  Reset-Mock;Must-Block 'NATIVE-MALFORMED-NAME' {Run-RealNative -Container 'x;echo'}
  Reset-Mock;Must-Block 'NATIVE-OTHER-ID' {Run-RealNative -Id ('e'*64)}
  Reset-Mock;$script:substitute=$true;Must-Block 'NATIVE-SAME-NAME-SWAPPED-ID' {Run-RealNative}
  Reset-Mock;$script:badCompose=$true;Must-Block 'NATIVE-DUAL-LABEL' {Run-RealNative}
  Reset-Mock;$script:badDaemon=$true;Must-Block 'NATIVE-DAEMON-DRIFT' {Run-RealNative}
  Reset-Mock;$script:foreignNetwork=$true;Must-Block 'NATIVE-FOREIGN-NETWORK' {Run-RealNative}
  Reset-Mock;$script:badPort=$true;Must-Block 'NATIVE-DYNAMIC-PORT-CONFLICT' {Run-RealNative}
  Reset-Mock;$script:badHost=$true;Must-Block 'NATIVE-NONLOOPBACK' {Run-RealNative}
  Reset-Mock;$script:badHealth=$true;Must-Block 'NATIVE-HEALTH' {Run-RealNative}
  Reset-Mock;$script:journal.sha='d'*40;Must-Block 'NATIVE-WRONG-SOURCE-SHA' {Run-RealNative}
  Reset-Mock;$script:journal.token='d'*24;Must-Block 'NATIVE-WRONG-JOURNAL-TOKEN' {Run-RealNative}
  Reset-Mock;$script:binding.Endpoint='tcp://127.0.0.1:2375';Must-Block 'NATIVE-REMOTE-BINDING' {Run-RealNative}
  Write-Output 'NATIVE-ADMISSION-ALL PASS'
} finally {
  $allowed=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if($script:temp.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase) -and
     [IO.Path]::GetFileName($script:temp) -cmatch '^ffh-sql-test-[a-f0-9]{32}$') {
    [IO.Directory]::Delete($script:temp,$true)
  }
}
