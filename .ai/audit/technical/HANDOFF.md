# Technical Audit Handoff

## Current handoff — FFH-013 final fresh technical/mathematical re-audit

**Role:** Technical & Mathematical Auditor  
**Execution mode:** `STANDARD_CHAT`  
**Manager control-plane head verified:** `96d9d35328feb1b2e5f2d0501f0d3d28a63c7746`  
**Exact frozen implementation target audited:** `115f947e28cfae831a550f239c58dd0b59ca5798`  
**Frozen packet:** `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_115f947e.md`  
**Independent report:** `.ai/audit/technical/FFH-013_FINAL_TECHNICAL_REAUDIT_115f947e.md`  
**Verdict:** **FAIL — REMEDIATION REQUIRED**

This is a fresh independent audit lane. The Financial Policy & Scenario Auditor's conclusions/verdict were not relied on. The frozen implementation SHA was the only financial-behavior target; later Manager commits were used only for workflow/control-plane state.

## Frozen-target custody

- Final remediation PR: `#24`
- Production candidate: `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`
- Candidate Foundation CI: run `34882801756`, job `104105952541` — green
- Final worker/handoff head: `23c1caa75cd4d66021161f0b540e2b00ec12e074`
- Final-head Foundation CI: run `34883153453`, job `104107126587` — green
- Frozen integration SHA: `115f947e28cfae831a550f239c58dd0b59ca5798`
- `23c1caa...` -> `115f947e...`: **zero changed files**

Green CI is supporting evidence only and does not override the findings below.

## Findings

| ID | Severity | Disposition |
|---|---|---|
| TMA-01 | HIGH | Missing spouse aggregate IRA YTD can be treated as non-material when the pre-YTD shared constraint is exactly non-binding, even though the unknown YTD can make the post-YTD shared feasible set material and trigger supported-excess fail-closed. This can expose phantom legal room. **Blocking.** |
| TMA-02 | MEDIUM | P03's single contribution-period authority is not achieved: `money-priority-secure.ts` retains a materially equivalent local `remainingContributionMonths()` implementation. **Blocking for P03.** |
| TMA-03 | MEDIUM | The shared contribution-period helper does not reject impossible ISO calendar dates; JavaScript date normalization can turn an invalid date such as `2026-09-31` into October and return 3 months instead of the required invalid-date fallback of 12. **Blocking for P03.** |

No CRITICAL finding was identified.

## Required disposition matrix

- **T1:** CLEARS
- **P03:** DOES NOT CLEAR
- **A01:** CLEARS
- **A02:** CLEARS
- **A03:** CLEARS for fully known YTD; TMA-01 is a missing-material-fact boundary defect
- **A04:** CLEARS
- **A05:** CLEARS
- **M01:** CLEARS exactly
- **M02:** CLEARS
- **Financial Engine Reconciliation Gate:** DOES NOT CLEAR

## Key independent results

T1 is fixed at the frozen target: in the `$100,000 / $50,000` compensation case with `$8,000 / $0` YTD, A has `$0` new room, B has `$7,500`, A receives an owner-local warning, and no zero MFJ group suppresses B. Reverse-owner/person/account order and multiple-account representations remain materially invariant.

The P03 IRA reservation mechanics themselves are sound: retirement-account evaluation and retirement-floor reservation use the shared helper; September produces four remaining months; `$500/month` has `$2,000` future pace; with `$500` owner legal room the ledger reserves exactly `$500`; shared room drops `$3,000 -> $2,500`; December reserves `$500`; YTD remains factual history; the active schedule remains a planning reservation consumed once; downstream Existing Cash/Secure/Build/Windfall cannot reuse that reserved IRA capacity; multiple IRA accounts do not multiply it. P03 nevertheless fails because TMA-02 and TMA-03 violate its explicit authority/semantic requirements.

A01 preserves the exact `$5,000.01 + $5,000.00` tied annual routing against `$10,000.01` shared room. A03/A04 supported-excess cases fail closed correctly when material facts are known. A05 preserves non-additive conditional owner maxima.

M01 preserves exactly `$10,000.01` shared annual room, `$7,500` owner conditional room each, `$833.33/month` Build authority, `$416.67 + $416.66` routing, `$9,999.96` annual legal consumption, and `$0.05` shared annual remainder with no epsilon/tolerance or hidden positive-residual clamp. M02 preserves `$0 / $7,500` additional room for the `$10,000 / $10,000`, `$8,000 / $0` case with an owner-local warning and no MFJ group created solely from owner excess.

## Regression preservation

No separate blocking regression was found in Roth direct eligibility, Traditional IRA deductibility, FFH-015 SIMPLE behavior, FFH-012/028 HSA behavior, or unrelated workplace-retirement behavior. The final Foundation run remains green across calculations, security contract, typecheck, lint, and build. PR #24 did not modify the dedicated SIMPLE/HSA/workplace-limit implementation contracts.

## Manager closure condition

**FFH-013 closure is blocked.** A new remediation target must address TMA-01 and the two P03 defects, then be frozen and independently re-audited. Manager retains merge/closure/FFH-017 activation authority.

This audit changed only `.ai/audit/technical/` on its audit branch. It did not merge anything, close FFH-013, activate FFH-017, change financial policy, perform production remediation, or perform Supabase/live-database work.
