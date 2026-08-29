import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateGoalProgress,
  groupCategoryAmounts,
  profileCompletion,
  sumAmounts,
} from "./dashboard-insights.ts";

test("groups category amounts and sorts largest first", () => {
  assert.deepEqual(
    groupCategoryAmounts([
      { category: "housing", amount: 1500 },
      { category: "groceries", amount: 400 },
      { category: "housing", amount: 250 },
    ]),
    [
      { category: "housing", amount: 1750 },
      { category: "groceries", amount: 400 },
    ],
  );
});

test("calculates and caps goal progress", () => {
  const result = calculateGoalProgress([
    { id: "1", name: "Emergency fund", currentAmount: 6000, targetAmount: 12000, priority: 1 },
    { id: "2", name: "Vacation", currentAmount: 3000, targetAmount: 2500, priority: 3 },
  ]);

  assert.equal(result[0].progress, 0.5);
  assert.equal(result[0].remaining, 6000);
  assert.equal(result[1].progress, 1);
  assert.equal(result[1].remaining, 0);
});

test("calculates profile completion", () => {
  assert.equal(profileCompletion([1, 2, 0, 1, 0, 1]), 67);
  assert.equal(profileCompletion([]), 0);
});

test("sums named amounts", () => {
  assert.equal(sumAmounts([{ name: "Checking", amount: 1200 }, { name: "Savings", amount: 3800 }]), 5000);
});
