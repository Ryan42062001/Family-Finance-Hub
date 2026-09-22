# Evidence Artifact Handoff & Intake — Manager/Worker Checklist

**Status:** Draft operational template; documentation-only.  
**Applies with:** `.ai/shared/WORKFLOW_V3_1.md`, `.ai/shared/WORKFLOW_V3.md`, `.ai/shared/WORKFLOW.md`.  
**Authority:** This checklist illustrates existing evidence, custody, validation and separation-of-duties requirements. It does not amend canonical workflow, task lifecycle, security policy, financial rules, audit thresholds, branch/merge authority, or any release gate. Where task or workflow requirements differ, those governing requirements control.

## Why this template exists

An artifact can have a filename, a worker-reported SHA-256, and a handoff document without its **actual bytes** being accessible in a separate Manager or Auditor chat. Equally, an offline negative test can report a *passing test assertion* while demonstrating the *product's unsafe behavior*. This checklist keeps artifact delivery, independent verification and security disposition separate.

## 1. Sender's private handoff receipt (complete before asking for review)

| Field | Fill with verified fact or `UNAVAILABLE` |
|---|---|
| Task / producing role / receiving role | |
| Original artifact filename and kind (ZIP / report / checksum sidecar) | |
| Exact producing branch and commit SHA, if repository-backed | |
| Local exact-byte SHA-256 and byte length of delivered artifact | |
| Artifact classification and private-data handling restrictions | |
| Delivery method: actual attachment to receiving chat / accessible private connector file / other | |
| Can receiver directly access the artifact bytes? `YES / NO / NOT YET VERIFIED` | |
| Separate private source/handoff files required, and how each is actually delivered | |
| Expected internal inventory and checksum/evidence-map exclusions | |
| Build/source provenance: genuine clean source build / retained or patched bundle / evidence-only | |
| Locked dependencies and exact suites that DID / DID NOT run | |
| Positive path results (e.g., all approved operations completed), separately from negative-case tests | |
| Negative case: test harness result AND actual product/runner result | |
| Known false-PASS, incomplete proof, or unresolved constraint | |
| Frozen predecessor artifact and protected PRs/branches that MUST NOT change | |
| Proposed *next* review gate; explicit non-authorizations | |

**Delivery is not completed by providing only a filename, a hash, a ZIP nested inside an inaccessible file, or a link whose exact bytes the receiver cannot obtain.** If the receiver cannot access the target, report `INTAKE BLOCKED` and make the exact bytes available through an approved private attachment or connector; do not create a surrogate archive, infer its contents, or instruct the recipient to verify an unseen file. A `sandbox:/...` download link should be provided only after the exact path exists in the current runtime.

## 2. Receiver's independent intake receipt

| Check | Record |
|---|---|
| Artifact bytes accessible from THIS receiving lane? | `YES / NO` |
| Exact path or private-file reference that was opened | |
| Independently computed SHA-256 and byte count vs sender's claim | `MATCH / MISMATCH / NOT RUN` |
| Archive CRC, path traversal, duplicate/case-collision, unsafe entry checks | `PASS / FAIL / NOT RUN` |
| Independently enumerated ZIP and extracted file sets | actual counts; equality result |
| Manifest file-set equality and every listed SHA-256 | actual counts; exclusions; result |
| Evidence hash-map file-set equality, acyclic provenance, final source/build/lock/test binding | actual counts; exclusions; result |
| Tests independently rerun on exact final package | commands, counts, outcomes |
| Tests merely retained/reported by sender | names and counts; NOT independently reproduced |
| Provenance and privacy caveats | |
| Decision and exact next owner/gate | |

If any target cannot be opened, **do not call it verified or accepted**. A valid SHA-256 comparison establishes byte identity of an accessible archive, not security correctness, source provenance, replayed test execution or permission to release. A file card or historical filename does not imply the same bytes exist in a new chat's local filesystem.

## 3. Test outcomes: separate harness PASS from system behavior

For every safety-negative/adversarial case, record **both**:

- Test assertion: `PASS / FAIL / NOT RUN`.
- Observed system behavior: `REJECTED / STOP / ACCEPTED / TERMINAL PASS / NO RECEIPT / NOT OBSERVED`; include request count/side effects and precise exit/error where applicable.

A harness `PASS` that correctly demonstrates an unapproved request, foreign identity, arbitrary inventory ID, or other invalid input reaching terminal product `PASS` is **a confirmed security blocker**, not remediation success. Likewise, a valid ordinary positive path that fails closed may demonstrate containment but **does not** satisfy an acceptance gate requiring the legitimate path to complete.

Use explicit categories: `EVIDENCE ONLY`, `DIAGNOSTIC`, `PROVISIONAL`, `READY FOR MANAGER REVIEW`, `MANAGER ACCEPTED FOR AUDIT`, `INDEPENDENT AUDIT PASS/FAIL`. These are descriptive receipt labels, **not replacement canonical task states or authorization**. Never equate retained TAP, green CI, internally consistent hashes, or prior Manager acceptance with fresh independent verification.

## 4. Prerequisite blockers versus implementation failures

When source custody, exact locked package integrity, toolchain, authorized test environment, or independent fixture/oracle completeness is missing:

1. Identify the **exact missing item**, the authorized owner, and the next lawful way to provide it.
2. Record commands/errors where they exist; distinguish observed failures from sender-reported outcomes.
3. Preserve last frozen target and protected PR custody; do not silently rebuild from old bundles or use substituted dependencies while claiming a clean source build.
4. Separate a **closed-world synthetic fixture-relative assertion** from any claim about live ownership, globally complete membership, or production isolation. If the required independent source/snapshot relationship proof is absent, mark the relationship `UNVERIFIED`.
5. Return any protected contract ambiguity to Manager for a separate decision; workers do not add requests, change projections, alter financial/security semantics, self-accept, or self-authorize production.

## 5. Manager closeout and routing

Summarize the exact artifact hash, independently reproduced checks, unreproduced claims, issue severity and required evidence. Record accepted/rejected disposition **only** at the applicable authorized gate. If audit/production remains blocked, say so explicitly. For a meaningful employee handoff, end with the canonical Workflow V3.1 **complete 11-role Next Activation table**, with only Manager-verified, dependency-safe activations and no duplicate execution lane; safe parallel activations remain permitted under Workflow V3.1.

**FFH-026 example only:** Frozen R5 remains immutable; R9 evidence-only is not a rebuilt F11 fix; the 28-request contract, F13 `UNVERIFIED`, separate PR #68/#77 custody and production/release holds are not modified by this template.
