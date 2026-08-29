import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "audit-household",
    people: [{ id: "p1", display_name: "Adult", relationship: "self", is_active: true, is_dependent: false }],
    income: [{
      id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 5000,
      monthly_gross_amount: 7000, is_active: true, is_variable: false,
    }],
    expenses: [
      { id: "e1", name: "Essentials", category: "housing", monthly_amount: 2500, is_essential: true },
      { id: "e2", name: "Lifestyle", category: "personal", monthly_amount: 1000, is_essential: false },
    ],
    accounts: [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 10000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [],
    goals: [{
      id: "g1", name: "Required Car", target_amount: 12000, current_amount: 0,
      target_date: "2027-08-29", priority: 1, goal_class: "necessary_protective",
      necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
    }],
    insuranceExposures: [{
      id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000,
      is_relevant_to_reserve: true,
    }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced",
      job_replacement_difficulty: "easy", known_income_disruption: false,
    },
  };
}

function totalMonthlyAllocated(result: ReturnType<typeof runMoneyPriorityEngine>): number {
  return result.recommendations.reduce(
    (sum, recommendation) => sum + recommendation.allocations.reduce((inner, allocation) => inner + allocation.monthlyAmount, 0),
    0,
  );
}

test("cross-stage allocations never exceed monthly plan capacity", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
  }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.ok(totalMonthlyAllocated(result) <= Math.max(0, result.snapshot.aggregates.monthlyCashFlowBeforeSavings));
  assert.equal(result.build.allocationMonthlyCapacity, 1200);
});

test("employer match consumes capacity before Build allocations", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
  }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const match = result.recommendations.find((item) => item.id === "secure-match-gap-r1");
  assert.equal(match?.allocations[0]?.monthlyAmount, 300);
  assert.equal(result.build.allocationMonthlyCapacity, 1200);
  assert.ok(result.build.totalAllocatedMonthly <= 1200);
});

test("promo payoff pace consumes capacity before Build allocations", () => {
  const raw = baseRaw();
  raw.debts = [{
    id: "promo", name: "Promo Card", debt_type: "credit_card", current_balance: 1200,
    interest_rate: 0, minimum_payment: 0, rate_type: "promotional",
    promo_rate_expires_on: "2027-08-29", post_promo_interest_rate: 24,
  }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const promo = result.recommendations.find((item) => item.id === "secure-promo-paydown-promo");
  assert.equal(promo?.allocations[0]?.monthlyAmount, 100);
  assert.equal(result.build.allocationMonthlyCapacity, 1400);
  assert.ok(totalMonthlyAllocated(result) <= 1500);
});

test("unfunded high-interest debt consumes current capacity before Build", () => {
  const raw = baseRaw();
  raw.debts = [{
    id: "card", name: "Card", debt_type: "credit_card", current_balance: 5000,
    interest_rate: 20, minimum_payment: 0, rate_type: "fixed",
  }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const debt = result.recommendations.find((item) => item.id === "secure-debt-high-card");
  assert.equal(debt?.allocations[0]?.monthlyAmount, 1500);
  assert.equal(result.build.allocationMonthlyCapacity, 0);
  assert.equal(result.build.totalAllocatedMonthly, 0);
  assert.equal(result.optimize.isUnlocked, false);
});

test("emergency reserve gap consumes capacity before Build", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const emergency = result.recommendations.find((item) => item.id === "secure-full-emergency-fund");
  assert.equal(emergency?.allocations[0]?.monthlyAmount, 1500);
  assert.equal(result.build.allocationMonthlyCapacity, 0);
  assert.equal(result.build.totalAllocatedMonthly, 0);
});

test("a small Secure balance gap can be completed before residual capacity flows downstream", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 7400, cash_purpose: "protected_reserve" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const emergency = result.recommendations.find((item) => item.id === "secure-full-emergency-fund");
  assert.equal(emergency?.allocations[0]?.monthlyAmount, 100);
  assert.equal(result.build.allocationMonthlyCapacity, 1400);
  assert.ok(result.build.totalAllocatedMonthly <= 1400);
  assert.ok(totalMonthlyAllocated(result) <= 1500);
});
