import assert from "node:assert/strict";
import test from "node:test";
import { calculateEmergencyFund } from "./emergency-fund.ts";

test("calculates emergency fund target, gap, coverage, and timeline", () => {
  const result = calculateEmergencyFund({
    currentSavings: 12000,
    monthlyEssentialExpenses: 4000,
    targetMonths: 6,
    monthlyContribution: 1000,
  });

  assert.equal(result.targetAmount, 24000);
  assert.equal(result.fundingGap, 12000);
  assert.equal(result.coverageMonths, 3);
  assert.equal(result.progress, 0.5);
  assert.equal(result.monthsToGoal, 12);
});

test("reports a funded emergency reserve", () => {
  const result = calculateEmergencyFund({
    currentSavings: 20000,
    monthlyEssentialExpenses: 3000,
    targetMonths: 6,
    monthlyContribution: 500,
  });

  assert.equal(result.fundingGap, 0);
  assert.equal(result.progress, 1);
  assert.equal(result.monthsToGoal, 0);
});

test("handles zero expenses and no contribution safely", () => {
  const result = calculateEmergencyFund({
    currentSavings: 5000,
    monthlyEssentialExpenses: 0,
    targetMonths: 6,
  });

  assert.equal(result.targetAmount, 0);
  assert.equal(result.coverageMonths, null);
  assert.equal(result.progress, null);
  assert.equal(result.monthsToGoal, 0);
});

test("normalizes invalid negative inputs", () => {
  const result = calculateEmergencyFund({
    currentSavings: -500,
    monthlyEssentialExpenses: -100,
    targetMonths: -3,
    monthlyContribution: -10,
  });

  assert.deepEqual(result, {
    targetAmount: 0,
    currentSavings: 0,
    fundingGap: 0,
    coverageMonths: null,
    progress: null,
    monthsToGoal: 0,
  });
});
