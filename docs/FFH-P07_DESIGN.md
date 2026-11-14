# FFH-P07 design — Goals tracker and monthly check-in

Status: **APPROVED by Ryan as recommended (2026-11-14)**: D1, G1–G10 with R1 = half-up and R2 = floor, C1–C10.
Base: `phase/ffh-p07-goals-and-check-ins` at `b3c0dc39592389244b8b5477cfdb53a7362aeedf`.
Nothing below is implemented until Ryan approves it. Scope source: `.ai/CURRENT_PHASE.md`.

## What already exists (canonical sources found)

| Source | What it defines | Used by |
|---|---|---|
| `public.goals` table (phase 2 + 5b migrations) | name, `target_amount > 0`, `current_amount >= 0`, `target_date`, numeric(14,2); RLS read = any member, write = owner/member (`private.can_write_household_financials`) | **Money Priority Engine** (`lib/supabase/money-priority-snapshot.ts`) and Financial profile |
| `lib/calculations/money-priority-goal-intelligence.ts` `fundingMonths` / `roundMoney` | months from as-of date to target date; required monthly = remaining ÷ months, rounded half-up to the cent; target date passed with money remaining = no amount | Engine only (not exported) |
| `lib/calculations/savings-goal.ts` | remaining = max(0, target − saved); progress = saved ÷ target capped at 100%; funded goal = $0/month | Planning "Savings goal" calculator |
| `lib/calculations/financial-summary.ts` | net worth = accounts with `include_in_net_worth` + retirement balances − debt balances; monthly cash flow = active income − expenses − debt minimums − employee retirement contributions | Dashboard |
| `lib/plan/plan-result.ts` `todayUtc()` | "today" is the UTC calendar date | Money plan |
| `lib/forms/validate.ts` money parser | amounts to the cent (known LOW backlog half-cent float quirk) | All forms |

## Key design decision (NEEDS APPROVAL — D1)

The existing `public.goals` table **feeds the Money Priority Engine**. Storing P07 goals there would put them into the
engine, which the approved scope forbids. **Proposal:** a new table `public.savings_goals` that the engine never
reads, plus a guard test that the engine snapshot loader does not reference it. The existing Financial profile goals
stay exactly as they are. To avoid two things called "goals", the new screen is titled **"Savings goals"** and says
"These goals are a separate tracker and don't change Your plan."

## Goals tracker rules

