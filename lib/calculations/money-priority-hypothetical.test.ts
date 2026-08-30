import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "h",
    people: [{ id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false }],
    income: [{ id: "i", owner_person_id: "p", name: "Job", monthly_amount: 7000, monthly_gross_amount: 10000, is_active: true }],
    expenses: [{ id: "e", name: "Essentials", category: "housing", monthly_amount: 2500, is_essential: true }],
    accounts: [
      { id: "cash", name: "Cash", account_type: "checking", balance: 10000, cash_purpose: "unallocated" },
      { id: "goal-cash", name: "Car", account_type: "savings", balance: 3000, cash_purpose: "earmarked_goal", related_goal_id: "car" },
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" },
    ],
    debts: [],
    goals: [{ id: "car", name: "Car", target_amount: 10000, current_amount: 3000, target_date: "2027-08-30", priority: 1, goal_class: "required", necessity: "necessary", deadline_flexibility: "fixed", consequence_level: "high" }],
    retirementAccounts: [], insuranceExposures: [],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy", desired_retirement_monthly_spending: null, retirement_spending_basis: "unknown", tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000 },
  };
}

function engine() { return runMoneyPriorityEngine(raw(), "2026-08-30"); }

test("no-op hypothetical rerun preserves the authoritative engine result", () => {
  const before = engine();
  const result = runHypotheticalMoneyPriorityEngine(before, {});
  assert.deepEqual(result.engine, before);
});

test("hypothetical rerun is deterministic and leaves the source engine immutable", () => {
  const before = engine(); const frozen = structuredClone(before);
  const changes = { addExpenses: [{ id: "x", name: "New cost", category: "transportation", monthlyAmount: 100, isEssential: true, cashFlowTreatment: "required" as const }] };
  const first = runHypotheticalMoneyPriorityEngine(before, changes);
  const second = runHypotheticalMoneyPriorityEngine(before, changes);
  assert.deepEqual(first, second);
  assert.deepEqual(before, frozen);
});

test("new financed purchase debt is rerun through Secure rather than treated as margin-only math", () => {
  const before = engine();
  const result = runHypotheticalMoneyPriorityEngine(before, {
    addDebts: [{ id: "auto", name: "Auto loan", type: "auto", balance: 20000, annualInterestRate: 20, minimumPayment: 500 }],
  });
  assert.equal(result.engine.snapshot.debts.some((debt) => debt.id === "auto"), true);
  assert.equal(result.engine.snapshot.aggregates.monthlyMinimumDebtPayments, before.snapshot.aggregates.monthlyMinimumDebtPayments + 500);
  assert.ok(result.engine.recommendations.some((recommendation) => recommendation.sourceInputs.includes("debt:auto")));
});

test("required hypothetical operating costs change authoritative monthly capacity", () => {
  const before = engine();
  const result = runHypotheticalMoneyPriorityEngine(before, {
    addExpenses: [{ id: "vehicle-ops", name: "Vehicle operating delta", category: "transportation", monthlyAmount: 250, isEssential: true, cashFlowTreatment: "required" }],
  });
  assert.equal(result.engine.snapshot.aggregates.monthlyRequiredOutflow, before.snapshot.aggregates.monthlyRequiredOutflow + 250);
  assert.equal(result.engine.snapshot.aggregates.monthlyCashFlowBeforeSavings, before.snapshot.aggregates.monthlyCashFlowBeforeSavings - 250);
});

test("negative synthetic expense can model a disappearing prior required cost without mutating stored data", () => {
  const before = engine();
  const result = runHypotheticalMoneyPriorityEngine(before, {
    addExpenses: [{ id: "housing-offset", name: "Housing cost offset", category: "housing", monthlyAmount: -500, isEssential: true, cashFlowTreatment: "required" }],
  });
  assert.equal(result.engine.snapshot.aggregates.monthlyRequiredOutflow, before.snapshot.aggregates.monthlyRequiredOutflow - 500);
  assert.equal(before.snapshot.expenses.some((expense) => expense.id === "housing-offset"), false);
});

test("cash use consumes related goal cash before unallocated cash and never protected reserve", () => {
  const before = engine();
  const result = runHypotheticalMoneyPriorityEngine(before, { cashUse: { amount: 5000, relatedGoalId: "car" } });
  const goalCash = result.engine.snapshot.accounts.find((account) => account.id === "goal-cash");
  const cash = result.engine.snapshot.accounts.find((account) => account.id === "cash");
  const reserve = result.engine.snapshot.accounts.find((account) => account.id === "reserve");
  assert.equal(goalCash?.balance, 0);
  assert.equal(cash?.balance, 8000);
  assert.equal(reserve?.balance, 9000);
  assert.equal(result.cashUsed, 5000);
});

test("hypothetical purchase cannot silently consume protected or unrelated earmarked cash", () => {
  const before = engine();
  assert.throws(() => runHypotheticalMoneyPriorityEngine(before, { cashUse: { amount: 14000, relatedGoalId: null } }), /exceeds eligible/);
});

test("available sale or trade cash can be added explicitly and then consumed in the same rerun", () => {
  const before = engine();
  const result = runHypotheticalMoneyPriorityEngine(before, { cashInflow: 5000, cashUse: { amount: 12000 } });
  assert.equal(result.cashInflowAdded, 5000);
  assert.equal(result.cashUsed, 12000);
  assert.equal(result.engine.snapshot.aggregates.protectedCash, before.snapshot.aggregates.protectedCash);
});

test("completing the related purchase goal removes its recurring protected funding need", () => {
  const before = engine();
  assert.ok(before.build.goals.find((goal) => goal.goalId === "car")?.protectedMonthlyNeed ?? 0 > 0);
  const result = runHypotheticalMoneyPriorityEngine(before, { completeGoalIds: ["car"] });
  assert.equal(result.engine.build.goals.find((goal) => goal.goalId === "car")?.protectedMonthlyNeed, 0);
});

test("policy mismatch is rejected instead of silently changing comparison policy", () => {
  const before = engine();
  const mismatched = { ...({} as Parameters<typeof runHypotheticalMoneyPriorityEngine>[2]), version: "different" };
  assert.throws(() => runHypotheticalMoneyPriorityEngine(before, {}, mismatched), /does not match/);
});

test("invalid hypothetical values are rejected", () => {
  const before = engine();
  assert.throws(() => runHypotheticalMoneyPriorityEngine(before, { cashInflow: -1 }), /cash inflow/);
  assert.throws(() => runHypotheticalMoneyPriorityEngine(before, { cashUse: { amount: Number.NaN } }), /cash use/);
  assert.throws(() => runHypotheticalMoneyPriorityEngine(before, { addDebts: [{ id: "d", name: "Debt", type: "auto", balance: -1, annualInterestRate: 5, minimumPayment: 10 }] }), /debt balance/);
  assert.throws(() => runHypotheticalMoneyPriorityEngine(before, { addExpenses: [{ id: "x", name: "Bad", category: "other", monthlyAmount: Number.NaN, isEssential: true, cashFlowTreatment: "required" }] }), /expense amount/);
});
