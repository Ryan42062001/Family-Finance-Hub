import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { retirementCapacityInvariantHolds } from "./money-priority-retirement-capacity.ts";
import { SCENARIO_DEFINITION_VERSION, validateScenarioDefinition, type ScenarioDefinition } from "../scenarios/scenario-definition.ts";
import { applyScenarioOverlay } from "../scenarios/scenario-overlay.ts";
import { runMoneyPriorityScenario } from "../scenarios/scenario-runner.ts";

const AS_OF = "2026-09-18";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "scenario-household",
    people: [{
      id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 67, covered_by_workplace_retirement_plan: true,
      estimated_taxable_compensation_annual: 100000, is_dependent: false, is_active: true,
    }],
    income: [
      { id: "income-a", owner_person_id: "p", name: "Income", income_type: "employment", monthly_amount: 7000, monthly_gross_amount: 10000, is_variable: false, is_active: true },
      { id: "income-b", owner_person_id: "p", name: "Income", income_type: "side", monthly_amount: 500, monthly_gross_amount: null, is_variable: true, is_active: true },
    ],
    expenses: [{ id: "housing", name: "Housing", category: "housing", monthly_amount: 2500, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [
      { id: "cash", name: "Cash", account_type: "checking", balance: 5000, cash_purpose: "unallocated" },
      { id: "debt-cash", name: "Debt reserve", account_type: "savings", balance: 1000, cash_purpose: "debt_backed_reserve", related_debt_id: "card" },
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" },
      { id: "goal-cash", name: "Goal cash", account_type: "savings", balance: 500, cash_purpose: "earmarked_goal", related_goal_id: "goal" },
    ],
    debts: [{
      id: "card", name: "Card", debt_type: "credit_card", current_balance: 4000, interest_rate: 18,
      minimum_payment: 200, rate_type: "fixed", is_past_due: false, is_in_collections: false, has_legal_or_tax_priority: false,
    }],
    retirementAccounts: [{
      id: "work", owner_person_id: "p", name: "401k", account_type: "401k", balance: 100000,
      monthly_employee_contribution: 500, monthly_employer_contribution: 200,
      employee_contributed_ytd: 4000, employer_contributed_ytd: 1600,
      plan_eligible_compensation_annual: 100000, full_match_employee_contribution_monthly: 500, match_status: "fully_captured",
    }],
    goals: [{
      id: "goal", name: "Goal", target_amount: 12000, current_amount: 500, target_date: "2027-09-18",
      priority: 2, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
      consequence_level: "moderate", planned_monthly_contribution: 100, core_need_amount: 8000,
      goal_intelligence_confirmed: true, underlying_need: "Need", desired_solution: "Plan", goal_nature: "mixed",
      underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null,
    }],
    insuranceExposures: [{
      id: "insurance", person_id: "p", name: "Health", insurance_type: "health",
      deductible_amount: 2000, family_deductible_amount: null, out_of_pocket_max: 6000,
      percentage_deductible: null, insured_value: null, is_relevant_to_reserve: true,
    }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", roth_vs_traditional: "unspecified",
      risk_tolerance: "moderate", retirement_priority: "balanced", job_replacement_difficulty: "easy",
      known_income_disruption: false, known_income_disruption_end_date: null,
      desired_retirement_monthly_spending: 3000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      expected_hsa_medical_spending_annual: null, tax_profile_year: 2026,
      tax_filing_status: "single", estimated_modified_agi: 100000, lived_with_spouse_during_tax_year: null,
    },
  };
}

function definition(overrides: Partial<ScenarioDefinition> = {}): ScenarioDefinition {
  return {
    version: SCENARIO_DEFINITION_VERSION,
    scenarioId: "scenario-1",
    baselineReference: { fingerprint: "opaque-baseline-ref", referenceId: "baseline-1" },
    recurringOverrides: [],
    oneTimeEvents: [],
    specializedIntent: null,
    ...overrides,
  };
}

function engine(input = raw()) {
  return runMoneyPriorityEngine(input, AS_OF);
}

