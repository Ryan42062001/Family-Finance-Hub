import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatSignedCurrency, paycheckInputDisplay, timeSavedLabel } from "../../lib/formatting/financial-presentation.ts";
import { compareMortgageExtraPayment } from "../../lib/calculations/mortgage-extra-payment.ts";
import { calculateSavingsGoal } from "../../lib/calculations/savings-goal.ts";
import { compareDebtExtraPayment, projectDebtStrategy } from "../../lib/calculations/debt-payoff.ts";
import { calculatePaycheckPlan, monthlyAmountToPerPaycheck } from "../../lib/calculations/paycheck-planner.ts";
import { allocationDisplayName, capacityChange } from "../../lib/scenarios/scenario-presentation.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const planning = source("../../components/planning/PlanningCalculators.tsx");
const paycheck = source("../../components/planning/PaycheckPlanner.tsx");
const debt = source("../../components/planning/DebtPayoffCalculator.tsx");
const dashboard = source("../../app/dashboard/page.tsx");
const css = source("../../app/globals.css");
const workspace = source("../../app/scenario-lab/ScenarioLabWorkspace.tsx");
const release = source("../../docs/FFH-P01_RELEASE_READINESS.md");

test("signed currency suppresses negative zero and zero after rounding without changing underlying amounts", () => {
  for (const value of [-0, -0.0001, 0, 0.0001, -0.49, 0.49]) assert.equal(formatSignedCurrency(value), "$0");
  assert.equal(formatSignedCurrency(-1), "-$1");
  assert.equal(formatSignedCurrency(3), "$3");
  assert.equal(formatSignedCurrency(-0.004, 2), "$0.00");
  assert.equal(formatSignedCurrency(-0.01, 2), "-$0.01");
  assert.equal(formatSignedCurrency(NaN), "—");
  // The former duplicated desktop cash-flow list was replaced by the
  // accessible Sankey reconciliation. The signed-currency utility remains
  // independently tested above and is still used for debt balances.
  assert.match(dashboard, /<MonthlyMoneyFlow input=\{moneyFlowInput\} \/>/);
  assert.match(dashboard, /monthlyDebtMinimums: summary\.monthlyDebtPayments/);
  assert.match(dashboard, /monthlyEmployeeRetirement: retirement\.reduce/);
  assert.doesNotMatch(dashboard, /<strong>-\{money\(/);
});

test("missing mortgage is not paid off; valid mortgage fixture remains unchanged", () => {
  const blank = compareMortgageExtraPayment({ principal: 0, annualInterestRate: 0, monthlyPayment: 0, extraMonthlyPayment: 0 });
  assert.equal(blank.baseline.months, 0);
  assert.match(planning, /mortgagePrincipal > 0 && mortgagePayment > 0/);
  assert.match(planning, /saved mortgage has a zero balance/);
  assert.match(planning, /Enter a mortgage balance and principal-and-interest payment/);
  const valid = compareMortgageExtraPayment({ principal: 12_000, annualInterestRate: 0, monthlyPayment: 500, extraMonthlyPayment: 100 });
  assert.deepEqual([valid.baseline.months, valid.accelerated.months, valid.monthsSaved], [24, 20, 4]);
});

test("savings projection rejects empty target for display but preserves genuine funded goals", () => {
  const empty = calculateSavingsGoal({ currentAmount: 0, targetAmount: 0, monthlyContribution: 0, monthsUntilTarget: 0 });
  assert.equal(empty.monthsToGoal, 0);
  assert.match(planning, /goalTargetAmount > 0/);
  assert.match(planning, /Enter a savings goal with a positive target/);
  const funded = calculateSavingsGoal({ currentAmount: 7_000, targetAmount: 7_000, monthlyContribution: 0, monthsUntilTarget: 12 });
  assert.equal(funded.monthsToGoal, 0);
});

test("time saved at zero is not misrepresented as debt being paid off", () => {
  assert.equal(timeSavedLabel(null), "—");
  assert.equal(timeSavedLabel(0), "0 months saved");
  assert.equal(timeSavedLabel(1), "1 month saved");
  assert.equal(timeSavedLabel(4), "4 months saved");
  const loan = compareDebtExtraPayment({ balance: 1_200, annualInterestRate: 0, minimumPayment: 100, extraMonthlyPayment: 0 });
  assert.equal(loan.monthsSaved, 0);
  assert.match(planning, /timeSavedLabel\(mortgage\.monthsSaved\)/);
  assert.match(debt, /timeSavedLabel\(comparison\.monthsSaved\)/);
});

test("paycheck display rounds cents but calculation retains exact annual reconciliation at all frequencies", () => {
  for (const freq of [52, 26, 24, 12]) {
    const pay = monthlyAmountToPerPaycheck(4_800, freq);
    const expenses = monthlyAmountToPerPaycheck(3_000, freq);
    assert.match(paycheckInputDisplay(pay), /^\d+(?:\.\d{1,2})?$/);
    assert.match(paycheckInputDisplay(expenses), /^\d+(?:\.\d{1,2})?$/);
    const result = calculatePaycheckPlan({ takeHomePay: pay, essentialExpenses: expenses, debtMinimums: 0, retirementContributions: 0, emergencySavings: 0, extraDebtPayment: 0, goalSavings: 0, discretionarySpending: 0 }, freq);
    assert.ok(Math.abs(result.annualRemaining - 21_600) < 1e-7);
  }
  assert.equal(paycheckInputDisplay(2215.3846153846152), "2215.38");
  assert.match(paycheck, /inputDrafts\[key\] \?\? paycheckInputDisplay\(value\)/);
  assert.match(paycheck, /onBlur=/);
  assert.match(paycheck, /setTakeHomePayOverride\(null\)/);
});

test("paycheck budgeting distinguishes below, exactly at, and above budget", () => {
  const plan = (saving: number) => calculatePaycheckPlan({
    takeHomePay: monthlyAmountToPerPaycheck(4_800, 26),
    essentialExpenses: monthlyAmountToPerPaycheck(3_000, 26),
    debtMinimums: 0, retirementContributions: 0,
    emergencySavings: saving, extraDebtPayment: 0, goalSavings: 0, discretionarySpending: 0,
  }, 26);
  assert.equal(plan(0).isOverAllocated, false);
  assert.ok(plan(0).allocationRate! < 1);
  const at = calculatePaycheckPlan({ takeHomePay: 100, essentialExpenses: 100, debtMinimums: 0, retirementContributions: 0, emergencySavings: 0, extraDebtPayment: 0, goalSavings: 0, discretionarySpending: 0 }, 26);
  assert.equal(at.allocationRate, 1);
  const over = plan(1000);
  assert.equal(over.isOverAllocated, true);
  assert.ok(Math.abs(over.overAllocatedBy - 169.2307692307695) < 1e-6);
  assert.ok(Math.abs(over.annualRemaining + 4400) < 1e-6);
  assert.ok(over.allocationRate! > 1);
  assert.match(paycheck, /role="alert"/);
  assert.match(paycheck, /role="progressbar"/);
  assert.match(paycheck, /aria-valuetext=/);
  assert.match(paycheck, /Projected annual shortfall/);
  assert.match(paycheck, /Projected annual balance/);
  assert.match(css, /\.progress-fill\.budget-fill-over\{background:#a53b46\}/);
});

test("Scenario Lab uses household language without changing comparison math or revealing unknown allocation IDs", () => {
  const changed = capacityChange(1300, 800);
  assert.equal(changed.amount, -500);
  assert.equal(Math.round(changed.percentage! * 100) / 100, -38.46);
  assert.equal(allocationDisplayName("origin::reserve::household", { debts: [], goals: [], retirementAccounts: [], expenses: [], income: [], insuranceExposures: [], people: [] }), "Household reserve (purpose not specified)");
  assert.equal(allocationDisplayName("invalid", { debts: [], goals: [], retirementAccounts: [], expenses: [], income: [], insuranceExposures: [], people: [] }), null);
  assert.doesNotMatch(workspace, /Authoritative household plan/);
  assert.match(workspace, /Your current household plan/);
  assert.match(workspace, /Technical identifier/);
  assert.match(workspace, /Hypothetical only · never applied to your profile/);
});

test("equal APR debt payoff ties do not imply distinct strategic priority", () => {
  const debts = [
    { id: "a", name: "Debt A", balance: 600, annualInterestRate: 0, minimumPayment: 100 },
    { id: "b", name: "Debt B", balance: 600, annualInterestRate: 0, minimumPayment: 100 },
  ];
  for (const extra of [0, 100]) for (const strategy of ["avalanche", "snowball"] as const) {
    const result = projectDebtStrategy(debts, extra, strategy);
    assert.equal(result.payoffPossible, true);
    assert.equal(result.payoffOrder.length, 2);
  }
  assert.match(debt, /same month may appear in saved-profile order/);
  assert.doesNotMatch(debt, /payoffOrder\.join\(" → "\)/);
});

test("sticky navigation anchor spacing and release gate history remain intact", () => {
  assert.match(css, /\.panel-grid\[id\]\{scroll-margin-top:10rem\}/);
  assert.match(release, /historical evidence/);
  for (const gate of ["new-signup", "first authenticated", "two-household", "FFH-026", "Private Beta"]) assert.ok(release.includes(gate), gate);
});
