# FFH-026 — FRESH Independent Security Audit of Frozen R5 Offline Synthetic Remediation

**Role:** Technical & Mathematical Auditor, Independent Technical / Security Reviewer. **Execution:** STANDARD_CHAT_HIGH; FAST_REFRESH. **Verdict:** **FAIL — REMEDIATION REQUIRED** for offline synthetic security acceptance. **Finding summary:** CRITICAL 0, HIGH 1, MEDIUM 0, LOW 1 (plus clearly delimited environment/provenance limitations). This is an independent audit, not production authorization or Manager disposition.

## Immutable target and authoritative refresh

- Frozen owner-supplied archive: `FFH-026_F09_F14_SYNTHETIC_REMEDIATION_R5.zip`; independent SHA-256 **`d38c59b82d58411997642933bd5e6779b8a37f91e6addc699e5a6711042ce5ff`**, exact match; 361,289 bytes; never modified/repacked.
- Manager routing/freeze: [PR #68 comment 5770093936](https://github.com/Ryan42062001/Family-Finance-Hub/pull/68#issuecomment-5770093936). Previous R2 F14 blocker: [comment 5769904469](https://github.com/Ryan42062001/Family-Finance-Hub/pull/68#issuecomment-5769904469). These were read as requirements/history, **not** adopted as validation results.
- PR #68 separately refreshed: OPEN / DRAFT / UNMERGED; head `740e9db86dd094d3c86255bd00ac88d9ca63ed7c`; PR's reported base SHA `8b5273b0bc36be3a48b6f12145e9674f31141804`. Direct comparison with current canonical `main` independently proved main at **`76fb49d7203b71f43d2f1b052706a0c500d2ef3e`**, four commits ahead of that PR base. No production target/branch was modified.
- Reviewed `.ai/shared/WORKFLOW_V3_1.md`, `WORKFLOW_V3.md`, `WORKFLOW.md`, `.ai/tasks/FFH-026.md`, `.ai/audit/AUDIT_PACKET_TEMPLATE.md`, prior PR findings and archived review handoff. FFH-026 production release candidate `18ccbacd4265461b01580f5e96214788b15ec5af` is a *different* target, not substituted for the frozen R5 ZIP.

## Exact final file inventory and hash-graph verification

Independently enumerated ZIP central directory and extracted directory, compared exact filenames and SHA-256 bytes for every entry. ZIP CRC PASS; 42 regular files; zero unsafe/traversing, duplicate, case-colliding, NFC-colliding, encrypted, or unsupported-compression entries; ZIP and extraction both contain precisely the following **42** file paths:

01. `.gitignore`
02. `INDEPENDENT_SECURITY_REVIEW_HANDOFF.md`
03. `README.md`
04. `SBOM.md`
05. `SHA256SUMS.txt`
06. `dist/A/allowlist.mjs`
07. `dist/A/content.js`
08. `dist/A/manifest.json`
09. `dist/B/allowlist.mjs`
10. `dist/B/content.js`
11. `dist/B/manifest.json`
12. `evidence/execution-evidence.json`
13. `evidence/final-package-regressions.json`
14. `evidence/tests.tap`
15. `generated/allowlist-A.mjs`
16. `generated/allowlist-B.mjs`
17. `generated/entry-A.mjs`
18. `generated/entry-B.mjs`
19. `generated/equivalence-receipt.json`
20. `generated/privacy-safe-descriptors.json`
21. `generated/synthetic-contract.json`
22. `package-lock.json`
23. `package.json`
24. `reference/accepted-structure.v1.json`
25. `scripts/build.mjs`
26. `scripts/create-zip.mjs`
27. `scripts/derive.mjs`
28. `scripts/final-regression-probes.mjs`
29. `scripts/pipeline.mjs`
30. `scripts/verify-package.mjs`
31. `scripts/verify-zip.mjs`
32. `src/artifact-verifier.mjs`
33. `src/browser-runner.mjs`
34. `src/contract.mjs`
35. `src/hash-verifier.mjs`
36. `src/zip-verifier.mjs`
37. `tests/artifact-drift.test.mjs`
38. `tests/contract.test.mjs`
39. `tests/filesystem-integration.test.mjs`
40. `tests/hash-graph.test.mjs`
41. `tests/sdk.test.mjs`
42. `tests/zip-integration.test.mjs`

- Independent final hash-map reconstruction: `SHA256SUMS.txt` contains exactly **41** unique entries, each equal to the actual file SHA-256, excluding only the checksum manifest itself. `evidence/execution-evidence.json.hashes` contains exactly **40** entries matching all other actual files, excluding only the execution-evidence record and checksum manifest. The checksum manifest includes and binds the evidence record. This is an acyclic closed hash graph over all 42 actual final files. The 40 evidence-bound files include both final bundles, source, lockfile and retained TAP.
- Clean exact extracted package: `node scripts/verify-package.mjs` exited 0 and returned `{"status":"PACKAGE_HASH_GRAPH_VALID","actualFiles":42,"evidenceFiles":40,"checksumFiles":41}`.
- Independent inspection confirms verifier calls filesystem enumeration, rejects symlinks/non-regular entries, compares actual name sets and hashes against both maps, and checks the reference/contract/descriptors/allowlists/receipt/bundle-structure links.
- Archive ZIP-level independent Python negative checks: added regular file -> ZIP_FILE_SET_DRIFT; ../ traversal entry -> UNSAFE_ARCHIVE_PATH; duplicate regular name -> DUPLICATE_ARCHIVE_PATH. These prove behavior of the independent ZIP validator **not** execution of `src/zip-verifier.mjs`; the latter's Node dependencies were unavailable offline.

## Independent execution — real filesystem and actual frozen package verifier

In **16 individually disposable exact-package copies**, reran the actual `scripts/verify-package.mjs` against the mutated filesystem (never a mocked list). Clean baseline PASSED; **16/16** invalid cases EXIT NONZERO:

| Negative case | Actual result |
|---|---|
| Unlisted `evidence/rogue.txt` | `STOP_CHECKSUM_FILE_SET_DRIFT` |
| Manager exact-row account select-order tamper | `STOP_CONTRACT_REFERENCE_DRIFT` |
| Request/table position reorder | `STOP_CONTRACT_REFERENCE_DRIFT` |
| Duplicate query parameter | `STOP_CONTRACT_REFERENCE_DRIFT` |
| Added unapproved parameter | `STOP_CONTRACT_REFERENCE_DRIFT` |
| Predicate-shape change | `STOP_CONTRACT_REFERENCE_DRIFT` |
| Selected-field order change | `STOP_CONTRACT_REFERENCE_DRIFT` |
| Source modification | checksum mismatch |
| A final bundle modification | A bundle binding failure |
| B final bundle modification | B bundle binding failure |
| Retained TAP modification | checksum mismatch |
| Dependency lock modification | checksum mismatch |
| Missing listed file | `STOP_CHECKSUM_FILE_SET_DRIFT` |
| Stale evidence with refreshed checksum manifest | `STOP_EVIDENCE_MISMATCH` |
| Modified checksum manifest | checksum mismatch |
| Modified evidence hash map | checksum mismatch |

Independently executed frozen dependency-free Node suites: **36/36 PASS** (artifact drift, contract, actual filesystem integration, hash graph). Independently executed frozen `scripts/final-regression-probes.mjs`: clean baseline PASS, **9/9** retained-script negative cases rejected. A full `node --test tests/*.test.mjs` attempt ran 36 passing tests and had two suite-import failures: `@supabase/ssr` unavailable for `tests/sdk.test.mjs`, `yazl` unavailable for `tests/zip-integration.test.mjs`. Separate `npm ci --offline --ignore-scripts` attempt in disposable directory returned `ENOTCACHED` for `yazl`. Thus the **5 SDK suite tests and 4 Node ZIP suite tests were not independently rerun**; 45/45 retained TAP is NOT treated as independent proof. No live network dependency installation was attempted.

## F09 — structural result and private-source limitation

**STRUCTURAL PASS / PRIVATE EXECUTION PROVENANCE UNVERIFIED.** Independently reconstructed all 28 JSON structural descriptors from the final synthetic contract; matched the independently pinned privacy-safe reference and generated descriptors position-for-position; recomputed all 28 receipt SHA-256 digests and parameter counts; compared both executable allowlists in exact order. A positions 1–17, B positions 18–28; Auth GET at 1 and 18; all methods GET; accepted exact-row account projection includes household_id and include_in_net_worth; observed A exact-row/inventory ordering and B inventory ordering preserved in the archive. Changed parameters, multiplicity, predicate shape, positional ordering, table positions, selected-field order or extra requests were independently rejected by the actual verifier. Verified generated A/B allowlists equal copied final distribution allowlists, and own-profile structure digest occurs in its bundle.

The derivation source reads one `FFH026_PRIVATE_ALLOWLIST` input and uses that parsed request sequence for synthetic contract, descriptors, receipt and profile allowlists with separately pinned privacy-safe reference. The original newly supplied private source is **not in this ZIP**; historical private-source file-byte identity, exact input invocation/custody and independent private-input provenance **cannot** be proven from this ZIP. Neither original private identifiers nor original request values are included in this public report.

## F10/F11/F12 — actual final-bundle synthetic execution and security findings

An independent no-network Node browser shim executed the **actual final `dist/A/content.js` and `dist/B/content.js`** with bundled pinned Supabase SDK code, representative synthesized chunked SSR cookie fixtures, synthetic local URL contexts, a local intercepted `fetch` returning synthetic JSON, and disabled WebSocket network access. This is NOT Chromium MV3 proof and does NOT substitute for the dependency-locked `tests/sdk.test.mjs` rerun.

- Clean A: **PASS**, 17/17 synthetic GETs; clean B: **PASS**, 11/11 synthetic GETs. Both first admitted operations were GET `/auth/v1/user` via the source's no-argument `client.auth.getUser()`. The shim detected zero outbound request deviations among executed calls, zero cookie writes.
- Missing synthetic cookie/session: failure receipt, zero intercepted network calls in both profiles.
- Wrong Auth response key, Auth 401 status, wrong content-type, and oversized (>65536-byte) Auth response: failed receipts after one intercepted GET, both profiles.
- Expired-session shim probe: zero intercepted network calls during its bounded observation window, but **no completed receipt**; no expired-session PASS is claimed. SDK-dependency test rerun still required.
- **HIGH / BLOCKING F11-01 — accepted foreign identity/household response:** In a disposable synthetic intercept, return an otherwise shape-valid Auth GET response with the *other synthetic profile's user ID*, leaving method/path/query/count and cookie fixture unchanged. The final A and B bundles nonetheless emit **PASS** after 17/11 GETs. Independently, change only a returned `household_id` field of a one-row household-scoped result to the opposite synthetic profile's household value, leaving the requested fields and row count intact; final A and B again emit **PASS**. Source `src/browser-runner.mjs` validates Auth `id` only as a string and row keys/cardinality without binding user/household values to the cookie-derived/admitted identity. **Reproduction:** load either unmodified final bundle in a network-disabled Node synthetic browser shim with a representative own-profile cookie; intercept local JSON responses; alter only one response identity/household field as described; observe `ffh026-result.status:PASS` and approved GET count unchanged. This proves the synthetic receipt can falsely certify cross-profile/mismatched result identity. It is **not** proof of actual production RLS leakage, but it blocks claiming F11 response validation/profile integrity is fully fail closed.
- **LOW F11-02 — fetch-init allowlist gap:** `assertRequest` checks method, body, URL/query and certain headers, but does not reject unknown `init` keys. The following `nativeFetch(input,{...init,...overrides})` forcibly sets method/redirect/credentials/cache/referrerPolicy but carries through other init keys such as mode, integrity and keepalive. No actual deviation was seen in completed SDK synthetic sequences. Add explicit permitted-key/value validation and direct negative tests as defense in depth; do not infer a live exploit from this source observation.
- **F12 STATIC PASS / DYNAMIC IDENTITY INTEGRITY BLOCKED BY F11-01:** Own-profile generated allowlist and structure digest are present in each final bundle; opposite-profile synthetic identity/household values and opposite-profile descriptor digest are absent from that bundle. This does not prevent accepting a forged opposite-profile *response*.

## F13 — explicitly UNVERIFIED; separate authority gate

Nothing above verifies Chromium MV3 isolated-world execution, real SSR-cookie visibility, browser-managed CORS preflight OPTIONS, DOM/console/log/diagnostic leakage, actual profile/process cleanup, browser/OS egress controls, or a production session. Only a separately Manager-authorized Chromium-capable **offline synthetic** test plan with tightly controlled synthetic profiles, packet-level egress observation and cleanup proof may close offline F13 aspects. Any live authenticated production preflight or production-helper installation needs a **distinct explicit authorization**; neither is authorized here.

## F14 — independent verdict

**PASS on frozen R5 offline package-file closure/evidence hash invariants,** including the two historical F14 bypass regressions, with a separately identified tooling limit on native Node yauzl/yazl ZIP-suite execution. Internal evidence hash equality does not prove historical clean-pipeline invocation or that retained TAP tests truly ran against private input. Clean extracted package, 16 real-filesystem negatives, 9 frozen-script negatives, 36 dependency-free tests and independent ZIP file/CRC/hash checks are direct evidence, not adopted worker/Manager attestations.

## Overall verdict, remedy and custody

**FAIL — REMEDIATION REQUIRED.** R5's frozen archive and F09/F14 repairs may remain preserved as immutable historical evidence, but this reviewer **does not recommend offline F09–F14 full security acceptance or lifting any release gate** because HIGH F11-01 demonstrates an actual frozen-bundle false PASS on mismatched synthetic user/household responses. Manager should route a narrowly scoped **offline synthetic same-task replacement**, not edit the frozen R5 archive: validate Auth identity vs cookie-derived expected identity and relevant household-scoped result IDs/relationships, with documented empty/multi-row cases and positive/negative A/B regression tests; close any fetch-option gap; produce new final source/build/lock/evidence hash graph and immutable ZIP SHA; independently rerun dependency-locked SDK and ZIP suites in provisioned **offline** environment; route fresh independent review of the new target. Keep the absence of private-source-byte provenance explicit; keep F13 UNVERIFIED until separately authorized browser work.

**Strict boundary:** No production helper install, live user session, authenticated production request, SQL, canary/financial mutation, Scenario Lab, deployment, rollback, cleanup, PR merge or Private Beta activation was attempted or authorized. This evidence-only audit branch is separate from draft production PR #68. Only Manager may dispose of the finding or authorize subsequent tasks.
