# FFH-P01 #83 WinPS5.1 ORIGINAL production exact inventory with fake Docker.
# No real Docker, SQL, owner Plan/Run, evidence, cleanup or filesystem mutation.
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
. (Join-Path $repo 'scripts/rls-local/automatic-cleanup.ps1')
. (Join-Path $repo 'scripts/rls-local/cleanup-executor.ps1')
function Receipt([int]$n) { Write-Output ('KI-'+$n.ToString('00')+' PASS') }
function Block([string]$category,[scriptblock]$action) {
  $caught=$false
  try {[void](& $action)} catch {
    if ($_.Exception.Message -cne $category) {
      throw ('KI_UNEXPECTED_CATEGORY_'+$category+'_ACTUAL_'+$_.Exception.Message)
    }
    $caught=$true
  }
  if (-not $caught) {throw ('KI_MISSING_BLOCK_'+$category)}
}
$sha='a'*40;$token='b'*24
$script:i=Get-FfhRunIdentity -SourceSha $sha -RunToken $token
$script:cid='c'*64;$script:nid='d'*64
$script:cname='supabase_db_'+$script:i.project
$script:vname=$script:cname
$script:nname='supabase_network_'+$script:i.project
$script:labels='{"com.supabase.cli.project":"'+$script:i.project+'","com.docker.compose.project":"'+$script:i.project+'"}'
$script:daemon='fake-daemon'
$script:protected='C:'+('f'*64)+' FFH-RLS-Test'
$script:crows=@($script:cid+' '+$script:cname)
$script:vrows=@($script:vname)
$script:nrows=@($script:nid+' '+$script:nname)
$script:mountName=$script:vname
$script:mountType='volume'
$script:volumeConsumers=@($script:cid)
$script:networkPeers=@($script:cid)
$script:attachedNetwork=$script:nid
$script:wrongLabels=$false
$script:readCount=0
$script:consumersReached=$false;$script:peersReached=$false
$script:portsHostIp='127.0.0.1'
$script:journal=[pscustomobject]@{
  version=2;sha=$sha;token=$token;project=$script:i.project;root=$script:i.root
  container=$script:i.container;daemon=$script:daemon
  cliVersion='2.122.0';ports=@(26000,26001)
  state='INVENTORY_VERIFIED';gateAResult='RUNNING';gateBResult='NOT_STARTED'
  protected=@($script:protected)
  resources=@(
    [pscustomobject]@{kind='containers';id=$script:cid;name=('/'+$script:cname)}
    [pscustomobject]@{kind='volumes';id=$script:vname;name=$script:vname}
    [pscustomobject]@{kind='networks';id=$script:nid;name=$script:nname}
  )
}
# Only the test-owned journal accessor is fake; Assert-FfhExactInventory
# itself and its real downstream checks remain ORIGINAL imported production.
function Read-FfhJournal {param($Identity) return $script:journal}
$script:fake={
  param([string[]]$argv)
  $script:readCount++
  $cmd=$argv -join ' '
  if ($argv[0] -ceq 'info' -and $argv[-1] -ceq '{{.ID}}') {return $script:daemon}
  if ($argv[0] -ceq 'ps') {
    if ($cmd.Contains('--filter volume=')) {
      $script:consumersReached=$true
      return @($script:volumeConsumers)
    }
    if ($cmd.Contains('--filter label=')) {return $script:cid}
    if ($argv[-1] -ceq '{{.ID}} {{.Names}}') {
      return @($script:crows)+@($script:protected.Substring(2))
    }
  }
  if ($argv[0] -ceq 'volume' -and $argv[1] -ceq 'ls') {
    if ($cmd.Contains('--filter label=')) {return $script:vname}
    return @($script:vrows)
  }
  if ($argv[0] -ceq 'network' -and $argv[1] -ceq 'ls') {
    if ($cmd.Contains('--filter label=')) {return $script:nid}
    return @($script:nrows)
  }
  if ($argv[0] -ceq 'inspect' -and $argv[1] -ceq $script:cid) {
    switch -CaseSensitive ($argv[-1]) {
      '{{.Name}}' {return ('/'+$script:cname)}
      '{{.Id}}' {return $script:cid}
      '{{json .Config.Labels}}' {
        if ($script:wrongLabels) {
          return ('{"com.supabase.cli.project":"'+$script:i.project+'","com.docker.compose.project":"foreign"}')
        }
        return $script:labels
      }
      '{{json .Mounts}}' {
        return ('[{"Type":"'+$script:mountType+'","Name":"'+$script:mountName+'"}]')
      }
      '{{json .NetworkSettings.Networks}}' {
        return ('{"owned":{"NetworkID":"'+$script:attachedNetwork+'"}}')
      }
      '{{.State.Running}}' {return 'true'}
      '{{json .State}}' {return '{"Running":true,"Health":{"Status":"healthy"}}'}
      '{{json .NetworkSettings.Ports}}' {
        return ('{"5432/tcp":[{"HostIp":"'+$script:portsHostIp+'","HostPort":"26000"}]}')
      }
    }
  }
  if ($argv[0] -ceq 'volume' -and $argv[1] -ceq 'inspect' -and
      $argv[2] -ceq $script:vname) {
    switch -CaseSensitive ($argv[-1]) {
      '{{json .Labels}}' {return $script:labels}
      '{{.Driver}}' {return 'local'}
    }
  }
  if ($argv[0] -ceq 'network' -and $argv[1] -ceq 'inspect' -and
      $argv[2] -ceq $script:nid) {
    switch -CaseSensitive ($argv[-1]) {
      '{{json .Labels}}' {return $script:labels}
      '{{.Driver}}' {return 'bridge'}
      '{{.Name}}' {return $script:nname}
      '{{.Id}}' {return $script:nid}
      '{{json .Containers}}' {
        $script:peersReached=$true
        $json=([ordered]@{})
        foreach ($peer in $script:networkPeers) {$json[$peer]=@{}}
        return (ConvertTo-Json -InputObject $json -Compress -Depth 3)
      }
    }
  }
  throw 'KI_FORBIDDEN_OR_UNKNOWN_DOCKER_COMMAND'
}
# Real namespace, actual Docker rows; C and V intentionally SHARE a name.
$original=Get-FfhFullResourceNamespace -Fake $script:fake
if (@($original).Count -ne 4) {throw 'KI_INITIAL_NAMESPACE_NOT_FOUR'}
Receipt 1
$inventory=@(Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake)
if ($inventory.Count -ne 3 -or -not $script:consumersReached -or -not $script:peersReached) {
  throw 'KI_REAL_INVENTORY_OR_DOWNSTREAM_NOT_REACHED'
}
Receipt 2
# Prove full original SQL admission path reaches loopback port verification,
# but fake journal/CLI only: no SQL execution or Docker mutation.
$cid=Assert-FfhJournaledSqlAdmission -Identity $script:i -Phase GATE_A -Fake $script:fake
if ($cid -cne $script:cid) {throw 'KI_READONLY_ADMISSION_CID'}
Receipt 3
$script:portsHostIp='0.0.0.0'
Block 'BLOCKED_SQL_ADMISSION_NONLOCAL_OR_WRONG_PORT' {
  Assert-FfhJournaledSqlAdmission -Identity $script:i -Phase GATE_A -Fake $script:fake
}
$script:portsHostIp='127.0.0.1'
Receipt 4
$script:crows+=('e'*64)+' '+$script:cname+'_extra'
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 5
$script:vrows+=($script:vname+'_data')
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:vrows=@($script:vname)
Receipt 6
$script:nrows+=('e'*64)+' '+$script:nname+'_extra'
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:nrows=@($script:nid+' '+$script:nname)
Receipt 7
$script:crows=@(($script:cid+' '+$script:cname),($script:cid+' '+$script:cname))
if (@(Get-FfhFullResourceNamespace -Fake $script:fake).Count -ne 5) {
  throw 'KI_DUPLICATE_NAMESPACE_ROW_COUNT'
}
Block 'BLOCKED: exact project resource namespace missing or duplicated' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 8
$script:crows=@(('e'*64)+' '+$script:cname)
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 9
$script:nrows=@(('e'*64)+' '+$script:nname)
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:nrows=@($script:nid+' '+$script:nname)
Receipt 10
$script:vrows=@($script:vname+'_data')
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:vrows=@($script:vname)
Receipt 11
$script:crows=@($script:cid+' '+$script:cname.ToUpperInvariant())
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 12
$script:crows=@('malformed '+$script:cname)
Block 'BLOCKED: malformed or unknown project resource namespace' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 13
$script:vrows=@()
Block 'BLOCKED: exact project resource namespace missing or duplicated' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:vrows=@($script:vname)
Receipt 14
$script:mountName='foreign_data'
Block 'BLOCKED: container uses foreign volume' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:mountName=$script:vname
Receipt 15
$script:volumeConsumers=@($script:cid,'e'*64)
Block 'BLOCKED: volume attached to foreign container' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:volumeConsumers=@($script:cid)
Receipt 16
$script:attachedNetwork='e'*64
Block 'BLOCKED: container uses foreign network' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:attachedNetwork=$script:nid
Receipt 17
$script:networkPeers=@($script:cid,'e'*64)
Block 'BLOCKED: foreign network endpoint' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:networkPeers=@($script:cid)
Receipt 18
$script:wrongLabels=$true
Block 'BLOCKED: contradictory or absent resource ownership labels' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:wrongLabels=$false
Receipt 19
$script:protected='C:'+('f'*64)+' FFH-RLS-Test-changed'
Block 'BLOCKED: protected FFH-RLS-Test inventory changed' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:protected='C:'+('f'*64)+' FFH-RLS-Test'
Receipt 20
$script:crows=@($script:cid+' '+$script:cname+'_'+$script:i.project)
Block 'BLOCKED: unlabeled or ambiguous named resource' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 21
$script:crows=@($script:cid+' /'+$script:cname)
if (@(Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake).Count -ne 3) {
  throw 'KI_SINGLE_DOCKER_SLASH_NORMALIZATION_FAILED'
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 22
$script:crows=@($script:cid+' //'+$script:cname)
Block 'BLOCKED: malformed or unknown project resource namespace' {
  Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake
}
$script:crows=@($script:cid+' '+$script:cname)
Receipt 23
$last=@(Assert-FfhExactInventory -Identity $script:i -Journal $script:journal -Fake $script:fake)
if ($last.Count -ne 3 -or $script:readCount -lt 40) {throw 'KI_FINAL_READ_ONLY_REACHABILITY'}
Receipt 24
# Original pre-fix cross-kind Contains(id) OR Contains(name) is demonstrably
# ambiguous for VALID real C/V rows, despite the corrected function PASS.
$containerRow='C:'+$script:cid+' '+$script:cname
$oldFound=@($script:journal.resources | Where-Object {
  $containerRow.Contains([string]$_.id) -or
  $containerRow.Contains([string]$_.name)
})
if ($oldFound.Count -ne 2 -or
    @($oldFound | Where-Object {$_.kind -ceq 'containers'}).Count -ne 1 -or
    @($oldFound | Where-Object {$_.kind -ceq 'volumes'}).Count -ne 1) {
  throw 'KI_FROZEN_OLD_COLLISION_NOT_REPRODUCED'
}
Receipt 25