test("FFH-040 no-op scenario financially reproduces baseline and leaves baseline deeply unchanged", () => {
  const baseline = engine();
  const frozen = structuredClone(baseline);
  const result = runMoneyPriorityScenario(baseline, definition());
  assert.equal(result.status, "valid");
  assert.deepEqual(result.scenarioEngineResult, baseline);
  assert.deepEqual(baseline, frozen);
  assert.deepEqual(result.provenance.overlay?.cash, {
    inflowCents: 0, genericUseCents: 0, medicalUseCents: 0, debtPayoffCents: 0, netCashDeltaCents: 0,
  });
});

test("FFH-040 invalid and protected generic overrides fail closed without mutating baseline", () => {
  const baseline = engine();
  const frozen = structuredClone(baseline);
  const invalid = {
    ...definition(),
    recurringOverrides: [{
      type: "retirement_account", id: "bad", accountId: "work",
      employeeContributedYtd: 999999,
    }],
  };
  const result = runMoneyPriorityScenario(baseline, invalid);
  assert.equal(result.status, "invalid");
  assert.equal(result.scenarioEngineResult, null);
  assert.ok(result.issues.some((issue) => issue.code === "protected_field"));
  assert.deepEqual(baseline, frozen);

  const unknown = validateScenarioDefinition({ ...definition(), recurringOverrides: [{ type: "magic", id: "x" }] }, baseline.snapshot);
  assert.equal(unknown.valid, false);
  assert.ok(unknown.issues.some((issue) => issue.code === "unknown_operation_type"));
});

test("FFH-040 duplicate and conflicting stable-ID targets fail instead of last-write-wins", () => {
  const baseline = engine();
  const duplicate = definition({
    recurringOverrides: [
      { type: "income", id: "a", incomeId: "income-a", monthlyTakeHomeAmount: 6000 },
      { type: "income", id: "b", incomeId: "income-a", isActive: false },
    ],
  });
  assert.equal(runMoneyPriorityScenario(baseline, duplicate).status, "invalid");

  const conflict = definition({
    recurringOverrides: [{ type: "debt", id: "d", debtId: "card", minimumPayment: 100 }],
    oneTimeEvents: [{ type: "cash_funded_debt_payoff", id: "pay", debtId: "card" }],
  });
  const result = runMoneyPriorityScenario(baseline, conflict);
  assert.equal(result.status, "invalid");
  assert.ok(result.issues.some((issue) => issue.code === "conflicting_operation"));
});

test("FFH-040 stable IDs, not duplicate display names, target existing income", () => {
  const baseline = engine();
  const result = runMoneyPriorityScenario(baseline, definition({
    recurringOverrides: [{ type: "income", id: "income-change", incomeId: "income-b", monthlyTakeHomeAmount: 900 }],
  }));
  assert.ok(result.scenarioEngineResult);
  assert.equal(result.scenarioEngineResult.snapshot.income.find((item) => item.id === "income-a")?.monthlyTakeHomeAmount, 7000);
  assert.equal(result.scenarioEngineResult.snapshot.income.find((item) => item.id === "income-b")?.monthlyTakeHomeAmount, 900);
});

