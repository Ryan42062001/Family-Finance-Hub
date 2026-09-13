# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-013
Role: Core Financial Engine Engineer
Status: READY_FOR_MANAGER
Execution mode: WORK_MODE_PREFERRED
Manager control-plane head verified: `7790c3d0765b01d0652cd1358a5cee6f39e6c7ae`
Approved audited production integration base: `b5111010ebc1f104709a4b27f8c79daef555f435`
Branch: `ffh/ffh-013-spousal-ira-ledger`
Pull request: #21 (draft), https://github.com/Ryan42062001/Family-Finance-Hub/pull/21
PRODUCTION_SHA: `7b28d7c8e072add66b44a93edeb0ddb66861d346`
VALIDATED_CI: Foundation CI run `34731613908`, job `103655304259`, validation child `e887bae5306305a5b6160457d2660cf5d0839193` — PASS
HANDOFF_SHA: documentation commit containing this file

Before reproduction: `evaluateRetirementAccountOpportunities()` sorted IRA owners and permanently allocated scarce MFJ compensation in ID order. With A compensation `$10,000`, B `$0`, both under 50, and YTD `$0/$0`, actual owner room was `{a: $7,500, b: $2,500}`. The failing regression expected each owner-conditional maximum to be `$7,500` plus one shared `$10,000` household constraint.

Root cause: one scalar `iraCompensationLimitByOwner` performed allocation before any routing choice, while the generic capacity ledger had only one owner group per IRA owner. It could not represent two non-additive conditional maxima constrained by a second shared MFJ compensation group.

Implementation:
- unequal-compensation MFJ pairs now receive owner-conditional ceilings and, only when joint compensation can bind, one tax-year/pair-specific shared group;
- Traditional + Roth YTD aggregates by owner, subtracts from joint compensation once, and is never conflated with scheduled/current-plan reservations;
- multiple accounts share an owner group while both spouses share the MFJ group;
- higher-compensation spouse remains capped by own supported compensation; lower spouse can use the approved spousal formula;
- missing material compensation or authoritative spouse IRA YTD/account inventory produces targeted information-needed; independently invariant equal/abundant cases remain actionable;
- possible joint/owner excess clamps new room to zero and emits a warning without correction mechanics;
- tied spouse IRA routes use proportional equal fulfillment in Build, Existing Cash, and Windfall; account ID is used only for a final-cent remainder;
- Roth direct eligibility and Traditional deductibility remain independent of compensation-ledger uncertainty.

Files changed at production checkpoint:
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-existing-cash.ts`
- `lib/calculations/money-priority-windfall.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`
- `lib/calculations/money-priority-advanced-retirement.test.ts`
- `lib/calculations/phase-5-closure-spousal-ira.test.ts`

Validation:
- focused FFH-013/IRA/Roth/Traditional/FFH-015/FFH-012/028 command: `101/101` PASS before final routing hardening; focused FFH-013 suite `10/10` PASS afterward;
- full `npm test`: `837/837` PASS;
- `npm run test:security`: `21/21` PASS;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS, zero errors and one unchanged React hook warning;
- `npm run build`: PASS after moving aside only the disposable stale `.next` cache that caused an initial Turbopack persistence panic;
- `npm run ai:validate-state`: PASS, 19 task files index-consistent with two documented legacy-task warnings;
- exact Foundation CI: run `34731613908`, job `103655304259`, every workflow step PASS.

No inherited failures and no remaining FFH-013 blocker. No HSA, SIMPLE, Phase 5C, schema/UI, Supabase, or live-database behavior changed. Manager retains merge, acceptance, audit, closure, and FFH-017 activation authority.

Exact next action: Manager verifies PR #21 and the checkpoints above, then decides acceptance/integration and subsequent independent audit routing.
