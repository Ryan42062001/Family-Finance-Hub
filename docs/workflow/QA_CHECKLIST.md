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
| Q7 | Isolation, B cannot see A | Sign in as TestB. If missing, add expense `ZZ-B-Groceries` (Groceries, `222`). Visit all four tabs | No `ZZ-A-…` record, no $5,000 income and no TestA name anywhere |
| Q8 | Isolation, A cannot see B | Sign out, sign in as TestA, visit all four tabs | No `ZZ-B-…` record and no TestB name anywhere |
| Q9 | Mobile and tablet layout | Repeat Q1, Q3 and one Financial profile page at a phone-sized window (about 390 px) and at a tablet-sized window (about 900 px) | Readable; nothing overlaps or is cut off. Phone: bottom navigation with icons, only when signed in. Tablet: a top bar with the four sections instead of the sidebar |
| Q10 | General look | Click through every page as TestA, including the Financial profile section tabs and the Planning calculator tabs (pill-shaped switchers) | The selected tab is highlighted and its content shows; note anything broken, confusing, misaligned or unclear wording |
| Q11 | Dark mode follows the device | Set the browser/OS to dark mode (or use a dark-preference browser profile), open the Preview signed out, then sign in as TestA and visit all four tabs | The whole app is dark: no white panels, unreadable text or invisible borders; the money-flow chart and its labels are readable |
| Q12 | Theme switch | Click the moon/sun button in the header, reload the page, then sign out and back in | The chosen theme stays after reload and sign-in; the button's label says what it will switch to |

| Q13 | Money plan (TestA) | Signed in as TestA, click **Your plan** (first item in the navigation) | The page shows three headline cards (This month, Months of cushion, Debt-free date), a numbered list of steps with a status (Recommended / Worth considering) and a monthly amount where one applies, and a **What's missing** section. Each "Why this step" expands. Links in What's missing open the matching Financial profile section; items the app can't record say so instead of linking. Nothing on the page changes saved data |
| Q14 | Plan summary on Overview | Signed in as TestA, open **Overview** | A "Your money plan · Next steps" card at the top lists up to three steps that match the first steps on the plan page, and **See your full plan** opens it |
| Q15 | Example household (signed out) | Sign out. On the Sign in page click **See an example household's plan** | `/demo` opens without signing in and is clearly labelled "Example household · made-up numbers"; it shows a full plan with no TestA/TestB data; there is no sidebar, account menu or link into anyone's profile |

| Q16 | New profile details (TestA) | Financial profile → **Insurance** → Add insurance `ZZ-A-Health` (Health, deductible `1500`). **Retirement** → if missing add `ZZ-A-401k` (401(k), balance `1000`, contributions `100`/`50`), then under **People in your household** add `ZZ-A-Person` (Me) if missing, Edit `ZZ-A-401k` → **Whose account is this?** `ZZ-A-Person` → **More details**: Employer match "Getting the full match", your contributions so far this year `500`. Open **Retirement goals**, enter monthly spending `4000`, pick **Today's dollars**, and save; then reopen it, change only Social Security to `1500`, save, and check the answer is still **Today's dollars** | Each save shows a success message and the values are still there after reload. **Your plan** → What's missing no longer asks for the insurance deductible, the employer match, the account owner or employee contributions YTD for ZZ-A-401k. TestB (Q7) still sees none of these |
| Q17 | Already signed in | While signed in as TestA, open `/auth/login` directly | A notice says "You're already signed in as <TestA's email>" with **Go to your plan** and **Sign out**; Sign out works |

Finish signed out.

## Reporting

- File **one GitHub issue per problem** using the **QA finding** template, with label `qa-finding`.
- Include the check number, steps, expected vs actual, a screenshot and a severity.
- Screenshots must not show passwords, cookie values, tokens or email links.
- Post one summary comment on the phase PR listing each check as PASS / FAIL / NOT RUN, with the Preview's commit
  SHA (shown in Vercel's deployment details) if available. A check that wasn't run is **NOT RUN**, never PASS.