test("FFH-040 generic INCLUDE recurring categories rerun only through the authoritative engine", () => {
  const baseline = engine();
  const result = runMoneyPriorityScenario(baseline, definition({
    recurringOverrides: [
      { type: "income", id: "income-change", incomeId: "income-a", monthlyTakeHomeAmount: 6500, monthlyGrossAmount: 9500, isActive: true },
      { type: "synthetic_income", id: "extra-income", incomeId: "scenario-income", name: "Explicit side income", incomeType: "other", ownerPersonId: "p", monthlyTakeHomeAmount: 250, monthlyGrossAmount: null, isVariable: true, isActive: true },
      { type: "expense", id: "housing-change", expenseId: "housing", monthlyAmount: 2600 },
      { type: "synthetic_expense", id: "childcare", expenseId: "scenario-childcare", name: "Childcare", category: "childcare", monthlyAmount: 500, isEssential: true, cashFlowTreatment: "required" },
      { type: "debt", id: "debt-change", debtId: "card", annualInterestRate: 15, minimumPayment: 180 },
      { type: "goal", id: "goal-change", goalId: "goal", targetAmount: 13000, currentAmount: 700, targetDate: "2028-01-01", priority: 3, plannedMonthlyContribution: 125 },
      { type: "retirement_account", id: "retirement-change", accountId: "work", monthlyEmployeeContribution: 550, annualContributionTarget: 8000 },
      { type: "person_retirement_age", id: "age-change", personId: "p", plannedRetirementAge: 68 },
      { type: "insurance_exposure", id: "insurance-change", exposureId: "insurance", deductibleAmount: 2500, outOfPocketMax: 6500 },
      { type: "planning_preferences", id: "preference-change", knownIncomeDisruption: true, knownIncomeDisruptionEndDate: "2027-01-01", emergencyFundMonthsOverride: 4 },
    ],
  }));
  assert.ok(result.scenarioEngineResult);
  const snapshot = result.scenarioEngineResult.snapshot;
  assert.equal(snapshot.income.find((item) => item.id === "scenario-income")?.monthlyTakeHomeAmount, 250);
  assert.equal(snapshot.expenses.find((item) => item.id === "scenario-childcare")?.monthlyAmount, 500);
  assert.equal(snapshot.retirementAccounts[0]?.employeeContributedYtd, baseline.snapshot.retirementAccounts[0]?.employeeContributedYtd);
  assert.equal(snapshot.people[0]?.estimatedTaxableCompensationAnnual, baseline.snapshot.people[0]?.estimatedTaxableCompensationAnnual);
  assert.equal(snapshot.preferences?.taxFilingStatus, baseline.snapshot.preferences?.taxFilingStatus);
  assert.equal(snapshot.preferences?.knownIncomeDisruption, true);
  assert.equal(snapshot.aggregates.monthlyCashFlowBeforeSavings,
    snapshot.aggregates.monthlyTakeHomeIncome - snapshot.aggregates.monthlyRequiredOutflow - snapshot.aggregates.monthlyDiscretionaryExpenses);
  assert.ok(retirementCapacityInvariantHolds(result.scenarioEngineResult.retirementCapacityLedger));
});

test("FFH-040 independent override ordering and repeated runs are deterministic", () => {
  const baseline = engine();
  const a = { type: "income", id: "income-change", incomeId: "income-a", monthlyTakeHomeAmount: 6800 } as const;
  const b = { type: "synthetic_expense", id: "cost", expenseId: "scenario-cost", name: "Cost", category: "other", monthlyAmount: 101.01, isEssential: false, cashFlowTreatment: "discretionary" } as const;
  const first = runMoneyPriorityScenario(baseline, definition({ recurringOverrides: [a, b] }));
  const second = runMoneyPriorityScenario(baseline, definition({ recurringOverrides: [b, a] }));
  const third = runMoneyPriorityScenario(baseline, definition({ recurringOverrides: [a, b] }));
  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
});

test("FFH-040 one-time inflow and cash use remain distinct from recurring income", () => {
  const baseline = engine();
  const result = runMoneyPriorityScenario(baseline, definition({
    oneTimeEvents: [
      { type: "cash_inflow", id: "bonus", amount: 1000.01, label: "Known cash inflow" },
      { type: "cash_use", id: "medical", amount: 500, purpose: "medical" },
    ],
  }));
  assert.ok(result.scenarioEngineResult);
  assert.equal(result.scenarioEngineResult.snapshot.aggregates.monthlyTakeHomeIncome, baseline.snapshot.aggregates.monthlyTakeHomeIncome);
  assert.equal(result.scenarioEngineResult.snapshot.aggregates.liquidCash, baseline.snapshot.aggregates.liquidCash + 500.01);
  assert.deepEqual(result.provenance.overlay?.cash, {
    inflowCents: 100001, genericUseCents: 0, medicalUseCents: 50000, debtPayoffCents: 0, netCashDeltaCents: 50001,
  });
});

test("FFH-040 generated one-time cash IDs cannot collide with baseline stable IDs", () => {
  const input = raw();
  input.accounts = [...(input.accounts ?? []), {
    id: "scenario:scenario-1:cash-inflow:bonus",
    name: "Existing",
    account_type: "checking",
    balance: 1,
    cash_purpose: "unallocated",
  }];
  const baseline = engine(input);
  const run = runMoneyPriorityScenario(baseline, definition({
    oneTimeEvents: [{ type: "cash_inflow", id: "bonus", amount: 100, label: "Bonus" }],
  }));
  assert.equal(run.status, "invalid");
  assert.ok(run.issues.some((issue) => issue.code === "duplicate_entity_id"));
});

