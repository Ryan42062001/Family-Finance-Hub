# Browser QA checklist

Run this on the **Vercel Preview of the phase branch** after each merge into the phase branch. ChatGPT Work mode
(Cloud Browser) normally runs it; Ryan can too. The Builder updates this file whenever a phase adds or changes
screens.

- **Test accounts:** use only the synthetic test accounts **TestA** and **TestB**. Ryan types their logins
  only in Work mode's secure sign-in window (never in the chat); they are never stored in the repository.
- **Data:** synthetic data only. Never enter real names, amounts, accounts or personal details.
- **Isolation of accounts:** sign in to only one account at a time (sign out before switching). Two tabs in one
  browser share a single login.
- **Out of scope:** Supabase, the Vercel settings pages, GitHub settings and the Production site
  (`family-finance-hub-taupe.vercel.app`, or the retired `family-finance-hub-ten-brown.vercel.app`).

Preview: `https://family-finance-hub-preview.vercel.app`, which always serves the **current phase branch** (see
`.ai/CURRENT_PHASE.md` and "Preview setup" in `docs/WORKFLOW.md`).

## Checks

| # | Check | Steps | Expected |
|---|---|---|---|
| Q1 | Signed-out header | Open the Preview signed out, go to `/auth/login` | A slim top bar shows only the **Family Finance Hub** logo and the theme button: no Overview / Financial profile / Planning / Scenario Lab links, no account menu. On a wide window the sign-in form sits beside a dark brand panel |
| Q2 | Protected pages need sign-in | Signed out, open `/dashboard`, `/financial-profile`, `/planning` and `/scenario-lab` | Each one redirects to the Sign in page |
| Q3 | Sign in | Sign in as TestA on a wide window (1280 px or more) | Overview opens with **TestA** as the household. A left sidebar shows the four sections with icons; the theme button and the round account button sit at its bottom. The dashboard shows the cash-flow card with a Savings rate ring, Net worth with an assets/debt bar, and a Financial health ring |
| Q4 | Add synthetic data (TestA) | Financial profile: if missing, add income `ZZ-A-Paycheck` (monthly take-home `5000`) and expense `ZZ-A-Rent` (category Housing, `3500`) | Both appear in their lists, and Overview totals update |
| Q5 | Scenario Lab does not save | Scenario Lab → **Create scenario** → Assumption type **Recurring expense change** → Expense **ZZ-A-Rent** → Monthly amount `4000` → **Add assumption** → **Run scenario** | The result shows a change of **−$500.00**. Then Financial profile → reload: ZZ-A-Rent is still **$3,500** |
| Q6 | Sign out | Click the round account button (sidebar bottom on a wide window, top right otherwise) → **Sign out** | Back on Sign in; Q1 holds again |
| Q7 | Isolation, B cannot see A (also automated: `E2E isolation (Preview)`) | Sign in as TestB. If missing, add expense `ZZ-B-Groceries` (Groceries, `222`). Visit all four tabs | No `ZZ-A-…` record, no $5,000 income and no TestA name anywhere |
| Q8 | Isolation, A cannot see B (also automated: `E2E isolation (Preview)`) | Sign out, sign in as TestA, visit all four tabs | No `ZZ-B-…` record and no TestB name anywhere |
| Q9 | Mobile and tablet layout | Repeat Q1, Q3 and one Financial profile page at a phone-sized window (about 390 px) and at a tablet-sized window (about 900 px) | Readable; nothing overlaps or is cut off. Phone: bottom navigation with icons, only when signed in. Tablet: a top bar with the four sections instead of the sidebar |
| Q10 | General look | Click through every page as TestA, including the Financial profile section tabs and the Planning calculator tabs (pill-shaped switchers) | The selected tab is highlighted and its content shows; note anything broken, confusing, misaligned or unclear wording |
| Q11 | Dark mode follows the device | Set the browser/OS to dark mode (or use a dark-preference browser profile), open the Preview signed out, then sign in as TestA and visit all four tabs | The whole app is dark: no white panels, unreadable text or invisible borders; the money-flow chart and its labels are readable |
| Q12 | Theme switch | Click the moon/sun button in the header, reload the page, then sign out and back in | The chosen theme stays after reload and sign-in; the button's label says what it will switch to |

| Q13 | Money plan (TestA) | Signed in as TestA, click **Your plan** (first item in the navigation) | The page shows three headline cards (This month, Months of cushion, Debt-free date), a numbered list of steps with a status (Recommended / Worth considering) and a monthly amount where one applies, and a **What's missing** section. Each "Why this step" expands. Links in What's missing open the matching Financial profile section; items the app can't record say so instead of linking. Nothing on the page changes saved data |
| Q14 | Plan summary on Overview | Signed in as TestA, open **Overview** | A "Your money plan · Next steps" card at the top lists up to three steps that match the first steps on the plan page, and **See your full plan** opens it |
| Q15 | Example household (signed out) | Sign out. On the Sign in page click **See an example household's plan** | `/demo` opens without signing in and is clearly labelled "Example household · made-up numbers"; it shows a full plan with no TestA/TestB data; there is no sidebar, account menu or link into anyone's profile |

