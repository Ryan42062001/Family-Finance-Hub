import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function rawBase(): MoneyPriorityRawSnapshot {
  return {
    householdId: "h1",
    people: [],
    income: [{ id: "i1", name: "Job", monthly_amount: 6000, monthly_gross_amount: 8000, is_active: true }],
    expenses: [{ id: "e1", name: "Housing", category: "housing", monthly_amount: 2000, is_essential: true }],
    accounts: [{ id: "a1", name: "Reserve", account_type: "savings", balance: 20000, cash_purpose: "protected_reserve" }],
    debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 5, minimum_payment: 1200, rate_type: "fixed" }],
    retirementAccounts: [{ id: "r1", name: "401k", account_type: "401k", balance: 10000, monthly_employee_contribution: 960, monthly_employer_contribution: 0, match_status: "fully_captured" }],
    goals: [],
    insuranceExposures: [{ id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy" },
  };
}

test("engine appends Optimize recommendations after Build", () => {
  const result = runMoneyPriorityEngine(rawBase(), "2026-08-29");
  const optimizeIndex = result.recommendations.findIndex((item) => item.stage === "optimize");
  assert.ok(optimizeIndex >= 0);
  assert.ok(result.recommendations.slice(0, optimizeIndex).every((item) => item.stage !== "optimize"));
});

test("resolved Secure stage unlocks Optimize allocations", () => {
  const result = runMoneyPriorityEngine(rawBase(), "2026-08-29");
  assert.equal(result.optimize.isUnlocked, true);
  assert.ok(result.optimize.totalDebtAllocation + result.optimize.totalInvestingAllocation > 0);
});

test("unresolved emergency reserve locks Optimize allocations", () => {
  const raw = rawBase();
  raw.accounts = [{ id: "a1", name: "Reserve", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.optimize.isUnlocked, false);
  assert.equal(result.optimize.totalDebtAllocation, 0);
  assert.equal(result.optimize.totalInvestingAllocation, 0);
  assert.ok(result.recommendations.some((item) => item.id === "secure-full-emergency-fund"));
});

test("Optimize plus Build allocations never exceed monthly plan capacity", () => {
  const result = runMoneyPriorityEngine(rawBase(), "2026-08-29");
  const total = result.build.totalAllocatedMonthly + result.optimize.totalDebtAllocation + result.optimize.totalInvestingAllocation;
  assert.ok(total <= Math.max(0, result.feasibility.monthlyPlanCapacity));
});

test("Optimize output is deterministic", () => {
  const first = runMoneyPriorityEngine(rawBase(), "2026-08-29");
  const second = runMoneyPriorityEngine(rawBase(), "2026-08-29");
  assert.deepEqual(second.optimize, first.optimize);
});