test("FFH-040 cash-funded debt payoff is atomic, exact, and cannot double-count cash or principal", () => {
  const baseline = engine();
  const frozen = structuredClone(baseline);
  const result = runMoneyPriorityScenario(baseline, definition({
    oneTimeEvents: [{ type: "cash_funded_debt_payoff", id: "pay-card", debtId: "card" }],
  }));
  assert.ok(result.scenarioEngineResult);
  const scenario = result.scenarioEngineResult.snapshot;
  assert.equal(scenario.debts.find((item) => item.id === "card")?.balance, 0);
  assert.equal(scenario.debts.find((item) => item.id === "card")?.minimumPayment, 0);
  assert.equal(scenario.aggregates.liquidCash, baseline.snapshot.aggregates.liquidCash - 4000);
  assert.equal(result.provenance.overlay?.cash.debtPayoffCents, 400000);
  assert.equal(result.provenance.overlay?.cash.netCashDeltaCents, -400000);
  assert.equal(scenario.aggregates.monthlyMinimumDebtPayments, baseline.snapshot.aggregates.monthlyMinimumDebtPayments - 200);
  assert.deepEqual(baseline, frozen);

  const insufficientRaw = raw();
  insufficientRaw.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" }];
  const insufficient = engine(insufficientRaw);
  const failed = runMoneyPriorityScenario(insufficient, definition({
    oneTimeEvents: [{ type: "cash_funded_debt_payoff", id: "pay-card", debtId: "card" }],
  }));
  assert.equal(failed.status, "invalid");
  assert.equal(failed.scenarioEngineResult, null);
});

test("FFH-040 overlay output is deeply frozen while baseline snapshot remains mutable only by its owner", () => {
  const baseline = engine();
  const before = structuredClone(baseline.snapshot);
  const overlay = applyScenarioOverlay(baseline.snapshot, definition({
    recurringOverrides: [{ type: "expense", id: "housing-change", expenseId: "housing", monthlyAmount: 2400 }],
  }));
  assert.equal(overlay.ok, true);
  if (!overlay.ok) return;
  assert.equal(Object.isFrozen(overlay.rawSnapshot), true);
  assert.equal(Object.isFrozen(overlay.rawSnapshot.expenses), true);
  assert.equal(Object.isFrozen(overlay.rawSnapshot.expenses?.[0]), true);
  assert.deepEqual(baseline.snapshot, before);
});

function hsaRaw(): MoneyPriorityRawSnapshot {
  const months = (personId: string) => Array.from({ length: 12 }, (_, index) => ({
    id: "month-" + personId + "-" + (index + 1), person_id: personId, tax_year: 2026, month: index + 1,
    eligibility_status: "eligible", coverage_status: "family", evidence_status: "confirmed",
  }));
  return {
    householdId: "hsa-scenario",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1970-01-01", estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1970-01-01", estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: [
      { id: "hsa-a", owner_person_id: "a", name: "A HSA", account_type: "hsa", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, hsa_ytd_tax_year: 2026 },
      { id: "hsa-b", owner_person_id: "b", name: "B HSA", account_type: "hsa", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, hsa_ytd_tax_year: 2026 },
    ],
    hsaTaxYearProfiles: [
      { id: "profile-a", person_id: "a", tax_year: 2026, medicare_effective_on: null, last_month_rule_status: "not_elected", testing_period_status: "not_applicable", data_version: 1 },
      { id: "profile-b", person_id: "b", tax_year: 2026, medicare_effective_on: null, last_month_rule_status: "not_elected", testing_period_status: "not_applicable", data_version: 1 },
    ],
    hsaMonthStatuses: [...months("a"), ...months("b")],
    hsaLegalSpouseAuthorities: [{
      id: "authority", tax_year: 2026, person_one_id: "a", person_two_id: "b",
      authority_status: "confirmed_legal_spouses", confirmation_source: "scenario-test",
      confirmed_at: "2026-01-01T00:00:00.000Z", data_version: 1,
    }],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 200000 },
  };
}

