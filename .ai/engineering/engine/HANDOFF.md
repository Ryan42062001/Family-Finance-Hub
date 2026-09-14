# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-013
Role: Core Financial Engine Engineer
Worker status: FINAL T1/P03 REMEDIATION COMPLETE — READY_FOR_MANAGER
Task state retained: REMEDIATION pending Manager verification, integration, freeze, and fresh dual re-audit
Execution mode: STANDARD_CHAT
Current milestone / PR base: `phase-5-money-priority-engine` @ `57bda3e0bf7fdf750f5397314de681ecefd709c3`
Branch: `ffh/ffh-013-final-audit-remediation`
Pull request: #24 (draft, open, unmerged)
PRODUCTION_SHA: `5584ea93aa88b9dba203c724269e66b3ffd5978b`
VALIDATED_CI: Foundation CI run `34880111403`, verify job `104097015642` — SUCCESS on the exact production/test candidate
HANDOFF_SHA: documentation-only commit containing this file

## Objective closed by this worker

This bounded remediation closes only the two HIGH findings returned by the fresh dual re-audit of the prior frozen FFH-013 target:

- FFH-013-T1 — non-scarce unequal-compensation owner excess incorrectly zeroed the unaffected spouse.
- FFH-013-P03 — active IRA monthly schedules were reserved using an unsupported annualized target rather than the supported remaining current-year period.

Already-cleared A01, A03, A04, A05, M01, and M02 behavior was preserved.

## T1 — before behavior and root cause

The prior evaluator treated unequal compensation as sufficient context for the shared spousal feasible set whenever an owner excess existed. That was too broad. In a non-scarce household such as compensation `$100,000/$50,000`, YTD `$8,000/$0`, the higher-compensation spouse's owner-only excess caused a zero MFJ shared group and incorrectly removed the other spouse's independent `$7,500` room even though joint compensation could not bind.

The root cause was failure to distinguish an unequal-compensation relationship from a joint compensation constraint that is actually material after YTD.

## T1 — correction

The evaluator now computes owner-specific post-YTD remaining room and joint post-YTD remaining room, then creates/applies the MFJ shared constraint only when the joint remainder is smaller than the aggregate owner-conditional remainder.

Result:
- `$100,000/$50,000`, YTD `$8,000/$0` => A `$0`, B `$7,500`, owner-local warning, no MFJ shared group.
- reversed owner excess => A `$7,500`, B `$0`.
- person/account ordering does not change results.
- scarce A03 `$10,000/$5,000`, YTD `$8,000/$0` remains shared/fail-closed as previously accepted.
- scarce A04 `$4,000/$2,000`, YTD `$5,000/$0` remains `$0/$0` with affected shared group at zero.
- equal-compensation M02 remains owner-local.

No correction mechanics were invented.

## P03 — before behavior and root cause

The prior IRA scheduling path derived planning reservations from:

`max(0, monthlyEmployeeContribution * 12 - aggregate IRA YTD)`

That treated the persisted/current monthly pace as if it were an authoritative annual target and mixed future scheduling with factual YTD. Around September 2026, `$500/month` with `$7,000` YTD could therefore reserve `$0` even though `$500` of legally supported future owner room remained, allowing later stages to reuse capacity already intended for the active schedule. Conversely, late-year low-YTD cases could reserve too much by annualizing all twelve months.

## P03 — correction

`evaluateRetirementAccountOpportunities` now accepts the engine `asOfDate` and derives the supported remaining current-year month count when the date belongs to the tax year. The engine forwards its authoritative `asOfDate` into the retirement opportunity evaluator.

Future schedule reservations now:
- remain distinct from factual YTD;
- use `monthlyEmployeeContribution × remaining current-year months` when the engine supplies an applicable current-year date;
- fall back to the pre-existing 12-month planning horizon only when no applicable as-of date exists;
- are allocated per IRA account deterministically;
- are capped by the existing owner/shared legal-capacity ledger;
- are consumed once before Existing Cash / Secure / Build / Windfall can use remaining room.

