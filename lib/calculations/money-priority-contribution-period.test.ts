import assert from "node:assert/strict";
import test from "node:test";
import { remainingContributionMonths } from "./money-priority-contribution-period.ts";

test("uses the full-year fallback when no applicable as-of date exists", () => {
  assert.equal(remainingContributionMonths(null, 2026), 12);
  assert.equal(remainingContributionMonths("not-a-date", 2026), 12);
  assert.equal(remainingContributionMonths("2025-09-01", 2026), 12);
});

test("counts the as-of month inclusively through the current tax-year end", () => {
  assert.equal(remainingContributionMonths("2026-01-01", 2026), 12);
  assert.equal(remainingContributionMonths("2026-09-01", 2026), 4);
  assert.equal(remainingContributionMonths("2026-12-01", 2026), 1);
});
