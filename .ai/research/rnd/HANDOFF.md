# Product & Technical R&D Handoff

HANDOFF

Task ID: FFH-034

Role: Product & Technical R&D Engineer

Status: READY_FOR_MANAGER

## Result

FFH-034 bounded CI/control-plane implementation is complete on PR #37 and remains unmerged.

Manager authorization baseline: `ef461fe977ad83cbeefe885b7da50351e58d586f`

Validated production checkpoint: `608332429c2dcf4e7689f3260aaa6b5d852b9dd5`

Implementation PR: `#37 — FFH-034: Foundation CI documentation fast path and evidence`

Production scope:
- `.github/workflows/ci.yml`
- `scripts/ci-change-mode.mjs`
- `scripts/ci-change-mode.test.mjs`

Control-plane evidence:
- `.ai/tasks/FFH-034.md`
- `.ai/research/rnd/HANDOFF.md`

No package/lock, financial/application, Supabase/migration/live-data, or Phase-6 files changed.

## Implemented architecture

- Preserves workflow name `Foundation CI` and job id `verify`.
- `verify` is always created; no workflow-level path suppression is used.
- A dependency-free Node classifier uses `git diff --no-renames --name-status`.
- DOCS_ONLY is limited to root Markdown, `.ai/**/*.md`, and `docs/**/*.md`.
- Mixed, non-doc, malformed, empty, unsupported-status, classifier-error, invalid-SHA, and manual-dispatch cases fail closed to FULL.
- Non-doc to docs renames are exposed as delete + add and therefore classify FULL.
- Classifier tests and classification are observable even on failure; a final enforcement step prevents `continue-on-error` from weakening the job result.
- AI-state validation runs on both FULL and DOCS_ONLY paths.
- FULL preserves install -> AI state -> dependency audit -> calculations -> security -> typecheck -> lint -> build.
- Evidence records event, PR, base/head/tested SHA, run/job, mode/reason, changed paths, stage outcomes, and full validation logs.
- Evidence is uploaded with `actions/upload-artifact@v4`, `if: always()`, 14-day retention.
- Because the repository is public, Foundation CI now uses ephemeral GitHub-hosted `windows-latest` with Node 22 and `contents: read`, not the persistent self-hosted runner.

## Direct classifier proof

21/21 classifier tests PASS, covering allowed Markdown, disallowed workflow/package/script/source/test/Supabase changes, mixed changes, non-doc deletion, non-doc-to-docs rename, malformed/unknown status, empty evidence, classifier error, manual dispatch, invalid SHA, path traversal, malformed paths, and Windows path separators.

## Authoritative FULL validation

Foundation CI #708:
- run `35405979356`
- job `105795707397`
- job name `verify`
- conclusion **SUCCESS**
- PR head `608332429c2dcf4e7689f3260aaa6b5d852b9dd5`
- actual tested SHA `bec8b9be648eb89d2367aef3f7eeaa321b553354`
- classification **FULL**
- reason `non-doc-change:M:.github/workflows/ci.yml`

Validation:
- classifier tests 21/21 PASS
- AI-state PASS; 24 task files index-consistent
- production dependency audit: 0 vulnerabilities
- calculations 919/919 PASS
- security 21/21 PASS
- typecheck PASS
- lint PASS
- build PASS
- final guardrail enforcement PASS

Durable artifact:
- id `10572591193`
- name `foundation-ci-evidence-35405979356-1`
- size 40,734 bytes
- digest `sha256:66d25fe46553d73316315208198aa49e7e02ab4166c72267c858cc62734cfe38`
- expires 2026-10-02

Artifact includes `run-context.txt`, `classification.json`, `changed-paths.tsv`, `stage-outcomes.tsv`, classifier-test log, install log, AI-state log, dependency-audit log, calculations log, security log, typecheck log, lint log, and build log.

## Validation defects found and closed

Run #705 succeeded functionally but exposed two evidence defects: checkout removed evidence initialized too early, and PowerShell nested arrays flattened the stage-outcome table. Both were repaired.

Run #706 then failed closed because the new Windows-path regression fixture was over-escaped. The fixture was corrected.

Run #708 is the first fully clean acceptance candidate and supersedes #705/#706.

## Remaining Manager gates

Manager must independently review before merging.

If accepted:
1. integrate PR #37;
2. require exact integration FULL CI;
3. create a disposable Markdown-only proof PR from the integrated milestone;
4. prove the same `Foundation CI / verify` succeeds in DOCS_ONLY mode;
5. prove classifier tests + AI-state + evidence upload run while expensive stages are skipped;
6. close the disposable proof PR;
7. activate the bounded public-repository required-`verify` ruleset for `main` and `phase-5-money-priority-engine`;
8. verify ruleset state;
9. freeze the integrated workflow target;
10. route one fresh independent Technical/Workflow audit.

FFH-020, FFH-016, PR #5 merge readiness, financial semantics, Supabase/live data, and Phase 6 are unchanged.

## Next Activation

| Order | Employee / Role | Status | Copy/paste activation prompt |
|---:|---|---|---|
| 1 | Manager / Architect | RECOMMEND TO MANAGER | Review FFH-034 PR #37 from production checkpoint `608332429c2dcf4e7689f3260aaa6b5d852b9dd5` and authoritative FULL Foundation CI #708 / run `35405979356` / job `105795707397`. Independently reconcile scope, fail-closed classifier behavior, public-runner hardening, artifact evidence, and preserved gates. If accepted, integrate and execute the required integration/DOCS_ONLY/ruleset/fresh-audit sequence from `.ai/tasks/FFH-034.md`. |
| 2 | Retirement & Tax-Advantaged Policy Analyst | IDLE | — |
| 3 | Debt & Liquidity Policy Analyst | IDLE | — |
| 4 | Goals, Cash Flow & Allocation Policy Analyst | IDLE | — |
| 5 | Core Financial Engine Engineer | IDLE | — |
| 6 | Application, Data & Integration Engineer | BLOCKED | FFH-020 remains blocked on secure Supabase CLI/auth/protected-backup execution; FFH-016 remains blocked behind Manager-accepted FFH-020. |
| 7 | Regulatory & Financial Research Analyst | IDLE | — |
| 8 | Product & Technical R&D Engineer | WAIT | FFH-034 implementation complete; wait for Manager review. |
| 9 | Technical & Mathematical Auditor | WAIT | Fresh FFH-034 Technical/Workflow audit only after Manager integration + live DOCS_ONLY proof + required-check ruleset activation. |
| 10 | Financial Policy & Scenario Auditor | WAIT | No FFH-034 policy audit required; final integrated Phase-5 policy audit remains downstream of FFH-020/FFH-016. |
| 11 | Work Helper / Super Troubleshooter | IDLE | — |
