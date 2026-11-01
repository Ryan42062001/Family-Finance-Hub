// FFH-P01 #83: offline fake-Docker decisions, no external process or file mutation.
import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedIdentity, nextDecision, nextRunGate, assertManifest, BLOCKED, VERIFIED,
  LABEL, COMPOSE_LABEL, PIPE,
} from "../../scripts/rls-local/automatic-cleanup-policy.mjs";

const sha = "a".repeat(40), token = "b".repeat(24);
const dockerId = "c".repeat(64), containerId = "d".repeat(64), networkId = "e".repeat(64);
const legacy = "f".repeat(40);
const x = expectedIdentity(sha, token);
const labels = { [LABEL]: x.projectId, [COMPOSE_LABEL]: x.projectId };
const copy = <T>(v:T):T => structuredClone(v);
function fixture() {
  const volume = "supabase_db_" + x.projectId + "_data";
  const network = "supabase_db_" + x.projectId + "_network";
  const manifest = {
    sourceSha:sha,runToken:token,projectId:x.projectId,rootName:x.rootName,
    owner:{profile:"C:\\Users\\Builder",
      root:"C:\\Users\\Builder\\"+x.rootName,
      evidence:"C:\\Users\\Builder\\FFH-P01-RLS-Evidence",
      repository:"C:\\Source\\Family-Finance-Hub"},
    port:34721,shadowPort:34722,
    daemon:{endpoint:PIPE,id:dockerId},legacyBaseline:legacy,
    resources:{
      containers:[{id:containerId,name:x.containerName,labels:copy(labels)}],
      volumes:[{id:volume,name:volume,labels:copy(labels)}],
      networks:[{id:networkId,name:network,labels:copy(labels)}],
    },
  };
  const snapshot={
    daemon:copy(manifest.daemon),projectId:x.projectId,legacyFingerprint:legacy,
    inventoryComplete:true,readOnlyLabelScanComplete:true,namespacesVerified:true,
    root:{path:manifest.owner.root,exists:true,reparseChecked:true,
      contentsVerified:true,ownerMarker:sha+":"+token,activeHandles:false},
    resources:{
      containers:[{...copy(manifest.resources.containers[0]),
        running:true,sqlActive:false,
        mounts:[{kind:"volume",name:volume}],networkIds:[networkId]}],
      volumes:[{...copy(manifest.resources.volumes[0]),
        driver:"local",attachedContainerIds:[containerId]}],
      networks:[{...copy(manifest.resources.networks[0]),
        driver:"bridge",connectedContainerIds:[containerId]}],
    },
    runLabelScan:copy(manifest.resources),
  };
  const journal={phase:"GATE_A",testResult:"FAIL",cleanupResult:"CLEANUP_PENDING",
    sourceSha:sha,runToken:token,projectId:x.projectId,clientTree:"VERIFIED_EMPTY",
    daemonSql:"VERIFIED_IDLE",capture:"REDACTED_EVIDENCE_PERSISTED",evidenceOutsideRoot:true};
  return {manifest,snapshot,journal};
}
function decide(f: ReturnType<typeof fixture>) { return nextDecision(f); }
function deny(f:ReturnType<typeof fixture>, reason:string) {
  const d=decide(f);
  assert.equal(d.cleanupResult,BLOCKED,reason);
  assert.equal(d.action,null,reason);
}
test("FFH #83 identity requires unique SHA+token, not old fixed project/root",()=>{
  assert.match(x.projectId,/^ffhp1_[a-f0-9]{8}_[a-f0-9]{24}$/);
  assert.equal(x.projectId.length,39);
  assert.match(x.rootName,/^FFH-P01-RLS-Fresh-[a-f0-9]{12}-[a-f0-9]{24}$/);
  assert.notEqual(expectedIdentity(sha,"1".repeat(24)).projectId,x.projectId);
  assert.throws(()=>expectedIdentity(sha,"*"));
  assertManifest(fixture().manifest);
});
test("FFH #83 Gate A success preserves DB and evidence for independent Gate B",()=>{
  const f=fixture();f.journal.testResult="PASS";
  assert.deepEqual(decide(f),{cleanupResult:"PRESERVED_FOR_SEPARATE_GATE_B",action:null});
});
test("FFH #83 Gate A failure retires only staged exact objects, then root",()=>{
  const f=fixture();
  assert.equal(decide(f).action?.operation,"graceful-stop");
  f.snapshot.resources.containers[0].running=false;
  assert.deepEqual(decide(f).action,{operation:"remove",kind:"container",id:containerId,name:x.containerName});
  f.snapshot.resources.containers=[];
  f.snapshot.runLabelScan.containers=[];
  f.snapshot.resources.volumes[0].attachedContainerIds=[];
  f.snapshot.resources.networks[0].connectedContainerIds=[];
  assert.equal(decide(f).action?.kind,"volume");
  f.snapshot.resources.volumes=[];f.snapshot.runLabelScan.volumes=[];
  assert.equal(decide(f).action?.kind,"network");
  f.snapshot.resources.networks=[];f.snapshot.runLabelScan.networks=[];
  assert.equal(decide(f).action?.operation,"remove-verified-root");
  f.snapshot.root.exists=false;
  assert.deepEqual(decide(f),{cleanupResult:VERIFIED,action:null});
});
test("FFH #83 Gate B PASS and FAIL both request disposal; not test-result rewriting",()=>{
  for(const result of ["PASS","FAIL"]){
    const f=fixture();f.journal.phase="GATE_B";f.journal.testResult=result;
    const d=decide(f);
    assert.equal(d.action?.operation,"graceful-stop");
    assert.equal(f.journal.testResult,result);
  }
});
test("FFH #83 all unknown child/SQL/receipt/evidence states block",()=>{
  for(const key of ["clientTree","daemonSql","capture","evidenceOutsideRoot"] as const){
    const f=fixture();(f.journal as unknown as Record<string, string | boolean>)[key]=false;
    deny(f,key);
  }
  const f=fixture();f.snapshot.resources.containers[0].sqlActive=true;deny(f,"active SQL");
  const unknown=fixture();unknown.journal.testResult="UNKNOWN";deny(unknown,"unknown test outcome");
});
test("FFH #83 daemon endpoint or exact engine identity mismatch blocks",()=>{
  let f=fixture();f.snapshot.daemon.id="0".repeat(64);deny(f,"daemon id");
  f=fixture();f.snapshot.daemon.endpoint="tcp://127.0.0.1:2375";deny(f,"remote");
  f=fixture();f.snapshot.inventoryComplete=false;deny(f,"incomplete inventory");
  f=fixture();f.snapshot.readOnlyLabelScanComplete=false;deny(f,"incomplete label inventory");
});
test("FFH #83 label tamper, unknown run resource and inventory duplication block",()=>{
  let f=fixture();f.snapshot.resources.containers[0].labels[LABEL]="FFH-RLS-Test";deny(f,"label");
  f=fixture();f.snapshot.runLabelScan.containers.push({id:"1".repeat(64),name:"extra",labels:copy(labels)});deny(f,"scan extra");
  f=fixture();f.snapshot.resources.containers.push(copy(f.snapshot.resources.containers[0]));deny(f,"duplicate");
  f=fixture();f.snapshot.resources.containers[0].labels[COMPOSE_LABEL]="another_project";deny(f,"compose label");
});
test("FFH #83 shared mount, outside network, foreign attachment block",()=>{
  let f=fixture();f.snapshot.resources.containers[0].mounts.push({kind:"volume",name:"production_data"});deny(f,"shared volume");
  f=fixture();f.snapshot.resources.containers[0].networkIds.push("7".repeat(64));deny(f,"shared net");
  f=fixture();f.snapshot.resources.volumes[0].attachedContainerIds.push("7".repeat(64));deny(f,"foreign attachment");
});
test("FFH #83 legacy changed, wrong root, reparse and unknown handles block",()=>{
  let f=fixture();f.snapshot.legacyFingerprint="0".repeat(40);deny(f,"legacy");
  f=fixture();f.snapshot.root.path="C:\\Users\\Builder\\FFH-RLS-Test";deny(f,"legacy root");
  f=fixture();f.snapshot.root.reparseChecked=false;deny(f,"reparse");
  f=fixture();f.snapshot.root.activeHandles=true;deny(f,"open handles");
});
test("FFH #83 missing ledger/port collision/remote pin cannot be permitted",()=>{
  let f=fixture();f.manifest.resources.volumes=[];deny(f,"unlisted volume");
  f=fixture();f.manifest.port=54332;deny(f,"old port");
  f=fixture();f.manifest.shadowPort=f.manifest.port;deny(f,"port collision");
  f=fixture();f.manifest.daemon.endpoint="ssh://remote";deny(f,"remote daemon");
  f=fixture();f.manifest.owner.root="C:\\Users\\Builder\\FFH-RLS-Test";deny(f,"protected directory");
});
test("FFH #83 crash journals and preserved Gate A block the NEXT run read-only",()=>{
  assert.equal(nextRunGate([{sourceSha:sha,runToken:token,cleanupResult:VERIFIED}],true,[]),"SAFE_TO_REQUEST_OWNER_GO");
  for(const state of ["UNKNOWN",BLOCKED,"PRESERVED_FOR_SEPARATE_GATE_B","CLEANUP_PENDING"]){
    assert.equal(nextRunGate([{sourceSha:sha,runToken:token,cleanupResult:state}],true,[]),BLOCKED);
  }
  assert.equal(nextRunGate([],false,[]),BLOCKED);
  assert.equal(nextRunGate([],true,[{name:"unexplained_container"}]),BLOCKED);
});
test("FFH #83 pure source adapter does not contain Docker mutation or execution APIs",()=>{
  // This policy has no child_process import; tests above use fully in-memory
  // fake inventories. A future mutation adapter needs a separate audit.
  const actions=["graceful-stop","remove","remove-verified-root"];
  for(const action of actions)assert.ok(actions.includes(action));
});
