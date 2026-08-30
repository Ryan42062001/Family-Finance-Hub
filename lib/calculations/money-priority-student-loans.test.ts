import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { assessStudentLoanStrategy } from "./money-priority-student-loans.ts";
import {
  deriveRecommendedPlanAllocations,
  evaluateUserPlan,
} from "./money-priority-user-plan.ts";

const AS_OF = "2026-08-30";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "student-loan-household",
    people: [{ id: "p1", display_name: "Alex", relationship: "self", is_active: true, is_dependent: false }],
    income: [{ id: "income", owner_person_id: "p1", name: "Salary", monthly_amount: 6000, monthly_gross_amount: 7500, is_active: true }],
    expenses: [{ id: "expense", name: "Essentials", category: "housing", monthly_amount: 2500, is_essential: true }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 8100, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 100000,
      monthly_employee_contribution: 900, monthly_employer_contribution: 225,
      full_match_employee_contribution_monthly: 500, match_status: "fully_captured",
    }],
    goals: [],
    insuranceExposures: [{ id: "insurance", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy", known_income_disruption: false },
  };
}

function loan(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "student-1", name: "Student Loan", debt_type: "student_loan", current_balance: 20000,
    interest_rate: 12, minimum_payment: 200, rate_type: "fixed",
    student_loan_source: "private", student_loan_repayment_plan: "standard",
    student_loan_forgiveness_strategy: "none", student_loan_strategy_active: false,
    current_required_monthly_payment: 200,
    ...overrides,
  };
}

function pslf(overrides: Record<string, unknown> = {}) {
  return loan({
    student_loan_source: "federal",
    student_loan_repayment_plan: "ibr",
    student_loan_forgiveness_strategy: "pslf",
    student_loan_strategy_active: true,
    qualifying_payments_made: 60,
    qualifying_payments_required: 120,
    estimated_forgiveness_amount: 15000,
    estimated_forgiveness_date: "2031-08-30",
    forgiveness_tax_treatment: "federally_tax_free",
    ...overrides,
  });
}

function idr(overrides: Record<string, unknown> = {}) {
  return loan({
    student_loan_source: "federal",
    student_loan_repayment_plan: "rap",
    student_loan_forgiveness_strategy: "idr",
    student_loan_strategy_active: true,
    estimated_forgiveness_amount: 12000,
    estimated_forgiveness_date: "2040-08-30",
    forgiveness_tax_treatment: "federally_tax_free",
    ...overrides,
  });
}

function engineWith(debts: Record<string, unknown>[], raw = baseRaw()) {
  raw.debts = debts;
  return runMoneyPriorityEngine(raw, AS_OF);
}

function strategy(result: ReturnType<typeof runMoneyPriorityEngine>, id = "student-1") {
  const value = result.secure.studentLoanStrategies.find((item) => item.debtId === id);
  assert.ok(value);
  return value;
}

test("private student loan with no special strategy uses ordinary debt policy", () => {
  assert.equal(strategy(engineWith([loan()])).state, "ordinary_debt_policy");
});

test("high-interest private student loan receives ordinary Secure handling", () => {
  const result = engineWith([loan()]);
  assert.ok(result.recommendations.some((item) => item.id === "secure-debt-high-student-1"));
});

test("low-rate private student loan receives ordinary lower-priority handling", () => {
  const result = engineWith([loan({ interest_rate: 3 })]);
  assert.equal(strategy(result).ordinaryDebtPolicyAllowed, true);
  assert.equal(result.recommendations.some((item) => item.id === "secure-debt-high-student-1"), false);
});

test("federal standard loan with forgiveness none uses ordinary policy", () => {
  const result = engineWith([loan({ student_loan_source: "federal" })]);
  assert.equal(strategy(result).state, "ordinary_debt_policy");
});

test("student label alone does not suppress high-interest payoff", () => {
  const result = engineWith([loan({ name: "Clearly Student Debt" })]);
  assert.equal(result.secure.debtClassifications[0]?.band, "high_interest");
});

test("sufficient PSLF strategy is preserved", () => {
  const value = strategy(engineWith([pslf()]));
  assert.equal(value.state, "preserve_current_strategy");
  assert.equal(value.ordinaryDebtPolicyAllowed, false);
});

test("high nominal PSLF APR does not trigger acceleration", () => {
  const result = engineWith([pslf({ interest_rate: 18 })]);
  assert.equal(result.recommendations.some((item) => item.id === "secure-debt-high-student-1"), false);
  assert.ok(result.recommendations.some((item) => item.id === "secure-student-loan-preserve-student-1"));
});

