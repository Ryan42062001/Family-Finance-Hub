import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import {
  buildMoneyPrioritySnapshot,
  MoneyPrioritySnapshotValidationError,
  type MoneyPriorityRawSnapshot,
} from "./money-priority-snapshot.ts";

function simpleAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "simple",
    owner_person_id: "self",
    name: "SIMPLE IRA",
    account_type: "simple_ira",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: 0,
    ...overrides,
  };
}

function raw(retirementAccount: Record<string, unknown>): MoneyPriorityRawSnapshot {
  return {
    householdId: "simple-contract",
    people: [{
      id: "self",
      display_name: "Self",
      relationship: "self",
      birth_date: "1990-01-01",
      planned_retirement_age: 65,
      covered_by_workplace_retirement_plan: true,
      estimated_taxable_compensation_annual: 100000,
      is_dependent: false,
      is_active: true,
    }],
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    retirementAccounts: [retirementAccount],
    goals: [],
    insuranceExposures: [],
  };
}

test("legacy SIMPLE higher-limit booleans remain non-authoritative and require reconfirmation", () => {
  for (const legacyValue of [true, false]) {
    const snapshot = buildMoneyPrioritySnapshot(raw(simpleAccount({ simple_higher_limit_eligible: legacyValue })));
    const account = snapshot.retirementAccounts[0]!;
    assert.equal(account.simplePlanLimitCategory, null);
    assert.equal(account.simplePlanLimitTaxYear, null);
    assert.equal(account.simpleHigherLimitEligible, null);
    assert.ok(snapshot.warnings.some((warning) => warning.includes("legacy SIMPLE higher-limit hint")));
  }
});

test("explicit standard SIMPLE category is tax-year bound and can use the existing conservative compatibility path", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw(simpleAccount({
    simple_higher_limit_eligible: true,
    simple_plan_limit_category: "standard",
    simple_plan_limit_tax_year: 2026,
  })));
  const account = snapshot.retirementAccounts[0]!;
  assert.equal(account.simplePlanLimitCategory, "standard");
  assert.equal(account.simplePlanLimitTaxYear, 2026);
  assert.equal(account.simpleHigherLimitEligible, false);
});

test("explicit certain-applicable higher SIMPLE category is preserved but not promoted into the pre-R1 Core boolean", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw(simpleAccount({
    simple_higher_limit_eligible: false,
    simple_plan_limit_category: "certain_applicable_higher",
    simple_plan_limit_tax_year: 2026,
  })));
  const account = snapshot.retirementAccounts[0]!;
  assert.equal(account.simplePlanLimitCategory, "certain_applicable_higher");
  assert.equal(account.simplePlanLimitTaxYear, 2026);
  assert.equal(account.simpleHigherLimitEligible, null);
});

test("SIMPLE category and tax year must be supplied together", () => {
  for (const overrides of [
    { simple_plan_limit_category: "standard" },
    { simple_plan_limit_tax_year: 2026 },
  ]) {
    assert.throws(
      () => buildMoneyPrioritySnapshot(raw(simpleAccount(overrides))),
      (error: unknown) => error instanceof MoneyPrioritySnapshotValidationError
        && error.issues.some((issue) => issue.code === "invalid_contract"),
    );
  }
});

test("unsupported SIMPLE categories and SIMPLE contract fields on non-SIMPLE accounts are rejected", () => {
  assert.throws(
    () => buildMoneyPrioritySnapshot(raw(simpleAccount({ simple_plan_limit_category: "higher", simple_plan_limit_tax_year: 2026 }))),
    MoneyPrioritySnapshotValidationError,
  );
  assert.throws(
    () => buildMoneyPrioritySnapshot(raw({
      ...simpleAccount({ simple_plan_limit_category: "standard", simple_plan_limit_tax_year: 2026 }),
      account_type: "401k",
    })),
    (error: unknown) => error instanceof MoneyPrioritySnapshotValidationError
      && error.issues.some((issue) => issue.code === "invalid_contract"),
  );
});

test("hypothetical reruns preserve the explicit SIMPLE plan-limit contract", () => {
  const current = runMoneyPriorityEngine({
    ...raw(simpleAccount({
      simple_plan_limit_category: "standard",
      simple_plan_limit_tax_year: 2026,
    })),
    income: [{ id: "income", owner_person_id: "self", name: "Income", monthly_amount: 5000, monthly_gross_amount: 8000, income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "housing", name: "Housing", category: "housing", monthly_amount: 2500, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }],
  }, "2026-09-01");
  const rerun = runHypotheticalMoneyPriorityEngine(current, {
    addExpenses: [{ id: "future", name: "Future expense", category: "other", monthlyAmount: 50, isEssential: true, cashFlowTreatment: "required" }],
  }).engine;
  assert.equal(rerun.snapshot.retirementAccounts[0]?.simplePlanLimitCategory, "standard");
  assert.equal(rerun.snapshot.retirementAccounts[0]?.simplePlanLimitTaxYear, 2026);
  assert.equal(rerun.snapshot.retirementAccounts[0]?.simpleHigherLimitEligible, false);
});
