# FFH-P01 release-readiness evidence

This document records current, privacy-safe evidence for the FFH-P01 candidate. It does not authorize production deployment, Supabase or auth configuration changes, Private Beta, merge, or use of real household data.

Lifecycle state: `PUNCH_LIST`. The original Vercel Preview-origin finding occurred on candidate `95397aa945cfec77cd374b8e13e3ecfb4e7ce800` and is preserved below as historical evidence. A subsequent bounded Preview-only origin configuration remediation resolved the blocking error, and the owner later verified browser-level calculation and CRUD functionality across Dashboard, Financial Profile, Scenario Lab, and Planning. This does **not** establish hosted-auth or production readiness. The current ten-item UI punch-list remediation requires new exact-head FAST and owner-preview verification; all later lifecycle gates remain pending.

## Gate matrix

| Gate | Current result | Evidence / remaining authority |
| --- | --- | --- |
| Confirmation and PKCE callback source behavior | VERIFIED | Exact email confirmation type, bounded unique token, session-backed success, safe internal destinations, and unchanged PKCE exchange are covered by `tests/security/ffh-051-auth-remediation.test.ts`. |
| Canonical auth origin | VERIFIED in repository | Confirmation, callback, protected-route redirect, and sign-up email redirect use one fail-closed `NEXT_PUBLIC_SITE_URL` boundary. HTTPS is required except explicit loopback development. |
| Production site URL, Supabase redirect allowlist, and email-template configuration | REQUIRES SEPARATE PRODUCTION AUTHORIZATION | No hosted auth or environment configuration was read or changed in FFH-P01. |
| Cookie/session establishment and first authenticated browser request | UNVERIFIED | Requires an owner-authorized preview/runtime exercise with a synthetic account. Source and contract tests do not substitute for browser/runtime evidence. |
| Scenario Lab null-preference reconciliation | VERIFIED | The current calculation test proves a $3,500 to $4,000 monthly-expense scenario changes capacity from $1,300 to $800 while preferences remain `null`. |
| Scenario Lab persistence/profile mutation | VERIFIED in repository | Tests prove the saved profile remains byte-for-byte equivalent and the Scenario Lab application surface contains no database or browser-storage write path. |
| Household isolation in current source | VERIFIED in repository | Authenticated membership derives the household server-side; every Scenario Lab snapshot relation is explicitly filtered by that household; security suites validate RLS policy shape and mutation constraints. |
| Deployed two-household negative RLS isolation | REQUIRES SEPARATE PRODUCTION AUTHORIZATION / UNVERIFIED | Repository tests do not execute deployed PostgreSQL policies. Run the rollback-only synthetic procedure from `docs/SECURITY_TESTS.md` only after bounded authorization. |
| FFH-026 historical F09–F14 gates | NOT INHERITED | Historical receipts are evidence only. Current deterministic source gates are rerun here; the historical F11 response-identity issue and F13 browser/runtime gap are not declared closed without current runtime evidence. |
| Private fixture/oracle/dependency custody | NOT REQUIRED for public deterministic suite | No private bytes or substituted oracle are needed for the current calculation/security suites. Any later production canary requiring private custody needs separate authorization and a privacy-safe receipt. |

## Preview-origin finding and bounded presentation follow-up

- **Historical finding:** Earlier owner preview returned `{"error":"Authentication origin is not configured."}` on `/dashboard` with the Preview origin unconfigured. This was a real blocker at that time.
- **Subsequent status:** Preview-only origin remediation and owner browser tests confirmed the error cleared; Production environment and Supabase hosted-auth settings were not modified or accepted.
- **Owner-confirmed application behavior:** Dashboard, Financial Profile CRUD, Scenario Lab, emergency-fund, mortgage, savings goal, retirement, single-debt, avalanche/snowball, and Paycheck Planner calculations were exercised in the browser with synthetic fixtures. This covers application UI interactions, not new-signup confirmation, the first authenticated request, deployed negative two-household isolation, or FFH-026 private evidence.
- **Current punch-list batch:** Mortgage/goal empty states; zero time saved; negative-zero dashboard deductions; currency-field display; accessible over-budget warning; annual shortfall labels; Scenario Lab plain language; debt payoff sequence interpretation; and this release note. Owner verification of the *new* commit and corresponding READY Preview remains pending.

## Owner preview procedure

Use synthetic identities and synthetic financial values only. On an authorized preview/runtime environment:

1. Confirm `NEXT_PUBLIC_SITE_URL`, the Supabase redirect allowlist, and confirmation email template point to the same exact HTTPS origin.
2. Sign up a synthetic user, follow the confirmation link, and verify the first authenticated request reaches the expected internal destination with a valid session cookie.
3. Verify an external or lookalike origin and an external `next` destination fail closed without leaking tokens or provider details.
4. With a profile whose preferences are absent, change monthly expenses from $3,500 to $4,000 in Scenario Lab and confirm capacity changes from $1,300 to $800.
5. Reload the saved profile and confirm preferences remain absent and no profile value changed.
6. Record only pass/fail, exact candidate SHA, runtime/deployment identity, and privacy-safe timestamps. Do not record tokens, cookies, email links, credentials, or household values beyond the synthetic fixture contract.

## Rollback plan

Before any separately authorized production promotion, record the exact previous known-good deployment and candidate SHA, snapshot the non-secret auth origin/redirect configuration, and verify that no schema migration is included. If auth, session, or household isolation fails, stop the release and Private Beta, restore the previous Vercel production alias and prior auth origin/redirect configuration, then rerun auth and isolation checks. FFH-P01 performs no schema migration, so database rollback is not part of this candidate. No rollback or production change has been performed by this phase.

## Mobile-first FFH-P01 owner-preview remediation (2026-10-24)

One bounded follow-up to the prior ten-item presentation punch list, under the same `PUNCH_LIST` phase and Draft PR #81. The single newer main policy for Regular Chat execution was integrated as a two-parent merge before mobile implementation. Source-level mobile work covers:

1. **Dashboard:** purpose-built compact mobile summary, prominent calculated monthly cash flow with a non-discretionary caution, a two-column group for net worth, savings rate, retirement and financial health, and expandable account/expense/debt/retirement/goal details. No new money metrics or math.
2. **Financial Profile:** six native accessible section disclosures with count and financial total, separate on-demand Add form, unchanged independent Edit/Delete forms and server actions; target hash opens a section and scrolls below navigation. Desktop disclosure expands on mount.
3. **Planning:** six choices, one visible on the main mobile Planning route at a time; separate route links for Retirement, Debt and Paycheck; results visually precede collapsed editable assumptions. All calculators remain temporary and no profile writes were added.
4. **Scenario Lab:** saved-plan versus hypothetical monthly capacity with signed amount and percentage; uncertain recommendation warnings remain visible; assumption composer and diagnostics are disclosed on demand. Technical recommendation reason is translated only for display; the original is available in Technical details.
5. **Navigation:** current-page-aware, text-labeled bottom navigation for Home, Profile, Planning and Scenarios, plus separate Account/Sign Out menu; safe-area padding prevents obscuring forms.

The synthetic browser fixtures and previous financial/security guarantees continue to govern the change. In particular, $4,800 monthly income, $3,000 expenses, $1,800 cash flow, $1,000 net worth, and a 37.5% savings rate (without debts or retirement contributions) are expected. Scenario Lab $1,800 → $1,300 must show −$500 (−27.78%) without profile mutations. The $169.23 biweekly paycheck deficit and −$4,400 annual shortfall remain authoritative test examples.

### Owner's final mobile Preview checklist

Use test-only household data. On a 320px, 375px, 390px and 430px phone viewport (plus tablet and desktop) verify:

- [ ] Dashboard shows cash flow immediately, then the compact 2×2 metrics and expandable summaries; no clipped dollar values, misleading "discretionary" claim, or horizontal page scrollbar.
- [ ] Profile initially shows the six section summaries; tapping a summary reveals existing records, Add is on demand, Edit updates the same record (does not duplicate), and Delete uses existing safeguards.
- [ ] A direct link to `/financial-profile#expenses` opens Expenses and leaves its heading visible below the sticky header.
- [ ] Planning switches emergency, mortgage and savings tools without changing saved records; Retirement, Debt and Paycheck routes remain accessible; results precede editable assumptions on phone.
- [ ] Mortgage/goal zero-input states and the over-budget red bar, explicit warning, cent-level deficit and signed annual shortfall remain correct.
- [ ] Scenario Lab shows current vs what-if values with the exact delta and percent; incomplete recommendation warnings are visible before expanding technical details; create/run/rerun/reset/duplicate/compare/discard still work.
- [ ] The four bottom navigation items show their labels and selected state, Account menu permits sign-out, keyboard navigation and safe areas work, and the nav does not cover any controls.
- [ ] Desktop remains a usable two-column layout, with server-side CRUD/authentication and financial calculations unchanged.

Automated source/financial/security checks and a READY Vercel Preview cannot substitute for this owner-operated mobile visual and interactive acceptance. The first authenticated browser request, hosted confirmation, deployed two-household RLS, private FFH-026 artifacts, exact production release, and all independent audit gates remain unresolved and separately authorized.