test("PSLF missing progress returns targeted more information needed", () => {
  const value = strategy(engineWith([pslf({ qualifying_payments_made: null })]));
  assert.equal(value.state, "more_information_needed");
  assert.ok(value.missingData.some((item) => item.includes("qualifying payments made")));
});

test("PSLF uncertainty does not block unrelated Secure debt", () => {
  const card = { id: "card", name: "Card", debt_type: "credit_card", current_balance: 3000, interest_rate: 20, minimum_payment: 100, rate_type: "fixed" };
  const result = engineWith([pslf({ qualifying_payments_made: null }), card]);
  assert.ok(result.recommendations.some((item) => item.id === "secure-debt-high-card"));
});

test("IDR forgiveness bypasses APR-only acceleration", () => {
  const result = engineWith([idr({ interest_rate: 15 })]);
  assert.equal(strategy(result).ordinaryDebtPolicyAllowed, false);
  assert.equal(result.recommendations.some((item) => item.id === "secure-debt-high-student-1"), false);
});

test("sufficient IDR inputs produce deterministic preservation", () => {
  assert.equal(strategy(engineWith([idr()])).state, "preserve_current_strategy");
});

test("potentially taxable IDR forgiveness is flagged", () => {
  const value = strategy(engineWith([idr({ forgiveness_tax_treatment: "potentially_taxable", estimated_forgiveness_tax_liability: null })]));
  assert.equal(value.state, "special_review");
  assert.ok(value.warnings.some((item) => item.includes("taxable")));
});

test("unknown IDR tax treatment is not assumed tax-free", () => {
  const value = strategy(engineWith([idr({ forgiveness_tax_treatment: "unknown" })]));
  assert.equal(value.state, "more_information_needed");
  assert.ok(value.warnings.some((item) => item.includes("not assumed tax-free")));
});

test("missing future tax liability is not fabricated", () => {
  const value = strategy(engineWith([idr({ forgiveness_tax_treatment: "potentially_taxable", estimated_forgiveness_tax_liability: null })]));
  assert.equal(value.estimatedForgivenessTaxLiability, null);
});

test("explicit forgiveness tax liability is respected", () => {
  const value = strategy(engineWith([idr({ forgiveness_tax_treatment: "potentially_taxable", estimated_forgiveness_tax_liability: 3500 })]));
  assert.equal(value.state, "preserve_current_strategy");
  assert.equal(value.estimatedForgivenessTaxLiability, 3500);
});

test("other forgiveness strategy receives special review", () => {
  const result = engineWith([loan({ student_loan_source: "federal", student_loan_forgiveness_strategy: "teacher", student_loan_strategy_active: true })]);
  assert.equal(strategy(result).state, "special_review");
});

test("multiple student loans receive independent states", () => {
  const result = engineWith([
    pslf({ id: "pslf" }),
    loan({ id: "private" }),
    loan({ id: "federal", student_loan_source: "federal" }),
  ]);
  assert.deepEqual(result.secure.studentLoanStrategies.map((item) => item.state), [
    "preserve_current_strategy", "ordinary_debt_policy", "ordinary_debt_policy",
  ]);
});

test("PSLF loan does not block high-interest credit-card priority", () => {
  const card = { id: "card", name: "Card", debt_type: "credit_card", current_balance: 3000, interest_rate: 22, minimum_payment: 100, rate_type: "fixed" };
  const result = engineWith([pslf(), card]);
  assert.ok(result.recommendations.some((item) => item.id === "secure-debt-high-card"));
});

test("private high-interest student loan competes normally by APR", () => {
  const card = { id: "card", name: "Card", debt_type: "credit_card", current_balance: 3000, interest_rate: 15, minimum_payment: 100, rate_type: "fixed" };
  const result = engineWith([loan({ interest_rate: 12 }), card]);
  const ids = result.secure.recommendations.filter((item) => item.id.startsWith("secure-debt-high-")).map((item) => item.id);
  assert.deepEqual(ids.slice(0, 2), ["secure-debt-high-card", "secure-debt-high-student-1"]);
});

test("existing ordinary employer retirement match remains first-class", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
  }];
  const result = engineWith([pslf()], raw);
  assert.ok(result.recommendations.some((item) => item.id === "secure-match-gap-r1"));
});

