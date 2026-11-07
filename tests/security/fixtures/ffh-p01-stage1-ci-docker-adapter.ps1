# FFH-P01 CI TEST-ONLY: synthetic read-only Docker metadata adapter.
# Loaded exclusively by ticketed GitHub Windows runner at the original -File
# entry. All real evidence/Git/native/C# validation remains production code.
# NEVER invoke Docker/SQL/Retire here. No untrusted payload or private ID output.
Set-StrictMode -Version Latest
$script:FfhCiProject='ffhp1_cba20f7f_'+('b'*24)
$script:FfhCiContainer='supabase_db_'+$script:FfhCiProject
$script:FfhCiVolume=$script:FfhCiContainer # pinned CLI 2.122.0
$script:FfhCiNetwork='supabase_network_'+$script:FfhCiProject
$script:FfhCiId=('c'*64)
$script:FfhCiNetId=('d'*64)
$script:FfhCiOtherId=('e'*64)
$script:FfhCiProtectedId=('f'*64)
$script:FfhCiDaemon='CI_SYNTHETIC_DAEMON'
$script:FfhCiFault=[string]$env:FFH_P01_CI_STAGE1_FAULT
if ($script:FfhCiFault -cnotin @('','DAEMON','LABEL','UNLABELLED_EXTRA',
  'CONTAINER_ID','VOLUME_NAME','NETWORK_ID','MOUNT','CONSUMER','PEER',
  'NETWORK_BIND','PORT','HEALTH','PROTECTED_BASELINE','PROTECTED_LATE',
  'STREAM_LEAK','OUTPUT_EXTRA','MODULE_IMPORT')) {
  throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
}
if ($script:FfhCiFault -ceq 'MODULE_IMPORT') {
  throw 'CI_SYNTHETIC_MODULE_IMPORT_FAULT'
}
$script:FfhCiLabels='{"com.supabase.cli.project":"'+$script:FfhCiProject+
  '","com.docker.compose.project":"'+$script:FfhCiProject+'"}'
