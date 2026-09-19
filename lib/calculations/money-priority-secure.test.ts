import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSecureStage } from "./money-priority-secure.ts";
import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

function baseSnapshot(): MoneyPrioritySnapshot {
  return {
    householdId: "h1",
    people: [{
      id: "p1", displayName: "Alex", relationship: "self", birthDate: null, plannedRetirementAge: 65,
      coveredByWorkplaceRetirementPlan: null, estimatedTaxableCompensationAnnual: null,
      isDependent: false, isActive: true,
    }],
    income: [{ id: "i1", ownerPersonId: "p1", name: "Job", type: "employment", monthlyTakeHomeAmount: 5000, monthlyGrossAmount: 7000, isVariable: false, isActive: true }],
    expenses: [
      { id: "e1", name: "Housing", category: "housing", monthlyAmount: 2000, isEssential: true, cashFlowTreatment: "required" },
      { id: "e2", name: "Fun", category: "personal", monthlyAmount: 500, isEssential: false, cashFlowTreatment: "discretionary" },
    ],
    accounts: [{ id: "a1", name: "Savings", type: "savings", balance: 3000, cashPurpose: "protected_reserve", relatedGoalId: null, relatedDebtId: null }],
    debts: [],
    retirementAccounts: [],
    hsa: {
      profiles: [],
      months: [],
      marriedAllocations: [],
      legalSpouseAuthorities: [],
    },
    goals: [],
    insuranceExposures: [{ id: "x1", personId: null, name: "Auto", type: "auto", deductibleAmount: 1000, familyDeductibleAmount: null, outOfPocketMax: null, percentageDeductible: null, insuredValue: null, isRelevantToReserve: true }],
    preferences: {
      emergencyFundMonthsOverride: null,
      debtVsInvesting: "balanced",
      rothVsTraditional: "unspecified",
      riskTolerance: "moderate",
      retirementPriority: "balanced",
      jobReplacementDifficulty: "unknown",
      knownIncomeDisruption: false,
      knownIncomeDisruptionEndDate: null,
      desiredRetirementMonthlySpending: null,
      retirementSpendingBasis: "unknown",
      planningSocialSecurityMonthly: null,
      planningPensionMonthly: null,
      expectedHsaMedicalSpendingAnnual: null,
      taxProfileYear: null,
      taxFilingStatus: null,
      estimatedModifiedAgi: null,
      livedWithSpouseDuringTaxYear: null,
    },
    aggregates: {
      monthlyTakeHomeIncome: 5000,
      monthlyGrossIncomeKnown: 7000,
      hasIncompleteGrossIncome: false,
      monthlyEssentialExpenses: 2000,
      monthlyCommittedNonEssentialExpenses: 0,
      monthlyDiscretionaryExpenses: 500,
      monthlyMinimumDebtPayments: 0,
      monthlyRequiredOutflow: 2000,
      monthlyCashFlowBeforeSavings: 2500,
      liquidCash: 3000,
      protectedCash: 3000,
      earmarkedCash: 0,
      debtBackedCash: 0,
      operatingCash: 0,
      unallocatedCash: 0,
      deductibleReserveTarget: 1000,
    },
    warnings: [],
  };
}

test("deductible reserve is satisfied when protected cash exceeds the target", () => {
  const result = evaluateSecureStage(baseSnapshot());
  assert.equal(result.deductibleReserveGap, 0);
  assert.equal(result.recommendations.some((item) => item.id === "secure-deductible-gap"), false);
});

test("deductible reserve gap is recommended first", () => {
  const snapshot = baseSnapshot();
  snapshot.aggregates.protectedCash = 200;
  const result = evaluateSecureStage(snapshot);
  assert.equal(result.deductibleReserveGap, 800);
  assert.equal(result.recommendations[0].id, "secure-deductible-gap");
  assert.equal(result.recommendations[0].urgency, "required");
});

test("missing deductible data produces more-information-needed", () => {
  const snapshot = baseSnapshot();
  snapshot.aggregates.deductibleReserveTarget = null;
  snapshot.insuranceExposures = [];
  const result = evaluateSecureStage(snapshot);
  assert.equal(result.deductibleReserveGap, null);
  assert.equal(result.recommendations[0].state, "more_information_needed");
});

test("uncaptured employer match creates required monthly gap", () => {
  const snapshot = baseSnapshot();
  snapshot.retirementAccounts = [{
    id: "r1", ownerPersonId: "p1", name: "401(k)", type: "401k", balance: 10000,
    monthlyEmployeeContribution: 200, monthlyEmployerContribution: 100, taxTreatment: "traditional",
    employeeContributedYtd: 0, employerContributedYtd: 0, annualContributionTarget: null,
    planEligibleCompensationAnnual: 84000,
    fullMatchEmployeeContributionMonthly: 300, matchStatus: "not_fully_captured", hsaYtdTaxYear: null,
    hsaCoverageType: null, hsaEligible: null,
  }];
  const result = evaluateSecureStage(snapshot);
  assert.equal(result.employerMatchMonthlyGap, 100);
  const match = result.recommendations.find((item) => item.relatedEntityId === "r1");
  assert.equal(match?.monthlyAmount, 100);
  assert.equal(match?.urgency, "required");
});