test("employer direct assistance is recognized", () => {
  const value = strategy(engineWith([loan({ employer_direct_loan_assistance_monthly: 200, employer_direct_loan_assistance_remaining: 5000 })]));
  assert.equal(value.employerDirectAssistanceMonthly, 200);
  assert.equal(value.state, "preserve_current_strategy");
});

test("known employer assistance suppresses destructive payoff", () => {
  const result = engineWith([loan({ employer_direct_loan_assistance_monthly: 200, employer_direct_loan_assistance_remaining: 5000 })]);
  assert.equal(result.recommendations.some((item) => item.id === "secure-debt-high-student-1"), false);
});

test("partial employer-assistance information is not treated as zero", () => {
  const value = strategy(engineWith([loan({ employer_direct_loan_assistance_monthly: 200, employer_direct_loan_assistance_remaining: null })]));
  assert.equal(value.state, "more_information_needed");
});

test("qualified student-loan payment retirement match is recognized explicitly", () => {
  const value = strategy(engineWith([loan({
    qualified_student_loan_payment_retirement_match_offered: true,
    qualified_payment_required_for_full_retirement_match: 200,
    expected_student_loan_based_employer_match_monthly: 100,
  })]));
  assert.equal(value.studentLoanPaymentRetirementMatchMonthly, 100);
  assert.equal(value.state, "preserve_current_strategy");
});

test("student-loan retirement match is not inferred", () => {
  const value = strategy(engineWith([loan()]));
  assert.equal(value.studentLoanPaymentRetirementMatchMonthly, 0);
  assert.equal(value.currentPaymentCapturesRetirementMatch, false);
});

test("required qualifying payment is protected for known retirement match", () => {
  const value = strategy(engineWith([loan({
    current_required_monthly_payment: 200,
    qualified_student_loan_payment_retirement_match_offered: true,
    qualified_payment_required_for_full_retirement_match: 200,
    expected_student_loan_based_employer_match_monthly: 100,
  })]));
  assert.equal(value.currentPaymentCapturesRetirementMatch, true);
  assert.equal(value.ordinaryDebtPolicyAllowed, false);
});

test("preserve-strategy loan receives no one-time cash acceleration", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 8100, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
  ];
  const result = engineWith([pslf()], raw);
  assert.equal(result.existingCash.deployments.some((item) => item.relatedEntityId === "student-1"), false);
});

test("ordinary high-interest student loan remains eligible for existing cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 8100, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
  ];
  const result = engineWith([loan({ current_balance: 5000 })], raw);
  assert.equal(result.existingCash.deployments.find((item) => item.relatedEntityId === "student-1")?.amount, 5000);
});

test("existing-cash liquidity floor remains intact for preserved strategy", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 8100, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
  ];
  const result = engineWith([pslf()], raw);
  assert.ok(result.existingCash.remainingUnallocatedCash >= result.existingCash.liquidityFloor);
});

test("protected earmarked and debt-backed cash classifications remain intact", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "protected", name: "Protected", account_type: "savings", balance: 8100, cash_purpose: "protected_reserve" },
    { id: "earmarked", name: "Goal", account_type: "savings", balance: 1000, cash_purpose: "earmarked_goal" },
    { id: "backed", name: "Debt reserve", account_type: "savings", balance: 2000, cash_purpose: "debt_backed_reserve", related_debt_id: "student-1" },
  ];
  const result = engineWith([pslf()], raw);
  assert.equal(result.snapshot.aggregates.protectedCash, 8100);
  assert.equal(result.snapshot.aggregates.earmarkedCash, 1000);
  assert.equal(result.snapshot.aggregates.debtBackedCash, 2000);
});

test("ordinary student-loan cash payoff reconciles residual debt", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 8100, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
  ];
  const result = engineWith([loan({ current_balance: 5000 })], raw);
  assert.equal(result.residualNeeds.debtAppliedById["student-1"], 5000);
  assert.equal(result.recommendations.some((item) => item.relatedEntityId === "student-1"), false);
});

test("minimum student-loan payment remains committed outflow", () => {
  const result = engineWith([pslf()]);
  assert.equal(result.snapshot.aggregates.monthlyMinimumDebtPayments, 200);
  assert.equal(result.snapshot.aggregates.monthlyRequiredOutflow, 2700);
});

test("special strategy suppresses only extra acceleration", () => {
  const result = engineWith([pslf()]);
  assert.equal(result.snapshot.debts[0]?.minimumPayment, 200);
  assert.equal(result.recommendations.some((item) => item.id === "secure-debt-high-student-1"), false);
});

