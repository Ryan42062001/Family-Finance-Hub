# Current phase

FFH-P10 — Can We Afford It? + financial best-practice warnings

State: AUDITING
Risk: HIGH (money calculations and advice presentation, household isolation, read-only scenario surface)
Owner: Ryan
Spec (binding): GitHub issue #171 (Owner-approved design); workflow addition: issue #188 (lessons learned)
Phase branch: `phase/ffh-p10-can-we-afford-it`, started at `304d60648b900c9909396776da0c1cf9ae139c53` (Production
`83979c1c9e3b6f2e6ac1f26f3d5643c8f98061db` plus the P09 close-out carried forward from draft #187)
Phase PR: #189 (phase → `main`, draft; collects QA, audit and release evidence)
Previous phase: FFH-P09 RELEASED / CLOSED (PR #186, Production smoke 12/12).

**Production deployment is NOT authorized.** Every merge into `main` is a separate Production release requiring
Ryan's explicit exact-SHA authorization. Hosted SQL, Supabase Auth, Vercel (including moving the fixed Preview
domain), secrets and real data need Ryan's approval per action.

## What P10 builds

- **What if?** (`/what-if`) replaces the Scenario Lab tab; Scenario Lab stays under **Tools** on that page (detailed
  view). Your plan gets **Can we afford a home? / a vehicle?** buttons. Simple view keeps What if? in its menu.
- **Guided purchase check** (`/what-if/purchase?type=home|vehicle`): one option, or two side by side, each with its
  own entries and result. The verdict is the canonical evaluator's, unchanged (`runHomeScenarioAdapter` /
  `runVehicleScenarioAdapter` on a freshly loaded server baseline). Blank costs stay unknown. Read-only: nothing saved.
- **Financial rules of thumb** (`lib/purchase-check/guidance.ts`): 28% housing, 36% debt (Fannie Mae), 20/3/8 (Money
  Guy), vehicle value ≤ half of income (Ramsey), 3–6 months of emergency savings (CFPB). Separate, educational,
  nonblocking; "Insufficient information" when an input is missing.
- No migration, no new table, no hosted change expected. No hypothetical PDF/CSV export.
- QA rows Q46–Q57.

## Status (2026-11-19)

- Built and merged into the phase branch via #190 (`c8734bd`); whole-phase `/code-review high`: 6 findings, all fixed.
- `c8734bd`: CI `fast`, `rls-matrix`, `e2e-isolation` PASS 58/58 (incl. `/what-if`, `/what-if/purchase`); Preview
  serves it; Preview smoke 12/12; signed-out `/what-if*` → Sign in.
- Browser QA Q46–Q57 PASS on `c8734bd` (no findings); phone-width parts of Q46/Q57 are Ryan's device checks (NOT RUN).
- Frozen for the independent different-model audit at the phase head after this docs-only update (app code as QA'd).
