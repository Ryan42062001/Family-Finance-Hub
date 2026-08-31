# Phase 5 Money Priority Engine — Final Completion Audit

Date: 2026-08-31
Branch: `phase-5-money-priority-engine`
Feature validation checkpoint: `0c1145cd68c8e4388112fad5394a13813a4f4b84`
Foundation CI: #207 — calculation tests, lint, and production build all passed.

## Executive result

Phase 5 is feature-complete for its planned calculation/policy scope and has reached closure readiness.

The final architecture answers **“What should I do with my money next?”** through one deterministic authoritative planning flow across Stabilize, Secure, Build, and Optimize. Existing cash and recurring cash flow remain separate resources, residual-needs reconciliation prevents one-time cash from being claimed twice, and Home/Vehicle affordability now use the same authoritative hypothetical rerun rather than a second competing priority system.

Recommendation Refresh V1 was hardened before closure so a financially relevant data change is not automatically labeled a material recommendation change. Basis freshness, policy/time freshness, authoritative recommendation impact, critical transitions, and Your Plan override reconciliation are now distinct concepts.

## Planned Phase 5 feature status

| Area | Status | Closure note |
|---|---|---|
| Stabilize | Complete | Negative/structural cash-flow problems precede downstream allocation. |
| Secure | Complete | Deductible reserve, employer match, debt policy, student-loan specialization, and emergency reserve are authoritative. |
| Committed expenses | Complete | Essential, required nonessential, and discretionary treatment remain distinct. |
| Existing cash | Complete | Protected, earmarked, debt-backed, operating, and unallocated cash are separated; liquidity floor is preserved. |
| Residual needs | Complete | One-time deployment and recurring allocation cannot double-claim the same original need. |
| Exceptional emergency reserve | Complete | Ordinary 3–6 month risk policy and concrete dated exceptional disruption policy are separated. |
| Student loans | Complete for V1 | Special repayment/forgiveness/employer-benefit facts can preserve strategy instead of forcing ordinary acceleration. |
| Goal ranking / two-pass Build | Complete | Lexicographic economic tier → deadline → consequence → proximity → user priority → stable ID. |
| Retirement projection | Complete | Projection guidance and benchmark fallback remain distinct. |
| Advanced retirement accounts | Complete for V1 | Legal capacity ≠ tax treatment eligibility ≠ recommended amount; 2026 policy is versioned. |
| Optimize | Complete | Receives only legitimate residual capacity after Secure and Build. |
| Recommended Plan vs Your Plan | Complete for V1 | Overrides never rewrite the authoritative recommendation and are reconciled explicitly. |
| Windfall Mode | Complete for V1 | One-time allocator; no invented taxes, recurring-income conversion, or assumed execution. |
| Vehicle affordability | Complete | Uses authoritative hypothetical post-purchase rerun. |
| Home affordability | Complete | Uses authoritative hypothetical rerun including mortgage debt, non-debt housing costs, sale timing, and ARM stress. |
| Recommendation Refresh | Complete for V1 | Hardened basis/recommendation separation and adversarial false-positive/false-negative controls. |

## Authoritative engine invariants

The final calculation path remains:

```text
normalized household snapshot
→ provisional Secure / Build / Optimize
→ existing-cash deployment
→ residual-needs snapshot
→ authoritative Secure
→ Build
→ feasibility
→ Optimize
→ normalized recommendations
```

Closure invariants verified by the regression suite include:

- total recurring allocations do not exceed legitimate plan capacity;
- one-time existing cash does not become recurring cash flow;
- protected/earmarked/debt-backed/operating cash is not silently repurposed;
- deductible and emergency-reserve needs share protected reserve dollars without double counting;
- committed nonessential expenses affect required outflow but do not inflate the emergency-fund base;
- employer match remains exclusively a Secure priority;
- goal ranking remains lexicographic rather than weighted;
- retirement account legal capacity and tax eligibility are not conflated;
- Windfall recommendations do not prove execution;
- Home/Vehicle purchases are rerun through the authoritative priority engine;
- Recommended Plan remains authoritative when Your Plan overrides exist;
- no calculation module automatically transfers, pays, trades, or contributes money.

## Recommendation Refresh closure

Recommendation Refresh version `2026.2` uses two distinct deterministic digests:

1. **financial basis fingerprint** — normalized financially relevant household state + Money Priority policy version + planning-assumption version + tax-policy version + tax year + explicit `asOfDate`;
2. **recommendation fingerprint** — stable authoritative recommendation identity/order/state/urgency/allocations plus meaningful feasibility state.

The financial fingerprint canonicalization sorts stable-ID collections by stable ID. Monetary fields use cent normalization; non-money numeric fields such as APRs and ratios are not indiscriminately rounded to cents. Display names, notes, prose explanations, rationales, and timestamps are excluded from financial identity where they are not financially meaningful.

The recommendation fingerprint intentionally does **not** treat an otherwise harmless feasible-plan numeric capacity change as a material recommendation change. Funding-gap state and funding-gap amount remain meaningful feasibility differences.

Refresh state decision order is categorical:

```text
critical transition
→ critical_change
else meaningful authoritative recommendation difference
→ materially_changed
else financially relevant basis/policy/time difference
→ refresh_recommended
else
→ current
```

