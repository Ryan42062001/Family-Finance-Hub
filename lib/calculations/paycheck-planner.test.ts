import assert from "node:assert/strict";
import test from "node:test";
import { calculatePaycheckPlan, monthlyAmountToPerPaycheck } from "./paycheck-planner.ts";

test("calculates a balanced paycheck plan", () => {
  const result = calculatePaycheckPlan({
    takeHomePay: 2200,
    essentialExpenses: 1100,
    debtMinimums: 200,
    retirementContributions: 250,
    emergencySavings: 150,
    extraDebtPayment: 100,
    goalSavings: 150,
    discretionarySpending: 150,
  });

  assert.equal(result.committedAmount, 2100);
  assert.equal(result.remainingAmount, 100);
  assert.equal(result.overAllocatedBy, 0);
  assert.equal(result.isOverAllocated, false);
  assert.equal(result.annualTakeHome, 57200);
});

test("reports an over-allocated paycheck", () => {
  const result = calculatePaycheckPlan({
    takeHomePay: 1000,
    essentialExpenses: 800,
    debtMinimums: 200,
    retirementContributions: 100,
    emergencySavings: 50,
    extraDebtPayment: 0,
    goalSavings: 0,
    discretionarySpending: 0,
  });

  assert.equal(result.remainingAmount, 0);
  assert.equal(result.overAllocatedBy, 150);
  assert.equal(result.isOverAllocated, true);
  assert.equal(result.annualRemaining, -3900);
});

test("handles zero take-home pay safely", () => {
  const result = calculatePaycheckPlan({
    takeHomePay: 0,
    essentialExpenses: 0,
    debtMinimums: 0,
    retirementContributions: 0,
    emergencySavings: 0,
    extraDebtPayment: 0,
    goalSavings: 0,
    discretionarySpending: 0,
  });

  assert.equal(result.allocationRate, null);
  assert.equal(result.remainingAmount, 0);
});

test("normalizes invalid negative values", () => {
  const result = calculatePaycheckPlan({
    takeHomePay: -100,
    essentialExpenses: -50,
    debtMinimums: Number.NaN,
    retirementContributions: 0,
    emergencySavings: 0,
    extraDebtPayment: 0,
    goalSavings: 0,
    discretionarySpending: 0,
  });

  assert.equal(result.takeHomePay, 0);
  assert.equal(result.committedAmount, 0);
});

test("converts monthly amounts to a per-paycheck amount", () => {
  assert.equal(monthlyAmountToPerPaycheck(2600, 26), 1200);
  assert.equal(monthlyAmountToPerPaycheck(1000, 0), 0);
});