test("unknown employer match asks for information instead of inventing a formula", () => {
  const snapshot = baseSnapshot();
  snapshot.retirementAccounts = [{
    id: "r1", ownerPersonId: "p1", name: "401(k)", type: "401k", balance: 10000,
    monthlyEmployeeContribution: 200, monthlyEmployerContribution: 0, taxTreatment: "traditional",
    employeeContributedYtd: null, employerContributedYtd: null, annualContributionTarget: null,
    fullMatchEmployeeContributionMonthly: null, matchStatus: "unknown", hsaYtdTaxYear: null,
    hsaCoverageType: null, hsaEligible: null,
  }];
  const result = evaluateSecureStage(snapshot);
  assert.equal(result.employerMatchMonthlyGap, 0);
  const match = result.recommendations.find((item) => item.relatedEntityId === "r1");
  assert.equal(match?.state, "more_information_needed");
});

test("special debt is ranked ahead of ordinary high-interest debt", () => {
  const snapshot = baseSnapshot();
  snapshot.debts = [
    { id: "d1", name: "Tax debt", type: "other", balance: 2000, annualInterestRate: 5, minimumPayment: 100, rateType: "fixed", promoRateExpiresOn: null, postPromoInterestRate: null, isPastDue: false, isInCollections: false, hasLegalOrTaxPriority: true, forgivenessOrRepaymentProgram: null, scheduledPayoffDate: null },
    { id: "d2", name: "Card", type: "credit_card", balance: 5000, annualInterestRate: 24, minimumPayment: 150, rateType: "fixed", promoRateExpiresOn: null, postPromoInterestRate: null, isPastDue: false, isInCollections: false, hasLegalOrTaxPriority: false, forgivenessOrRepaymentProgram: null, scheduledPayoffDate: null },
  ];
  snapshot.aggregates.monthlyMinimumDebtPayments = 250;
  const result = evaluateSecureStage(snapshot);
  const debtRecs = result.recommendations.filter((item) => item.relatedEntityId?.startsWith("d"));
  assert.equal(debtRecs[0].relatedEntityId, "d1");
  assert.equal(debtRecs[1].relatedEntityId, "d2");
});

test("high-interest debts are ordered by APR descending", () => {
  const snapshot = baseSnapshot();
  snapshot.debts = [
    { id: "d1", name: "Card A", type: "credit_card", balance: 1000, annualInterestRate: 18, minimumPayment: 50, rateType: "fixed", promoRateExpiresOn: null, postPromoInterestRate: null, isPastDue: false, isInCollections: false, hasLegalOrTaxPriority: false, forgivenessOrRepaymentProgram: null, scheduledPayoffDate: null },
    { id: "d2", name: "Card B", type: "credit_card", balance: 1000, annualInterestRate: 29, minimumPayment: 50, rateType: "fixed", promoRateExpiresOn: null, postPromoInterestRate: null, isPastDue: false, isInCollections: false, hasLegalOrTaxPriority: false, forgivenessOrRepaymentProgram: null, scheduledPayoffDate: null },
  ];
  const result = evaluateSecureStage(snapshot);
  const highDebtRecs = result.recommendations.filter((item) => item.id.startsWith("secure-debt-high-"));
  assert.deepEqual(highDebtRecs.map((item) => item.relatedEntityId), ["d2", "d1"]);
});

test("full emergency fund uses the risk-derived month target and protected reserve cash", () => {
  const snapshot = baseSnapshot();
  snapshot.people.push({
    id: "p2", displayName: "Child", relationship: "child", birthDate: null, plannedRetirementAge: null,
    coveredByWorkplaceRetirementPlan: null, estimatedTaxableCompensationAnnual: null,
    isDependent: true, isActive: true,
  });
  snapshot.aggregates.protectedCash = 1000;
  const result = evaluateSecureStage(snapshot);
  assert.equal(result.fullEmergencyTarget, 8000);
  assert.equal(result.fullEmergencyGap, 7000);
  assert.equal(result.recommendations.at(-1)?.id, "secure-full-emergency-fund");
});

test("mortgage debt does not create a Secure-stage payoff recommendation", () => {
  const snapshot = baseSnapshot();
  snapshot.debts = [{ id: "m1", name: "Mortgage", type: "mortgage", balance: 150000, annualInterestRate: 7, minimumPayment: 1200, rateType: "fixed", promoRateExpiresOn: null, postPromoInterestRate: null, isPastDue: false, isInCollections: false, hasLegalOrTaxPriority: false, forgivenessOrRepaymentProgram: null, scheduledPayoffDate: null }];
  const result = evaluateSecureStage(snapshot);
  assert.equal(result.recommendations.some((item) => item.relatedEntityId === "m1"), false);
});
