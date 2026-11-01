// FFH-P01 #83: pure source-only cleanup policy; no Docker/SQL/filesystem calls.
// NOT an owner-host cleanup adapter. Activation requires an independent audit.
import {win32} from "node:path";
export const PIPE="npipe:////./pipe/dockerDesktopLinuxEngine";
export const LABEL="com.supabase.cli.project";
export const BLOCKED="CLEANUP_BLOCKED_MANUAL_REVIEW";
export const VERIFIED="CLEANUP_VERIFIED";
const sha=/^[0-9a-f]{40}$/, token=/^[0-9a-f]{24}$/, id=/^[0-9a-f]{64}$/;
const safe=/^[a-z0-9][a-z0-9_.-]{0,127}$/;
const kinds=["containers","volumes","networks"];
const fail=(reason)=>{throw Error(reason)};
function child(parent,part,basename) {
  return typeof parent==="string" && typeof part==="string" &&
    /^[a-z]:\\/i.test(parent) &&
    parent===win32.normalize(parent) && part===win32.normalize(part) &&
    win32.dirname(part).toLowerCase()===parent.toLowerCase() &&
    win32.basename(part)===basename && !/ffh-rls-test/i.test(part);
}
export function expectedIdentity(sourceSha,runToken) {
  if(!sha.test(sourceSha??"") || !token.test(runToken??"")) fail("RUN_IDENTITY_INVALID");
  const suffix=sourceSha.slice(0,12)+"_"+runToken;
  return {sourceSha,runToken,
    projectId:"ffh_p01_rls_fresh_"+suffix,
    rootName:"FFH-P01-RLS-Fresh-"+sourceSha.slice(0,12)+"-"+runToken,
    containerName:"supabase_db_ffh_p01_rls_fresh_"+suffix};
}
export function assertManifest(m) {
  if(!m || typeof m!=="object") fail("MANIFEST_MISSING");
  const x=expectedIdentity(m.sourceSha,m.runToken);
  if(m.projectId!==x.projectId || m.rootName!==x.rootName) fail("RUN_IDENTITY_MISMATCH");
  if(!m.owner || !child(m.owner.profile,m.owner.root,x.rootName) ||
     !child(m.owner.profile,m.owner.evidence,"FFH-P01-RLS-Evidence") ||
     typeof m.owner.repository!=="string" ||
     m.owner.root.toLowerCase()===m.owner.repository.toLowerCase() ||
     m.owner.root.toLowerCase().startsWith(m.owner.repository.toLowerCase()+"\\"))
     fail("ROOT_OR_EVIDENCE_BOUNDARY_INVALID");
  if(!Number.isInteger(m.port) || !Number.isInteger(m.shadowPort) ||
     m.port<20000 || m.port>60999 || m.shadowPort<20000 ||
     m.shadowPort>60999 || m.port===m.shadowPort ||
     m.port===54332 || m.shadowPort===54333) fail("HOST_PORT_COLLISION_OR_INVALID");
  if(m.daemon?.endpoint!==PIPE || !id.test(m.daemon.id??"")) fail("DAEMON_IDENTITY_INVALID");
  if(!sha.test(m.legacyBaseline??"")) fail("LEGACY_BASELINE_UNVERIFIED");
  if(!m.resources || typeof m.resources!=="object") fail("LEDGER_MISSING");
  for(const kind of kinds) {
    if(!Array.isArray(m.resources[kind])) fail("LEDGER_INCOMPLETE");
    const ids=new Set(),names=new Set();
    for(const r of m.resources[kind]) {
      if(!r || !safe.test(r.name??"") || !r.name.includes(x.projectId) ||
         /ffh-rls-test/i.test(r.name) ||
         (kind==="volumes" ? r.id!==r.name : !id.test(r.id??"")) ||
         r.labels?.[LABEL]!==x.projectId || ids.has(r.id) || names.has(r.name))
         fail("LEDGER_OWNERSHIP_UNVERIFIED");
      ids.add(r.id);names.add(r.name);
    }
  }
  return x;
}
function verifiedResource(r,ledger,kind,project) {
  if(!r || !ledger || r.id!==ledger.id || r.name!==ledger.name ||
     r.labels?.[LABEL]!==project || r.labels?.["ffh.p01.protected"]==="true")
     fail("RESOURCE_ID_LABEL_MISMATCH");
  if(kind==="containers" &&
     (typeof r.running!=="boolean" || typeof r.sqlActive!=="boolean" ||
      !Array.isArray(r.mounts) || !Array.isArray(r.networkIds) ||
      r.mounts.some(x=>x?.kind!=="volume" || !safe.test(x.name??"")) ||
      r.networkIds.some(x=>!id.test(x??""))))
     fail("CONTAINER_MOUNT_NETWORK_UNKNOWN");
  if(kind==="volumes" && (r.driver!=="local" ||
     !Array.isArray(r.attachedContainerIds))) fail("VOLUME_DRIVER_ATTACH_UNKNOWN");
  if(kind==="networks" && (r.driver!=="bridge" ||
     !Array.isArray(r.connectedContainerIds))) fail("NETWORK_DRIVER_ATTACH_UNKNOWN");
}
/**
 * A fresh FULL daemon snapshot is mandatory before EVERY mutation.
 * At most one exact-ID action. No prune, force, glob, retry, or orphan sweep.
 * The caller must implement an independently audited, non-shell Docker adapter.
 */