test("Recommended Plan reflects zero extra payment for preserve strategy", () => {
  const result = engineWith([pslf()]);
  const allocation = deriveRecommendedPlanAllocations(result).find((item) => item.relatedEntityId === "student-1");
  assert.equal(allocation?.recommendedMonthlyAmount, 0);
});

test("Your Plan cannot rewrite the authoritative student-loan strategy", () => {
  const result = engineWith([pslf()]);
  const allocation = deriveRecommendedPlanAllocations(result).find((item) => item.relatedEntityId === "student-1");
  assert.ok(allocation);
  evaluateUserPlan(result, [{ allocationId: allocation.allocationId, monthlyAmount: 300 }]);
  assert.equal(strategy(result).state, "preserve_current_strategy");
});

test("extra Your Plan payment against preserve strategy surfaces tradeoff", () => {
  const result = engineWith([pslf()]);
  const allocation = deriveRecommendedPlanAllocations(result).find((item) => item.relatedEntityId === "student-1");
  assert.ok(allocation);
  const user = evaluateUserPlan(result, [{ allocationId: allocation.allocationId, monthlyAmount: 300 }]);
  const impact = user.impacts.find((item) => item.allocationId === allocation.allocationId);
  assert.equal(impact?.severity, "tradeoff");
  assert.ok(impact?.explanation.includes("conflicts with the modeled"));
});

test("paid-off student loan creates no strategy recommendation", () => {
  const result = engineWith([pslf({ current_balance: 0 })]);
  assert.equal(result.recommendations.some((item) => item.relatedEntityId === "student-1"), false);
});

test("stale override for paid-off student loan is superseded", () => {
  const active = engineWith([pslf()]);
  const allocation = deriveRecommendedPlanAllocations(active).find((item) => item.relatedEntityId === "student-1");
  assert.ok(allocation);
  const paid = engineWith([pslf({ current_balance: 0 })]);
  const user = evaluateUserPlan(paid, [{ allocationId: allocation.allocationId, monthlyAmount: 300 }]);
  assert.equal(user.overrides.superseded.length, 1);
});

test("unknown source and strategy produce targeted uncertainty", () => {
  const result = engineWith([loan({ student_loan_source: "unknown", student_loan_forgiveness_strategy: "unknown" })]);
  assert.equal(strategy(result).state, "more_information_needed");
  assert.ok(result.recommendations.some((item) => item.id === "secure-student-loan-missing-student-1"));
});

test("student-loan assessment is deterministic", () => {
  const result = engineWith([pslf()]);
  assert.deepEqual(result.secure.studentLoanStrategies, engineWith([pslf()]).secure.studentLoanStrategies);
});

test("normalized snapshot remains unchanged by assessment", () => {
  const result = engineWith([pslf()]);
  const before = structuredClone(result.snapshot);
  assessStudentLoanStrategy(result.snapshot.debts[0]!, AS_OF);
  assert.deepEqual(result.snapshot, before);
});

test("engine allocation-capacity invariant remains intact", () => {
  const result = engineWith([loan()]);
  const recurring = result.recommendations.flatMap((item) => item.allocations)
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  assert.ok(recurring <= Math.max(0, result.feasibility.monthlyPlanCapacity));
});

test("policy version and date behavior are explicit", () => {
  const result = engineWith([idr()]);
  assert.equal(strategy(result).policyVersion, "2026.1");
  assert.ok(strategy(result).reasons.some((item) => item.includes("post-July-1-2026")));
});

test("legacy compatibility signal receives special review", () => {
  const result = engineWith([loan({
    student_loan_source: "federal",
    student_loan_forgiveness_strategy: "other",
    forgiveness_or_repayment_program: "legacy-program",
  })]);
  assert.equal(strategy(result).state, "special_review");
});

test("ordinary non-student debt has no student strategy assessment", () => {
  const result = engineWith([{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 1000, interest_rate: 18, minimum_payment: 50, rate_type: "fixed" }]);
  assert.equal(result.secure.studentLoanStrategies.length, 0);
});

test("student strategy fields normalize without mutating raw input", () => {
  const raw = baseRaw();
  raw.debts = [pslf()];
  const before = structuredClone(raw);
  const result = runMoneyPriorityEngine(raw, AS_OF);
  assert.equal(result.snapshot.debts[0]?.studentLoanForgivenessStrategy, "pslf");
  assert.deepEqual(raw, before);
});
