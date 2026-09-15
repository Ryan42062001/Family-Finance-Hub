import assert from "node:assert/strict";
import test from "node:test";
import { remainingContributionMonths } from "./money-priority-contribution-period.ts";

test("uses the full-year fallback when no applicable as-of date exists", () => {
  assert.equal(remainingContributionMonths(null, 2026), 12);
  assert.equal(remainingContributionMonths("not-a-date", 2026), 12);
  assert.equal(remainingContributionMonths("2025-09-01", 2026), 12);
});

test("R03 rejects impossible ISO-looking calendar dates instead of accepting Date normalization", () => {
  assert.equal(remainingContributionMonths("2026-09-31", 2026), 12);
  assert.equal(remainingContributionMonths("2026-02-30", 2026), 12);
  assert.equal(remainingContributionMonths("2026-02-29", 2026), 12);
});

test("R03 preserves a valid leap date", () => {
  assert.equal(remainingContributionMonths("2024-02-29", 2024), 11);
});

test("counts the as-of month inclusively through the current tax-year end", () => {
  assert.equal(remainingContributionMonths("2026-01-01", 2026), 12);
  assert.equal(remainingContributionMonths("2026-09-01", 2026), 4);
  assert.equal(remainingContributionMonths("2026-12-01", 2026), 1);
});