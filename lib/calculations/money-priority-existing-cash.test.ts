import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateSecureStage } from "./money-priority-secure.ts";
import { evaluateExistingCashDeployment } from "./money-priority-existing-cash.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "cash-household",
    people: [{ id: "p1", display_name: "Adult", is_active: true, is_dependent: false }],
    income: [{ id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 5000, monthly_gross_amount: 7000, is_active: true }],
    expenses: [{ id: "e1", name: "Essentials", category: "housing", monthly_amount: 2500, is_essential: true }],
    accounts: [
      { id: "cash", name: "Extra savings", account_type: "savings", balance: 4000, cash_purpose: "unallocated" },
      { id: "ef", name: "Emergency", account_type: "savings", balance: 1000, cash_purpose: "protected_reserve" },
    ],
    debts: [], retirementAccounts: [], goals: [],
    insuranceExposures: [{ id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, job_replacement_difficulty: "easy", known_income_disruption: false },
  };
}

function evaluate(raw: MoneyPriorityRawSnapshot) {
  const snapshot = buildMoneyPrioritySnapshot(raw);
  const secure = evaluateSecureStage(snapshot, "2026-08-29");
  return { snapshot, result: evaluateExistingCashDeployment(snapshot, secure) };
}

test("only explicitly unallocated cash is deployable", () => {
  const raw = baseRaw();
  raw.accounts?.push(
    { id: "goal", name: "Car", account_type: "savings", balance: 9000, cash_purpose: "earmarked_goal" },
    { id: "ops", name: "Bills", account_type: "checking", balance: 2000, cash_purpose: "operating_cash" },
  );
  const { result } = evaluate(raw);
  assert.equal(result.availableUnallocatedCash, 4000);
  assert.ok(result.deployedCash <= 4000);
});

test("unallocated cash fills a deductible gap before the broader emergency reserve", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra savings", account_type: "savings", balance: 4000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 200, cash_purpose: "protected_reserve" },
  ];
  const { result } = evaluate(raw);
  assert.equal(result.deployments[0]?.id, "existing-cash-secure-deductible-gap");
  assert.equal(result.deployments[0]?.amount, 800);
  assert.equal(result.deployments[1]?.id, "existing-cash-secure-full-emergency-fund");
  assert.equal(result.deployments[1]?.amount, 3200);
});

test("deductible deployment reduces the emergency reserve need instead of double counting it", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "cash", name: "Extra savings", account_type: "savings", balance: 8000, cash_purpose: "unallocated" }];
  const { result } = evaluate(raw);
  const reserveTotal = result.deployments.filter((item) => item.category === "reserve").reduce((sum, item) => sum + item.amount, 0);
  assert.equal(reserveTotal, 7500);
  assert.equal(result.remainingUnallocatedCash, 500);
});

test("high-interest debt receives unallocated cash before lower stages", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra savings", account_type: "savings", balance: 3000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
  ];
  raw.debts = [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 5000, interest_rate: 22, minimum_payment: 100, rate_type: "fixed" }];
  const { result } = evaluate(raw);
  assert.equal(result.deployments[0]?.id, "existing-cash-secure-debt-high-card");
  assert.equal(result.deployments[0]?.amount, 3000);
  assert.equal(result.remainingUnallocatedCash, 0);
});

test("debt-backed cash is never redeployed to another debt or reserve", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra savings", account_type: "savings", balance: 500, cash_purpose: "unallocated" },
    { id: "promo-reserve", name: "Promo reserve", account_type: "savings", balance: 4000, cash_purpose: "debt_backed_reserve", related_debt_id: "promo" },
  ];
  raw.debts = [
    { id: "promo", name: "Promo Card", debt_type: "credit_card", current_balance: 4000, interest_rate: 0, minimum_payment: 0, rate_type: "promotional", promo_rate_expires_on: "2027-08-29", post_promo_interest_rate: 25 },
    { id: "card", name: "Other Card", debt_type: "credit_card", current_balance: 2000, interest_rate: 20, minimum_payment: 50, rate_type: "fixed" },
  ];
  const { result } = evaluate(raw);
  assert.equal(result.availableUnallocatedCash, 500);
  assert.equal(result.deployedCash, 500);
  assert.equal(result.deployments.some((item) => item.relatedEntityId === "promo"), false);
});

test("employer match does not consume one-time existing cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "cash", name: "Extra savings", account_type: "savings", balance: 1000, cash_purpose: "unallocated" },
    { id: "ef", name: "Emergency", account_type: "savings", balance: 7500, cash_purpose: "protected_reserve" },
  ];
  raw.retirementAccounts = [{ id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", monthly_employee_contribution: 0, monthly_employer_contribution: 0, full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured" }];
  const { result } = evaluate(raw);
  assert.equal(result.deployments.some((item) => item.id.includes("match")), false);
  assert.equal(result.remainingUnallocatedCash, 1000);
});
