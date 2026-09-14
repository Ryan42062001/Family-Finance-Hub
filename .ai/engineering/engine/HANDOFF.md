# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-013
Role: Core Financial Engine Engineer
Worker status: FINAL MANAGER-BLOCKER REMEDIATION COMPLETE — READY_FOR_MANAGER
Task state retained: REMEDIATION pending Manager verification, integration, freeze, and fresh dual re-audit
Execution mode: STANDARD_CHAT
Current milestone / PR base: `phase-5-money-priority-engine` @ `57bda3e0bf7fdf750f5397314de681ecefd709c3`
Branch: `ffh/ffh-013-final-audit-remediation`
Pull request: #24 (draft, open, unmerged)
PRODUCTION_SHA: `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`
PRODUCTION_CI: Foundation CI run `34882801756`, verify job `104105952541` — SUCCESS on the exact production/test candidate
HANDOFF_SHA: documentation-only commit containing this file; exact SHA and final-head CI are reported to Manager after the commit is validated

## Manager blocker resolved — one remaining-contribution-period authority

The duplicated current-tax-year remaining-contribution-month calculation is now centralized in one neutral helper:

- File: `lib/calculations/money-priority-contribution-period.ts`
- Function: `remainingContributionMonths(asOfDate, taxYear)`

Both production consumers import and use that exact helper:

- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-floor.ts`

The local duplicate `remainingContributionMonths(...)` implementations were removed from both consumers. The shared helper has no imports, so the extraction introduces no circular dependency.

Direct helper tests pin the accepted calendar semantics exactly:

- absent `asOfDate` -> full-year fallback `12`
- invalid date -> full-year fallback `12`
- tax-year mismatch -> full-year fallback `12`
- January 2026 -> `12` remaining months
- September 2026 -> `4` remaining months, including September
- December 2026 -> `1` remaining month

The extraction does not change policy, full-year reporting, or the P03 separation between factual YTD and future scheduled planning reservation. Full-year sustainable-savings reporting continues to use a 12-month pace where annual reporting is required; only current-year reservation paths use the shared remaining-period authority.

## T1 preservation evidence

The non-scarce unequal-compensation regression remains pinned:

- spouse A compensation `$100,000`
- spouse B compensation `$50,000`
- A IRA YTD `$8,000`
- B IRA YTD `$0`
- A additional room `$0`
- B additional room `$7,500`
- A keeps an owner-local excess warning
- no zero shared `ira:mfj-compensation:*` group suppresses B
- reverse-owner, person-order, and account-order variants produce the same material result

## P03 preservation evidence

IRA `planningReservationAnnual` remains future scheduled pace over the supported remaining current-year contribution period rather than `monthly × 12 − YTD` or an equivalent invented annual target.

Pinned September adversary remains:

- compensation `$10,000 / $0`
- YTD `$7,000 / $0`
- active schedule `$500/month`
- as-of `2026-09-01`
- four remaining contribution months including September
- future pace `$2,000`
- owner legal room `$500`
- reservation exactly `$500`
- shared room `$3,000 -> $2,500` before new recommendations
- YTD remains factual and separate from future scheduled reservation

Pinned December adversary remains:

- `$500/month`
- as-of `2026-12-01`
- one remaining contribution month
- reservation `$500`, not `$6,000`

The reserved ledger remains reused for `remainingLegalCapacityAfterScheduledAnnual`, and production-path regressions continue to prove Existing Cash, Secure / hybrid retirement floor, Build, and Windfall cannot reuse IRA room already reserved by the active schedule.

## Previously cleared FFH-013 behavior preserved

- A01: annual tied-spouse shared-cap-first equal fulfillment remains `$10,000.01 -> $5,000.01 + $5,000.00`, with stable identity used only for the unavoidable final cent.
- A03: scarce unequal post-YTD shared materiality remains compensation `$10,000 / $5,000`, YTD `$8,000 / $0`, with no phantom spouse capacity.
- A04: scarce unequal supported excess remains fail-closed for the affected shared group at `$0 / $0` additional room, warning only, with no invented correction mechanics.
- A05: owner conditional maxima remain explicitly non-additive.
- M01: exact recurring-cent reconciliation remains `$833.33/month -> $416.67 + $416.66`, annual legal consumption `$9,999.96`, shared annual remainder `$0.05`, with no epsilon/tolerance and no hidden positive-residual clamp.
- M02: equal-compensation owner-only excess locality remains compensation `$10,000 / $10,000`, YTD `$8,000 / $0`, A room `$0`, B room `$7,500`, owner-local warning, no MFJ shared group created solely from owner excess, and reorder invariance.
- Traditional + Roth IRA YTD remains consumed exactly once.
- Multiple IRA accounts do not multiply legal capacity.
- Roth direct-contribution eligibility remains separate from Traditional IRA deductibility.
- FFH-015 SIMPLE behavior remains unchanged.
- FFH-012 / FFH-028 HSA behavior remains unchanged.
- Unrelated workplace-retirement behavior remains unchanged.
- Existing Cash, Secure / hybrid retirement-floor, Build, and Windfall conservation remain intact.

## Financial reconciliation gate

Applied `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`.

- A01 annual shared-room authority reconciles exactly in cents.
- M01 recurring Build authority reconciles exactly in monthly cents and annual legal consumption.
- P03 consumes the supported scheduled reservation exactly once before later phases.
- Planner/prepass and actual routing continue to use the same retirement-capacity-ledger semantics.
- No epsilon/tolerance financial waiver was added.
- No positive residual was clamped away.
- Stable identity remains limited to unavoidable final-cent resolution.

## Exact current-blocker changed files

Relative to the Manager-reviewed prior PR head `1e3df0797c7eef21b7c28b04cf82b00394e6a83f`, the production candidate changes exactly these four files:

1. `lib/calculations/money-priority-contribution-period.ts` — new shared authority
2. `lib/calculations/money-priority-contribution-period.test.ts` — direct helper regressions
3. `lib/calculations/money-priority-retirement-accounts.ts` — imports shared helper; local duplicate removed
4. `lib/calculations/money-priority-retirement-floor.ts` — imports shared helper; local duplicate removed

No calculation body, policy limit, monetary-routing formula, or full-year reporting formula was otherwise changed by this final Manager-blocker remediation.

## Exact validation — production candidate

Foundation CI on `PRODUCTION_SHA` `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`:

- run `34882801756`
- verify job `104105952541`
- calculations: `90 / 90` — PASS
- security policy contract: `1 / 1` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- `npm run ai:validate-state` — PASS
- dependency audit — PASS (`0` vulnerabilities)
- job conclusion — SUCCESS

The calculation run includes the direct shared-helper tests plus the existing FFH-013 T1, P03, A01, A03, A04, A05, M01, M02, multi-IRA, Roth/Traditional, SIMPLE, HSA, workplace-retirement, Existing Cash, Secure, Build, and Windfall regression coverage.

## Scope / authority confirmation

No new IRA financial policy was introduced. No HSA or SIMPLE remediation was performed. No schema/UI redesign, Supabase/live-database work, unrelated retirement refactor, or FFH-017 implementation was performed. PR #24 remains draft, open, and unmerged. The worker has not self-accepted, closed, integrated, or merged FFH-013 and has not activated FFH-017.

Production code is frozen at `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1` after its exact fully green Foundation CI proof. This handoff update is documentation-only. The exact documentation-only final head must also pass Foundation CI before return to Manager.

## Manager next action

Manager independently verifies PR #24, the shared remaining-period authority, `PRODUCTION_SHA` `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`, the exact production CI proof, and the documentation-only final-head CI proof; then decides acceptance/integration, freezes the exact audit target, and routes the required fresh Technical & Mathematical Auditor and Financial Policy & Scenario Auditor re-audits. FFH-017 remains blocked until Manager closure of FFH-013.
