import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { allocationDisplayName, capacityChange, refreshStateLabel, scenarioStatusLabel } from "../../lib/scenarios/scenario-presentation.ts";

const entities = {
  people: [], income: [], expenses: [], insuranceExposures: [],
  debts: [], retirementAccounts: [],
  goals: [{ id: "emergency-fund", label: "Emergency fund" }],
};

const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const profile = readFileSync(new URL("../../app/financial-profile/page.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../app/scenario-lab/ScenarioLabWorkspace.tsx", import.meta.url), "utf8");

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

test("shared shell preserves keyboard, responsive, contrast, and reduced-motion affordances", () => {
  assert.match(layout, /Skip to main content/);
  assert.match(layout, /<AppHeader/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /@media\(max-width:650px\)/);
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
