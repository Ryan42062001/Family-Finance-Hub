# FFH-013 — Financial Policy & Scenario Audit

Date: 2026-09-13
Role: Financial Policy & Scenario Auditor
Process: canonical Workflow V3.1
Execution mode: STANDARD_CHAT
Frozen audit packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_0a8c2f2a.md`
Audit packet ID: `FFH-013-0a8c2f2a-2026-09-13`
Frozen audit target: `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`
Final verdict: **FAIL — REMEDIATION REQUIRED**

## Independence / boundary

This is a fresh independent financial-policy and household-scenario audit of exact frozen integration SHA `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`.

Manager control-plane head `188f9acbf32b9811cf07153b2fe4005cfdcae8a1` was verified separately and was not substituted as the behavior target. The Technical & Mathematical Auditor's new verdict was not read or used.

No production behavior, Manager task state, FFH-013 closure state, or FFH-017 activation state was modified.

## Accepted authority inspected

Repository-accepted authority only:

- FFH-D006 — MFJ spousal-IRA scarce-compensation capacity.
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`.
- `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md` R6 evidence based on IRS Publication 590-A and 2026 IRA limits.
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`.
- accepted FFH-015 SIMPLE and FFH-012/FFH-028 HSA behavior only for preservation review.

No new external rule was needed and no accepted FFH-009 policy was rewritten.

## Core implementation conclusion

The frozen implementation substantially replaces the prior sorted-owner legal-capacity split with the approved feasible-set structure:

- one age-appropriate combined Traditional + Roth IRA limit per owner;
- higher-compensation spouse constrained by own supported compensation;
- lower-compensation spouse may expose conditional spousal-IRA room;
- one shared MFJ-compensation group when joint compensation is scarce;
- actual Traditional + Roth YTD aggregated per owner and deducted from owner/shared room;
- multiple IRA accounts constrained by one owner group and one shared group;
- Roth direct eligibility and Traditional deductibility evaluated separately from compensation capacity;
- missing material spouse compensation/YTD/account inventory remains targeted information-needed;
- concrete one-time/Build/Windfall routing consumes the shared ledger.

However, two policy defects remain at the frozen target. One is HIGH and blocking.

## Household/scenario evaluation

### PASS — one-earner / reverse-earner / scarce compensation

For `$10,000 / $0` compensation with zero YTD, each spouse can expose a `$7,500` conditional maximum while the shared MFJ compensation group remains `$10,000`. Reversing which spouse earns the compensation does not create owner-ID legal priority.

For `$6,000 / $4,000`, the higher-compensation spouse is capped at `$6,000`, the lower spouse may expose a `$7,500` conditional maximum, and both consume the same `$10,000` shared pool.

### PASS — equal compensation

Equal compensation does not manufacture a lower-compensation spouse. Each owner is limited by that owner's own supported compensation and individual IRA limit.

### PASS — YTD and multiple accounts

Actual Traditional + Roth IRA YTD is aggregated by owner once before additional room is computed. Shared remaining room subtracts both spouses' actual YTD once. Owner groups and the MFJ group prevent multiple Traditional/Roth account records from multiplying capacity.

Scheduled/current-plan contributions are planning reservations against a cloned capacity ledger rather than additions to authoritative YTD. They remain distinct from already-contributed facts.

### PASS — missing information / locality

When scarce MFJ compensation could bind, missing spouse compensation, missing aggregate spouse IRA YTD, missing spouse account inventory, or unresolved owner facts produce targeted `more_information_needed`. Absence of a recorded spouse IRA is not treated as proof of zero YTD.

IRA-specific uncertainty does not globally disable unrelated HSA, SIMPLE, workplace-retirement, debt, or goal evaluation.

### PASS — Roth eligibility / Traditional deductibility separation

Roth direct eligibility is intersected with combined IRA/shared-compensation room; available shared compensation is not automatically represented as direct Roth room. Traditional IRA contribution eligibility and deductibility remain separate, including partial/nondeductible cases.

### PASS — equal fulfillment and FFH-013-M01

FFH-013-M01 is **CLOSED**.

At the required `$10,000.01` adversarial shared pool:

- Build recurring authority: `$833.33/month`;
- routed accounts: `$416.67 + $416.66 = $833.33/month` exactly;
- annual legal consumption: `$5,000.04 + $4,999.92 = $9,999.96`;
- shared annual remainder: `$0.05`;
- account-order reversal preserves the same material result;
- stable identity assigns only the unavoidable final recurring cent.

This is deterministic product routing, not a statutory spouse-priority rule.

## Finding FFH-013-P01 — HIGH — owner-only excess does not fail closed for the shared group

**Classification: HIGH / BLOCKING.**

FFH-D006 / FFH-009 requires that when authoritative YTD exceeds a supported **individual or joint** compensation ceiling, additional room for the affected shared group becomes zero and the product surfaces a possible-excess warning without inventing correction mechanics.

The frozen evaluator only zeroes the MFJ shared pool when **combined YTD exceeds joint compensation**. When the higher-compensation spouse exceeds that spouse's supported owner ceiling but combined YTD remains below joint compensation, it emits an owner warning but leaves the residual shared pool actionable for the other spouse.

Adversarial example derived directly from frozen code:

- A supported IRA compensation: `$4,000`;
- B supported IRA compensation: `$2,000`;
- joint supported compensation: `$6,000`;
- A actual IRA YTD: `$5,000`;
- B actual IRA YTD: `$0`.

Frozen behavior:

- A owner ceiling = `$4,000` and A additional room = `$0`;
- owner-excess warning is emitted for A;
- combined YTD = `$5,000`, so shared remaining is still computed as `$1,000`;
- B retains `$1,000` of actionable additional IRA room and the shared ledger can route it.

Accepted policy requires zero new room for the affected shared group once the supported individual ceiling is already exceeded.

The defect is broader for the lower-compensation spouse: if that spouse's YTD alone exceeds the spouse's individual IRA dollar limit while combined YTD remains below joint compensation, the code clamps that owner's own room to zero but does not emit the required individual-excess warning and can leave additional shared room available to the other spouse.

The existing focused excess regression does not cover owner-only excess in isolation; its fixture exceeds joint compensation at the same time, so the joint-excess path masks this gap.

**Household impact:** the engine can recommend a new IRA contribution from the same shared MFJ compensation group after authoritative facts already establish an individual excess condition that FFH-D006 explicitly requires to fail closed. This violates the approved conservative household-safety rule.

**Required remediation behavior:** detect supported owner-level IRA excess for either spouse, emit the approved possible-excess warning, and expose zero additional room for the affected shared MFJ group without inventing withdrawal, penalty, earnings, recharacterization, or filing advice.

## Finding FFH-013-P02 — MEDIUM — conditional owner maxima are presented as independent-looking "known contribution room"

**Classification: MEDIUM / BLOCKING POLICY PRESENTATION.**

The ledger correctly treats owner maxima as conditional, but the household-facing `build-retirement-account-options` recommendation summarizes each available IRA independently as:

`<account>: $X of known 2026 contribution room`

and does not state that spouse IRA amounts in an `ira:mfj-compensation:*` group are conditional maxima drawing from one shared MFJ compensation pool.

For the canonical `$10,000 / $0` case, the recommendation can therefore show both spouse destinations as `$7,500` of "known contribution room" without also stating that household shared compensation remaining is only `$10,000`.

FFH-009 specifically requires conditional owner room to be exposed together with the shared compensation constraint so a household is not led to treat `$7,500 + $7,500` as `$15,000` of independent legal room.

Concrete routing remains capped, so this is not an over-routing defect. It is still a material legal-capacity explanation/presentation mismatch and should be remediated before FFH-013 closure.

## Other requested scenario conclusions

- Joint compensation below combined individual IRA limits: represented through one shared group — PASS except P01 excess fail-closed boundary.
- One spouse already at individual limit: ordinary non-excess exact-limit room correctly reaches zero for that spouse; remaining shared capacity can support the other spouse when no excess exists — PASS.
- Asymmetric and partial YTD: narrows owner/shared room exactly once — PASS.
- Exact joint-compensation exhaustion: zero additional shared room — PASS.
- One-cent remaining capacity: conserved — PASS.
- Multiple Traditional/Roth accounts for one or both spouses: owner/shared groups prevent capacity multiplication — PASS.
- Roth-ineligible destination with otherwise available compensation: Roth route remains unavailable; shared compensation does not override MAGI eligibility — PASS.
- Traditional partially deductible/nondeductible destination: legal contribution capacity remains separate from deductibility — PASS.
- Missing lower-spouse YTD/no recorded spouse IRA: targeted information-needed rather than inferred zero — PASS.
- Supported joint-compensation excess: shared room zero plus warning, without invented correction mechanics — PASS.
- Supported individual excess: **FAIL — P01**.
- Person/account reorder: material legal results remain order-invariant; final-cent stable identity is limited to exact tie resolution — PASS.

## Preservation review

FFH-013 did not change HSA legal-capacity code or SIMPLE statutory/category code. The changed retirement evaluator preserves separate HSA and workplace/SIMPLE branches, and full candidate CI passed their accepted regressions.

Conclusion:

- accepted FFH-012 / FFH-028 HSA behavior: preserved;
- accepted FFH-015 SIMPLE behavior: preserved;
- unrelated 401(k)/workplace opportunities: preserved;
- Roth direct-eligibility semantics: preserved;
- Traditional IRA deductibility semantics: preserved, including symmetric spouse lookup for MFJ.

## CI attribution

Exact candidate Foundation CI:

- run `34732621610`;
- job `103658103064`;
- exact head `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`;
- AI-state validation PASS;
- dependency audit PASS;
- calculations PASS;
- security PASS;
- Type Check PASS;
- lint PASS;
- build PASS.

No workflow run is attached directly to integration SHA `0a8c2f2a...`. Repository comparison proves that the delta from the green production SHA to the integration target contains control-plane/workflow/CI-configuration/handoff files only and no later FFH-013 financial production-code change.

No new CI failure identity was identified and no inherited CI debt is registered. Passing CI does not negate P01/P02 because the missing owner-only-excess and conditional-room presentation cases are policy/scenario gaps rather than failing covered tests.

## Final disposition

- Shared-compensation feasible-set architecture: substantially correct.
- Owner conditional maxima: mathematically enforced by ledger, but household presentation is incomplete/misleading (P02).
- YTD versus planning reservations: correctly separated.
- Missing-information locality: correct.
- Supported excess handling: **not policy-complete (P01)**.
- Roth eligibility: preserved and separate.
- Traditional deductibility: preserved and separate.
- Equal-fulfillment/statutory priority: correct; stable identity only resolves unavoidable final cent.
- FFH-013-M01: **CLOSED**.
- HSA/SIMPLE/workplace preservation: PASS.

Because HIGH finding FFH-013-P01 remains open, FFH-013 does not satisfy its frozen financial-policy/household-scenario audit gate.

**Final verdict: FAIL — REMEDIATION REQUIRED.**

Manager alone owns remediation routing, FFH-013 closure, and FFH-017 activation.