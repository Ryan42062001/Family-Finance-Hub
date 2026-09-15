import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "household-1",
    people: [
      {
        id: "person-1",
        display_name: "Alex",
        relationship: "self",
        birth_date: "1990-01-01",
        planned_retirement_age: 67,
        estimated_taxable_compensation_annual: 90000,
        is_active: true,
        is_dependent: false,
      },
    ],
    income: [
      {
        id: "income-1",
        owner_person_id: "person-1",
        name: "Salary",
        monthly_amount: 6000,
        monthly_gross_amount: 7500,
        is_variable: false,
        is_active: true,
      },
    ],
    expenses: [
      { id: "expense-1", name: "Housing", category: "housing", monthly_amount: 2500, is_essential: true },
      { id: "expense-2", name: "Lifestyle", category: "other", monthly_amount: 500, is_essential: false },
    ],
    accounts: [
      { id: "account-1", name: "Emergency Savings", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" },
    ],
    debts: [
      {
        id: "debt-1",
        name: "Credit Card",
        debt_type: "credit_card",
        current_balance: 4000,
        interest_rate: 18,
        minimum_payment: 200,
        rate_type: "fixed",
      },
    ],
    retirementAccounts: [
      {
        id: "retirement-1",
        owner_person_id: "person-1",
        name: "401(k)",
        account_type: "401k",
        balance: 10000,
        monthly_employee_contribution: 300,
        monthly_employer_contribution: 150,
        employee_contributed_ytd: 0,
        employer_contributed_ytd: 0,
        plan_eligible_compensation_annual: 90000,
        annual_employee_limit: 24500,
        annual_combined_limit: 73500,
        plan_limit_confirmed: true,
        workplace_plan_access: true,
        match_status: "fully_captured",
      },
    ],
    goals: [
      {
        id: "goal-1",
        name: "Replace Car",
        target_amount: 12000,
        current_amount: 0,
        target_date: "2027-08-29",
        priority: 1,
        goal_class: "necessary_protective",
        necessity: "required",
        deadline_flexibility: "fixed",
        consequence_level: "high",
        planned_monthly_contribution: 0,
        core_need_amount: 12000,
        goal_intelligence_confirmed: true,
        underlying_need: "Maintain reliable transportation",
        desired_solution: "Replace the vehicle",
        goal_nature: "preservation",
        underfunding_consequence: "employment_disruption",
        borrowing_likelihood: "unlikely",
        expected_borrowing_amount: null,
        expected_borrowing_apr: null,
      },
    ],
    insuranceExposures: [
      {
        id: "insurance-1",
        name: "Auto",
        exposure_type: "auto",
        deductible_amount: 1000,
        is_relevant_to_reserve: true,
      },
    ],
    preferences: {
      emergency_fund_months_override: 3,
      debt_vs_investing: "balanced",
      roth_vs_traditional: "balanced",
      risk_tolerance: "moderate",
      retirement_priority: "normal",
      job_replacement_difficulty: "easy",
      known_income_disruption: false,
      desired_retirement_monthly_spending: 1000,
      retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0,
      planning_pension_monthly: 0,
    },
  };
}

test("engine is deterministic for the same snapshot, policy, and as-of date", () => {
  const raw = baseRaw();
  const first = runMoneyPriorityEngine(raw, "2026-08-29");
  const second = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.deepEqual(second, first);
});

test("secure recommendations rank ahead of build recommendations", () => {
  const result = runMoneyPriorityEngine(baseRaw(), "2026-08-29");
  const creditCardIndex = result.recommendations.findIndex((item) => item.id === "secure-debt-high-debt-1");
  const carIndex = result.recommendations.findIndex((item) => item.id === "build-goal-goal-1");
  assert.ok(creditCardIndex >= 0);
  assert.ok(carIndex >= 0);
  assert.ok(creditCardIndex < carIndex);
});

test("engine does not allocate more Build dollars than monthly capacity", () => {
  const raw = baseRaw();
  raw.goals = [
    ...(raw.goals ?? []),
    {
      id: "goal-2",
      name: "Large Required Goal",
      target_amount: 100000,
      current_amount: 0,
      target_date: "2027-08-29",
      priority: 2,
      goal_class: "necessary_protective",
      necessity: "required",
      deadline_flexibility: "fixed",
      consequence_level: "high",
      planned_monthly_contribution: 0,
      core_need_amount: 100000,
      goal_intelligence_confirmed: true,
      underlying_need: "Maintain another required household function",
      desired_solution: "Fund the required goal",
      goal_nature: "preservation",
      underfunding_consequence: "other_material",
      borrowing_likelihood: "unlikely",
      expected_borrowing_amount: null,
      expected_borrowing_apr: null,
    },
  ];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.ok(result.build.totalAllocatedMonthly <= result.build.monthlyPlanCapacity);
});

test("negative cash flow creates a Stabilize recommendation before Secure and Build", () => {
  const raw = baseRaw();
  raw.expenses = [
    { id: "expense-1", name: "Housing", category: "housing", monthly_amount: 6500, is_essential: true },
  ];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.equal(result.recommendations[0]?.id, "stabilize-cash-flow-gap");
  assert.equal(result.recommendations[0]?.stage, "stabilize");
});

test("missing gross income blocks only retirement benchmarking", () => {
  const raw = baseRaw();
  raw.income = [
    {
      id: "income-1",
      owner_person_id: "person-1",
      name: "Salary",
      monthly_amount: 6000,
      monthly_gross_amount: null,
      is_variable: false,
      is_active: true,
    },
  ];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  assert.ok(result.recommendations.some((item) => item.id === "build-retirement-missing-data"));
  assert.ok(result.recommendations.some((item) => item.id === "secure-debt-high-debt-1"));
  assert.ok(result.recommendations.some((item) => item.id === "build-goal-goal-1"));
});

test("rank values are contiguous and stable", () => {
  const result = runMoneyPriorityEngine(baseRaw(), "2026-08-29");
  assert.deepEqual(result.recommendations.map((item) => item.rank),
    result.recommendations.map((_, index) => index + 1));
});
