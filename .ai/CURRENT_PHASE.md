# Current phase

FFH-P02 — Modern UI refresh and dark mode

State: BUILDING
Risk: LOW (presentation only)
Owner: Ryan
Phase branch / PR: `phase/ffh-p02-modern-ui` → `main`
Design reference: owner-approved mockup (Claude canvas "Family Finance Hub refresh", 2026-11-12)

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

A modern, futuristic look across every page, with a **dark mode** that follows the device setting and a manual toggle.
After Ryan's first Preview review ("still too similar"), the scope grew to a structural refresh (approved 2026-11-12):
a left sidebar app shell on wide screens, a bento dashboard with ring gauges, glass cards on a glowing background,
segmented tabs and a split-screen sign-in.

## Scope

- A design-token rewrite in `app/globals.css` with light and dark themes.
- Structural presentation changes: sidebar shell (`AppHeader`, `DesktopNavLink`), account menu holding Sign out,
  slim page titles, bento dashboard (`app/dashboard/page.tsx`; rings and bars only draw values already shown as text),
  profile and planning tabs, split-screen auth pages, icon tab bar on phones.
- Header, navigation and the mobile tab bar restyled, plus a theme toggle (remembered per browser, no flash on load).
- Every page restyled through the shared tokens: auth, onboarding, dashboard (including the money-flow chart),
  financial profile, planning and Scenario Lab.
- `docs/workflow/QA_CHECKLIST.md` gains dark-mode checks and the new layout's expectations.

## Out of scope / boundaries

- No changes to calculations, data, auth, RLS, server actions or database. Any such change is a different phase.
- New features (household invitations, account settings, bills, history, CSV import) are later phases, in the order
  recorded in `docs/PRODUCT_ROADMAP.md`.

## Done when

- CI green (`fast`, `rls-matrix`); `npm run verify` passes.
- Work mode QA on the Preview passes in light and dark mode; Ryan accepts the look.
- Independent review: a fresh Claude session (routine, LOW-risk phase).
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