Direct September adversary:
- compensation `$10,000/$0`;
- YTD `$7,000/$0`;
- active A schedule `$500/month`;
- `asOfDate = 2026-09-01`;
- future pace = `$2,000` across Sep–Dec, but owner legal room is only `$500`;
- ledger reserves exactly `$500` scheduled capacity;
- shared room falls from `$3,000` to `$2,500` before new allocations.

December low-YTD adversary:
- `$500/month` at `2026-12-01` reserves only `$500`, not a twelve-month amount.

Both-spouse, multiple-account, staged-consumer, and order-invariance regressions are included.

## CI regression diagnosis

Candidate `5147a0113078f3ed5e162e298eb1fbcf0825c743` correctly implemented T1/P03 but Foundation CI failed at `npm test` because two pre-existing retirement-floor assertions still encoded the superseded P03 annualized current-year reservation behavior.

The stale assertions were in `lib/calculations/money-priority-hybrid-retirement-floor.test.ts` at `AS_OF_DATE = 2026-09-01`:

1. Same owner, Traditional + Roth IRA, each `$500/month`, YTD zero.
   - Full-year savings-rate reporting remains `$12,000` reported / `$7,500` legally sustainable.
   - Current-year reservation is now four months × `$1,000/month` = `$4,000`.
   - Remaining current-year legal capacity is therefore `$3,500`, not the obsolete `$0`.

2. Two spouses with separate IRAs, each `$500/month`, YTD zero.
   - Full-year sustainable contribution reporting remains `$12,000`.
   - Each owner reserves four remaining months = `$2,000` against separate `$7,500` limits.
   - Remaining current-year legal capacity is `$5,500 + $5,500 = $11,000`, not the obsolete `$3,000`.

Only those two expectations were updated. No production semantics changed in the CI-alignment commit.

## Exact production/test files changed in PR #24

- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-engine.ts`
- `lib/calculations/ffh-013-final-audit-remediation.test.ts`
- `lib/calculations/money-priority-hybrid-retirement-floor.test.ts`

This handoff file is the only documentation/control-plane file added after the exact green production candidate.

## Direct preservation evidence

The exact green full calculation suite preserves:
- A01 shared-cap-first equal fulfillment and deterministic final-cent handling;
- A03 scarce unequal post-YTD shared materiality;
- A04 scarce unequal supported excess fail-closed behavior;
- A05 conditional/non-additive household explanation;
- M01 exact recurring reconciliation (`$416.67 + $416.66 = $833.33/month`, `$9,999.96` annual legal consumption, `$0.05` shared remainder);
- M02 equal-compensation owner-only excess locality;
- Roth direct eligibility separation;
- Traditional IRA deductibility separation;
- FFH-015 SIMPLE behavior;
- FFH-012/028 HSA behavior;
- unrelated workplace-retirement behavior;
- multiple-account non-multiplication;
- Existing Cash / Secure / Build / Windfall retirement-capacity conservation.

## Exact validation

Foundation CI on `PRODUCTION_SHA` `5584ea93aa88b9dba203c724269e66b3ffd5978b`:
- run `34880111403`
- verify job `104097015642`
- Install dependencies — PASS
- Validate AI control-plane state — PASS
- Audit production dependencies — PASS
- Test calculations — PASS
- Test security policy contract — PASS
- Type check — PASS
- Lint — PASS
- Build — PASS
- job conclusion — SUCCESS

No inherited CI debt is claimed. CI-001 remains closed.

## Scope / authority confirmation

No new IRA financial policy was introduced. No HSA or SIMPLE remediation was performed. No schema/UI redesign, Supabase/live-database work, unrelated retirement refactor, or FFH-017 implementation was performed. PR #24 remains draft, open, and unmerged. The worker has not self-accepted, closed, integrated, or merged FFH-013 and has not activated FFH-017.

## Manager next action

Manager independently verifies PR #24, `PRODUCTION_SHA` `5584ea93aa88b9dba203c724269e66b3ffd5978b`, and Foundation CI run `34880111403` / job `104097015642`; decides acceptance/integration; freezes the new exact target; and routes the required fresh Technical & Mathematical Auditor and Financial Policy & Scenario Auditor re-audits. FFH-017 remains blocked until Manager closure of FFH-013.
