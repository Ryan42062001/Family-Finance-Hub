# Product & Technical R&D Handoff

HANDOFF

Task ID: FFH-039

Role: Product & Technical R&D Engineer

Status: ACCEPTED

Execution mode: STANDARD_CHAT_HIGH

Branch: research/ffh-039-scenario-lab-contract

Verified Manager/control-plane baseline:
177cce093cd24fd9169361ff4ccb397ac7b6b5d1

Verified Phase-6 product baseline:
ae11a48359d082e615b76822b6bbe3a7f379a8d2

Report:
.ai/research/rnd/FFH-039_SCENARIO_LAB_PRODUCT_TECHNICAL_CONTRACT.md

Report commit:
b549b8d13e1f54a4b54f7fff2fdab1cbd1073c98

## Result

Scenario Lab v1 discovery/design is complete.

The contract defines an ephemeral deterministic Scenario Lab that reuses the accepted Phase-5 Money Priority Engine rather than creating a second financial engine.

Key product/technical boundary:
- authoritative persisted household -> normalized snapshot remains the baseline;
- scenario inputs are typed hypothetical overlays with explicit provenance;
- generic profile-change scenarios rerun runMoneyPriorityEngine on an immutable clone;
- Home, Vehicle, Windfall, Your Plan and Recommendation Refresh remain specialized accepted modules/adapters rather than copied logic;
- legal/tax unknowns remain unknown;
- recurring and one-time money stay distinct;
- exact reconciliation, final-cent determinism and cross-stage legal-capacity no-reuse remain mandatory;
- stale scenarios are rejected using a versioned baseline fingerprint and require explicit rebase;
- v1 scenarios are ephemeral/in-memory only, with no Supabase schema or RLS change;
- no scenario-to-profile commit/apply action exists in v1.

## Scenario taxonomy

INCLUDE:
- income/paycheck change;
- recurring expense change;
- one-time cash/windfall;
- debt balance/payment/payoff;
- savings/goal amount/date/priority;
- retirement contribution;
- home purchase/affordability;
- vehicle purchase/affordability;
- job loss;
- parental leave / temporary income reduction;
- childcare;
- bounded insurance changes;
- cash-impact-only large medical expense;
- retirement-age changes.

DEFER:
- dedicated new-child/dependent event;
- dedicated relocation;
- dedicated refinancing.

REQUIRES POLICY:
- tax filing/status changes;
- user-selectable investment-return assumptions;
- Monte Carlo / probabilistic simulation.

The report also isolates future policy needs for tax/HSA-aware medical behavior and recommendation-bearing refinancing.

## Persistence decision

R&D product/technical recommendation: EPHEMERAL v1.

No Scenario Lab Supabase table, migration, cache, localStorage persistence, cross-device save, share link, or profile mutation is required for v1.

A future persisted design, if separately authorized, should store scenario definitions/provenance and baseline fingerprints rather than a second authoritative household profile.

## Baseline / stale model

Each draft binds to:
- canonical normalized financial basis;
- Money Priority policy version;
- planning-assumptions version;
- tax-policy version;
- tax year;
- explicit as-of date;
- versioned Scenario Lab fingerprint schema.

Every Run/Rerun reloads the authenticated household baseline server-side. Fingerprint mismatch returns stale_baseline and does not silently execute the old draft.

Rebase retains only explicit override intent with valid stable IDs. Deleted entities are never retargeted by display name.

## Policy questions routed, not answered

- hypothetical filing-status eligibility/dependencies;
- user-selectable return assumptions;
- Monte Carlo semantics;
- tax/HSA-aware medical-event behavior;
- future recommendation-bearing refinance behavior.

No new statutory or financial-policy meaning was defined.

## Follow-on decomposition

For Manager consideration only; no work is activated by this handoff:

1. Core Financial Engine Engineer — typed scenario overlay/runner foundation and reconciliation tests.
2. Application, Data & Integration Engineer — authenticated ephemeral Scenario Lab route/server action/UI using the stable Core contract.
3. Core/App-Data bounded integration — Home/Vehicle/Windfall/Your Plan/Recommendation Refresh adapters.
4. Technical & Mathematical Auditor — exact frozen implementation audit.
5. Financial Policy & Scenario Auditor — independent policy/scenario-preservation audit.
6. Separate future Regulatory/Policy lanes only for categories classified REQUIRES POLICY or later-deferred expansion.

## Boundaries preserved

No production code, UI, Supabase schema/migration, live data, financial policy, statutory interpretation, Monte Carlo, FFH-038, Phase 7, or workflow/control-plane upgrade was implemented or recommended by FFH-039.

## Exact next action

Manager / Architect reviews the FFH-039 report and independently decides whether to accept the product/technical contract and which bounded follow-on implementation/policy tasks, owners, sequence, and audit gates to authorize.


## Manager disposition — 2026-09-18

Manager independently reviewed the FFH-039 contract against the accepted Phase-5 source architecture and accepts it.

Manager checks:
- branch is exactly two documentation commits ahead of activation baseline `177cce093cd24fd9169361ff4ccb397ac7b6b5d1`;
- no production/application/calculation/schema/package/live-data file changed;
- `runHypotheticalMoneyPriorityEngine` already reruns the canonical `runMoneyPriorityEngine`;
- Home and Vehicle already delegate through accepted hypothetical reruns;
- Windfall and Your Plan are distinct accepted post-engine layers;
- Recommendation Refresh already provides canonical financial-basis/recommendation diff semantics suitable for reuse;
- job-loss / temporary-income scenarios can reuse existing income overrides plus accepted `knownIncomeDisruption` / end-date emergency-reserve semantics without inventing benefits, entitlements, taxes, or recovery dates.

Manager accepts the v1 boundary:
- ephemeral authenticated drafts/results;
- no Scenario Lab persistence or Supabase migration;
- typed immutable overlays, not arbitrary JSON patching;
- one canonical engine, no fork;
- specialized Home/Vehicle/Windfall/Your Plan adapters;
- stale-baseline fail-closed behavior;
- no apply-to-profile action;
- all REQUIRES POLICY categories remain out of v1 until separately authorized.

No design audit is required: FFH-039 remained product/technical discovery and did not define new protected financial/statutory semantics.

FFH-039 is CLOSED / ACCEPTED.

Next: Manager will establish the exact post-acceptance canonical base and activate a separate Core task for the typed scenario overlay + runner foundation.
