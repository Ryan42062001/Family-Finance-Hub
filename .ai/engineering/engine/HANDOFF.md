# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-013
Remediation: FFH-013-M01 — recurring equal-fulfillment cent reconciliation
Role: Core Financial Engine Engineer
Worker status: REMEDIATION COMPLETE — READY_FOR_MANAGER RE-REVIEW
Execution mode: STANDARD_CHAT
Manager control-plane head verified and synchronized: `8f8c8d449e17d169d608d01a62676d340b9afc4a`
Approved audited production integration base retained from FFH-013: `b5111010ebc1f104709a4b27f8c79daef555f435`
Current milestone target: `phase-5-money-priority-engine`
Branch: `ffh/ffh-013-spousal-ira-ledger`
Pull request: #21 (draft)
PRODUCTION_SHA: `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`
VALIDATED_CI: Foundation CI run `34732621610`, verify job `103658103064` — SUCCESS on exact production/test candidate
HANDOFF_SHA: recorded in the FFH-013 task checkpoint from the commit containing this remediation handoff

## FFH-013-M01 exact reproduction

The Manager-reproduced reachable case was retained as the adversarial boundary:
- shared MFJ compensation remaining: `$10,000.01`;
- each spouse owner-conditional room: `$7,500.00`;
- old routable-capacity prepass consumed destinations sequentially and derived `$625.00 + $208.33 = $833.33/month`;
- Build therefore authorized `$833.33/month` of retirement routing;
- actual equal-fulfillment routing converted that request to `roundMoney($833.33 * 12) = $9,999.96` annually, split it `$4,999.98 / $4,999.98`, then independently rounded each route to `$416.67/month`;
- account-level monthly routes therefore summed to `$833.34/month`, one cent above the authoritative Build retirement request;
- the subtraction/clamp path hid the mismatch by clamping the remaining routing amount to zero.

Annual statutory capacity was still bounded, but recurring account routes and the Build request failed the exact routing/accounting invariant.

## Root cause

The routable-capacity prepass and actual equal-owner router reconciled in different monetary domains. The prepass sequentially consumed annual capacity and rounded each result to monthly dollars; the actual router split an annual request first and then independently rounded each account to monthly dollars. Those operations are not cent-conserving at recurring equal-fulfillment boundaries.

## Bounded remediation

Build equal-owner tie planning and actual tied routing now use the same deterministic recurring-monthly-cent reconciliation method:
- the authoritative recurring request is converted to integer monthly cents;
- equal-owner fulfillment allocates those cents deterministically;
- stable sorted account identity is used only for an unavoidable odd final recurring cent;
- each route consumes annual legal capacity as exactly `allocatedMonthlyCents * 12`;
- the routable-capacity prepass uses the same monthly-cent allocator as actual routing;
- no epsilon/tolerance was introduced;
- the existing routing invariant was not weakened;
- legal capacity was not reverted to sorted-owner preallocation.

## Before / after cent math

Before:
- Build retirement request: `$833.33/month`;
- routes: `$416.67 + $416.67 = $833.34/month`;
- recurring over-route: `$0.01/month`.

After:
- Build retirement request: `83,333` cents = `$833.33/month`;
- `ira-a`: `41,667` cents = `$416.67/month` = `$5,000.04/year`;
- `ira-b`: `41,666` cents = `$416.66/month` = `$4,999.92/year`;
- route sum: `$833.33/month` exactly;
- annual routed total: `$9,999.96`;
- shared legal pool remaining: `$10,000.01 - $9,999.96 = $0.05`;
- retirement-capacity invariant holds.

Reversing the IRA account input order produces the same account allocations, so stable identity affects only the unavoidable final cent and input order does not affect the result.

## Exact FFH-013-M01 changed files

Production/test remediation only:
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`

Control-plane synchronization/documentation on the worker branch is separate from the bounded behavioral change.

## Direct adversarial Build regression

`FFH-013-M01 Build recurring routes reconcile exactly at the $10,000.01 shared-pool boundary` passes and proves:
- retirement Build `allocatedMonthlyAmount === 833.33`;
- sum of `retirementAccountAllocations[].allocatedMonthlyAmount === 833.33` exactly;
- routes are `$416.67` and `$416.66` monthly;
- annual legal consumption is `$5,000.04 + $4,999.92 = $9,999.96`;
- shared remaining room is `$0.05`;
- capacity invariant holds;
- account-order reversal leaves the routed result unchanged.

## Validation

Exact Foundation CI on `PRODUCTION_SHA` `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`:
- run `34732621610`;
- verify job `103658103064`;
- Validate AI control-plane state: PASS;
- Audit production dependencies: PASS;
- full calculations / `npm test`: PASS, including FFH-013 shared-compensation/YTD, multiple-IRA, missing-information, owner/account reorder, exact-cent, Roth eligibility, Traditional deductibility, FFH-015 SIMPLE, and FFH-012/028 HSA regressions;
- security policy contract: PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- workflow conclusion: SUCCESS.

The workflow is configured to run only for pull requests targeting `main`, so PR #21 was temporarily retargeted to `main` solely to obtain exact candidate CI and is restored to `phase-5-money-priority-engine` for Manager review. No merge was performed.

## Policy / scope preservation

Unchanged by FFH-013-M01:
- annual shared MFJ legal-capacity semantics and exact statutory conservation;
- owner-conditional IRA maxima and shared compensation ledger architecture;
- Roth IRA eligibility behavior;
- Traditional IRA deductibility behavior;
- FFH-015 SIMPLE policy/implementation;
- FFH-012/FFH-028 HSA policy/implementation;
- schema/UI;
- Supabase/live database;
- FFH-017 / Phase 5C.

No forbidden-domain behavior changed. Manager retains lifecycle authority for acceptance, merge/integration, independent audit routing, closure, and FFH-017 activation. PR #21 remains draft and unmerged.

Exact next action: Manager independently verifies FFH-013-M01 against PR #21 and the exact CI evidence above, then decides re-acceptance/integration and audit routing.
