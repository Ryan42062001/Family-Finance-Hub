# Family Finance Hub — Financial Engine Reconciliation Gate

Status: CANONICAL ENGINEERING / MANAGER / AUDIT CONTROL-PLANE STANDARD
Scope: money-routing and legal-capacity implementations only; no new financial policy

This standard exists to prevent mathematically legal annual capacity from diverging from the concrete dollars actually routed, displayed, reserved, or consumed by downstream stages.

It does not define statutory limits or product priority. It defines how approved financial behavior must reconcile across representation layers.

## 1. One authoritative routing model

When a planner/prepass estimates routable capacity and a later execution/router allocates that capacity to concrete destinations, both paths must use the same authoritative reconciliation logic or a provably equivalent exact calculation.

Do not let a planning prepass consume destinations one way while the actual router consumes them another way if rounding, grouping, tie allocation, ordering, or shared-capacity logic can differ.

If two code paths must remain separate, tests must prove equivalence at adversarial monetary boundaries.

## 2. Aggregate-to-destination equality

For every routed money stage, the authoritative aggregate allocation must equal the sum of concrete destination allocations in the unit exposed by that stage.

Examples:
- Build monthly retirement allocation = sum of retirement-account monthly allocations;
- one-time retirement deployment = sum of one-time account deployments;
- Windfall retirement deployment = sum of concrete retirement destinations;
- shared legal-capacity consumption = sum of owner/account consumption recorded against that shared group.

Do not hide an over-route or under-route by clamping a residual to zero after destination rounding.

If the representation converts between annual and monthly values, the implementation must explicitly choose which representation is authoritative for routing and reconcile the other representation to it deterministically.

## 3. Exact cents, no epsilon safety valve

Monetary conservation checks operate in integer cents or an equivalently exact money representation at the reconciliation boundary.

Do not use floating-point tolerance, epsilon, or a positive residual allowance to make a financial invariant pass.

Stable identity may assign an unavoidable final cent only after all approved financial/routing factors and equal-fulfillment rules have been applied.

## 4. Required adversarial boundaries

Any task that changes money routing, allocation, shared legal capacity, splitting, annual/monthly conversion, or grouped ledger consumption must directly test the applicable cases:

- odd-cent total or residual;
- one cent below and one cent above a limit when meaningful;
- exact limit exhaustion;
- two or more concrete destinations sharing one aggregate capacity;
- reversed person/account/input order;
- multiple accounts for one owner where capacity is owner-level;
- multiple owners sharing one group where capacity is household-level;
- repeated/staged consumption so a dollar cannot be spent twice;
- annual-to-monthly or monthly-to-annual conversion when the stage exposes a different unit than the legal ledger;
- final-cent deterministic assignment for true financial ties.

A test that proves only annual legal safety is insufficient when the product exposes monthly destination allocations.

## 5. Manager pre-acceptance hand check

For a production change that materially affects routing, splitting, rounding, or shared financial capacity, Manager must independently inspect at least one adversarial scenario outside the worker's happy-path summary before acceptance.

The hand check should compare:
1. approved aggregate amount;
2. concrete destination amounts;
3. shared/owner ledger consumption;
4. residual after routing;
5. any annual/monthly conversion.

A green CI run is necessary evidence but is not sufficient evidence that these quantities reconcile.

If Manager finds a reachable mismatch, the task returns to `REMEDIATION` even if legal annual capacity remains bounded and CI is green.

## 6. Audit requirement

For high-impact audited money-routing work, the frozen audit packet must identify the applicable reconciliation invariants and require the Technical & Mathematical Auditor to independently verify them at the exact frozen target.

The Financial Policy & Scenario Auditor should verify that concrete household outcomes do not present or route more capacity than the accepted policy permits, but does not replace the technical reconciliation audit.

## 7. Handoff evidence

Workers changing money routing or capacity ledgers must include in `READY_FOR_MANAGER` evidence:
- the authoritative routing unit(s);
- aggregate-to-destination reconciliation result;
- exact-cent/rounding strategy;
- at least one adversarial boundary result;
- whether planner/prepass and actual router share the same implementation path;
- confirmation that no positive residual was hidden by tolerance or clamp behavior.

## 8. Non-goals

This control-plane standard does not:
- change statutory or regulatory meaning;
- choose Roth versus Traditional policy;
- change retirement priority ordering;
- alter HSA, IRA, SIMPLE, or workplace limits;
- authorize schema, database, or UI expansion;
- replace independent financial-policy review.

It applies only after the financial behavior itself has been authorized.