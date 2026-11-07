// Types for the source-only policy's pure contract; not an implementation adapter.
export const PIPE: string;
export const LABEL: string;
export const COMPOSE_LABEL: string;
export const BLOCKED: string;
export const VERIFIED: string;
export function expectedIdentity(sourceSha:string,runToken:string):{
  sourceSha:string;runToken:string;projectId:string;rootName:string;containerName:string
};
export function assertManifest(manifest:unknown):ReturnType<typeof expectedIdentity>;
export function nextDecision(input:{
  manifest:unknown; journal:unknown; snapshot:unknown
}):{
  cleanupResult:string; action:null|{
    operation:string;kind:string;id?:string;name?:string;path?:string
  };reason?:string
};
export function nextRunGate(journals:unknown[],completeRunLabelScan:boolean,unexplainedRunResources:unknown[]):string;
