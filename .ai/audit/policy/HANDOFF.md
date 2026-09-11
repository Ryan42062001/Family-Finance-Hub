# Financial Policy & Scenario Audit — HANDOFF

Task: FFH-012 — HSA Legal-Capacity Calculation
Audit target: `b33e97320c8907193ba8f6a571b0d92684237f18`
Verdict: FAIL — REMEDIATION REQUIRED

Blocking findings:
1. HIGH — married-family sharing is triggered solely from the conflated `spouse_partner` household relationship. FFH-D005/FFH-007 authorize that legal rule for spouses, while the accepted data contract does not prove whether `spouse_partner` is a legal spouse or non-spouse partner. The focused FFH-012 married helper also inherits a `single` tax filing status while still asserting married sharing. Manager/App-Data must resolve the identity authority; Auditor does not invent a rule.
2. MEDIUM — partial-year married shared-family equal allocation can create $0.01 of spendable legal capacity. Example: seven eligible family months produce a rounded shared base of $5,104.17, but independently rounded equal halves become $2,552.09 + $2,552.09 = $5,104.18, and the ledger permits consumption up to those owner/group ceilings.

Non-blocking finding:
- LOW — married-family ledger component fields named as remaining shared/catch-up room are not decremented in the married consume branch, although current routing stays safe because mutable account/shared/owner groups still constrain consumption.

Cleared areas: self-only/full-family and one-vs-two eligible spouse behavior under authoritative spouse facts; owner-specific age-55 catch-up routing; multiple HSAs; employee+employer YTD aggregation; exhaustion/partial capacity; Medicare and possible-excess handling; unknown/mismatched tax-year conservatism; HSA medical-spending exclusion from long-term retirement saving when intent is unresolved; Cash/Secure/Build/Windfall/Your Plan shared-ledger use; account/input-order invariance. PR #8's legacy-to-normalized fixture adapter is acceptable as test-only regression scenario alignment and does not change production legacy conservatism.

Exact evidence report: `.ai/audit/policy/FFH-012_POLICY_SCENARIO_AUDIT.md`
CI: Foundation run `34614840278`, job `103314058423`, exact head `b33e973...`; `Test calculations` passed, later security-policy-contract step failed.

Required next role: Manager / Architect to return FFH-012 for narrow remediation and route the spouse-vs-partner authority gap to the appropriate App/Data/Policy authority. Manager owns final task disposition.

No production code or Manager-owned task state was changed by this audit.