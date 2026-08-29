import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

test("normalizes numeric strings, cash purposes, and 457 account type", () => {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "household-1",
    income: [
      { id: "i1", name: "Job", monthly_amount: "5000", monthly_gross_amount: "7000", is_active: true },
    ],
    expenses: [
      { id: "e1", name: "Rent", category: "housing", monthly_amount: "1500", is_essential: true },
      { id: "e2", name: "Fun", category: "personal", monthly_amount: "300", is_essential: false },
    ],
    accounts: [
      { id: "a1", name: "EF", account_type: "savings", balance: "6000", cash_purpose: "protected_reserve" },
      { id: "a2", name: "Checking", account_type: "checking", balance: "2000", cash_purpose: "operating_cash" },
      { id: "a3", name: "Cash", account_type: "cash", balance: "500", cash_purpose: "unallocated" },
      { id: "a4", name: "Brokerage", account_type: "brokerage", balance: "9000", cash_purpose: "not_applicable" },
    ],
    debts: [
      { id: "d1", name: "Car", debt_type: "auto_loan", current_balance: "12000", interest_rate: "6.5", minimum_payment: "350" },
    ],
    retirementAccounts: [
      { id: "r1", name: "Gov plan", account_type: "457", balance: "10000", monthly_employee_contribution: "500", monthly_employer_contribution: "100", match_status: "fully_captured" },
    ],
  });

  assert.equal(snapshot.retirementAccounts[0].type, "457b");
  assert.equal(snapshot.aggregates.monthlyTakeHomeIncome, 5000);
  assert.equal(snapshot.aggregates.monthlyGrossIncomeKnown, 7000);
  assert.equal(snapshot.aggregates.monthlyRequiredOutflow, 1850);
  assert.equal(snapshot.aggregates.monthlyCashFlowBeforeSavings, 2850);
  assert.equal(snapshot.aggregates.liquidCash, 8500);
  assert.equal(snapshot.aggregates.protectedCash, 6000);
  assert.equal(snapshot.aggregates.operatingCash, 2000);
  assert.equal(snapshot.aggregates.unallocatedCash, 500);
});

test("uses the largest relevant deductible exposure including percentage deductibles", () => {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "household-1",
    insuranceExposures: [
      { id: "x1", name: "Health", insurance_type: "health", deductible_amount: "2500", family_deductible_amount: "5000", is_relevant_to_reserve: true },
      { id: "x2", name: "Home", insurance_type: "homeowners", percentage_deductible: "0.02", insured_value: "300000", is_relevant_to_reserve: true },
      { id: "x3", name: "Pet", insurance_type: "pet", deductible_amount: "10000", is_relevant_to_reserve: false },
    ],
  });

  assert.equal(snapshot.aggregates.deductibleReserveTarget, 6000);
});

test("warns when key planning inputs are incomplete", () => {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "household-1",
    income: [{ id: "i1", name: "Job", monthly_amount: 4000, monthly_gross_amount: null, is_active: true }],
    retirementAccounts: [{ id: "r1", name: "401k", account_type: "401k", balance: 1000, monthly_employee_contribution: 200, monthly_employer_contribution: 100 }],
  });

  assert.equal(snapshot.aggregates.hasIncompleteGrossIncome, true);
  assert.ok(snapshot.warnings.some((warning) => warning.includes("insurance deductible")));
  assert.ok(snapshot.warnings.some((warning) => warning.includes("Gross income")));
  assert.ok(snapshot.warnings.some((warning) => warning.includes("retirement account has no owner")));
});

test("ignores inactive income in planning aggregates", () => {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "household-1",
    income: [
      { id: "i1", name: "Current", monthly_amount: 5000, monthly_gross_amount: 7000, is_active: true },
      { id: "i2", name: "Old job", monthly_amount: 4000, monthly_gross_amount: 6000, is_active: false },
    ],
  });

  assert.equal(snapshot.aggregates.monthlyTakeHomeIncome, 5000);
  assert.equal(snapshot.aggregates.monthlyGrossIncomeKnown, 7000);
});
