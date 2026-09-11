# Retirement & Tax-Advantaged Policy Analyst Handoff

HANDOFF

Task ID: FFH-022

Role: Retirement & Tax-Advantaged Policy Analyst

Status: READY_FOR_MANAGER

Verified starting state:
- repository: `Ryan42062001/Family-Finance-Hub`
- milestone branch: `phase-5-money-priority-engine`
- verified Manager control-plane head: `20a46c1b6660bf3aa5e7d455e2e0b5cf689098cf`
- task branch: `ffh/ffh-022-hsa-legal-marriage-authority`
- FFH-022 was ACTIVE and assigned to Retirement Policy
- FFH-012 is REMEDIATION after dual independent audit FAIL

Assigned objective:
Resolve the protected semantic gap where persisted `spouse_partner` conflates legal spouses and non-spouse partners while FFH-D005 / FFH-007 married-family HSA ordinary-limit/allocation rules apply to spouses.

Policy decision:
Family Finance Hub must require an explicit pair-specific, target-tax-year legal-spouse authority before applying married-spouse HSA shared-family ordinary-limit/allocation rules. Minimum semantics are `confirmed_legal_spouses`, `confirmed_not_legal_spouses`, and `unknown` (exact implementation names not mandated).

Key behavior:
- `spouse_partner` alone never authorizes married HSA sharing; it may only identify a candidate pair for confirmation.
- Affirmative legal-spouse authority permits the already-approved married-family rules when HSA eligibility/coverage conditions otherwise trigger them.
- Confirmed non-spouse partners do not receive a married shared group/equal spouse split; owners are evaluated independently under existing person/month HSA rules.
- Unknown/missing authority yields targeted `more_information_needed` wherever spouse status can materially change capacity; independently supported self-only/unrelated routes may continue.
- Explicit married-allocation data is downstream preference and cannot create spouse authority.
- `tax_filing_status` is corroborating only. Repository schema calls it planning status, not a filed return; it cannot create or erase legal-spouse HSA authority.

Minimum data/runtime/UI contract:
- pair-specific + HSA-tax-year-bound tri-state authority, or lossless equivalent;
- confirmation/provenance metadata;
- missing/default = unknown;
- no optimistic backfill from `spouse_partner` or tax filing status;
- no silent prior-year carryforward;
- runtime carries identical authority semantics through Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and Recommendation Refresh;
- UI explicitly distinguishes legal spouse / not legally married partner / unknown for the target HSA tax year without preselection from ambiguous metadata.

Governing authority:
- FFH-D005 accepted HSA legal-capacity/data policy.
- `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md`.
- accepted FFH-010 HSA input migration.
- Phase 5 household relationship schema showing `spouse_partner` conflation.
- tax-profile schema documenting `tax_filing_status` as planning-only.
- both FFH-012 independent audit FAIL verdicts.

Authority-gap disposition:
No new Regulatory/R&D question is required. Accepted policy already says the special shared ordinary rule is a spouse rule and material unknown legal HSA facts remain unknown-safe. FFH-022 resolves a product-data authority gap, not a new statutory interpretation.

Evidence produced:
- `.ai/policy/retirement/FFH-022_HSA_LEGAL_MARRIAGE_AUTHORITY_POLICY.md`
- policy artifact commit: `1d5b7025d977b9a6495d42d797a779ec6cf0f690`
- FFH-022 task state/evidence update commit: `433218ade0b7596bbc7b46e890f59f7e6c897f70`

Required regression scenarios are recorded in the FFH-022 policy artifact and task, including legal spouse, confirmed non-spouse, unknown, filing-status conflicts, married-allocation-without-authority, self-only locality, tax-year isolation, pair-order invariance, and recommendation refresh after authority change.

No production code, schema, migration, or test files were modified. No production CI/test pass is claimed for this documentation-only policy task.

Remaining blocker for FFH-022: none. Manager approval is required before the semantics become implementation authority.

Exact next action:
Manager reviews FFH-022. If accepted, route the approved pair/year spouse-authority contract to the appropriate App/Data/Core/FFH-023 implementation task. Engineering must not infer marriage from `spouse_partner` or `tax_filing_status`. After a validated integrated FFH-012 remediation checkpoint exists, reactivate both independent auditors.

Do not set ACCEPTED, AUDIT_READY, or CLOSED from this worker handoff.