Critical transitions remain narrow and deterministic, including newly unsafe funding gaps, total modeled income loss, activation of known disruption, newly lost employer-match capture, and newly required/high Secure actions.

Adversarial coverage now includes the explicit false-positive control where a small financially relevant cash change changes the financial basis but leaves the recommendation equivalent, producing `refresh_recommended` rather than `materially_changed`.

## Home / Vehicle closure

Home and Vehicle affordability use `runHypotheticalMoneyPriorityEngine()` to construct a post-purchase household and then rerun the actual engine.

Home closure coverage includes mortgage P&I counted once, non-debt housing costs, disappearing prior housing cost, protected cash, unrelated earmarks, debt-backed cash, sale-proceeds timing, related-goal completion, required-goal preservation, employer-match preservation, retirement displacement, and deterministic ARM stress.

Vehicle closure coverage includes acquisition cash, financing, APR/term/LTV/negative-equity behavior, operating-cost deltas, related-goal completion, protected cash boundaries, employer-match preservation, required-goal preservation, retirement effects, determinism, and immutability.

## 2026 policy freshness

The current tax-policy module remains explicitly versioned for tax year 2026 rather than scattering statutory limits throughout calculation code. It includes the supported 2026 workplace-plan, IRA, SIMPLE, SEP, HSA, catch-up, Roth phaseout, and Traditional IRA deductibility values used by Advanced Retirement V1.

A future tax year should add a new versioned tax-policy basis; 2026 constants should not be silently edited in place.

## Security and privacy audit

### Database structure

The connected Supabase project was checked during closure. Supabase Security Advisor returned **zero security lints**.

All current public application tables have RLS enabled. Household-scoped financial tables use membership predicates through `private.is_household_member(household_id)` for SELECT and DELETE, and both membership `USING` and membership `WITH CHECK` on UPDATE. INSERT policies require membership of the target household. Profile policies restrict records to `auth.uid()`.

The membership helper is a private `SECURITY DEFINER` function with an empty `search_path` and checks `household_members.user_id = auth.uid()`. Its execution surface is intentionally used only as the RLS membership predicate rather than trusting browser-supplied household identity.

### Live negative isolation test

A transaction was executed under the `authenticated` database role with a randomly generated non-member JWT subject. The non-member could see **zero rows** from households, household members, household people, accounts, income, expenses, debts, retirement accounts, goals, insurance exposures, household financial preferences, and profiles. The transaction was rolled back.

The project currently had no member rows available to perform a meaningful positive-member/second-household live comparison, so closure relies on the verified RLS policy structure plus the successful non-member negative test and zero Security Advisor findings. A two-household seeded isolation integration test remains a worthwhile pre-production enhancement, not a Phase 5 calculation blocker.

### Current Supabase platform check

The 2026 Supabase Data API default changed so new tables may require explicit grants before being reachable through the Data API. Current project migrations already contain explicit authenticated grants for application tables alongside RLS, so this platform change does not invalidate the current access model. No Phase 5 schema migration was required.

## Determinism / immutability / scope

Verified boundaries:

- no `Date.now()` or hidden wall-clock dependency in Phase 5 recommendation refresh;
- explicit `asOfDate` is authoritative;
- no runtime web calls from Phase 5 calculations;
- no database reads from calculation modules;
- no service-role client added to browser calculation paths;
- no raw financial-snapshot logging added;
- no Phase 5 calculation mutates supplied authoritative engine results or snapshots;
- no recommendation fingerprint is used for authentication or authorization;
- no Phase 5 UI redesign, background refresh job, notification engine, or automatic money movement was added as part of closure.

## Validation

Feature checkpoint `0c1145cd68c8e4388112fad5394a13813a4f4b84` passed Foundation CI #207:

- calculation regression suite: passed;
- Recommendation Refresh adversarial suite: passed;
- Home Affordability adversarial suite: passed;
- Vehicle Affordability regression suite: passed;
- lint: passed;
- production build: passed.

Supabase closure verification:

- Security Advisor: zero security lints;
- all current public application tables: RLS enabled;
- household financial tables: household membership policies present;
- UPDATE policies: both `USING` and `WITH CHECK` present;
- non-member authenticated isolation transaction: zero visible rows across tested user/household financial tables.

## Deferred product scope

The following are intentionally outside Phase 5 closure and should not be treated as missing Phase 5 features:

- bank synchronization;
- automatic transfers, debt payments, trades, or contributions;
- persisted recommendation history / stale-event history;
- background recalculation, cron, polling, or notifications;
- Scenario Lab UI;
- full tax-return simulation;
- comprehensive federal student-loan/PSLF certification simulator;
- richer future account-quality/tax-diversification optimization;
- production UI presentation of refresh state;
- seeded multi-household end-to-end RLS integration harness.

## Closure decision

**Phase 5 is complete for the planned V1/V2 calculation and policy scope.**

Future work should begin as a new phase rather than adding new financial-planning behaviors to Phase 5 without a new scoped design. Any later 2027 statutory update should be introduced through a new versioned policy basis so Recommendation Refresh can correctly mark old recommendations stale.
