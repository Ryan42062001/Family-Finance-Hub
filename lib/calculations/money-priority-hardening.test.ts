import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateSecureStage } from "./money-priority-secure.ts";

function snapshot() {
  return buildMoneyPrioritySnapshot({
    householdId: "hh-hardening",
    people: [{ id: "p1", display_name: "Alex", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 67, is_active: true }],
    income: [{ id: "i1", owner_person_id: "p1", name: "Job", monthly_amount: 6000, monthly_gross_amount: 8000, is_active: true, is_variable: false }],
    expenses: [{ id: "e1", name: "Housing", category: "housing", monthly_amount: 2000, is_essential: true }],
    accounts: [
      { id: "a1", name: "Emergency Fund", account_type: "savings", balance: 4000, cash_purpose: "protected_reserve" },
      { id: "a2", name: "Promo payoff reserve", account_type: "savings", balance: 3000, cash_purpose: "debt_backed_reserve", related_debt_id: "promo1" },
      { id: "a3", name: "Other debt reserve", account_type: "savings", balance: 2000, cash_purpose: "debt_backed_reserve", related_debt_id: "other1" },
      { id: "a4", name: "Goal cash", account_type: "savings", balance: 5000, cash_purpose: "earmarked_goal", related_goal_id: "g1" },
    ],
    debts: [{
      id: "promo1",
      name: "0% Card",
      debt_type: "credit_card",
      current_balance: 9000,
      interest_rate: 0,
      minimum_payment: 100,
      rate_type: "promotional",
      promo_rate_expires_on: "2027-08-29",
      post_promo_interest_rate: 24.99,
    }, { id: "other1", name: "Other reserved debt", debt_type: "other", current_balance: 0, minimum_payment: 0 }],
    goals: [{ id: "g1", name: "Car", target_amount: 10000, current_amount: 5000, priority: 1 }],
    insuranceExposures: [{ id: "x1", name: "Home", insurance_type: "homeowners", deductible_amount: 5000, is_relevant_to_reserve: true }],
    preferences: { debt_vs_investing: "balanced", job_replacement_difficulty: "unknown" },
  });
}

test("promo payoff pace subtracts only cash explicitly backed by that debt", () => {
  const value = snapshot();
  const result = evaluateSecureStage(value, "2026-08-29");
  const promo = result.recommendations.find((item) => item.id === "secure-promo-paydown-promo1");

  assert.equal(promo?.gapAmount, 6000);
  assert.equal(promo?.monthlyAmount, 500);
  assert.ok(promo?.reasons.some((reason) => reason.includes("3000.00")));
});

test("debt-backed and earmarked cash do not satisfy the protected reserve", () => {
  const value = snapshot();
  const result = evaluateSecureStage(value, "2026-08-29");

  assert.equal(value.aggregates.liquidCash, 14000);
  assert.equal(value.aggregates.protectedCash, 4000);
  assert.equal(value.aggregates.debtBackedCash, 5000);
  assert.equal(value.aggregates.earmarkedCash, 5000);
  assert.equal(result.deductibleReserveGap, 1000);
});

test("deductible reserve and full emergency fund share the same protected cash pool", () => {
  const value = snapshot();
  const result = evaluateSecureStage(value, "2026-08-29");

  assert.equal(result.deductibleReserveTarget, 5000);
  assert.equal(result.deductibleReserveGap, 1000);
  assert.equal(result.fullEmergencyTarget, 8400);
  assert.equal(result.fullEmergencyGap, 4400);
});

test("promo debt with no expiration date asks for information instead of inventing a payoff pace", () => {
  const value = snapshot();
  value.debts[0].promoRateExpiresOn = null;
  const result = evaluateSecureStage(value, "2026-08-29");
  const promo = result.recommendations.find((item) => item.relatedEntityId === "promo1");

  assert.equal(promo?.state, "more_information_needed");
  assert.equal(promo?.monthlyAmount, null);
});

test("fully debt-backed promo balance does not create a new monthly payoff recommendation", () => {
  const value = snapshot();
  value.accounts[1].balance = 9000;
  value.aggregates.debtBackedCash = 11000;
  value.aggregates.liquidCash = 20000;
  const result = evaluateSecureStage(value, "2026-08-29");

  assert.equal(result.recommendations.some((item) => item.relatedEntityId === "promo1"), false);
});