test("FFH-040 HSA family/shared/catch-up authority survives no-op and unrelated scenario reruns without recreation", () => {
  const baseline = engine(hsaRaw());
  const sharedBefore = baseline.retirementCapacityLedger.groups.find((group) => group.id === "hsa:married-family");
  assert.ok(sharedBefore);
  assert.equal(sharedBefore.originalRemainingAnnualRoom, 10750);
  assert.deepEqual(baseline.retirementCapacityLedger.entries.map((entry) => entry.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(baseline.retirementCapacityLedger.entries.map((entry) => entry.catchUpRemainingRoom), [1000, 1000]);
  const noOp = runMoneyPriorityScenario(baseline, definition());
  assert.deepEqual(noOp.scenarioEngineResult?.retirementCapacityLedger, baseline.retirementCapacityLedger);
  assert.deepEqual(noOp.scenarioEngineResult?.snapshot.hsa, baseline.snapshot.hsa);

  const changed = runMoneyPriorityScenario(baseline, definition({
    recurringOverrides: [{ type: "synthetic_expense", id: "cost", expenseId: "scenario-cost", name: "Cost", category: "other", monthlyAmount: 1, isEssential: true, cashFlowTreatment: "required" }],
  }));
  assert.ok(changed.scenarioEngineResult);
  assert.deepEqual(changed.scenarioEngineResult.snapshot.hsa, baseline.snapshot.hsa);
  assert.equal(changed.scenarioEngineResult.retirementCapacityLedger.groups.find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 10750);
  assert.deepEqual(changed.scenarioEngineResult.retirementCapacityLedger.entries.map((entry) => entry.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(changed.scenarioEngineResult.retirementCapacityLedger.entries.map((entry) => entry.catchUpRemainingRoom), [1000, 1000]);
  assert.ok(retirementCapacityInvariantHolds(changed.scenarioEngineResult.retirementCapacityLedger));
});

function spousalIraRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "ira-scenario",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000.01, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 0, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income", monthly_amount: 5000, monthly_gross_amount: 6000, is_active: true }],
    expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 10000.01, retirement_spending_basis: "today_dollars" },
  };
}

test("FFH-040 spousal-IRA shared compensation and odd-cent final allocation remain canonical", () => {
  const baseline = engine(spousalIraRaw());
  const shared = baseline.retirementCapacityLedger.groups.find((group) => group.id.startsWith("ira:mfj-compensation:"));
  assert.ok(shared);
  assert.equal(shared.originalRemainingAnnualRoom, 10000.01);
  const run = runMoneyPriorityScenario(baseline, definition());
  assert.deepEqual(run.scenarioEngineResult, baseline);
  assert.equal(run.scenarioEngineResult?.retirementCapacityLedger.groups.find((group) => group.id.startsWith("ira:mfj-compensation:"))?.originalRemainingAnnualRoom, 10000.01);
  assert.ok(run.scenarioEngineResult && retirementCapacityInvariantHolds(run.scenarioEngineResult.retirementCapacityLedger));
});

test("FFH-040 missing legal facts remain unknown when affordability inputs change", () => {
  const input = raw();
  if (input.retirementAccounts?.[0]) {
    input.retirementAccounts[0].employee_contributed_ytd = null;
    input.retirementAccounts[0].plan_eligible_compensation_annual = null;
  }
  const baseline = engine(input);
  const run = runMoneyPriorityScenario(baseline, definition({
    recurringOverrides: [{ type: "income", id: "pay", incomeId: "income-a", monthlyTakeHomeAmount: 9000, monthlyGrossAmount: 12000 }],
  }));
  assert.ok(run.scenarioEngineResult);
  assert.equal(run.scenarioEngineResult.snapshot.retirementAccounts[0]?.employeeContributedYtd, null);
  assert.equal(run.scenarioEngineResult.snapshot.retirementAccounts[0]?.planEligibleCompensationAnnual, null);
  assert.equal(run.scenarioEngineResult.snapshot.people[0]?.estimatedTaxableCompensationAnnual, 100000);
});
