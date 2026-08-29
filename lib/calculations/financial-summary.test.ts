import assert from "node:assert/strict";
import test from "node:test";
import { calculateFinancialSummary } from "./financial-summary.ts";

test("calculates net worth, cash flow, and savings rate", () => {
  const summary = calculateFinancialSummary({
    accountBalances: [10000, 2500],
    retirementBalances: [20000],
    debtBalances: [15000],
    monthlyIncome: [6000],
    monthlyExpenses: [2500, 500],
    monthlyDebtPayments: [750],
    monthlyEmployeeRetirement: [600],
    monthlyEmployerRetirement: [300],
  });

  assert.equal(summary.netWorth, 17500);
  assert.equal(summary.monthlyIncome, 6000);
  assert.equal(summary.monthlyCashFlow, 1650);
  assert.equal(summary.monthlyRetirementContributions, 900);
  assert.equal(summary.savingsRate, 0.375);
});

test("returns null savings rate when income is zero", () => {
  const summary = calculateFinancialSummary({
    accountBalances: [],
    retirementBalances: [],
    debtBalances: [],
    monthlyIncome: [],
    monthlyExpenses: [],
    monthlyDebtPayments: [],
    monthlyEmployeeRetirement: [],
    monthlyEmployerRetirement: [],
  });

  assert.equal(summary.savingsRate, null);
  assert.equal(summary.monthlyCashFlow, 0);
});
