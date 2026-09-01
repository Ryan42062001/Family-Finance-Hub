import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { evaluateHomeAffordability, type HomePurchaseScenario } from "./home-affordability.ts";
import { evaluateVehicleAffordability, type VehiclePurchaseScenario } from "./vehicle-affordability.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

const AS_OF = "2026-08-31";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "closure-cash-household",
    people: [{
      id: "person-1", display_name: "Alex", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, is_active: true, is_dependent: false,
    }],
    income: [{
      id: "income-1", owner_person_id: "person-1", name: "Salary", monthly_amount: 10000,
      monthly_gross_amount: 12500, is_variable: false, is_active: true,
    }],
    expenses: [{
      id: "expense-1", name: "Essentials", category: "housing", monthly_amount: 3000,
      is_essential: true, cash_flow_treatment: "required",
    }],
    accounts: [
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" },
      { id: "cash", name: "Cash", account_type: "savings", balance: 25000, cash_purpose: "unallocated" },
    ],
    retirementAccounts: [{
      id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k",
      balance: 200000, monthly_employee_contribution: 1200, monthly_employer_contribution: 300,
      full_match_employee_contribution_monthly: 600, match_status: "fully_captured",
    }],
    insuranceExposures: [{
      id: "insurance-1", name: "Auto", insurance_type: "auto", deductible_amount: 1000,
      is_relevant_to_reserve: true,
    }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", risk_tolerance: "moderate",
      retirement_priority: "normal", job_replacement_difficulty: "easy", known_income_disruption: false,
      desired_retirement_monthly_spending: null, retirement_spending_basis: "unknown",
    },
  };
}

function engineWithMalformedUnlinkedEarmark(): MoneyPriorityEngineResult {
  const result = structuredClone(runMoneyPriorityEngine(baseRaw(), AS_OF));
  result.snapshot.accounts.push({
    id: "malformed-earmark",
    name: "Unlinked earmark",
    type: "savings",
    balance: 50000,
    cashPurpose: "earmarked_goal",
    relatedGoalId: null,
    relatedDebtId: null,
  });
  return result;
}

function homeScenario(): HomePurchaseScenario {
  return {
    purchasePrice: 200000,
    downPayment: 20000,
    mortgage: {
      rateType: "fixed", interestRate: 4, termYears: 30, arm: null,
      hasBalloonPayment: false, allowsNegativeAmortization: false,
    },
    closing: {
      closingCosts: 4000, prepaidCosts: 1000, initialEscrowDeposit: 1000,
      earnestMoneyAlreadyPaid: 0, sellerCredits: 0, lenderCredits: 0, otherCredits: 0,
    },
    propertyTaxesAnnual: 4000,
    insurance: { homeownersAnnual: 1200, floodAnnual: 0, otherRequiredAnnual: 0 },
    hoaMonthly: 0,
    mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: 200,
    monthlyUtilityChange: 0,
    otherMonthlyPropertyCosts: 0,
    immediateRequiredRepairs: 0,
    plannedNearTermRepairs: 0,
    currentHousingMonthlyCost: 0,
    currentHousingCostDisappears: false,
    relatedGoalId: null,
    homeSale: null,
  };
}

function vehicleScenario(): VehiclePurchaseScenario {
  return {
    needType: "planned_replacement",
    purchasePrice: 12000,
    tradeInValue: 0,
    tradeInLoanPayoff: 0,
    cashDownPayment: 12000,
    salesTax: 0,
    titleRegistrationFees: 0,
    otherPurchaseFees: 0,
    loanApr: null,
    loanTermMonths: null,
    monthlyInsuranceChange: 0,
    monthlyFuelChange: 0,
    monthlyMaintenanceChange: 0,
    monthlyRegistrationTaxChange: 0,
    monthlyParkingTollsChange: 0,
    relatedGoalId: null,
  };
}

test("home affordability never treats an unlinked earmark as purchase cash", () => {
  const result = evaluateHomeAffordability(engineWithMalformedUnlinkedEarmark(), homeScenario());
  assert.equal(result.cashToClose.relatedGoalEarmarkedCash, 0);
});

test("vehicle affordability never treats an unlinked earmark as purchase cash", () => {
  const result = evaluateVehicleAffordability(engineWithMalformedUnlinkedEarmark(), vehicleScenario());
  assert.equal(result.cash.relatedGoalEarmarkedCash, 0);
});
