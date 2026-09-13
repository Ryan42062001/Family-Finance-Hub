# Financial Policy & Scenario Audit — HANDOFF

Task: FFH-013 — Spousal-IRA Shared Compensation Ledger
Process: canonical Workflow V3.1 fresh independent policy/scenario audit
Frozen audit packet: `FFH-013_FROZEN_AUDIT_PACKET_0a8c2f2a.md`
Audit packet ID: `FFH-013-0a8c2f2a-2026-09-13`
Frozen audit target: `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`
Verdict: **FAIL — REMEDIATION REQUIRED**

## Independence / boundary

- Audited only exact frozen financial-behavior target `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`.
- Manager control-plane head `188f9acbf32b9811cf07153b2fe4005cfdcae8a1` was verified separately and was not substituted as the target.
- The Technical & Mathematical Auditor's new verdict was not read or used.
- No production code, Manager lifecycle/task state, FFH-013 closure state, or FFH-017 activation state was changed.

## Policy conclusions

The frozen implementation substantially implements FFH-D006 / FFH-009 correctly:

- scarce MFJ compensation is represented as owner constraints plus one shared compensation group rather than a sorted-owner statutory split;
- higher-compensation owner remains subject to own supported compensation;
- lower/zero-compensation spouse can receive conditional spousal-IRA room;
- actual Traditional + Roth YTD aggregates once;
- scheduled/current-plan contributions remain planning reservations rather than YTD;
- multiple accounts cannot multiply owner/shared capacity;
- missing spouse compensation/YTD/account inventory remains targeted;
- Roth direct eligibility and Traditional deductibility remain separate;
- one-time/Build/Windfall routing consumes the same shared ledger.

## FFH-013-M01

**CLOSED.**

Required `$10,000.01` recurring boundary reconciles exactly:

- Build authority `$833.33/month`;
- routes `$416.67 + $416.66 = $833.33/month`;
- annual legal consumption `$9,999.96`;
- shared remainder `$0.05`;
- account-order reversal preserves the result;
- stable identity assigns only the unavoidable final cent.

## Blocking findings

### FFH-013-P01 — HIGH — owner-only excess does not fail closed for the shared group

When authoritative YTD exceeds one spouse's supported individual/compensation ceiling but combined YTD remains below joint compensation, the frozen evaluator warns on the affected owner yet leaves residual shared compensation actionable for the other spouse.

Example:
- A compensation `$4,000`, A YTD `$5,000`;
- B compensation `$2,000`, B YTD `$0`;
- joint compensation `$6,000`.

Frozen behavior leaves B `$1,000` additional shared IRA room. FFH-D006 / FFH-009 requires zero new room for the affected shared group once an authoritative individual or joint ceiling is exceeded.

The lower-compensation spouse's individual excess is also not independently warned when joint compensation has not itself been exceeded.

### FFH-013-P02 — MEDIUM — conditional maxima are presented as independent-looking known room

The ledger enforces non-additivity, but `build-retirement-account-options` describes each spouse IRA as `$X of known contribution room` without also surfacing the shared MFJ compensation remaining amount/conditional nature.

In a `$10,000 / $0` compensation case the household can therefore see `$7,500` for each spouse without being told in that explanation that both draw from one `$10,000` shared pool. Concrete routing stays safe, but the household-facing legal-capacity explanation does not satisfy FFH-009's conditional-maxima presentation requirement.

## Other scenario results

PASS:
- one-earner and reversed-earner households;
- `$6,000 / $4,000` and equal-compensation semantics;
- ordinary individual-limit exhaustion without existing excess;
- asymmetric/partial YTD and exact joint exhaustion;
- one-cent shared capacity;
- multiple Traditional/Roth accounts for one or both spouses;
- Roth-ineligible routes remaining separate from compensation capacity;
- Traditional partial/nondeductible status remaining separate from contribution capacity;
- missing lower-spouse YTD / no recorded spouse IRA producing targeted information-needed;
- supported joint-compensation excess producing zero shared room plus warning without invented correction mechanics;
- person/account reorder invariance.

FAIL:
- supported owner-only excess fail-closed behavior (P01).

## Preservation

No FFH-013 regression identified in:
- FFH-012 / FFH-028 HSA behavior;
- FFH-015 SIMPLE behavior;
- unrelated 401(k)/workplace opportunities;
- Roth direct eligibility semantics;
- Traditional IRA deductibility semantics.

## CI

Exact candidate Foundation CI:
- run `34732621610`;
- job `103658103064`;
- head `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`;
- AI-state, dependency audit, calculations, security, Type Check, lint, and build all PASS.

No workflow run is attached directly to merge SHA `0a8c2f2a...`. The delta from the green production candidate to the frozen integration target contains control-plane/workflow/CI/handoff files only and no later FFH-013 financial production-code change.

Green CI does not clear P01/P02 because those policy scenarios are not covered by the passing suite.

## Auditor evidence

Detailed report:
`.ai/audit/policy/FFH-013_POLICY_SCENARIO_AUDIT_0a8c2f2a.md`

Report commit:
`1a1c8a8d2ae686998f453d24145407feb8767580`

## Manager disposition

FFH-013 does not satisfy the frozen Financial Policy & Scenario audit gate while FFH-013-P01 remains open. Manager alone owns remediation routing, FFH-013 closure, and FFH-017 activation.