import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { allocationDisplayName, capacityChange, refreshStateLabel, scenarioOperationPresentation, scenarioStatusLabel } from "../../lib/scenarios/scenario-presentation.ts";

const entities = {
  people: [], income: [], expenses: [], insuranceExposures: [],
  debts: [], retirementAccounts: [],
  goals: [{ id: "emergency-fund", label: "Emergency fund" }],
};

const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../../components/AppHeader.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../../app/dashboard/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const profile = readFileSync(new URL("../../app/financial-profile/page.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../app/scenario-lab/ScenarioLabWorkspace.tsx", import.meta.url), "utf8");
const controls = readFileSync(new URL("../../app/scenario-lab/SpecializedScenarioControls.tsx", import.meta.url), "utf8");
const scenarioPage = readFileSync(new URL("../../app/scenario-lab/page.tsx", import.meta.url), "utf8");

test("Scenario presentation reports the owner preview capacity change accurately", () => {
  assert.equal(4_800 - 3_500, 1_300);
  assert.equal(4_800 - 4_000, 800);
  const change = capacityChange(1_300, 800);
  assert.equal(change.amount, -500);
  assert.ok(change.percentage !== null);
  assert.equal(Math.round(change.percentage! * 100) / 100, -38.46);
});

test("Scenario presentation never describes more-information-needed as complete", () => {
  assert.equal(scenarioStatusLabel("more_information_needed"), "Needs more information");
  assert.notEqual(scenarioStatusLabel("more_information_needed"), scenarioStatusLabel("valid"));
  assert.equal(refreshStateLabel("materially_changed"), "Recommendations changed meaningfully");
});

test("known allocations use verified labels and unknown IDs remain diagnostics", () => {
  assert.equal(allocationDisplayName("secure-cash::goal::emergency-fund", entities), "Emergency fund · goal");
  assert.equal(allocationDisplayName("unknown::goal::not-in-profile", entities), null);
  assert.equal(allocationDisplayName("malformed", entities), null);
});

test("Scenario assumptions resolve household labels and authoritative financial changes", () => {
  const richEntities = {
    people: [], insuranceExposures: [],
    income: [{ id: "income-1", label: "Primary paycheck", baseline: { monthlyTakeHomeAmount: 4_800 } }],
    expenses: [{ id: "expense-1", label: "Walmart", baseline: { monthlyAmount: 3_500 } }],
    debts: [{ id: "debt-1", label: "Car loan", baseline: { balance: 8_000, minimumPayment: 300, annualInterestRate: 5 } }],
    goals: [{ id: "goal-1", label: "Emergency fund", baseline: { targetAmount: 12_000, currentAmount: 6_000, plannedMonthlyContribution: 500 } }],
    retirementAccounts: [{ id: "retirement-1", label: "Work 401(k)", baseline: { monthlyEmployeeContribution: 400, annualContributionTarget: 12_000 } }],
  };
  const expense = scenarioOperationPresentation({ type: "expense", id: "op-1", expenseId: "expense-1", monthlyAmount: 4_000 }, richEntities);
  assert.equal(expense.title, "Walmart");
  assert.equal(expense.category, "Monthly expense");
  assert.deepEqual(expense.changes[0], { label: "Monthly amount", before: "$3,500", after: "$4,000", delta: "+$500" });
  assert.equal(scenarioOperationPresentation({ type: "income", id: "op-2", incomeId: "income-1", monthlyTakeHomeAmount: 4_500 }, richEntities).title, "Primary paycheck");
  assert.equal(scenarioOperationPresentation({ type: "debt", id: "op-3", debtId: "debt-1", minimumPayment: 350 }, richEntities).title, "Car loan");
  assert.equal(scenarioOperationPresentation({ type: "goal", id: "op-4", goalId: "goal-1", targetAmount: 15_000 }, richEntities).title, "Emergency fund");
  assert.equal(scenarioOperationPresentation({ type: "retirement_account", id: "op-5", accountId: "retirement-1", monthlyEmployeeContribution: 500 }, richEntities).title, "Work 401(k)");
});

test("stale entity references fail readable and keep identifiers only in diagnostics", () => {
  const stale = scenarioOperationPresentation({ type: "expense", id: "operation-id", expenseId: "stale-expense-id", monthlyAmount: 50 }, entities);
  assert.equal(stale.title, "Expense no longer available");
  assert.deepEqual(stale.diagnosticIds, ["operation-id", "stale-expense-id"]);
  assert.equal(stale.changes[0]?.before, "Not available");
});

test("normal Scenario Lab copy avoids developer terminology and renames windfall", () => {
  const normalCopy = workspace + controls + scenarioPage;
  for (const removed of ["FFH-042 conflict detector", "Generic-event ownership", "allocation IDs", "Ephemeral by design", ">Windfall<", "Gross windfall amount", "Windfall source", "Tax treatment", "Known tax liability", "Earmarked amount"]) {
    assert.equal(normalCopy.includes(removed), false, removed);
  }
  for (const replacement of ["Extra Money (One-Time)", "How much extra money are you receiving?", "Where is the money coming from?", "Tax status", "Known taxes owed", "Money already set aside"]) {
    assert.ok(controls.includes(replacement), replacement);
  }
});

test("shared shell preserves keyboard, responsive, contrast, and reduced-motion affordances", () => {
  assert.match(layout, /Skip to main content/);
  assert.match(layout, /<AppHeader/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /@media\(max-width:650px\)/);
});

test("authenticated navigation owns section switching and sign out without dashboard duplication", () => {
  for (const label of ["Overview", "Financial profile", "Planning", "Scenario Lab", "Sign out"]) {
    assert.ok(header.includes(label), label);
  }
  assert.match(header, /authenticated \? <form action=\{logout\}>/);
  assert.doesNotMatch(dashboard, /action=\{logout\}/);
  assert.doesNotMatch(dashboard, />Edit financial profile</);
});

test("financial profile refresh preserves every existing CRUD action", () => {
  for (const action of ["addAccount", "addIncome", "addExpense", "addDebt", "addRetirementAccount", "addGoal", "updateAccount", "updateIncome", "updateExpense", "updateDebt", "updateRetirementAccount", "updateGoal", "deleteRecord"]) {
    assert.ok(profile.includes(action), action);
  }
  for (const section of ["accounts", "income", "expenses", "debts", "retirement", "goals"]) {
    assert.match(profile, new RegExp(`id=\\"${section}\\"`));
  }
});

test("Scenario Lab keeps advanced controls accessible and unknown identifiers inspectable", () => {
  assert.match(workspace, /<details className="scenario-advanced">/);
  assert.match(workspace, /Technical identifier/);
  assert.match(workspace, /Hypothetical only · never applied to your profile/);
});

test("Scenario Lab uses full desktop width and collapses cleanly for mobile", () => {
  assert.match(styles, /scenario-draft-card:only-child\{grid-column:1\/-1\}/);
  assert.match(styles, /scenario-assumption-changes\{display:grid;grid-template-columns:repeat\(3/);
  assert.match(styles, /scenario-draft-card:only-child \.scenario-composer,.scenario-assumption-changes\{grid-template-columns:1fr\}/);
  assert.match(styles, /scenario-draft-card input,.scenario-draft-card select\{min-width:0\}/);
});
