# FFH-012 — Frozen Dual Re-Audit Packet

AUDIT_PACKET_ID: `FFH-012-ffde8440-2026-09-12`
PARENT_TASK: `FFH-012`
AUDIT_TARGET_SHA: `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`
MANAGER_ACCEPTANCE_RECORD: `.ai/tasks/FFH-025.md` — Manager acceptance 2026-09-12
REQUIRED_AUDITS: `BOTH`
FROZEN_AT: `2026-09-12`

## Frozen-target rule
Both auditors must independently audit the exact financial-behavior target `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`.

Later milestone commits through the current Manager control-plane lineage contain Workflow V3.1/task/audit bookkeeping and do not redefine the financial behavior target. Auditors may inspect those later documentation artifacts for routing/context, but must not silently switch the audited implementation SHA.

## Governing requirements
- Parent task: `.ai/tasks/FFH-012.md`
- Accepted legal-marriage authority: `.ai/policy/retirement/FFH-022_HSA_LEGAL_MARRIAGE_AUTHORITY_POLICY.md`
- FFH-023 remediation task/evidence: `.ai/tasks/FFH-023.md`
- FFH-025 accepted remediation task/evidence: `.ai/tasks/FFH-025.md`
- Prior Technical audit evidence: `.ai/audit/technical/HANDOFF.md`
- Prior Policy/Scenario audit: `.ai/audit/policy/FFH-012_POLICY_SCENARIO_REAUDIT.md`
- Prior Policy handoff: `.ai/audit/policy/HANDOFF.md`

## Exact implementation evidence
- Prior failed-audit target: `1487b192491a704ca3500b42d22a50289ee1551b`
- FFH-025 PRODUCTION_SHA: `f537b7b7021288b578acb504a52cd9ac285a2fc2`
- FFH-025 PR: #15
- FFH-025 integration / current audit target: `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`
- Integration CI: Foundation CI run `34669630244`, job `103488407900`
- Integration CI observed gates: install PASS; production dependency audit PASS; calculations PASS; security PASS; typecheck FAIL on separately tracked inherited debt; lint/build skipped by fail-fast.
- Known inherited CI debt: `CI-001` in `.ai/manager/KNOWN_CI_DEBT.md`

Relevant FFH-025 production/test surface includes:
- `lib/calculations/money-priority-hsa-legal-capacity.ts`
- `lib/calculations/ffh-025-hsa-compound-authority-materiality.test.ts`
- relevant HSA/money-priority integration tests changed by PR #15

## Accepted authority that must remain protected
Legal-spouse authority is tri-state and pair/tax-year specific:
- `confirmed_legal_spouses`
- `confirmed_not_legal_spouses`
- `unknown`

A `spouse_partner` relationship label does not establish legal marriage. Filing status is corroborating only. Allocation rows, relationship labels, or prior-year state must not manufacture current-year legal-spouse authority.

Unknown authority should block only HSA outputs whose supported legal-capacity result can materially change under supported spouse/non-spouse resolutions. Unrelated recommendations should remain usable.

## Prior findings that both auditors must revisit

### Finding A — previously OPEN / HIGH
Compound unknown-authority materiality.

Representative prior failing scenario:
- Person A: self, under 55, no Medicare, 12 HSA-eligible months, self-only coverage, HSA YTD 0.
- Person B: candidate partner, under 55, no Medicare, unresolved HSA eligibility/coverage such that family coverage remains a supported resolution.
- Legal-spouse authority missing/unknown.

Prior behavior could expose A's full self-only `$4,400` even though a supported legal-spouse/family-coverage resolution could produce shared ordinary capacity of `$8,750`, defaulting to `$4,375` each. Because `$4,400` was not invariant, the affected HSA recommendation had to become targeted `more_information_needed`.

FFH-025 claims to fix this by treating unknown/missing authority as material only when both people may still be HSA-eligible and family coverage is known or remains possible for either.

Auditors must independently determine whether Finding A is now CLOSED on the frozen target.

### Finding B — previously CLOSED
Odd-cent shared ordinary-capacity conservation.

Required retained behavior includes:
`$5,104.17 = $2,552.08 + $2,552.09`.

Auditors must verify FFH-025 did not regress this behavior.

### Finding C — previously CLOSED
Build/account reconciliation for shared HSA routing.

Required retained behavior includes:
`$8,750` annual shared ordinary room represented/routed as `$4,375 + $4,375`, with monthly account routes `$364.58 + $364.58 = $729.16`, and no positive reconciliation residue escaping authoritative routing.

Auditors must verify FFH-025 did not regress this behavior.

## Required independent questions
Each auditor must answer, within their assigned domain:
1. Does the exact target close Finding A without over-blocking invariant/local HSA results?
2. Does it preserve Findings B and C?
3. Does unknown/missing authority remain targeted to materially affected HSA outputs rather than disabling unrelated IRA/workplace-retirement recommendations?
4. Are fully known all-self-only cases actionable when spouse authority cannot change the supported result?
5. Are known-ineligible counterpart cases local/actionable where appropriate?
6. Do confirmed non-spouses remain independent?
7. Do confirmed legal spouses with family coverage continue to use lawful shared capacity?
8. Is there any inference of legal marriage from `spouse_partner`, filing status, allocation rows, input order, or prior-year state?
9. Is behavior invariant to person/pair/input ordering where policy says it must be deterministic?
10. Are target-year, YTD contribution, Medicare, age/catch-up, partial-year, and multi-account semantics preserved?
11. Does Build/recommendation/account routing reconcile without phantom or lost cents?
12. Are any observed failures task-owned, inherited (`CI-001`), integration-only, or unrelated baseline/tooling failures?
13. Are tests/scenarios sufficient to support a blocking or passing verdict?

## Auditor independence rules
- Technical and Policy auditors must use fresh independent chats.
- Do not read, rely on, quote, or adopt the other auditor's verdict before submitting your own.
- Do not assume passing tests prove policy correctness.
- Do not assume plausible outputs prove code/math correctness.
- Do not modify production behavior during the audit.
- Do not change the audit target SHA.
- Findings must be classified `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- Final verdict must be exactly one of:
  - `PASS`
  - `PASS WITH NON-BLOCKING FINDINGS`
  - `FAIL — REMEDIATION REQUIRED`

## Closure gate
FFH-012 may close only after both required independent audits return a passing verdict (`PASS` or `PASS WITH NON-BLOCKING FINDINGS`) on this exact frozen behavior target, with no unresolved blocking finding. Manager alone owns final closure.