| # | Rule | Grounded? |
|---|---|---|
| G1 | Fields: name (1–100 chars), target amount (> 0), saved so far (≥ 0, default 0), target date (optional). Amounts numeric(14,2), max 999,999,999,999.99. | Yes — mirrors `public.goals` constraints |
| G2 | As-of date = today in UTC (`todayUtc()`). | Yes — Money plan convention |
| G3 | Remaining = max(0, target − saved). Saved above target is allowed and shows "Reached". | Yes — `savings-goal.ts`, goal intelligence |
| G4 | Months left = whole calendar months from today to the target date, counting a part month as a full month, minimum 1 when the date is in the future (e.g. Nov 14 → Dec 14 = 1, Nov 14 → Dec 15 = 2, Nov 14 → Nov 30 = 1). | Yes — engine `fundingMonths` (copied, with a parity test against the engine's output) |
| G5 | Monthly needed = remaining ÷ months left, rounded **half-up to the cent** (computed exactly in integer cents after review F01). Because of rounding, months × monthly can differ from remaining by under 1¢ per month (e.g. $100 over 3 months = $33.33). | Rounding is the engine's rule — **NEEDS APPROVAL (R1)**: keep half-up (matches Your plan) or round **up** to the cent so the monthly amount always covers the target ($33.34). Recommend: half-up, for consistency. |
| G6 | Reached (remaining = 0): monthly needed $0.00, "Goal reached". | Yes |
| G7 | No target date: no monthly amount; "Add a target date to see the monthly amount." | Yes — engine returns null |
| G8 | Target date today or earlier with money remaining: no monthly amount; "The target date has passed. $X is still needed. Change the date to see a new monthly amount." No catch-up figure is invented. | Yes — engine treats as 0 months / null |
| G9 | Progress bar = saved ÷ target capped at 100%, shown as a whole percent (display only, rounded down so 99.6% never shows 100%). | Ratio yes; display rounding **NEEDS APPROVAL (R2)** — recommend floor |
| G10 | Owner/member: add, edit, delete a goal. Viewer: read-only. Delete asks for confirmation. | Scope-approved |

## Monthly check-in rules (all NEED APPROVAL — no canonical source exists)

| # | Proposed rule |
|---|---|
| C1 | **One check-in per household per calendar month** (`YYYY-MM`). The month defaults to the current UTC month; past months may be added; future months are refused. |
| C2 | **Balances entered:** one line per item in the Financial profile at check-in time — each account with "include in net worth", each retirement account, each debt — pre-filled with the profile's current balance as a suggestion the user confirms or changes. Each line stores a **copy** of the item's name and kind (asset/debt), so later renames or deletions don't change history. |
| C3 | **A check-in does not change the Financial profile.** Balances entered stay in the check-in only. (Updating the profile from a check-in can be a later, separately approved feature.) |
| C4 | **Unknown balance:** a line may be left blank = "not entered" (stored as null, never as 0). |
| C5 | **Net-worth snapshot** = sum of asset lines − sum of debt lines, the same formula as the dashboard, exact to the cent (database numeric, no float). If any line is "not entered", net worth is **not shown**: "Incomplete — 2 balances not entered." No partial total is presented as net worth. |
| C6 | **Cash-flow snapshot** = the dashboard's *planned* monthly cash flow (active income − expenses − debt minimums − employee retirement contributions) read from the Financial profile **by the database at the moment the check-in is first saved**, stored with its four parts. Labelled "Planned monthly cash flow when you checked in", never as actual spending. It is stored as "not available" only when the profile has no active income **and** no expenses (Ryan confirmed this original wording on 2026-11-14 instead of the dashboard's stricter rule; migration `20261114110000`). With only income or only expenses the amount is shown, and it can be negative. The client cannot submit these numbers. |
| C7 | **"Did you follow this month's plan?"** Yes/No, required. Only the answer is stored; the plan steps themselves are not snapshotted in P07. |
| C8 | **Editing:** owner/member may edit a check-in's balances and Yes/No answer; net worth is recalculated from the edited lines. The cash-flow snapshot is **never recalculated** — it stays as frozen at first save. Changing the profile never alters any saved check-in. Each check-in records who created it and who last edited it, and when. |
| C9 | **Deleting:** owner/member may delete a whole check-in (with confirmation). Viewer cannot create, edit or delete. |
| C10 | **History:** list of check-ins newest first with month, net worth (or "Incomplete"), planned cash flow, Yes/No; opening one shows its lines. No charts or month-to-month change figures in P07 (avoids new comparison rules). |

## Data model and security (implementation, for the record)

- New tables `savings_goals`, `monthly_check_ins` (unique `household_id, check_in_month`), `monthly_check_in_balances`
  (lines, `household_id` carried for RLS). RLS: select = `private.can_read_household`, insert/update/delete =
  `private.can_write_household_financials`; lines must belong to a check-in of the same household.
- Check-in create/edit through one atomic `security invoker` database function (RLS still applies) that writes the
  check-in and its lines in one transaction, computes net worth and, on create only, the cash-flow snapshot.
- Server actions re-check the role and fail closed; viewers see no edit controls, and the database refuses them anyway.
- RLS matrix additions: owner/member/viewer × own/other household × select/insert/update/delete on all three tables,
  cross-household line injection, snapshot-tampering attempts, and a viewer RPC refusal. Synthetic `ZZ-` data only.
- Money Priority Engine files are not edited; a test asserts the engine snapshot loader does not read the new tables.
- Hosted migration only after Ryan authorizes it, with hosted parity verified.
