# FFH-P01 release-readiness evidence

This document records current, privacy-safe evidence for the FFH-P01 candidate. It does not authorize production deployment, Supabase or auth configuration changes, Private Beta, merge, or use of real household data.

Lifecycle state: `PUNCH_LIST`. The original Vercel Preview-origin finding occurred on candidate `95397aa945cfec77cd374b8e13e3ecfb4e7ce800` and is preserved below as historical evidence. A subsequent bounded Preview-only origin configuration remediation resolved the blocking error, and the owner later verified browser-level calculation and CRUD functionality across Dashboard, Financial Profile, Scenario Lab, and Planning. That statement describes the original evidence checkpoint; newer owner-operated hosted-auth evidence and subsequent UI candidates are reconciled in the dated addendum below. Production readiness and later lifecycle gates are still pending.


## Manager owner-preview evidence reconciliation (2026-10-27)

**Authority and classification:** Owner-operated synthetic browser screenshots and owner reports from FFH-P01 Preview, plus inspected Supabase dashboard screenshots and historical GitHub evidence. These are **owner observations**, not fresh independent HIGH-risk audit receipts. This addendum updates the older gate matrix without overwriting preserved historical failed findings. Reconciliation starting source HEAD: `dd67ba525f44a9676b9e8528a98203739b8ef309` (PR #81, same phase branch). No credential, token, cookie, private oracle, real household financial data, or email address is recorded here.

| Area | Evidence and bounded status |
| --- | --- |
| Hosted signup and verification | **OWNER-OBSERVED PASS:** synthetic address registration; confirmation email received; link completed; destination was FFH-P01 Preview `/onboarding`, not older Production; subsequent refresh retained the authenticated onboarding session. Source: owner screenshots and confirmation in Manager conversation, October 2026. |
| Hosted Supabase URL configuration | **OWNER-VERIFIED CONFIG:** Production Site URL `https://family-finance-hub-ten-brown.vercel.app` unchanged; original Production `/auth/callback` preserved; exact FFH-P01 branch Preview `/auth/callback` added (two allowlisted URLs, no wildcard). |
| Shared email template | **OWNER-VERIFIED CHANGE:** Supabase hosted *Confirm sign up* template saved with an anchor using `{{ .ConfirmationURL }}`. This replaced the prior `{{ .SiteURL }}/auth/confirm?token_hash=...` link and is a change in the **production-backed shared Supabase Auth configuration**, not a GitHub code modification. Fresh Preview confirmation now succeeds. **Production signup/callback compatibility after the change is still unverified**; do not revert the template or either URL without a separate controlled plan. |
| Cookie and first request | **BROWSER-LEVEL SESSION PASS ONLY:** the authenticated Preview onboarding page survived refresh. No network-level `Set-Cookie` receipt, explicit first-request instrumentation, negative token lifecycle (invalid/expired/reused), forward-host/origin spoof check, or independent end-to-end Production auth smoke is implied. |
| UI and financial behavior | **OWNER-OBSERVED PASS for tested synthetic cases:** Dashboard/Profile CRUD persistence; no-profile-write Scenario Lab comparison; planning calculators; mobile and desktop layout sampling, money-flow V2 parent/category interaction; numeric wheel guard (owner confirmed mouse wheel leaves focused amounts unchanged while scrolling). This is not full responsive/accessibility or adversarial coverage at every listed viewport. |
| Multi-household isolation | **SEPARATE EVIDENCE LEVELS:** owner-operated browser tests used separate synthetic accounts with expected distinct account records; prior FFH-026 PR #68 reports a rollback-only two-household direct PostgreSQL test. Current-candidate independent direct RLS negative proof, policy-role matrix and receipts must be reviewed at the release gate. Browser absence of another household is not proof of RLS denial. |
| Confirmation-email deliverability | **OPEN / OWNER-DEFERRED:** confirmations reached iCloud **Junk**; Supabase uses existing Brevo custom SMTP with an iCloud sender address; Brevo currently has no authenticated sending domain. Owner explicitly declined a paid domain or other spending. Do not alter SMTP, purchase domains, or claim inbox delivery. Reassess before inviting outside Private Beta users. |
| Test-user deletion | **OPEN / NO CLEANUP ACTION:** Supabase Auth deletion previously failed with `households_created_by_fkey` (household creator referencing `auth.users`). No bulk Auth deletion or household cascade was performed or authorized here. Preserve the synthetic test accounts and records until a separately scoped, safe dependency-aware cleanup with exact identities, retention and ownership checks. |
| Historical FFH-026 | **NOT AUTOMATICALLY ACCEPTED:** historical R5 independent audit had a HIGH F11 identity/household-response false-PASS and F13 Chromium/runtime remained `UNVERIFIED`. A subsequent F09–F12 remediation bundle was reported successful by the producing worker, but the replacement package's complete private custody and fresh independent audit receipt are not established by this FFH-P01 repository review. F14 artifact integrity history is not a fresh replacement-package audit. Do not infer live RLS, live session, or launch safety from an offline helper. |
| Lifecycle and spending boundary | **PUNCH_LIST / HIGH:** no Phase Sync, FULL PHASE CI, frozen audit target, fresh phase audit, merge, release promotion, Production application deploy, new schema/RLS DDL, Private Beta, or paid domain authorized by this record. Owner's Supabase hosted-auth setting changes above are specifically documented and must not be mislabeled as 'no Production configuration change.' |

**Manager next gate:** preserve this documentation-only evidence update, validate branch FAST on its exact new SHA, reconcile remaining hosted Production auth and independent RLS/browser/security evidence before Phase Sync, and maintain fresh independent HIGH-risk audit requirements. PR #81 remains draft, open and unmerged until explicitly changed under Speed Workflow V2.1.

## Gate matrix

| Gate | Current result | Evidence / remaining authority |
| --- | --- | --- |
| Confirmation and PKCE callback source behavior | VERIFIED | Exact email confirmation type, bounded unique token, session-backed success, safe internal destinations, and unchanged PKCE exchange are covered by `tests/security/ffh-051-auth-remediation.test.ts`. |
| Canonical auth origin | VERIFIED in repository | Confirmation, callback, protected-route redirect, and sign-up email redirect use one fail-closed `NEXT_PUBLIC_SITE_URL` boundary. HTTPS is required except explicit loopback development. |
| Supabase hosted auth URL and confirmation template | OWNER-CHANGED / PREVIEW RETEST PASS | Owner left the Production Site URL and original Production callback intact, allowed one exact branch Preview `/auth/callback`, and changed the shared confirmation template to `{{ .ConfirmationURL }}`. Preview retest passed; Production compatibility after this shared-template change still needs verification. |
| Preview signup and session persistence | OWNER-OBSERVED PASS; FORENSIC/ADVERSARIAL GAPS OPEN | Owner confirmed synthetic signup, email confirmation, Preview `/onboarding` destination and authenticated session surviving refresh. Raw `Set-Cookie`/first-request instrumentation, token misuse/expiry/replay, host-origin negatives and Production compatibility remain independently unverified. |
| Scenario Lab null-preference reconciliation | VERIFIED | The current calculation test proves a $3,500 to $4,000 monthly-expense scenario changes capacity from $1,300 to $800 while preferences remain `null`. |
| Scenario Lab persistence/profile mutation | VERIFIED in repository | Tests prove the saved profile remains byte-for-byte equivalent and the Scenario Lab application surface contains no database or browser-storage write path. |
| Household isolation in current source | VERIFIED in repository | Authenticated membership derives the household server-side; every Scenario Lab snapshot relation is explicitly filtered by that household; security suites validate RLS policy shape and mutation constraints. |
| Deployed two-household negative RLS isolation | PRIOR/HISTORICAL EVIDENCE; CURRENT-CANDIDATE INDEPENDENT GATE OPEN | Earlier FFH-026 PR #68 cites a rollback-only synthetic isolation proof, and the owner separately observed two test accounts with distinct records. These do not by themselves establish a fresh, independently reviewed direct RLS negative receipt against the FFH-P01 release candidate. Do not conflate browser identity separation with direct PostgreSQL RLS tests. |
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


## Desktop command-center / monthly money-flow owner preview (2026-10-24)

Same Primary Builder, same `FFH-P01` / `PUNCH_LIST` / HIGH-risk draft PR #81. This desktop-only follow-up preserves the mobile-first implementation and remains separate from the production and security-evidence gates.

**Money flow:** The Dashboard now passes the existing `calculateFinancialSummary` totals and the already-fetched, household-scoped expense records into an interactive, dependency-free Sankey-style diagram. The new pure `buildMonthlyMoneyFlow` presentation model converts inputs to integer cents and fails closed for mismatched totals, invalid amounts and missing active income/recorded expenses. It separates essential vs discretionary expenses, debt minimums, employee retirement contributions and remaining monthly cash flow. Employer contributions, debts' balance principal, account balances, goals, hypothetical allocations and invented savings transfers are intentionally excluded. For a shortfall, a red source segment is explicitly marked **unfunded gap, not income**; ribbons never have negative width or imply funding priorities. Expense categories expand on demand; a semantically structured table is the textual equivalent.

**Desktop:** Compact household header and one-row net worth, monthly cash flow, savings rate and financial-health summaries. Retirement assets remain in the expanded secondary account/retirement panels. Financial Profile uses a records-first, left-category-selector view with one active section on desktop, on-demand Add/Edit, unchanged Delete and deep-link navigation. Planning selects one active calculator with assumptions and results visible side by side at comfortable widths, while all six tools remain reachable and standalone URLs remain intact. Scenario Lab opens desktop width for left-side scenario editing and side-by-side baseline/hypothetical results, with emphasized dollar/percentage differences and retained warnings/technical disclosures. Desktop content scales to 1024, 1280, 1440 and 1920 widths without requiring new dependencies or schema changes.

**Synthetic reconciliation examples** (no private financial data):

| Example | Income | Essential + discretionary expense | Debt minimums | Employee retirement | Cash flow | Unfunded gap |
|---|---:|---:|---:|---:|---:|---:|
| Default | $4,800.00 | $1,700.00 + $1,300.00 | $0.00 | $0.00 | $1,800.00 | $0.00 |
| With debt and retirement | $4,800.00 | $1,700.00 + $1,300.00 | $400.00 | $300.00 | $1,100.00 | $0.00 |
| Overcommitted | $2,500.00 | $1,700.00 + $1,300.00 | $0.00 | $0.00 | −$500.00 | $500.00 |

Reconciliation invariant: **essential + discretionary + debt minimums + employee retirement + positive remaining cash flow = recorded income + expressly unfunded shortfall**. The third example does not represent its unfunded gap as received income. All category sums reconcile to the saved expense total. Empty/incomplete sources produce a partial-data state with a Profile link.

### Desktop and mobile owner-acceptance checklist

- [ ] Desktop Dashboard at 1024/1280/1440/1920: household name + four metrics fit prominently, money-flow ribbon widths and values are legible; hover/focus reports the same amount as its accessible table; the optional category breakdown reconciles.
- [ ] Test the $4,800/$3,000/no-debt example; with $400 debt and $300 employee retirement; and a $500 shortfall. Verify employer contributions are not deducted and a shortfall is never portrayed as positive spendable cash.
- [ ] Financial Profile: use left-side Accounts/Income/Expenses/Debts/Retirement/Goals selector. Confirm Add and Edit require an explicit save, Cancel/close edit does not write, Delete retains safeguards, and `#expenses` is a working direct link.
- [ ] Desktop Planning: switch Emergency/Mortgage/Savings and open standalone Retirement/Debt/Paycheck. Check live result updates, existing warnings, zero-state labels and no saved profile mutation.
- [ ] Desktop Scenario Lab: baseline vs hypothetical both fit horizontally, signed $/percentage change visible, incomplete recommendation visible, diagnostics optional; creation/rerun/reset/duplicate/comparison/discard preserved.
- [ ] Mobile 320/375/390/430: prior compact Dashboard 2×2, six Profile disclosures, one active Planning calculator, compact Scenario Lab, four labeled safe-area nav tabs and readable warning states unchanged.
- [ ] Tablet to desktop transitions: no clipped financial numbers, hidden forms inadvertently open, keyboard traps, fixed navigation overlaps, or horizontal overflow.

Automated source tests and Vercel build cannot prove all real authenticated touch/hover/resize interactions. Owner-operated visual and CRUD preview remain required. The unresolved hosted-authentication, first authenticated request, negative two-household RLS, FFH-026 history and production-readiness gates are preserved. Do **not** run FULL PHASE CI, Phase Sync, freeze, independent audit, merge, production changes or Private Beta under this handoff.


## Money-Flow Visualization V2 — owner-review addition (2026-10-24)

**State:** Same FFH-P01 Primary Builder; bounded presentation-only V2 on Draft PR #81, `PUNCH_LIST`, HIGH risk. The already-approved mobile design and prior desktop work are left intact.

**Three-stage Sankey:** Stage 1 recorded monthly income plus a separately identified red **unfunded shortfall** source segment only when commitments exceed income. Stage 2 essential expenses, discretionary expenses, debt minimums, employee retirement contributions, and positive remaining monthly cash flow. Stage 3, shown on explicit expansion, draws proportional curved paths from each expense parent to its **actual positive recorded expense categories**. No invented transfers, expenses, employer deductions or savings allocations. Category ribbons add no additional money and reconcile to each parent.

**Adaptive geometry:** A pure `lib/calculations/monthly-money-flow-layout.ts` view-only layout, separate from the unchanged integer-cent financial model, calculates dimensions from the number of visible parent/child ribbons. The SVG viewBox height is no longer fixed at 440. Parent and child nodes reserve spacing for labels; very small flows receive a visual-only minimum thickness, with the exact amount shown in tooltips and the table. Long category names may be abbreviated visually; their full text remains in keyboard labels and the table. No extra visualization dependencies.

**Interaction/accessibility:** Hover/focus highlights a flow and its family; Enter/Space/click on an expense parent toggles Stage 3; a visible show/hide button works on touch and announces its state. An aria-live detail panel exposes cent-accurate amounts and percentage of **recorded income**; percentages can exceed 100% for deficits, which do not imply funded commitments. Reduced-motion preferences disable transitions. The semantic monthly reconciliation table remains available, now including category rows, parent-child labels, and the unfunded gap when present. On narrow viewports, the existing compact Dashboard remains the primary view.

**Synthetic assertions:**

| Fixture | Recorded income | Expense commitments | Debt minimum | Employee retirement | Remaining cash flow | Shortfall |
|---|---:|---:|---:|---:|---:|---:|
| A: two outcomes | $4,800.00 | $3,000.00 essential | $0.00 | $0.00 | $1,800.00 | $0.00 |
| B: category hierarchy | $5,000.00 | $2,500.00 essential (Housing $1,500, Groceries $700, Utilities $300), $300.00 discretionary (Entertainment) | $200.00 | $500.00 | $1,500.00 | $0.00 |
| C: unfunded | $2,500.00 | $3,000.00 essential | $0.00 | $0.00 | −$500.00 | $500.00 |
| D: incomplete | Missing active income | Input incomplete | — | — | Unknown | Not calculated |

Under fixture B, the three essential child paths sum exactly to their $2,500.00 parent and the Entertainment child path sums to the $300.00 discretionary parent. The authoritative overall invariant remains **income + labeled unfunded gap = commitments + positive remaining cash flow**. Widths are proportional to recorded amounts, except a disclosed visual-only minimum for tiny categories.

### V2 visual acceptance: owner-operated Preview

- [ ] **Compact:** at 1024/1280/1440/1920px inspect $4,800 → $3,000/$1,800; two main destinations are compact, clear and labeled $3,000 (62.5%) / $1,800 (37.5%).
- [ ] **Expanded:** activate Show expense categories and activate an essential/discretionary ribbon; Stage 3 opens as actual curved ribbons to saved categories. Each parent's child amounts sum to the parent, and one-category parents show exactly one category.
- [ ] **Spacing:** test 10 categories and tiny $0.01 values using synthetic data. Verify labels do not overlap, scale remains readable, and no chart/page horizontal overflow. Check reduced motion and high zoom.
- [ ] **Keyboard/touch:** Tab to parent/child ribbons, inspect Enter/Space/click, highlight and focus details; visible toggle, live announcements and full-category accessible table are usable without SVG hover.
- [ ] **Negative:** simulate $2,500 income and $3,000 commitments. Confirm the red $500 **unfunded gap** is not labeled as income or funded savings; no negative width.
- [ ] **Incomplete:** no active income, zero amount and irreconcilable records show honest empty/partial-data or zero-state messages with no fabricated branches.
- [ ] **Mobile regression:** recheck 320/375/390/430px Dashboard, Profile, Planning, Scenario Lab, fixed bottom navigation, safe areas and warning states. No unrelated layout changes intended.

Browser interaction and authenticated device screenshots are **not** builder-verified; owner acceptance is still needed. Prior hosted-auth, first authenticated request, two-household isolation, FFH-026 private-evidence and production gates remain unresolved. No FULL PHASE CI, Phase Sync, freeze, independent HIGH-risk audit, merge, production changes or Private Beta authorization under this assignment.
