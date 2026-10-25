import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateFinancialSummary } from "../../lib/calculations/financial-summary.ts";
import { calculatePaycheckPlan, monthlyAmountToPerPaycheck } from "../../lib/calculations/paycheck-planner.ts";
import { capacityChange, scenarioReasonForPeople } from "../../lib/scenarios/scenario-presentation.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const dashboard = source("../../app/dashboard/page.tsx");
const profile = source("../../app/financial-profile/page.tsx");
const planning = source("../../components/planning/PlanningCalculators.tsx");
const retirement = source("../../components/planning/RetirementPacingCalculator.tsx");
const debt = source("../../components/planning/DebtPayoffCalculator.tsx");
const paycheck = source("../../components/planning/PaycheckPlanner.tsx");
const scenario = source("../../app/scenario-lab/ScenarioLabWorkspace.tsx");
const header = source("../../components/AppHeader.tsx");
const nav = source("../../components/MobileNavigation.tsx");
const disclosure = source("../../components/ResponsiveDisclosure.tsx");
const profileSection = source("../../components/ProfileSection.tsx");
const css = source("../../app/globals.css");

test("synthetic dashboard baseline retains cash flow, net worth and zero states", () => {
  const financial = calculateFinancialSummary({
    accountBalances: [1_000], retirementBalances: [], debtBalances: [],
    monthlyIncome: [4_800], monthlyExpenses: [3_000],
    monthlyDebtPayments: [], monthlyEmployeeRetirement: [], monthlyEmployerRetirement: [],
  });
  assert.equal(financial.monthlyCashFlow, 1_800);
  assert.equal(financial.netWorth, 1_000);
  assert.equal(financial.monthlyRetirementContributions, 0);
  assert.ok(Math.abs(financial.savingsRate! * 100 - 37.5) < .00001);
  assert.match(dashboard, /After recurring expenses, debt minimums and employee retirement contributions/);
  assert.match(dashboard, /not necessarily all discretionary money/);
});

test("mobile dashboard prioritizes cash flow, health and compact expandable summaries", () => {
  for (const copy of ["Monthly cash flow", "Net worth", "Savings rate", "Retirement assets", "Financial health", "Accounts", "Expenses", "Debt", "Goals"]) {
    assert.ok(dashboard.includes(copy), copy);
  }
  assert.match(dashboard, /className="dashboard-mobile-overview"/);
  assert.match(dashboard, /className="mobile-summary-grid"/);
  assert.match(dashboard, /href="\/financial-profile#expenses"/);
  assert.match(dashboard, /href="\/planning"/);
});

test("profile summary has six independently expandable financial sections", () => {
  for (const section of ["accounts", "income", "expenses", "debts", "retirement", "goals"]) {
    assert.match(profile, new RegExp(`<ProfileSection id="${section}"`));
  }
  for (const action of ["addAccount", "addIncome", "addExpense", "addDebt", "addRetirementAccount", "addGoal", "updateAccount", "updateIncome", "updateExpense", "updateDebt", "updateRetirementAccount", "updateGoal", "deleteRecord"]) {
    assert.ok(profile.includes(action), action);
  }
  assert.equal((profile.match(/className="profile-add-disclosure"/g) ?? []).length, 6);
  assert.match(profile, /<RecordActions kind="account"/);
  assert.match(profile, /<RecordActions kind="goal"/);
  assert.match(profileSection, /count === 1/);
  assert.match(disclosure, /window\.matchMedia/);
  assert.match(disclosure, /window\.addEventListener\("hashchange"/);
  assert.match(disclosure, /scrollIntoView/);
  assert.match(disclosure, /<details ref=\{ref\}/);
});

test("mobile planning selects one tool and keeps all six accessible", () => {
  for (const id of ["emergency-fund", "mortgage", "savings-goal"]) assert.ok(planning.includes(id));
  for (const path of ["/planning/retirement", "/planning/debt", "/planning/paycheck"]) assert.ok(planning.includes(path));
  assert.match(planning, /aria-pressed=\{activeTool === id\}/);
  assert.match(planning, /mobile-active-tool/);
  assert.match(css, /\.mobile-planning-tool\{display:none\}/);
  assert.match(css, /\.mobile-planning-tool\.mobile-active-tool\{display:block\}/);
  assert.match(css, /\.calculator-pair\{display:flex;flex-direction:column-reverse/);
  for (const file of [planning, retirement, debt, paycheck]) {
    assert.match(file, /calculator-input-disclosure/);
    assert.match(file, /calculator-pair/);
  }
});

test("unchanged paycheck mathematics, warning, and temporary data-entry semantics", () => {
  const takeHomePay = monthlyAmountToPerPaycheck(4800,26);
  const essentialExpenses = monthlyAmountToPerPaycheck(3000,26);
  const result = calculatePaycheckPlan({
    takeHomePay,essentialExpenses,debtMinimums:0,retirementContributions:0,
    emergencySavings:1000,extraDebtPayment:0,goalSavings:0,discretionarySpending:0,
  },26);
  assert.ok(Math.abs(result.overAllocatedBy - 169.2307692307695) < .000001);
  assert.ok(Math.abs(result.annualRemaining + 4400) < .000001);
  assert.match(paycheck, /role="alert"/);
  assert.match(paycheck, /budget-fill-over/);
  assert.match(planning, /Enter a savings goal with a positive target/);
  assert.match(planning, /Enter a mortgage balance and principal-and-interest payment/);
  assert.doesNotMatch(planning, /localStorage|sessionStorage|\.insert\(|\.update\(/);
});

test("mobile Scenario Lab shows calculated change and preserves uncertainty", () => {
  const change = capacityChange(1800,1300);
  assert.equal(change.amount,-500);
  assert.equal(Math.round(change.percentage! * 100) / 100,-27.78);
  assert.match(scenario, /className="scenario-mobile-glance"/);
  assert.match(scenario, /Current monthly capacity/);
  assert.match(scenario, /What-if monthly capacity/);
  assert.match(scenario, /"more_information_needed"/);
  assert.match(scenario, /scenario-mobile-warning/);
  assert.match(scenario, /scenario-mobile-assumptions/);
  assert.match(scenario, /Technical identifier/);
  assert.match(scenario, /Hypothetical only · never applied to your profile/);
  assert.doesNotMatch(scenario, /localStorage|sessionStorage/);
});

test("technical recommendation wording is replaced only at display boundary", () => {
  const technical = "The current authoritative engine result materially changes recommendation order, state, allocation, destination, or feasibility.";
  const visible = scenarioReasonForPeople(technical);
  assert.notEqual(visible, technical);
  assert.match(visible, /what-if change could meaningfully affect/);
  assert.equal(scenarioReasonForPeople("Other engine warning"), "Other engine warning");
  assert.match(scenario, /scenarioReasonForPeople\(reason\)/);
  assert.match(scenario, /Original technical reason/);
});

test("mobile safe area, section anchors and 320-430px layout safeguards exist", () => {
  for (const href of ["/dashboard","/financial-profile","/planning","/scenario-lab"]) assert.ok(nav.includes(href));
  for (const name of ["Home","Profile","Planning","Scenarios"]) assert.ok(nav.includes(name));
  assert.match(nav, /aria-current=\{active \? "page"/);
  assert.match(header, /<MobileNavigation \/>/);
  assert.match(header, /mobile-account-menu/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /max-width:760px/);
  assert.match(css, /max-width:360px/);
  assert.match(css, /\.profile-section-panel\{scroll-margin-top:10rem\}/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