export function nextDecision({manifest,journal,snapshot}) {
  try {
    const x=assertManifest(manifest);
    if(!journal || !snapshot || journal.sourceSha!==x.sourceSha ||
       journal.runToken!==x.runToken || journal.projectId!==x.projectId ||
       !["GATE_A","GATE_B"].includes(journal.phase) ||
       !["PASS","FAIL","UNKNOWN"].includes(journal.testResult) ||
       journal.cleanupResult===BLOCKED || journal.cleanupResult==="UNKNOWN")
       fail("JOURNAL_UNVERIFIED");
    if(journal.phase==="GATE_A" && journal.testResult==="PASS")
      return {cleanupResult:"PRESERVED_FOR_SEPARATE_GATE_B",action:null};
    if(journal.clientTree!=="VERIFIED_EMPTY" ||
       journal.daemonSql!=="VERIFIED_IDLE" ||
       journal.capture!=="REDACTED_EVIDENCE_PERSISTED" ||
       journal.evidenceOutsideRoot!==true) fail("INDETERMINATE_CHILD_SQL_OR_EVIDENCE");
    if(snapshot.daemon?.endpoint!==manifest.daemon.endpoint ||
       snapshot.daemon?.id!==manifest.daemon.id) fail("DAEMON_ID_CHANGED");
    if(snapshot.projectId!==x.projectId ||
       snapshot.legacyFingerprint!==manifest.legacyBaseline)
       fail("PROJECT_OR_LEGACY_STATE_CHANGED");
    if(snapshot.inventoryComplete!==true ||
       snapshot.readOnlyLabelScanComplete!==true ||
       snapshot.namespacesVerified!==true) fail("SNAPSHOT_INCOMPLETE");
    if(snapshot.root?.path!==manifest.owner.root ||
       snapshot.root?.reparseChecked!==true ||
       snapshot.root?.contentsVerified!==true ||
       snapshot.root?.ownerMarker!==x.sourceSha+":"+x.runToken ||
       snapshot.root?.activeHandles===true) fail("ROOT_OWNERSHIP_UNVERIFIED");
    if(!snapshot.resources || !snapshot.runLabelScan) fail("RESOURCE_SCAN_MISSING");
    for(const kind of kinds) {
      const observed=snapshot.resources[kind],labelScan=snapshot.runLabelScan[kind];
      if(!Array.isArray(observed)||!Array.isArray(labelScan)) fail("RESOURCE_SCAN_MISSING");
      const ids=new Set();
      for(const r of observed) {
        const stored=manifest.resources[kind].find(z=>z.id===r.id);
        if(!stored || ids.has(r.id)) fail("UNJOURNALED_OR_DUPLICATE_RESOURCE");
        verifiedResource(r,stored,kind,x.projectId);ids.add(r.id);
      }
      if(labelScan.length!==ids.size || labelScan.some(z=>!ids.has(z.id)))
        fail("RUN_LABEL_INVENTORY_MISMATCH");
    }
    const c=snapshot.resources.containers,v=snapshot.resources.volumes,n=snapshot.resources.networks;
    const vNames=new Set(manifest.resources.volumes.map(z=>z.name));
    const nIds=new Set(manifest.resources.networks.map(z=>z.id));
    const cIds=new Set(manifest.resources.containers.map(z=>z.id));
    if(c.some(z=>z.mounts.some(m=>!vNames.has(m.name)) ||
       z.networkIds.some(i=>!nIds.has(i))) ||
       v.some(z=>z.attachedContainerIds.some(i=>!cIds.has(i))) ||
       n.some(z=>z.connectedContainerIds.some(i=>!cIds.has(i))))
       fail("SHARED_OR_FOREIGN_RESOURCE_ATTACHMENT");
    const running=c.find(z=>z.running);
    if(running) {
      if(running.sqlActive) fail("ACTIVE_SQL_SESSION");
      return {cleanupResult:"CLEANUP_PENDING",action:{operation:"graceful-stop",kind:"container",id:running.id,name:running.name}};
    }
    if(c.length) return {cleanupResult:"CLEANUP_PENDING",action:{operation:"remove",kind:"container",id:c[0].id,name:c[0].name}};
    if(v.some(z=>z.attachedContainerIds.length) ||
       n.some(z=>z.connectedContainerIds.length)) fail("ATTACHMENTS_NOT_DRAINED");
    if(v.length) return {cleanupResult:"CLEANUP_PENDING",action:{operation:"remove",kind:"volume",id:v[0].id,name:v[0].name}};
    if(n.length) return {cleanupResult:"CLEANUP_PENDING",action:{operation:"remove",kind:"network",id:n[0].id,name:n[0].name}};
    if(snapshot.root.exists) return {cleanupResult:"CLEANUP_PENDING",action:{operation:"remove-verified-root",kind:"directory",path:manifest.owner.root}};
    return {cleanupResult:VERIFIED,action:null};
  }catch(e) {
    return {cleanupResult:BLOCKED,action:null,reason:String(e?.message??"UNKNOWN")};
  }
}
/** Fresh read-only crash/journal scan; unknown or retained DB blocks next Gate A. */
export function nextRunGate(journals,completeRunLabelScan,unexplainedRunResources) {
  if(!Array.isArray(journals) || completeRunLabelScan!==true ||
     !Array.isArray(unexplainedRunResources) || unexplainedRunResources.length)
     return BLOCKED;
  const seen=new Set();
  for(const j of journals) {
    if(!j || !token.test(j.runToken??"") || !sha.test(j.sourceSha??"") ||
       seen.has(j.runToken) || j.cleanupResult!==VERIFIED) return BLOCKED;
    seen.add(j.runToken);
  }
  return "SAFE_TO_REQUEST_OWNER_GO";
}
