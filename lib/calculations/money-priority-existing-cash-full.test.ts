import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "cash-full",
    people: [{
      id: "p1", display_name: "Adult", birth_date: "1990-01-01", planned_retirement_age: 65,
      is_active: true, is_dependent: false,
    }],
    income: [{
      id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 5000,
      monthly_gross_amount: 7000, is_active: true, is_variable: false,
    }],
    expenses: [{ id: "e1", name: "Essentials", category: "housing", monthly_amount: 2500, is_essential: true }],
    accounts: [
      { id: "cash", name: "Extra cash", account_type: "savings", balance: 10000, cash_purpose: "unallocated" },
      { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
    ],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 50000,
      monthly_employee_contribution: 840, monthly_employer_contribution: 0,
      employee_contributed_ytd: 10080, match_status: "fully_captured",
    }],
    goals: [],
    insuranceExposures: [{ id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy",
      known_income_disruption: false,
    },
  };
}

test("Build existing cash closes a required-goal funding shortfall without changing monthly capacity", () => {
  const raw = baseRaw();
  raw.income = [{
    id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 3500,
    monthly_gross_amount: 7000, is_active: true, is_variable: false,
  }];
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 10000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
  ];
  raw.goals = [{
    id: "car", name: "Required Car", target_amount: 12000, current_amount: 0,
    target_date: "2027-08-29", priority: 1, goal_class: "necessary_protective", necessity: "required",
    deadline_flexibility: "fixed", consequence_level: "high",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const goalDeployment = result.existingCash.deployments.find((item) => item.id === "existing-cash-build-goal-car");

  assert.equal(result.snapshot.aggregates.monthlyCashFlowBeforeSavings, 1000);
  assert.equal(result.build.allocationMonthlyCapacity, 1000);
  assert.equal(result.build.allocations.find((item) => item.relatedEntityId === "car")?.unfundedMonthlyAmount, 0);
  assert.equal(goalDeployment, undefined);
});

test("Build existing cash closes only the deadline shortfall when monthly capacity is insufficient", () => {
  const raw = baseRaw();
  raw.income = [{
    id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 3000,
    monthly_gross_amount: 7000, is_active: true, is_variable: false,
  }];
  raw.retirementAccounts = [];
  raw.goals = [{
    id: "car", name: "Required Car", target_amount: 12000, current_amount: 0,
    target_date: "2027-08-29", priority: 1, goal_class: "necessary_protective", necessity: "required",
    deadline_flexibility: "fixed", consequence_level: "high",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const goalAllocation = result.build.allocations.find((item) => item.relatedEntityId === "car");
  const goalDeployment = result.existingCash.deployments.find((item) => item.id === "existing-cash-build-goal-car");

  assert.equal(result.snapshot.aggregates.monthlyCashFlowBeforeSavings, 500);
  assert.equal(goalAllocation?.allocatedMonthlyAmount, 500);
  assert.equal(goalAllocation?.unfundedMonthlyAmount, 0);
  assert.equal(goalDeployment?.amount, 6000);
  assert.equal((goalDeployment?.amount ?? 0) + (goalAllocation?.allocatedMonthlyAmount ?? 0) * 12, 12000);
  assert.equal(result.existingCash.remainingUnallocatedCash, 4000);
});

test("retirement cash catch-up is capped by known annual contribution room", () => {
  const raw = baseRaw();
  raw.income = [{
    id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 2600,
    monthly_gross_amount: 7000, is_active: true, is_variable: false,
  }];
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 24000, match_status: "fully_captured",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const retirementDeployment = result.existingCash.deployments.find((item) => item.id === "existing-cash-build-retirement");

  assert.equal(result.build.retirement.recommendedMonthlyIncrease, 840);
  assert.equal(result.build.allocations.find((item) => item.category === "retirement")?.unfundedMonthlyAmount, 740);
  assert.equal(retirementDeployment?.amount, 500);
});

test("Optimize investing deploys only cash above the liquidity floor", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 10000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 10500, cash_purpose: "protected_reserve" },
  ];
  raw.debts = [{
    id: "mortgage", name: "Mortgage", debt_type: "mortgage", current_balance: 150000,
    interest_rate: 3, minimum_payment: 1000, rate_type: "fixed",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const investing = result.existingCash.deployments.find((item) => item.id === "existing-cash-optimize-investing");

  assert.equal(result.existingCash.liquidityFloor, 1750);
  assert.equal(investing?.amount, 8250);
  assert.equal(result.existingCash.remainingUnallocatedCash, 1750);
});

test("Optimize split keeps the liquidity floor and divides deployable cash between debt and investing", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 10000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 10500, cash_purpose: "protected_reserve" },
  ];
  raw.debts = [{
    id: "mortgage", name: "Mortgage", debt_type: "mortgage", current_balance: 150000,
    interest_rate: 5, minimum_payment: 1000, rate_type: "fixed",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const debt = result.existingCash.deployments.find((item) => item.id === "existing-cash-optimize-debt-mortgage");
  const investing = result.existingCash.deployments.find((item) => item.id === "existing-cash-optimize-investing");

  assert.equal(result.existingCash.liquidityFloor, 1750);
  assert.equal(debt?.amount, 4125);
  assert.equal(investing?.amount, 4125);
  assert.equal(result.existingCash.remainingUnallocatedCash, 1750);
});

test("unresolved Secure needs prevent Build and Optimize existing-cash deployments", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 1000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" },
  ];
  raw.goals = [{
    id: "car", name: "Required Car", target_amount: 12000, current_amount: 0,
    target_date: "2027-08-29", priority: 1, goal_class: "necessary_protective", necessity: "required",
    deadline_flexibility: "fixed", consequence_level: "high",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");

  assert.equal(result.existingCash.secureFullyCovered, false);
  assert.ok(result.existingCash.deployments.every((item) => item.stage === "secure"));
  assert.equal(result.existingCash.remainingUnallocatedCash, 0);
});