| Q16 | New profile details (TestA) | Financial profile → **Insurance** → Add insurance `ZZ-A-Health` (Health, deductible `1500`). **Retirement** → if missing add `ZZ-A-401k` (401(k), balance `1000`, contributions `100`/`50`), then under **People in your household** add `ZZ-A-Person` (Me) if missing, Edit `ZZ-A-401k` → **Whose account is this?** `ZZ-A-Person` → **More details**: Employer match "Getting the full match", your contributions so far this year `500`. Open **Retirement goals**, enter monthly spending `4000`, pick **Today's dollars**, and save; then reopen it, change only Social Security to `1500`, save, and check the answer is still **Today's dollars** | Each save shows a success message and the values are still there after reload. **Your plan** → What's missing no longer asks for the insurance deductible, the employer match, the account owner or employee contributions YTD for ZZ-A-401k. TestB (Q7) still sees none of these |
| Q17 | Already signed in | While signed in as TestA, open `/auth/login` directly | A notice says "You're already signed in as <TestA's email>" with **Go to your plan** and **Sign out**; Sign out works |
| Q18 | Build info page (signed out) | Signed out, open `/api/build-info` on the Preview | A tiny text page with exactly two fields: `commit` (a 40-character code) and `environment` (`preview`). Nothing else: no names, emails, amounts or account details. No sign-in is needed |
| Q19 | Simple view switch (TestA) | Signed in as TestA, open the account menu (round button) and turn **Simple view** on | The menu and phone bottom bar show only **Your plan**, **Overview** and **Financial profile**; Overview no longer shows the Financial health card, the "Where income goes" chart, the detailed breakdown or a Planning tools button; the plan summary, cash flow and net worth stay |
| Q20 | Detailed tools in Simple view (TestA) | With Simple view on, open `/scenario-lab` and `/planning` directly | Each page still works and shows a note "You're using Simple view…" with **Switch to detailed view**; that button turns Simple view off and keeps you on the same page |
| Q21 | Simple view is per person | With TestA's Simple view still on, sign out, sign in as **TestB** | TestB sees the full detailed menu (Planning and Scenario Lab present) and its own switch is off. Sign back in as TestA, turn Simple view **off** again, and confirm the full menu returns |
| Q22 | Add to home screen | On a phone browser, open the Preview and use **Add to Home Screen** (or check `/manifest.webmanifest` loads signed out) | The app offers to install as "Finance Hub" with the green FF icon; `/manifest.webmanifest` shows only the app name, colours and icon paths |
| Q23 | Household page (TestA) | Signed in as TestA, open the account menu → **Household & invitations** | Shows TestA's household name and **You · Owner**; an **Invite someone** form; "Waiting to be accepted" is empty or lists only TestA's own invitations |
| Q24 | Create and cancel an invite link (TestA) | Signed in as TestA, create an invite link for `ZZ-A-Invite` as **Viewer**, copy the link privately (don't send it anywhere), then **Cancel** it under "Waiting to be accepted". Open the copied link in the same browser, then choose **Join the household** | Link is shown once with **Copy link**. Public landing shows a generic invitation shell for any correctly shaped token, including a cancelled one; it does **not** validate token existence, expiry or cancellation on page load. After choosing Join, the cancelled invitation leads to the generic "This invitation isn't valid" result, and nobody joined TestA's household. Never display household details or the token as text on the public landing page |
| Q25 | Invitations stay private (TestB) | Sign out, sign in as **TestB**, open **Household & invitations** | TestB sees only its own household and none of TestA's invitations (no `ZZ-A-Invite`) |
| Q26 | Invite link signed out | Sign out, open `/invite/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ` (a made-up link) | "You've been invited…" with **Sign in to join** and **Create an account**; nothing about any household is shown. (Accepting needs a third account, so joining is covered by the automated database checks) |

Finish signed out.

The **guided setup** (`/setup`, five questions shown right after a new household is created) needs a brand-new
household, so it can't be checked with TestA or TestB; the Builder covers it with local tests and screenshots.

## Reporting

- File **one GitHub issue per problem** using the **QA finding** template, with label `qa-finding`.
- Include the check number, steps, expected vs actual, a screenshot and a severity.
- Screenshots must not show passwords, cookie values, tokens or email links.
- Post one summary comment on the phase PR listing each check as PASS / FAIL / NOT RUN, with the Preview's commit
  SHA (shown in Vercel's deployment details) if available. A check that wasn't run is **NOT RUN**, never PASS.
