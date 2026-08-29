import assert from "node:assert/strict";
import test from "node:test";
import { calculateSavingsGoal } from "./savings-goal.ts";

test("projects months to a savings goal", () => {
  const result = calculateSavingsGoal({ currentAmount: 5000, targetAmount: 11000, monthlyContribution: 500 });
  assert.equal(result.remainingAmount, 6000);
  assert.equal(result.monthsToGoal, 12);
  assert.equal(result.progress, 5000 / 11000);
});

test("calculates required monthly contribution for a target window", () => {
  const result = calculateSavingsGoal({ currentAmount: 2000, targetAmount: 8000, monthlyContribution: 300, monthsUntilTarget: 10 });
  assert.equal(result.projectedAmountAtTarget, 5000);
  assert.equal(result.requiredMonthlyContribution, 600);
});

test("reports a funded goal", () => {
  const result = calculateSavingsGoal({ currentAmount: 10000, targetAmount: 8000, monthlyContribution: 0, monthsUntilTarget: 12 });
  assert.equal(result.remainingAmount, 0);
  assert.equal(result.monthsToGoal, 0);
  assert.equal(result.requiredMonthlyContribution, 0);
  assert.equal(result.progress, 1);
});

test("handles a goal with no monthly contribution", () => {
  const result = calculateSavingsGoal({ currentAmount: 1000, targetAmount: 5000, monthlyContribution: 0 });
  assert.equal(result.monthsToGoal, null);
});

test("handles zero target amount safely", () => {
  const result = calculateSavingsGoal({ currentAmount: 0, targetAmount: 0, monthlyContribution: 100 });
  assert.equal(result.progress, null);
  assert.equal(result.remainingAmount, 0);
  assert.equal(result.monthsToGoal, 0);
});
