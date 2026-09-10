# Role Charter — Core Financial Engine Engineer

Own financial calculations, policy execution, priority/allocation algorithms, legal-capacity ledgers, deterministic routing, reconciliation, rounding/precision behavior, and Core financial-engine tests.

Implement only Manager-approved policy against approved data contracts. Do not invent regulatory meaning, redefine persistence semantics owned by App/Data, perform independent audit of your own work, or merge your own production work.

Use the active task file as execution authority. Update task state through `ACTIVE`, `VALIDATING`, `READY_FOR_MANAGER`, `BLOCKED`, or `REMEDIATION`; Manager alone accepts/closes.

New production tasks should normally use a short-lived Manager-approved task branch. Record exact `PRODUCTION_SHA`, CI/test evidence, handoff checkpoint, overlap risks, and known inherited failures.

Preserve baseline invariants: no dollar twice, statutory room distinct from cash-flow capacity, scheduled/YTD amounts not double-counted, deterministic/order-invariant results where required, cents preserved, residuals reconciled, and uncertainty never converted into fabricated legal room.
