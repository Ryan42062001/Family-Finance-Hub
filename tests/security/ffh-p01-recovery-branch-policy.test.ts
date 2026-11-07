// Source invariants complement (do not replace) real WinPS5.1 -File native tests.
// FFH-P01 #83: pinned Supabase CLI v2.122.0 recovery-only branch marker.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const recovery=readFileSync("scripts/rls-local/diagnostic-recovery-readonly.ps1","utf8");
const native=readFileSync("scripts/rls-local/ffh-owned-root-retire.cs","utf8");
const ownerPlan=readFileSync("scripts/rls-local/owner-disposable-recovery-plan.ps1","utf8");
const normal=readFileSync("scripts/rls-local/automatic-cleanup.ps1","utf8");
const stage=readFileSync("tests/security/fixtures/ffh-p01-stage1-full-entry-ci.test.ps1","utf8");
const nativeFixture=readFileSync("tests/security/fixtures/ffh-p01-native-root.test.ps1","utf8");
const fixed="0d6e4079e36703ebd37c00722f5891d28b0e2811dc114b129215123adcce3605";
test("BR-01 immutable ASCII main SHA is independent of fixture files",()=>{
 assert.equal(createHash("sha256").update(Buffer.from([0x6d,0x61,0x69,0x6e])).digest("hex"),fixed);
});
test("BR-02 only canonical directory and exact pinned file are declared in recovery manifest",()=>{
 assert.ok(recovery.includes("'D|supabase\\.branches|-'"));
 assert.ok(recovery.includes("'F|supabase\\.branches\\_current_branch|"+fixed+"'"));
});
test("BR-03 native parser denies branch state on destructive Retire",()=>{
 assert.match(native,/ParsePermit\(manifest,!delete\)/);
 assert.match(native,/!readOnly && \(rel==@"/);
 assert.match(native,/MANIFEST_UNKNOWN_PATH/);
});
test("BR-04 exact-case native whitelist and no wildcard branch children",()=>{
 assert.ok(native.includes('rel==@"supabase\\.branches\\_current_branch"'));
 assert.ok(!native.includes('supabase\\.branches\\*'));
 assert.match(native,/StringComparer\.OrdinalIgnoreCase/);
 assert.match(native,/String\.Equals\(rel,/);
});
test("BR-05 fixed digest cannot be provided solely by a self-observed file hash",()=>{
 assert.ok(native.includes('const string BRANCH_SHA="'+fixed+'"'));
 assert.match(native,/v\[2\]!=BRANCH_SHA/);
 assert.match(native,/Sha\(h,cache\)!=rule\.digest/);
});
test("BR-06 file length four checked on native held handle, including recheck",()=>{
 assert.match(native,/IsBranchState\(rel\) && Length\(e\.info\)!=4/);
 assert.match(native,/IsBranchState\(e\.relative\) && Length\(i\)!=4/);
 assert.match(ownerPlan,/BLOCKED_ROOT_BRANCH_SIZE/);
});
test("BR-07 conditional 25-entry cap includes optional provenance receipt",()=>{
 assert.match(native,/items\.Count>\(branch\?25:24\)/);
 assert.match(native,/if\(branch!=branchFile\)Fail\("MANIFEST_INCOMPLETE"\)/);
 assert.match(recovery,/rootReceiptCheckSha256/);
});
test("BR-08 destructive root permit source remains branch-free",()=>{
 assert.doesNotMatch(normal,/\.branches/);
 assert.match(native,/public static string Retire\(/);
});
test("BR-09 tracked Stage 1 real -File happy and adversarial tests exist",()=>{
 assert.match(stage,/BRANCH_WRONG_FOUR_BYTES/);
 assert.match(stage,/BRANCH_REQUIRED_FILE_MISSING/);
 assert.match(stage,/BRANCH_WITH_OPTIONAL_PROVENANCE_SHA/);
 assert.match(stage,/BRANCH_FINAL_RECOVERY_COMPLETE/);
});
test("BR-10 native WinPS tests require reparse, hardlink, foreign ACL, race, and wrong case rejection",()=>{
 assert.match(nativeFixture,/SYNTH_BRANCH_JUNCTION_CREATION_FAILED/);
 assert.match(nativeFixture,/SYNTH_BRANCH_HARDLINK_CREATE_FAILED/);
 assert.match(nativeFixture,/ACL_FOREIGN/);
 assert.match(nativeFixture,/_CURRENT_BRANCH/);
 assert.match(nativeFixture,/FileReceipt '50'/);
});
test("BR-11 unchanged full-tree handles and zero-disposition preflight",()=>{
 assert.match(native,/held\.Add\(e\)/);
 assert.match(native,/ValidateComplete\(permit,seen\)/);
 assert.match(native,/if\(!delete\)return "PREFLIGHT_OK"/);
 assert.match(native,/DispositionAttempts\+\+/);
});
