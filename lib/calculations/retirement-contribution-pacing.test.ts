import assert from "node:assert/strict";
import test from "node:test";
import { calculateRetirementContributionPacing } from "./retirement-contribution-pacing.ts";

test("calculates the required contribution per remaining pay period", () => {
  const result = calculateRetirementContributionPacing({
    annualTarget: 24000,
    contributedYearToDate: 12000,
    remainingPayPeriods: 12,
    currentContributionPerPayPeriod: 800,
  });

  assert.equal(result.remainingAmount, 12000);
  assert.equal(result.requiredPerPayPeriod, 1000);
  assert.equal(result.projectedYearEndContribution, 21600);
  assert.equal(result.projectedShortfall, 2400);
  assert.equal(result.projectedExcess, 0);
  assert.equal(result.targetReached, false);
});

test("reports when the annual target is already reached", () => {
  const result = calculateRetirementContributionPacing({
    annualTarget: 7000,
    contributedYearToDate: 7500,
    remainingPayPeriods: 8,
    currentContributionPerPayPeriod: 0,
  });

  assert.equal(result.remainingAmount, 0);
  assert.equal(result.requiredPerPayPeriod, 0);
  assert.equal(result.targetReached, true);
  assert.equal(result.projectedExcess, 500);
});

test("handles no remaining pay periods", () => {
  const result = calculateRetirementContributionPacing({
    annualTarget: 10000,
    contributedYearToDate: 8000,
    remainingPayPeriods: 0,
    currentContributionPerPayPeriod: 500,
  });

  assert.equal(result.requiredPerPayPeriod, null);
  assert.equal(result.projectedYearEndContribution, 8000);
  assert.equal(result.projectedShortfall, 2000);
});

test("normalizes negative and non-finite values", () => {
  const result = calculateRetirementContributionPacing({
    annualTarget: -1,
    contributedYearToDate: Number.NaN,
    remainingPayPeriods: -5,
    currentContributionPerPayPeriod: -10,
  });

  assert.deepEqual(result, {
    annualTarget: 0,
    contributedYearToDate: 0,
    remainingAmount: 0,
    requiredPerPayPeriod: 0,
    projectedYearEndContribution: 0,
    projectedShortfall: 0,
    projectedExcess: 0,
    targetReached: true,
  });
});
