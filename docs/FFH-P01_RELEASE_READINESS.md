# FFH-P01 release-readiness evidence

This document records current, privacy-safe evidence for the FFH-P01 candidate. It does not authorize production deployment, Supabase or auth configuration changes, Private Beta, merge, or use of real household data.

Lifecycle state: `PUNCH_LIST`. The original Vercel Preview-origin finding occurred on candidate `95397aa945cfec77cd374b8e13e3ecfb4e7ce800` and is preserved below as historical evidence. A subsequent bounded Preview-only origin configuration remediation resolved the blocking error, and the owner later verified browser-level calculation and CRUD functionality across Dashboard, Financial Profile, Scenario Lab, and Planning. That statement describes the original evidence checkpoint; newer owner-operated hosted-auth evidence and subsequent UI candidates are reconciled in the dated addendum below. Production readiness and later lifecycle gates are still pending.


## Manager owner-preview evidence reconciliation (2026-10-27)

**Authority and classification:** Owner-operated synthetic browser screenshots and owner reports from FFH-P01 Preview, plus inspected Supabase dashboard screenshots and historical GitHub evidence. These are **owner observations**, not fresh independent HIGH-risk audit receipts. This addendum updates the older gate matrix without overwriting preserved historical failed findings. Reconciliation starting source HEAD: `dd67ba525f44a9676b9e8528a98203739b8ef309` (PR #81, same phase branch). No credential, token, cookie, private oracle, real household financial data, or email address is recorded here.

| Area | Evidence and bounded status |
| --- | --- |
| Hosted signup and verification | **OWNER-OBSERVED PASS:** synthetic address registration; confirmation email received; link completed; destination was FFH-P01 Preview `/onboarding`, not older Production; subsequent refresh retained the authenticated onboarding session. Source: owner screenshots and confirmation in Manager conversation, October 2026. |
| Hosted Supabase URL configuration | **OWNER-VERIFIED CONFIG:** Production Site URL `https://family-finance-hub-ten-brown.vercel.app` unchanged; original Production `/auth/callback` preserved; exact FFH-P01 branch Preview `/auth/callback` added (two allowlisted URLs, no wildcard). |
| Shared email template | **OWNER-VERIFIED CHANGE:** Supabase hosted *Confirm sign up* template saved with an anchor using `{{ .ConfirmationURL }}`. This replaced the prior `{{ .SiteURL }}/auth/confirm?token_hash=...` link and is a change in the **production-backed shared Supabase Auth configuration**, not a GitHub code modification. Fresh Preview confirmation now succeeds. **Production signup/callback compatibility is now OWNER-OBSERVED PASS** for a new synthetic signup, as documented in the dated follow-up below; this is not independent security proof. Do not revert the template or either URL without a separate controlled plan. |
| Cookie and first request | **BROWSER-LEVEL SESSION PASS ONLY:** the authenticated Preview onboarding page survived refresh. No network-level `Set-Cookie` receipt, explicit first-request instrumentation, negative token lifecycle (invalid/expired/reused), or deployed hostile Host/origin/redirect spoof check is implied. A separate **owner-operated Production login and signup smoke PASS** is recorded below, not an independent security audit. |
| UI and financial behavior | **OWNER-OBSERVED PASS for tested synthetic cases:** Dashboard/Profile CRUD persistence; no-profile-write Scenario Lab comparison; planning calculators; mobile and desktop layout sampling, money-flow V2 parent/category interaction; numeric wheel guard (owner confirmed mouse wheel leaves focused amounts unchanged while scrolling). This is not full responsive/accessibility or adversarial coverage at every listed viewport. |
| Multi-household isolation | **SEPARATE EVIDENCE LEVELS:** owner-operated browser tests used separate synthetic accounts with expected distinct account records; prior FFH-026 PR #68 reports a rollback-only two-household direct PostgreSQL test. Current-candidate independent direct RLS negative proof, policy-role matrix and receipts must be reviewed at the release gate. Browser absence of another household is not proof of RLS denial. |
| Confirmation-email deliverability | **OPEN / OWNER-DEFERRED:** confirmations reached iCloud **Junk**; Supabase uses existing Brevo custom SMTP with an iCloud sender address; Brevo currently has no authenticated sending domain. Owner explicitly declined a paid domain or other spending. Do not alter SMTP, purchase domains, or claim inbox delivery. Reassess before inviting outside Private Beta users. |
| Test-user deletion | **OPEN / NO CLEANUP ACTION:** Supabase Auth deletion previously failed with `households_created_by_fkey` (household creator referencing `auth.users`). No bulk Auth deletion or household cascade was performed or authorized here. Preserve the synthetic test accounts and records until a separately scoped, safe dependency-aware cleanup with exact identities, retention and ownership checks. |
| Historical FFH-026 | **NOT AUTOMATICALLY ACCEPTED:** historical R5 independent audit had a HIGH F11 identity/household-response false-PASS and F13 Chromium/runtime remained `UNVERIFIED`. A subsequent F09–F12 remediation bundle was reported successful by the producing worker, but the replacement package's complete private custody and fresh independent audit receipt are not established by this FFH-P01 repository review. F14 artifact integrity history is not a fresh replacement-package audit. Do not infer live RLS, live session, or launch safety from an offline helper. |
| Lifecycle and spending boundary | **PUNCH_LIST / HIGH:** no Phase Sync, FULL PHASE CI, frozen audit target, fresh phase audit, merge, release promotion, Production application deploy, new schema/RLS DDL, Private Beta, or paid domain authorized by this record. Owner's Supabase hosted-auth setting changes above are specifically documented and must not be mislabeled as 'no Production configuration change.' |

**Manager next gate (reconciled below):** preserve this evidence-only record and verify exact-head branch FAST. Production signup now has owner-observed success; independently reviewed RLS, adversarial token/Host/redirect and first-request/`Set-Cookie` evidence, FFH-026 custody, rollback and production-release acceptance remain open before any Manager-authorized progression. PR #81 remains draft, open and unmerged until explicitly changed under Speed Workflow V2.1.

## Nonproduction adversarial authentication route-execution evidence — 2026-10-27

**Authority:** same FFH-P01 Primary Builder on Draft PR #81, Speed Workflow V2.1, HIGH / \`PUNCH_LIST\`. One bounded synthetic **nonproduction** test-only pass. This addendum is deliberately distinct from the earlier 2026-10-27 owner browser report, source-only FFH-051 assertions, and any fresh independent audit. No hosted Auth, Supabase data/SQL, production traffic, application routes, UI, policies, financial logic, credentials or release configuration were changed.

**Executed test boundary:** \`tests/security/ffh-p01-auth-route-execution.test.ts\` compiles and executes the **actual unchanged** confirmation route, PKCE callback route, signup action and SSR server/proxy modules using TypeScript's already installed compiler and isolated fake \`NextResponse\`, \`next/headers\` and Supabase adapters. The current shared \`trustedRequestUrl\`, \`safeInternalDestination\`, and \`singleBoundedAuthParameter\` implementations execute without mocks. Redirects/statuses, provider calls and fake cookie callback parameters are asserted; all credentials, identity strings and cookie values are synthetic. The fake response and cookie adapters are **not** a Next.js runtime, deployed \`Set-Cookie\`, actual provider token verifier, HTTP proxy, authenticated browser or real first protected request.

### Confirmed source/runtime-level security finding — BLOCKED pending Manager routing

**FFH-P01 AUTH-NEXT-ENCODED-CONTROL (new test finding):** An executed \`app/auth/confirm/route.ts\` successful **mock** email-OTP exchange with \`next=/path%0Aunsafe\` (received as a URL-encoded query parameter) redirected to \`https://ffh-synthetic.example/path%0Aunsafe\` rather than the required same-origin safe fallback \`https://ffh-synthetic.example/dashboard\`. Its origin remained synthetic and same-origin. The current \`lib/auth/safe-destination.ts\` rejects *literal* control characters and selected encoded separators, but its \`UNSAFE_CHARACTER\` pattern does not reject the **percent-encoded control sequence** \`%0A\` in the path. The same helper is used by the callback route. This is a reproduced fail-closed input-validation gap in the nonproduction route-execution harness; **no open redirect, HTTP response splitting, live token compromise, production exploitation or downstream interpretation is established**. Security impact and remediation design require Manager triage.

**Regression policy:** The new dedicated test \`AUTH CONTROL-CHARACTER GATE: encoded newline in next must fail closed\` intentionally expects \`/dashboard\`. It must **remain failing** until a separately authorized, narrowly scoped security implementation fixes and tests the helper. Do **not** weaken the assertion, mark the exact-head FAST as SUCCESS, or infer production safety from the other green cases. The original first-run tests also exposed harness-only problems (Node 22 strip-types parameter property, and cross-VM prototype deep equality); both were fixed without changing the app. This security discrepancy is the remaining intentional finding.

### Evidence-level matrix

| Surface or requirement | Evidence class | Outcome and limitation |
| --- | --- | --- |
| Confirmation query validation | **EXECUTED SYNTHETIC ROUTE** | Unique bounded email token accepted; missing/empty/duplicate/oversized token, wrong/duplicate type rejected before provider call; provider missing session, error or thrown exception follows generic token-free redirect. |
| Invalid/expired/reused confirmation tokens | **EXECUTED SYNTHETIC ROUTE + FAKE PROVIDER REJECTION** | Generic error redirect when the fake provider returns those rejection statuses. **Does not prove real Supabase token expiry, single-use or replay enforcement.** |
| PKCE code callback | **EXECUTED SYNTHETIC ROUTE + FAKE PROVIDER** | Normal successful mocked code exchange sends the user to a safe same-origin destination; missing or provider-rejected invalid/expired/reused synthetic code returns generic login redirect; real PKCE verifier/session exchange, provider exception handling and host-side token behavior are not proven. |
| Origin and redirect negatives | **EXECUTED SYNTHETIC ROUTE** | Lookalike/wrong-scheme untrusted URL origins return HTTP 400 without invoking provider; forwarded Host headers cannot override the URL-only trust helper in this mock. External, protocol-relative, nested, duplicate, encoded-separator \`next\` inputs fall back to \`/dashboard\`. **Exception: percent-encoded newline in \`next\` reproduces AUTH-NEXT-ENCODED-CONTROL and blocks sign-off.** |
| Sign-up origin | **EXECUTED SYNTHETIC SERVER ACTION** | Valid matching-origin synthetic signup passes the canonical HTTPS callback URL to fake \`auth.signUp\`; hostile Origin returns before provider. No real hosted signup was performed here. |
| SSR cookie adapter wiring | **EXECUTED SYNTHETIC DEPENDENCY CALLBACKS** | Server \`getAll/setAll\` delegates to mock cookie store with unchanged options; proxy fake session-refresh callback forwards fake writes to mock request/response and preserves synthetic headers. **Not evidence of deployed HTTP \`Set-Cookie\`, its attributes, actual browser storage, session continuity or first authenticated request.** |
| Existing FFH-051 auth security checks | **SOURCE TEXT + EXECUTED PURE HELPERS** | \`tests/security/ffh-051-auth-remediation.test.ts\` already tests pure canonical origin/destination/token helpers and source shape; this assignment did not duplicate its static assertions to claim independent route proof. |
| Preview and existing Production normal signup/login and refresh | **OWNER-OBSERVED BROWSER PASS** | Prior dated report remains valid for tested normal flows. Not a signed adversarial audit or evidence of behavior on the current FFH-P01 branch deployed to Production. |
| Deployed adversarial Host/token/redirect and first \`Set-Cookie\` | **NOT EXECUTED / OPEN** | Controlled, authorized deployed candidate-specific tests and privacy-safe instrumented first-request receipts remain required; this harness cannot prove provider token lifecycle or actual HTTP response/cookie behavior. |
| Direct two-household role-aware PostgreSQL RLS | **SEPARATE OPEN RELEASE GATE** | Needs current-candidate independently reviewed synthetic direct denial matrix across owner/member/viewer/non-member, SELECT/INSERT/UPDATE/DELETE and mutation/role boundaries. Browser-separated account records and historic FFH-026 worker statements do not prove this. No SQL executed. |
| Historical FFH-026 F11/F13 and private evidence | **SEPARATE OPEN CUSTODY / AUDIT GATE** | Previous HIGH F11 response-identity false-PASS and F13 browser/runtime \`UNVERIFIED\` remain historical issues needing Manager disposition, artifact/source-oracle provenance where needed and fresh independent review. Historical worker-reported F09–F12 repair is not independent current approval. A historical offline Chromium/browser helper is **not automatically a required current-app dependency**; Manager must first document whether the current application verification strategy needs that private harness or an authorized equivalent. |
| Operational rollback and production-readiness parity | **SEPARATE OPEN RELEASE GATE** | Existing rollback *plan* is not a tested rollback or authenticated deployment/current SHA receipt. Manager authorization and independent evidence remain required; no Vercel promotion/rollback or production mutation performed. |

**Manager decision required before resuming auth source work:** classify severity and authorize a bounded auth-destination validation fix (including rejection of percent-encoded control input, both confirm/callback test cases, and valid-path preservation) or specify another evidence-based resolution. Then rerun current exact-head FAST and reassess affected security evidence. Other independent RLS, deployed adversarial/first-cookie, FFH-026 and operational rollback gates remain open. Do not start Phase Sync, FULL PHASE CI, immutable freeze, independent audit, merge, Production deployment, rollback, Private Beta or spending under this assignment.


## Production authentication browser follow-up — owner report (2026-10-27)

**Evidence classification: OWNER-OBSERVED PASS, not independently audited.** This updates the Production compatibility question left open in the 2026-10-27 Manager reconciliation above. It does **not** supersede historical audit findings, authenticate the FFH-P01 branch as a deployed Production release, or establish a cross-household RLS denial. Observations below are from Product Owner browser testing with synthetic accounts; private screenshots and credential-bearing browser/network artifacts are not committed.

| Runtime and operation | Owner report | Classification and limit |
| --- | --- | --- |
| FFH-P01 Preview — new signup | Synthetic signup, confirmation email, callback to the **exact FFH-P01 branch Preview**, protected onboarding and an authenticated session after refresh succeeded. | **OWNER-OBSERVED PASS**, no raw cookie/first-request instrumentation. Existing dated evidence retained. |
| Existing Production — existing test account | Existing Yahoo test identity signed in, its Dashboard showed the previously recorded **synthetic test balance**, and the session persisted through a browser refresh. | **OWNER-OBSERVED PASS** for sign-in, protected Dashboard read and refresh; not a new-account confirmation or direct database-isolation proof. No actual balance or account identifier is copied here. |
| Existing Production — new signup after shared template change | New synthetic identity signed up, completed confirmation from the delivered email, landed on `https://family-finance-hub-ten-brown.vercel.app/onboarding` and remained authenticated on refresh. | **OWNER-OBSERVED PASS** for Production email-confirmation destination, protected onboarding and refresh on the existing Production deployment; no network-level `Set-Cookie` or independent adversarial proof. |
| Shared hosted Supabase Auth | Owner saved shared **Confirm sign up** template with `{{ .ConfirmationURL }}` and retained exact Production and Preview `/auth/callback` allowlist entries. Both regular signup flows subsequently passed. | **OWNER-CONFIRMED HOSTED CONFIGURATION + BROWSER PASS**. Existing shared Production-backed setting change is recorded; do not change hosted Auth, URLs, secrets or templates in this documentation task. |
| Brevo / iCloud delivery | Brevo delivered confirmation messages, but iCloud categorized them as **Junk**. Owner deferred a sending-domain purchase and deliverability improvement. | **DELIVERY OBSERVED / DELIVERABILITY OPEN, OWNER-DEFERRED**. No promise of Inbox arrival, spend, SMTP or domain change; revisit before outside Private Beta invitation. |
| Test-account cleanup | Previous Supabase Auth test-identity removal hit `households_created_by_fkey`. | **BLOCKED / NO DELETION AUTHORIZED**. Preserve test users, households, constraints and data; any cleanup requires separate dependency-aware Manager authorization. |

### Current-candidate security and release gates — still open

The following items are **NOT independently VERIFIED** by the owner-observed signup, refresh and browser-account separation results. Repository source tests and historical FFH-026 artifacts may support their design but cannot be promoted into current deployed adversarial or independent runtime PASS.

| Required evidence | Current classification / exact outstanding action |
| --- | --- |
| **Direct negative cross-household PostgreSQL RLS** | **OPEN — release blocker.** Against an approved synthetic, production-safe/current-candidate test environment, independently review role-aware owner/member/viewer/nonmember and Household A/B policy-role evidence for denied cross-household SELECT/INSERT/UPDATE/DELETE, membership revocation, household reassignment and creator constraints, including cleanup/rollback. Owner-visible distinct records and historic PR #68 rollback-only SQL do not constitute a fresh independently reviewed negative RLS receipt. No SQL or test-data mutation authorized here. |
| **Confirmation token lifecycle** | **OPEN — security evidence gate.** Obtain approved negative invalid/expired/already-used token and replay behavior, including safe failure response and absence of credential/token exposure; the successful real confirmation email proves neither expiration enforcement nor replay rejection. Requires separate scoped instrumented/adversarial check, not this docs task. |
| **Host/origin and destination redirects** | **OPEN — deployed adversarial proof.** Repository test assertions cover canonical origin, safe internal destinations and rejecting forwarded-host-style trust, but obtain approved runtime hostile `Host`/`X-Forwarded-Host`, lookalike origins, external/encoded `next` URLs, and callback/redirect fail-closed receipts on the exact intended candidate. Do not confuse source-level tests with deployed hostile-request proof or expose tokens in receipts. |
| **First authenticated request and `Set-Cookie`** | **OPEN — instrumented runtime evidence.** Owner refresh success establishes practical session continuity. Separately verify first protected request immediately after confirmation/login, expected status/redirect and privacy-safe `Set-Cookie` presence/attributes, session propagation and safe error behavior on the exact candidate, without storing cookie values or confirmation links. |
| **FFH-026 F11/F13 and private evidence** | **OPEN — independent custody/audit gate.** Historical R5 F11 contained a HIGH false-PASS of response identity/household equivalence; F13 browser/Chromium/runtime behavior remained `UNVERIFIED`. A later F09–F12 worker-reported remediation (including tests/bundles) and historic F14 checks do **not** close F11/F13 without replacement private-artifact custody, source/oracle/dependency provenance, exact hashes and a **fresh independent** review where required. Do not place proprietary/private oracle bytes, secrets or household data in GitHub. Manager must route any missing evidence or new testing separately. |
| **Production release and rollback readiness** | **OPEN — governance/release blocker.** The observed existing Production site is not proof that Draft PR #81/current SHA was deployed. Before any separate authorization: pin exact intended production deployment/SHA, known-good rollback target and non-secret relevant hosted-auth setting state; verify deployment/environment/migration parity, production-safe negative smoke, privacy-safe rollback feasibility and stop criteria. Existing rollback *plan* is documented above but has not been executed or independently accepted. No promotion/rollback/configuration or production mutation under this assignment. |
| **Full release governance** | **PUNCH_LIST / HIGH.** Consolidated owner/Manager decision is required before Phase Sync; then separately authorized exact-head FULL PHASE CI, immutable freeze, fresh independent HIGH-risk audit, and explicit owner merge/deployment decisions in workflow order. FAST or a working browser signup does not replace these gates. |

**Manager routing:** Treat the two normal signup/callback flows and existing-account Production sign-in as **owner-observed functional PASS** only. Keep security-critical RLS, adversarial authentication and first-request evidence, FFH-026 provenance/F11/F13, deployment/rollback, deferred mail deliverability and safe test-data cleanup separately unresolved. If privileged testing or remediation is necessary, raise a specific scoped Manager authorization rather than broadening this documentation assignment. Do not invoke Phase Sync, FULL PHASE CI, freeze, auditor, merge, Production deployment, Supabase edits, data deletion, paid resources or Private Beta.

## Gate matrix

| Gate | Current result | Evidence / remaining authority |
| --- | --- | --- |
| Confirmation and PKCE callback source behavior | VERIFIED | Exact email confirmation type, bounded unique token, session-backed success, safe internal destinations, and unchanged PKCE exchange are covered by `tests/security/ffh-051-auth-remediation.test.ts`. |
| Canonical auth origin | VERIFIED in repository | Confirmation, callback, protected-route redirect, and sign-up email redirect use one fail-closed `NEXT_PUBLIC_SITE_URL` boundary. HTTPS is required except explicit loopback development. |
| Supabase hosted auth URL and confirmation template | OWNER-CHANGED / PREVIEW + PRODUCTION BROWSER PASS | Owner preserved the exact Production and branch Preview callback allowlist entries and shared `{{ .ConfirmationURL }}` template. Separate new-account browser signup/confirmation flows succeeded on both destinations. Hosted settings were changed by the owner before this documentation assignment; no additional config change is authorized. |
| Preview and Production signup/session persistence | OWNER-OBSERVED PASS; FORENSIC/ADVERSARIAL GAPS OPEN | Preview: synthetic signup, confirmation, exact Preview protected `/onboarding` and refresh persistence. Production: existing test account signed in with prior synthetic Dashboard data visible and session retained after refresh; separate new synthetic account confirmed by email, reached Production `/onboarding`, and remained signed in after refresh. These are owner browser observations only; raw first-request/`Set-Cookie`, token lifecycle, deployed hostile Host/redirect and independent security checks remain open. |
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
