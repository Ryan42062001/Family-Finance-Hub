# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-013
Role: Core Financial Engine Engineer
Worker status: FFH-013-M02 REMEDIATION COMPLETE — READY_FOR_MANAGER
Task state retained: REMEDIATION pending Manager verification, integration, and fresh frozen dual re-audit
Execution mode: STANDARD_CHAT
Manager control-plane head verified and synchronized: `de2034b67e894910591922c1de2e021255c7a7fc`
Branch: `ffh/ffh-013-audit-remediation`
Pull request: #23 (draft, open, unmerged)
Prior PR head before M02: `0fdb57bebb7f77dd6eaaabd0fb9375432a58355c`
Prior production candidate: `0dd0a7891afa3e6e5f3f7da29497d8afb527938c`
PRODUCTION_SHA: `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`
VALIDATED_CI: Foundation CI run `34737929168`, verify job `103672520594` — SUCCESS on the exact production/test candidate
HANDOFF_SHA: documentation commit containing this file

## FFH-013-M02 before behavior

Accepted FFH-009 / FFH-D006 policy says equal-compensation spouses do not enter the lower-compensation spousal-IRA enhancement/shared feasible set. Each spouse independently uses `max(0, min(L_i, C_i) - Y_i)`.

Before M02 remediation, PR #23 calculated `ownerExcesses` after YTD and treated any nonempty owner-excess set as sufficient to create/fail closed the MFJ shared compensation group. For equal compensation `$10,000/$10,000`, both under age 50 with `$7,500` individual IRA limits and YTD `$8,000/$0`, owner A correctly had zero owner room but `ownerExcesses=[A]` also forced shared remaining to `$0` and attached that zero shared group to both spouses. Spouse B's independently supported `$7,500` room was therefore incorrectly reduced to `$0`.

## Root cause

The post-YTD excess path did not distinguish the accepted legal scopes:
- unequal compensation, where one spouse is lower-compensation and FFH-D006's shared MFJ spousal feasible set applies; versus
- equal compensation, where neither spouse receives a spousal enhancement and owner limits remain independent.

`ownerExcesses.length > 0` and `jointExcess` were being used as unconditional shared-group materiality/fail-closed signals even when `higher === null` proved there was no spousal shared feasible set.

## M02 correction

The evaluator now derives `sharedSpousalFeasibleSetApplies = higher !== null` and gates all MFJ shared-group materiality/fail-closed creation through that accepted unequal-compensation condition.

Equal compensation now behaves owner-locally:
- owner-only excess still clamps that owner's additional room to zero through the owner ceiling;
- the warning remains owner-specific and explicitly says additional room for this owner is zero;
- no `ira:mfj-compensation:*` group is created solely because of that owner excess;
- the unaffected spouse retains independently supported room;
- no correction mechanics are invented.

Unequal compensation is intentionally unchanged in legal effect: applicable owner/joint excess still fails the affected shared MFJ group closed, preserving accepted A03/A04 behavior.

## Direct M02 evidence

Dedicated regressions in `lib/calculations/ffh-013-m02-equal-compensation-excess.test.ts` pass in the exact full calculation CI suite:
- `$10,000/$10,000` compensation, A YTD `$8,000`, B YTD `$0`: A room `$0`, B room `$7,500`; capacity groups remain owner-local (`ira:a`, `ira:b`); A receives the owner-excess warning; no MFJ shared group is created.
- Reversed excess, A YTD `$0`, B YTD `$8,000`: A retains `$7,500`, B room is `$0`, with B's owner-local warning.
- Reversing person input order preserves both owner-specific result sets.
- Reversing IRA account input order preserves both owner-specific result sets.
- Unequal-compensation A04 pin remains: `$4,000/$2,000` compensation with `$5,000/$0` YTD produces `$0/$0`, retains the shared MFJ group, and retains the affected-shared-group warning.

## A01–A05 and M01 preservation

The pre-existing FFH-013 adversarial suite remains green under the exact candidate:
- A01 annual tied equal fulfillment remains shared-cap aware before allocation and cent-exact.
- A02 scheduled/current-plan IRA reservations remain planning-ledger reservations distinct from authoritative YTD.
- A03 unequal-compensation post-YTD materiality remains shared-feasible-set aware.
- A04 unequal-compensation owner/joint supported excess remains fail closed for the affected shared group.
- A05 household-facing owner maxima remain explicitly conditional/non-additive where a shared MFJ group exists.
- M01 remains exact: `$416.67 + $416.66 = $833.33/month`; annual legal consumption `$9,999.96`; shared annual remainder `$0.05`.

Roth direct eligibility, Traditional IRA deductibility, FFH-015 SIMPLE, FFH-012/028 HSA, unrelated workplace retirement, multiple-account non-multiplication, scheduled-vs-YTD semantics, Existing Cash / Secure / Build / Windfall conservation, exact-cent reconciliation, and owner/input-order invariance remain covered by the full calculation suite and passed on the exact candidate.

## Exact changed files for this M02 remediation

Behavioral/test change only:
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/ffh-013-m02-equal-compensation-excess.test.ts`

Control-plane synchronization to Manager head `de2034b67e894910591922c1de2e021255c7a7fc` without product-semantic changes:
- `.ai/tasks/FFH-013.md`
- `.ai/tasks/TASK_INDEX.md`

Worker evidence update:
- `.ai/engineering/engine/HANDOFF.md`

The control-plane sync was also recorded as a no-content merge-parent checkpoint so PR #23 is genuinely based on the current milestone head rather than merely carrying copied file contents. Against the current milestone base, the synchronized task/index files therefore do not expand the PR diff.

## Validation

Exact Foundation CI for `PRODUCTION_SHA` `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`:
- run `34737929168`
- verify job `103672520594`
- Validate AI control-plane state — PASS
- Audit production dependencies — PASS
- Test calculations — PASS, including the five dedicated M02 regressions and the complete existing FFH-013/A01–A05/M01 suite
- Test security policy contract — PASS
- Type check — PASS
- Lint — PASS
- Build — PASS

The full calculation gate also exercises Existing Cash, Secure/retirement-floor, Build, Windfall, Roth eligibility, Traditional deductibility, FFH-015 SIMPLE, FFH-012/028 HSA, and workplace-retirement regressions. No inherited CI failure is being claimed.

## Scope / authority confirmation

No financial policy was changed. No A01–A05 redesign was performed. M01 was not reopened. No FFH-017, schema/UI, HSA policy, SIMPLE policy, Supabase, or live-database work was performed. PR #23 remains unmerged. The worker has not self-accepted or closed FFH-013. Manager retains acceptance, integration, fresh dual-audit routing, closure, and FFH-017 activation authority.

Exact next action: Manager independently verifies M02 and the preserved A01–A05/M01 behavior at `PRODUCTION_SHA` `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`, reviews PR #23 and this final handoff, then decides acceptance/integration and freezes one new target for Technical and Policy re-audit.
