import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "residual-household",
    people: [{
      id: "p1",
      display_name: "Adult",
      birth_date: "1990-01-01",
      planned_retirement_age: 65,
      is_active: true,
      is_dependent: false,
    }],
    income: [{
      id: "i1",
      owner_person_id: "p1",
      name: "Salary",
      monthly_amount: 5000,
      monthly_gross_amount: 7000,
      is_active: true,
      is_variable: false,
    }],
    expenses: [{
      id: "e1",
      name: "Essentials",
      category: "housing",
      monthly_amount: 2500,
      is_essential: true,
    }],
    accounts: [
      { id: "cash", name: "Extra cash", account_type: "savings", balance: 6500, cash_purpose: "unallocated" },
      { id: "ef", name: "Emergency", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" },
    ],
    debts: [],
    retirementAccounts: [],
    goals: [],
    insuranceExposures: [{
      id: "x1",
      name: "Auto",
      insurance_type: "auto",
      deductible_amount: 1000,
      is_relevant_to_reserve: true,
    }],
    preferences: {
      emergency_fund_months_override: 3,
      debt_vs_investing: "balanced",
      job_replacement_difficulty: "easy",
      known_income_disruption: false,
    },
  };
}

test("one-time reserve deployment removes the same need from recurring Secure allocation", () => {
  const result = runMoneyPriorityEngine(baseRaw(), "2026-08-29");
  const reserveDeployed = result.existingCash.deployments
    .filter((item) => item.category === "reserve")
    .reduce((sum, item) => sum + item.amount, 0);
  const recurringReserve = result.recommendations
    .flatMap((item) => item.allocations)
    .filter((item) => item.category === "reserve")
    .reduce((sum, item) => sum + item.monthlyAmount, 0);

  assert.equal(reserveDeployed, 6500);
  assert.equal(result.residualNeeds.secureReserveApplied, 6500);
  assert.equal(result.secure.fullEmergencyGap, 0);
  assert.equal(recurringReserve, 0);
  assert.equal(result.snapshot.aggregates.protectedCash, 1000);
  assert.equal(result.snapshot.aggregates.unallocatedCash, 6500);
});

test("employer match remains a recurring payroll need after one-time cash planning", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 1000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
  ];
  raw.retirementAccounts = [{
    id: "r1",
    owner_person_id: "p1",
    name: "401(k)",
    account_type: "401k",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 300,
    match_status: "not_fully_captured",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const match = result.recommendations.find((item) => item.id === "secure-match-gap-r1");

  assert.equal(result.existingCash.deployments.some((item) => item.id.includes("match")), false);
  assert.equal(match?.allocations[0]?.monthlyAmount, 300);
});

test("one-time goal funding reduces the corresponding recurring Build need", () => {
  const raw = baseRaw();
  raw.income = [{
    id: "i1",
    owner_person_id: "p1",
    name: "Salary",
    monthly_amount: 3000,
    monthly_gross_amount: 7000,
    is_active: true,
    is_variable: false,
  }];
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 10000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
  ];
  raw.goals = [{
    id: "car",
    name: "Required Car",
    target_amount: 12000,
    current_amount: 0,
    target_date: "2027-08-29",
    priority: 1,
    goal_class: "necessary_protective",
    necessity: "required",
    deadline_flexibility: "fixed",
    consequence_level: "high",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const deployment = result.existingCash.deployments.find((item) => item.id === "existing-cash-build-goal-car");
  const recurring = result.build.allocations.find((item) => item.relatedEntityId === "car");

  assert.equal(deployment?.amount, 6000);
  assert.equal(result.residualNeeds.goalAppliedById.car, 6000);
  assert.equal(recurring?.allocatedMonthlyAmount, 500);
  assert.equal(recurring?.unfundedMonthlyAmount, 0);
  assert.equal((deployment?.amount ?? 0) + (recurring?.allocatedMonthlyAmount ?? 0) * 12, 12000);
  assert.equal(result.snapshot.goals[0]?.currentAmount, 0);
});

test("one-time debt payoff removes the debt from downstream recurring claims", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7800, cash_purpose: "protected_reserve" },
  ];
  raw.debts = [{
    id: "card",
    name: "Card",
    debt_type: "credit_card",
    current_balance: 5000,
    interest_rate: 22,
    minimum_payment: 100,
    rate_type: "fixed",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const deployment = result.existingCash.deployments.find((item) => item.relatedEntityId === "card");
  const recurringDebt = result.recommendations
    .flatMap((item) => item.allocations)
    .filter((item) => item.category === "debt" && item.relatedEntityId === "card")
    .reduce((sum, item) => sum + item.monthlyAmount, 0);

  assert.equal(deployment?.amount, 5000);
  assert.equal(result.residualNeeds.debtAppliedById.card, 5000);
  assert.equal(recurringDebt, 0);
  assert.equal(result.secure.recommendations.some((item) => item.relatedEntityId === "card"), false);
  assert.equal(result.optimize.recommendations.some((item) => item.relatedDebtId === "card"), false);
  assert.equal(result.snapshot.debts[0]?.balance, 5000);
});

test("retirement catch-up remains distinct from recurring retirement trajectory funding", () => {
  const raw = baseRaw();
  raw.people![0]!.estimated_taxable_compensation_annual = 84000;
  raw.income = [{
    id: "i1",
    owner_person_id: "p1",
    name: "Salary",
    monthly_amount: 2600,
    monthly_gross_amount: 7000,
    is_active: true,
    is_variable: false,
  }];
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 10000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
  ];
  raw.retirementAccounts = [{
    id: "r1",
    owner_person_id: "p1",
    name: "401(k)",
    account_type: "401k",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: 24000,
    employer_contributed_ytd: 0,
    match_status: "fully_captured",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const retirement = result.build.allocations.find((item) => item.category === "retirement");

  assert.equal(result.residualNeeds.retirementCatchUpApplied, 500);
  assert.equal(retirement?.allocatedMonthlyAmount, 100);
  assert.equal(retirement?.unfundedMonthlyAmount, 740);
});

test("residual reconciliation preserves the cross-stage monthly-capacity invariant", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7800, cash_purpose: "protected_reserve" },
  ];
  raw.debts = [{
    id: "card",
    name: "Card",
    debt_type: "credit_card",
    current_balance: 5000,
    interest_rate: 22,
    minimum_payment: 100,
    rate_type: "fixed",
  }];

  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const recurring = result.recommendations
    .flatMap((item) => item.allocations)
    .reduce((sum, item) => sum + item.monthlyAmount, 0);

  assert.ok(recurring <= Math.max(0, result.feasibility.monthlyPlanCapacity));
});
