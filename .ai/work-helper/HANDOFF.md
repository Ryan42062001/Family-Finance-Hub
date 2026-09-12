# Work Helper / Super Troubleshooter Handoff

Task: FFH-028 — HSA Candidate-Pair Cardinality Safety Remediation
Status: READY_FOR_MANAGER
Starting milestone: `e06bf586f6c43254eb64816cc7482f6b9212beda`
Branch: `ffh/ffh-028-hsa-candidate-pair-cardinality`
PR: #17
PRODUCTION_SHA: `f266c112abff752e268c48dd097d7d562ac58169`
VALIDATED_CI: run `34698588257`, job `103566232253`, validation SHA `d13c412851c8a35d1d7cc4a85054d3dcf8bae94f`
HANDOFF_SHA: documentation commit containing this file; read final branch head

Outcome: reproduced `$17,500 !== $8,750` before production editing. Three active self/spouse_partner candidates erased `candidatePairIds`, causing pair/year authority and materiality handling to be skipped. The evaluator now retains all ambiguous candidate identities and applies the existing FFH-025 month-level materiality test per HSA owner against every other candidate. Materially ambiguous HSA outputs are targeted `more_information_needed`; all-known self-only locality and unrelated IRA/workplace opportunities remain usable.

No legal pair is inferred from relationship, filing status, allocations, account ownership, order, prior year, or a lone authority row. Findings A/B/C remain preserved, including `$5,104.17 = $2,552.08 + $2,552.09` and monthly Build routing `$364.58 + $364.58 = $729.16`.

Changed code/test scope: `lib/calculations/money-priority-hsa-legal-capacity.ts`; `lib/calculations/ffh-028-hsa-candidate-pair-cardinality.test.ts`.

Validation: focused 67/67; full calculations 818/818; exact CI AI state, dependency, calculations, and security all PASS. CI Type check fails only on the five exact Manager-registered `CI-001` diagnostics in `money-priority-married-hsa-remediation.test.ts:219` and `money-priority-retirement-accounts.test.ts:20`; lint/build are skipped in CI. Local lint passes with one inherited warning; local build compiles production then stops on CI-001.

Exact next action: Manager verifies PR #17, updates canonical task/index lifecycle, integrates if accepted, and freezes a new FFH-012 dual re-audit packet. Work Helper does not merge, accept, close, or activate auditors.
