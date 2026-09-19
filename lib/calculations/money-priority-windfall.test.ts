import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { allocateWindfall, type WindfallInput } from "./money-priority-windfall.ts";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "h", people: [{ id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, estimated_taxable_compensation_annual: 100000,
      covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false }],
    income: [{ id: "i", owner_person_id: "p", name: "Job", monthly_amount: 7000, monthly_gross_amount: 10000, is_active: true }],
    expenses: [{ id: "e", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true }],
    accounts: [{ id: "cash", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" }],
    debts: [], goals: [], retirementAccounts: [],
    insuranceExposures: [{ id: "x", name: "Insurance", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy",
      desired_retirement_monthly_spending: null, retirement_spending_basis: "unknown", tax_profile_year: 2026,
      tax_filing_status: "single", estimated_modified_agi: 100000 },
  };
}

function evaluate(input: Partial<WindfallInput> = {}, source = raw()) {
  const engine = runMoneyPriorityEngine(source, "2026-08-30");
  return { engine, result: allocateWindfall(engine, { amount: 10000, source: "bonus", taxTreatment: "not_applicable", ...input }) };
}

test("positive finite windfall is accepted with deterministic cent rounding", () => {
  const { result } = evaluate({ amount: 10000.006 });
  assert.equal(result.state, "valid");
  assert.equal(result.grossAmount, 10000.01);
});

for (const [name, amount] of [["zero", 0], ["negative", -1], ["NaN", Number.NaN], ["Infinity", Number.POSITIVE_INFINITY]] as const) {
  test(`${name} windfall is invalid`, () => assert.equal(evaluate({ amount }).result.state, "invalid"));
}

test("known independent reservations reduce deployable capital exactly once", () => {
  const { result } = evaluate({ knownTaxLiability: 1000, knownOtherLiability: 500, restrictedAmount: 2000, earmarkedAmount: 1500 });
  assert.equal(result.deployableAmount, 5000);
  assert.equal(result.reservedTaxAmount, 1000);
  assert.equal(result.restrictedAmount + result.earmarkedAmount, 3500);
  assert.ok(result.totalAllocated <= 5000);
});

test("reservations above gross are invalid rather than negative", () => {
  const { result } = evaluate({ amount: 1000, knownTaxLiability: 800, restrictedAmount: 300 });
  assert.equal(result.state, "invalid");
  assert.equal(result.deployableAmount, 0);
});

test("malformed or negative reservation is invalid", () => {
  assert.equal(evaluate({ knownOtherLiability: -1 }).result.state, "invalid");
  assert.equal(evaluate({ restrictedAmount: Number.NaN }).result.state, "invalid");
});

test("uncertain tax treatment estimates no percentage and holds the remainder", () => {
  const { result } = evaluate({ taxTreatment: "uncertain", knownTaxLiability: 1000 });
  assert.equal(result.reservedTaxAmount, 1000);
  assert.equal(result.heldForTaxReviewAmount, 9000);
  assert.equal(result.deployableAmount, 0);
  assert.equal(result.state, "more_information_needed");
});

for (const source of ["inheritance", "tax_refund", "insurance_proceeds", "asset_sale", "legal_settlement"] as const) {
  test(`${source} source alone invents no tax liability or restriction`, () => {
    const { result } = evaluate({ source, taxTreatment: "not_applicable" });
    assert.equal(result.reservedTaxAmount, 0);
    assert.equal(result.restrictedAmount, 0);
  });
}

test("windfall leaves all recurring engine capacity and needs unchanged", () => {
  const { engine } = evaluate({ amount: 12000 });
  const before = structuredClone(engine);
  allocateWindfall(engine, { amount: 24000, source: "bonus", taxTreatment: "not_applicable" });
  assert.deepEqual(engine, before);
  assert.equal(engine.snapshot.aggregates.monthlyTakeHomeIncome, before.snapshot.aggregates.monthlyTakeHomeIncome);
  assert.equal(engine.build.monthlyPlanCapacity, before.build.monthlyPlanCapacity);
  assert.equal(engine.build.retirement.recommendedMonthlyIncrease, before.build.retirement.recommendedMonthlyIncrease);
});

test("existing cash fully satisfying reserve prevents duplicate windfall reserve funding", () => {
  const source = raw();
  source.accounts = [
    { id: "protected", name: "Reserve", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" },
    { id: "free", name: "Free", account_type: "checking", balance: 9000, cash_purpose: "unallocated" },
  ];
  const { engine, result } = evaluate({ amount: 5000 }, source);
  assert.ok(engine.existingCash.deployments.some((item) => item.category === "reserve"));
  assert.equal(result.allocations.some((item) => item.category === "reserve"), false);
});

test("partially residual reserve receives only the authoritative remainder and shared reserve is not doubled", () => {
  const source = raw();
  source.accounts = [
    { id: "protected", name: "Reserve", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" },
    { id: "free", name: "Free", account_type: "checking", balance: 4000, cash_purpose: "unallocated" },
  ];
  const { engine, result } = evaluate({ amount: 10000 }, source);
  const windfallReserve = result.allocations.filter((item) => item.category === "reserve").reduce((sum, item) => sum + item.allocatedAmount, 0);
  assert.equal(engine.residualNeeds.secureReserveApplied + windfallReserve, 9000);
});

test("Secure debt precedes a required goal and never exceeds residual principal", () => {
  const source = raw();
  source.debts = [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 2000, interest_rate: 25, minimum_payment: 50 }];
  source.goals = [{ id: "goal", name: "Required", target_amount: 5000, current_amount: 0, target_date: "2027-01-01",
    priority: 1, necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" }];
  const { result } = evaluate({ amount: 6000 }, source);
  const debtIndex = result.allocations.findIndex((item) => item.relatedEntityId === "card");
  const goalIndex = result.allocations.findIndex((item) => item.relatedEntityId === "goal");
  assert.equal(result.allocations[debtIndex]?.allocatedAmount, 2000);
  assert.ok(debtIndex >= 0 && goalIndex > debtIndex);
});

test("required, important, and optional goals preserve explicit phase order and target caps", () => {
  const source = raw();
  source.goals = [
    { id: "o", name: "Optional", target_amount: 1000, current_amount: 0, target_date: "2026-10-01", priority: 1, necessity: "optional" },
    { id: "i", name: "Important", target_amount: 1000, current_amount: 0, target_date: "2026-10-01", priority: 1, necessity: "important" },
    { id: "r", name: "Required", target_amount: 1000, current_amount: 500, target_date: "2027-01-01", priority: 5, necessity: "required" },
  ];
  const { result } = evaluate({ amount: 5000 }, source);
  const goals = result.allocations.filter((item) => item.category === "goal");
  assert.deepEqual(goals.map((item) => item.relatedEntityId), ["r", "i", "o"]);
  assert.deepEqual(goals.map((item) => item.allocatedAmount), [500, 1000, 1000]);
});

test("goal ties use stable IDs rather than input order", () => {
  const source = raw();
  source.goals = ["b", "a"].map((id) => ({ id, name: id, target_amount: 1000, current_amount: 0,
    target_date: "2027-01-01", priority: 1, necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" }));
  assert.deepEqual(evaluate({ amount: 1500 }, source).result.allocations.filter((item) => item.category === "goal").map((item) => item.relatedEntityId), ["a", "b"]);
});

test("PSLF and IDR preservation debts receive no windfall acceleration", () => {
  const source = raw();
  source.debts = [
    { id: "p", name: "PSLF", debt_type: "student_loan", current_balance: 20000, interest_rate: 8, minimum_payment: 100,
      student_loan_source: "federal", student_loan_forgiveness_strategy: "pslf", student_loan_strategy_active: true,
      student_loan_repayment_plan: "ibr", qualifying_payments_made: 50, qualifying_payments_required: 120 },
    { id: "i", name: "IDR", debt_type: "student_loan", current_balance: 20000, interest_rate: 8, minimum_payment: 100,
      student_loan_source: "federal", student_loan_forgiveness_strategy: "idr", student_loan_strategy_active: true,
      student_loan_repayment_plan: "ibr", estimated_forgiveness_amount: 10000, estimated_forgiveness_date: "2035-01-01",
      forgiveness_tax_treatment: "unknown" },
  ];
  assert.equal(evaluate({ amount: 50000 }, source).result.allocations.some((item) => item.category === "debt"), false);
});

test("ordinary high-interest student debt follows ordinary Secure policy", () => {
  const source = raw();
  source.debts = [{ id: "s", name: "Private loan", debt_type: "student_loan", current_balance: 3000,
    interest_rate: 15, minimum_payment: 100, student_loan_source: "private", student_loan_forgiveness_strategy: "none",
    student_loan_strategy_active: false }];
  const allocation = evaluate({ amount: 5000 }, source).result.allocations.find((item) => item.relatedEntityId === "s");
  assert.equal(allocation?.allocatedAmount, 3000);
});

test("low-rate mortgage is not a mandatory windfall sink", () => {
  const source = raw();
  source.debts = [{ id: "m", name: "Mortgage", debt_type: "mortgage", current_balance: 100000, interest_rate: 3, minimum_payment: 1000 }];
  const { result } = evaluate({ amount: 10000 }, source);
  assert.equal(result.allocations.some((item) => item.relatedEntityId === "m"), false);
  assert.ok(result.remainingUnallocated > 0);
});

test("retirement requires modeled need and only direct IRA/HSA destinations", () => {
  const source = raw();
  // Leave the direct-account room unconsumed by recurring Build so this test
  // isolates Windfall destination filtering rather than reopening prior room.
  source.income![0].monthly_amount = 3000;
  source.preferences = { ...source.preferences, desired_retirement_monthly_spending: 5000,
    retirement_spending_basis: "today_dollars", planning_social_security_monthly: 0, planning_pension_monthly: 0 };
  source.retirementAccounts = [
    { id: "k", owner_person_id: "p", name: "401k", account_type: "401k", balance: 0, monthly_employee_contribution: 0,
      monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "fully_captured" },
    { id: "ira", owner_person_id: "p", name: "Roth IRA", account_type: "roth_ira", balance: 0, monthly_employee_contribution: 0,
      monthly_employer_contribution: 0, employee_contributed_ytd: 7000, employer_contributed_ytd: 0, match_status: "not_offered" },
    { id: "sep", owner_person_id: "p", name: "SEP", account_type: "sep_ira", balance: 0, monthly_employee_contribution: 0,
      monthly_employer_contribution: 0, employer_contributed_ytd: 0, sep_eligible_compensation_annual: 100000,
      sep_compensation_calculation_supported: true, match_status: "not_offered" },
  ];
  const { result } = evaluate({ amount: 10000 }, source);
  const retirement = result.allocations.filter((item) => item.category === "retirement");
  assert.deepEqual(retirement.map((item) => item.relatedEntityId), ["ira"]);
  assert.equal(retirement[0]?.allocatedAmount, 500);
  assert.ok(result.warnings.some((item) => item.includes("no known direct legal destination")));
});

test("legal retirement room alone does not create a contribution", () => {
  const source = raw();
  source.retirementAccounts = [{ id: "ira", owner_person_id: "p", name: "IRA", account_type: "roth_ira", balance: 50000,
    monthly_employee_contribution: 1200, monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered" }];
  assert.equal(evaluate({ amount: 10000 }, source).result.allocations.some((item) => item.category === "retirement"), false);
});

test("employer match and payroll-only SIMPLE are not direct windfall destinations", () => {
  const source = raw();
  source.retirementAccounts = [{ id: "s", owner_person_id: "p", name: "SIMPLE", account_type: "simple_ira", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_fully_captured", full_match_employee_contribution_monthly: 500,
    simple_higher_limit_eligible: false }];
  assert.equal(evaluate({ amount: 10000 }, source).result.allocations.some((item) => item.category === "retirement"), false);
});

test("taxable investing is not forced and unallocated windfall is allowed", () => {
  const { result } = evaluate({ amount: 50000 });
  assert.equal(result.totalAllocated + result.remainingUnallocated, result.deployableAmount);
  assert.ok(result.remainingUnallocated > 0);
});

test("identical inputs are deterministic and all inputs remain immutable", () => {
  const source = raw();
  const engine = runMoneyPriorityEngine(source, "2026-08-30");
  const input: WindfallInput = { amount: 12345, source: "gift", taxTreatment: "known_non_taxable", note: "test" };
  const sourceBefore = structuredClone(source);
  const engineBefore = structuredClone(engine);
  const inputBefore = structuredClone(input);
  assert.deepEqual(allocateWindfall(engine, input), allocateWindfall(engine, input));
  assert.deepEqual(source, sourceBefore);
  assert.deepEqual(engine, engineBefore);
  assert.deepEqual(input, inputBefore);
});
