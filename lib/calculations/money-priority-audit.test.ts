import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { MONEY_PRIORITY_POLICY_V1 } from "./money-priority-policy.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "audit-household",
    people: [{ id: "p1", display_name: "Adult", relationship: "self", is_active: true, is_dependent: false }],
    income: [{ id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 5000, monthly_gross_amount: 7000, is_active: true, is_variable: false }],
    expenses: [
      { id: "e1", name: "Essentials", category: "housing", monthly_amount: 2500, is_essential: true },
      { id: "e2", name: "Lifestyle", category: "personal", monthly_amount: 1000, is_essential: false },
    ],
    accounts: [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 10000, cash_purpose: "protected_reserve" }],
    debts: [], retirementAccounts: [],
    goals: [{ id: "g1", name: "Required Car", target_amount: 12000, current_amount: 0, target_date: "2027-08-29", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" }],
    insuranceExposures: [{ id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy", known_income_disruption: false },
  };
}

function totalMonthlyAllocated(result: ReturnType<typeof runMoneyPriorityEngine>): number {
  return result.recommendations.reduce((sum, recommendation) => sum + recommendation.allocations.reduce((inner, allocation) => inner + allocation.monthlyAmount, 0), 0);
}

test("cross-stage allocations never exceed monthly plan capacity", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{ id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, plan_eligible_compensation_annual: 84000, full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.ok(totalMonthlyAllocated(result) <= Math.max(0, result.snapshot.aggregates.monthlyCashFlowBeforeSavings));
  assert.equal(result.build.allocationMonthlyCapacity, 1200);
});

test("employer match consumes capacity before Build allocations", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{ id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, plan_eligible_compensation_annual: 84000, full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.recommendations.find((item) => item.id === "secure-match-gap-r1")?.allocations[0]?.monthlyAmount, 300);
  assert.equal(result.build.allocationMonthlyCapacity, 1200);
});

test("promo payoff pace consumes capacity before Build allocations", () => {
  const raw = baseRaw();
  raw.debts = [{ id: "promo", name: "Promo Card", debt_type: "credit_card", current_balance: 1200, interest_rate: 0, minimum_payment: 0, rate_type: "promotional", promo_rate_expires_on: "2027-08-29", post_promo_interest_rate: 24 }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.recommendations.find((item) => item.id === "secure-promo-paydown-promo")?.allocations[0]?.monthlyAmount, 100);
  assert.equal(result.build.allocationMonthlyCapacity, 1400);
  assert.ok(totalMonthlyAllocated(result) <= 1500);
});

test("unfunded high-interest debt consumes current capacity before Build", () => {
  const raw = baseRaw();
  raw.debts = [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 5000, interest_rate: 20, minimum_payment: 0, rate_type: "fixed" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.recommendations.find((item) => item.id === "secure-debt-high-card")?.allocations[0]?.monthlyAmount, 1500);
  assert.equal(result.build.allocationMonthlyCapacity, 0);
  assert.equal(result.optimize.isUnlocked, false);
});

test("emergency reserve gap consumes capacity before Build", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.recommendations.find((item) => item.id === "secure-full-emergency-fund")?.allocations[0]?.monthlyAmount, 1500);
  assert.equal(result.build.allocationMonthlyCapacity, 0);
});

test("a small Secure balance gap can be completed before residual capacity flows downstream", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 7400, cash_purpose: "protected_reserve" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.recommendations.find((item) => item.id === "secure-full-emergency-fund")?.allocations[0]?.monthlyAmount, 100);
  assert.equal(result.build.allocationMonthlyCapacity, 1400);
  assert.ok(totalMonthlyAllocated(result) <= 1500);
});

test("deductible and full emergency reserve do not double-allocate the same reserve need", () => {
  const raw = baseRaw();
  raw.income = [{ id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 12000, monthly_gross_amount: 7000, is_active: true, is_variable: false }];
  raw.accounts = [{ id: "a1", name: "Emergency Fund", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" }];
  raw.goals = [];
  raw.retirementAccounts = [{ id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0, monthly_employee_contribution: 840, monthly_employer_contribution: 0, match_status: "fully_captured" }];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const deductible = result.recommendations.find((item) => item.id === "secure-deductible-gap");
  const emergency = result.recommendations.find((item) => item.id === "secure-full-emergency-fund");
  assert.equal((deductible?.allocations[0]?.monthlyAmount ?? 0) + (emergency?.allocations[0]?.monthlyAmount ?? 0), 7500);
});

test("custom policy propagates through Secure and Optimize instead of silently using defaults", () => {
  const raw = baseRaw();
  raw.goals = [];
  raw.retirementAccounts = [{ id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0, monthly_employee_contribution: 840, monthly_employer_contribution: 0, match_status: "fully_captured" }];
  raw.debts = [
    { id: "consumer", name: "Consumer Loan", debt_type: "personal_loan", current_balance: 5000, interest_rate: 12, minimum_payment: 0, rate_type: "fixed" },
    { id: "mortgage", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 6.5, minimum_payment: 0, rate_type: "fixed" },
  ];
  const policy = { ...MONEY_PRIORITY_POLICY_V1, version: "audit-custom", highInterestDebtApr: 0.15, debtDecision: { ...MONEY_PRIORITY_POLICY_V1.debtDecision, accelerateStartingApr: 0.13 }, optimizeDebt: { mortgagePayoffFavoredApr: 0.07, mortgageInvestingFavoredApr: 0.03 } };
  const result = runMoneyPriorityEngine(raw, "2026-08-29", policy);
  assert.equal(result.policyVersion, "audit-custom");
  assert.equal(result.secure.debtClassifications.find((item) => item.debtId === "consumer")?.band, "payoff_favored");
  assert.equal(result.optimize.recommendations.find((item) => item.relatedDebtId === "mortgage")?.decision, "split");
});

test("existing cash deployment never exceeds the unallocated cash pool", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "free", name: "Unallocated", account_type: "savings", balance: 2500, cash_purpose: "unallocated" },
    { id: "protected", name: "Emergency", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" },
    { id: "earmarked", name: "Goal", account_type: "savings", balance: 9000, cash_purpose: "earmarked_goal" },
  ];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.existingCash.availableUnallocatedCash, 2500);
  assert.ok(result.existingCash.deployedCash <= 2500);
  assert.equal(result.existingCash.deployedCash + result.existingCash.remainingUnallocatedCash, 2500);
});

test("existing cash deployment is deterministic and does not alter monthly allocation capacity", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "free", name: "Unallocated", account_type: "savings", balance: 1000, cash_purpose: "unallocated" },
    { id: "protected", name: "Emergency", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" },
  ];
  const first = runMoneyPriorityEngine(raw, "2026-08-29");
  const second = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.deepEqual(second.existingCash, first.existingCash);
  assert.equal(first.build.allocationMonthlyCapacity, second.build.allocationMonthlyCapacity);
  assert.ok(totalMonthlyAllocated(first) <= Math.max(0, first.snapshot.aggregates.monthlyCashFlowBeforeSavings));
});
