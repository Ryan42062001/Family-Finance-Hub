# Browser QA checklist

Run this on the **Vercel Preview of the phase branch** after each merge into the phase branch. ChatGPT Work mode
(Cloud Browser) normally runs it; Ryan can too. The Builder updates this file whenever a phase adds or changes
screens.

- **Test accounts:** use only the synthetic test accounts **TestA** and **TestB**. Ryan supplies their passwords
  directly in the Work chat; they are never stored in the repository.
- **Data:** synthetic data only. Never enter real names, amounts, accounts or personal details.
- **Isolation of accounts:** sign in to only one account at a time (sign out before switching). Two tabs in one
  browser share a single login.
- **Out of scope:** Supabase, the Vercel settings pages, GitHub settings and the Production site
  (`family-finance-hub-taupe.vercel.app`, or the retired `family-finance-hub-ten-brown.vercel.app`).

Preview: the Vercel Preview of the **current phase branch** (see `.ai/CURRENT_PHASE.md`). Ryan gives the exact URL with
each run; Vercel shortens long branch names, so it isn't predictable.

## Checks

| # | Check | Steps | Expected |
|---|---|---|---|
| Q1 | Signed-out header | Open the Preview signed out, go to `/auth/login` | Header shows only the **Family Finance Hub** logo: no Overview / Financial profile / Planning / Scenario Lab tabs and no Sign out |
| Q2 | Protected pages need sign-in | Signed out, open `/dashboard`, `/financial-profile`, `/planning` and `/scenario-lab` | Each one redirects to the Sign in page |
| Q3 | Sign in | Sign in as TestA | Overview opens with **TestA** as the household; tabs and **Sign out** appear |
| Q4 | Add synthetic data (TestA) | Financial profile: if missing, add income `ZZ-A-Paycheck` (monthly take-home `5000`) and expense `ZZ-A-Rent` (category Housing, `3500`) | Both appear in their lists, and Overview totals update |
| Q5 | Scenario Lab does not save | Scenario Lab → **Create scenario** → Assumption type **Recurring expense change** → Expense **ZZ-A-Rent** → Monthly amount `4000` → **Add assumption** → **Run scenario** | The result shows a change of **−$500.00**. Then Financial profile → reload: ZZ-A-Rent is still **$3,500** |
| Q6 | Sign out | Click **Sign out** | Back on Sign in; Q1 holds again |
| Q7 | Isolation, B cannot see A | Sign in as TestB. If missing, add expense `ZZ-B-Groceries` (Groceries, `222`). Visit all four tabs | No `ZZ-A-…` record, no $5,000 income and no TestA name anywhere |
| Q8 | Isolation, A cannot see B | Sign out, sign in as TestA, visit all four tabs | No `ZZ-B-…` record and no TestB name anywhere |
| Q9 | Mobile layout | Repeat Q1, Q3 and one Financial profile page at a phone-sized window (about 390 px wide) | Readable; nothing overlaps or is cut off; bottom navigation appears only when signed in |
| Q10 | General look | Click through every page as TestA | Note anything broken, confusing, misaligned or unclear wording |
| Q11 | Dark mode follows the device | Set the browser/OS to dark mode (or use a dark-preference browser profile), open the Preview signed out, then sign in as TestA and visit all four tabs | The whole app is dark: no white panels, unreadable text or invisible borders; the money-flow chart and its labels are readable |
| Q12 | Theme switch | Click the moon/sun button in the header, reload the page, then sign out and back in | The chosen theme stays after reload and sign-in; the button's label says what it will switch to |

Finish signed out.

## Reporting

- File **one GitHub issue per problem** using the **QA finding** template, with label `qa-finding`.
- Include the check number, steps, expected vs actual, a screenshot and a severity.
- Screenshots must not show passwords, cookie values, tokens or email links.
- Post one summary comment on the phase PR listing each check as PASS / FAIL / NOT RUN, with the Preview's commit
  SHA (shown in Vercel's deployment details) if available. A check that wasn't run is **NOT RUN**, never PASS.