function Assert-FfhLocalDockerDesktop {
  Assert-FfhDockerEnvironment
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
  }
  return [pscustomobject]@{
    Endpoint='npipe:////./pipe/dockerDesktopLinuxEngine'
    Executable='CI_SYNTHETIC_NO_EXTERNAL_PROCESS'
  }
}
function Invoke-FfhDockerRead {
  param([string[]]$Arguments,[scriptblock]$Fake)
  if ($null -ne $Fake -or $null -eq $Arguments -or $Arguments.Count -lt 2) {
    throw 'BLOCKED_RECOVERY_CI_SYNTHETIC_SCOPE'
  }
  $cmd=$Arguments -join ' '
  $last=[string]$Arguments[-1]
  if ($script:FfhCiFault -ceq 'STREAM_LEAK') {
    Write-Warning 'PRIVATE_NEVER_PRINT_CI_SECRET'
    Write-Information 'PRIVATE_NEVER_PRINT_CI_SECRET' -InformationAction Continue
    throw 'PRIVATE_NEVER_PRINT_CI_SECRET'
  }
  if ($Arguments[0] -ceq 'info' -and $last -ceq '{{.ID}}') {
    if ($script:FfhCiFault -ceq 'DAEMON') {return 'CI_SYNTHETIC_WRONG_DAEMON'}
    return $script:FfhCiDaemon
  }
  if ($Arguments[0] -ceq 'ps' -and $cmd.Contains('--filter volume=')) {
    if ($script:FfhCiFault -ceq 'CONSUMER') {return $script:FfhCiOtherId}
    return $script:FfhCiId
  }
  if ($Arguments[0] -ceq 'ps') {
    if ($cmd.Contains('--filter label=')) {
      if ($script:FfhCiFault -ceq 'LABEL' -and
          $cmd.Contains('com.docker.compose.project')) {return}
      return $script:FfhCiId
    }
    if ($last -ceq '{{.ID}} {{.Names}}') {
      $protectedName=if ($script:FfhCiFault -ceq 'PROTECTED_BASELINE' -or
          ($script:FfhCiFault -ceq 'PROTECTED_LATE' -and
           $script:FfhRecoveryStage -ceq 'PROTECTED_BASELINE')) {
        'FFH-RLS-Test-DRIFT'
      } else {'FFH-RLS-Test'}
      $rows=@(($script:FfhCiId+' '+$script:FfhCiContainer),
        ($script:FfhCiProtectedId+' '+$protectedName))
      if ($script:FfhCiFault -ceq 'UNLABELLED_EXTRA') {
        $rows+=($script:FfhCiOtherId+' '+$script:FfhCiContainer+'_extra')
      }
      return $rows
    }
  }
  if ($Arguments[0] -ceq 'volume' -and $Arguments[1] -ceq 'ls') {
    if ($cmd.Contains('--filter label=')) {return $script:FfhCiVolume}
    if ($script:FfhCiFault -ceq 'VOLUME_NAME') {return ($script:FfhCiVolume+'_data')}
    return $script:FfhCiVolume
  }
  if ($Arguments[0] -ceq 'network' -and $Arguments[1] -ceq 'ls') {
    if ($cmd.Contains('--filter label=')) {return $script:FfhCiNetId}
    return ($script:FfhCiNetId+' '+$script:FfhCiNetwork)
  }
  if ($Arguments[0] -ceq 'inspect' -and
      $Arguments[1] -ceq $script:FfhCiId) {
    switch -CaseSensitive ($last) {
      '{{.Name}}' {return ('/'+$script:FfhCiContainer)}
      '{{.Id}}' {
        if ($script:FfhCiFault -ceq 'CONTAINER_ID') {return $script:FfhCiOtherId}
        return $script:FfhCiId
      }
      '{{json .Config.Labels}}' {return $script:FfhCiLabels}
      '{{json .Mounts}}' {
        $volume=if ($script:FfhCiFault -ceq 'MOUNT') {'foreign_volume'}
          else {$script:FfhCiVolume}
        return ('[{"Type":"volume","Name":"'+$volume+'"}]')
      }
      '{{json .NetworkSettings.Networks}}' {
        return ('{"owned":{"NetworkID":"'+$script:FfhCiNetId+'"}}')
      }
      '{{.State.Running}}' {return 'true'}
      '{{json .State}}' {
        $status=if ($script:FfhCiFault -ceq 'HEALTH') {'unhealthy'}else{'healthy'}
        return ('{"Running":true,"Health":{"Status":"'+$status+'"}}')
      }
      '{{json .NetworkSettings.Ports}}' {
        $ip=if ($script:FfhCiFault -ceq 'PORT') {'0.0.0.0'} else {'127.0.0.1'}
        return ('{"5432/tcp":[{"HostIp":"'+$ip+'","HostPort":"26000"}]}')
      }
    }
  }
  if ($Arguments[0] -ceq 'volume' -and $Arguments[1] -ceq 'inspect' -and
      $Arguments[2] -ceq $script:FfhCiVolume) {
    switch -CaseSensitive ($last) {
      '{{json .Labels}}' {return $script:FfhCiLabels}
      '{{.Driver}}' {return 'local'}
    }
  }
  if ($Arguments[0] -ceq 'network' -and $Arguments[1] -ceq 'inspect' -and
      $Arguments[2] -ceq $script:FfhCiNetId) {
    switch -CaseSensitive ($last) {
      '{{json .Labels}}' {return $script:FfhCiLabels}
      '{{.Driver}}' {return 'bridge'}
      '{{.Name}}' {return $script:FfhCiNetwork}
      '{{.Id}}' {
        if ($script:FfhCiFault -ceq 'NETWORK_ID') {return $script:FfhCiOtherId}
        return $script:FfhCiNetId
      }
      '{{json .Containers}}' {
        $id=if ($script:FfhCiFault -ceq 'PEER') {$script:FfhCiOtherId}
          else {$script:FfhCiId}
        return ('{"'+$id+'":{}}')
      }
      '{{json .Options}}' {
        $bind=if ($script:FfhCiFault -ceq 'NETWORK_BIND') {'0.0.0.0'}else{'127.0.0.1'}
        return ('{"com.docker.network.bridge.host_binding_ipv4":"'+$bind+
          '","com.docker.network.bridge.gateway_mode_ipv4":"nat","com.docker.network.bridge.gateway_mode_ipv6":"nat"}')
      }
      '{{.EnableIPv6}}' {return 'false'}
    }
  }
  throw 'BLOCKED_RECOVERY_CI_UNEXPECTED_DOCKER_REQUEST'
}
