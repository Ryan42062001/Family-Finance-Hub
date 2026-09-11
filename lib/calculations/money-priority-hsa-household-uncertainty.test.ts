import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import { evaluateUserPlan } from "./money-priority-user-plan.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";

const AS_OF_DATE = "2026-09-01";
const TAX_YEAR = 2026;
type Owner = "a" | "b";

type HsaInput = {
  id: string;
  owner: Owner;
  eligible: boolean | null;
  coverage: "family" | "self_only" | null;
  employeeYtd?: number;
  employerYtd?: number;
  matchMonthly?: number;
};

function hsa(input: HsaInput): Record<string, unknown> {
  return {
    id: input.id,
    owner_person_id: input.owner,
    name: input.id,
    account_type: "hsa",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: input.employeeYtd ?? 0,
    employer_contributed_ytd: input.employerYtd ?? 0,
    hsa_ytd_tax_year: TAX_YEAR,
    hsa_eligible: input.eligible,
    hsa_coverage_type: input.coverage,
    match_status: input.matchMonthly ? "not_fully_captured" : "not_offered",
    full_match_employee_contribution_monthly: input.matchMonthly ?? null,
  };
}

function raw(
  hsaAccounts: HsaInput[],
  options: {
    aBirthDate?: string;
    bBirthDate?: string;
    monthlyIncome?: number;
    monthlyExpense?: number;
    deployableCash?: number;
    addIra?: boolean;
    addWorkplace?: boolean;
    reserveBalance?: number;
    marriedAllocation?: { a: number; b: number };
  } = {},
): MoneyPriorityRawSnapshot {
  const accounts: Record<string, unknown>[] = [{
    id: "reserve", name: "Reserve", account_type: "savings",
    balance: options.reserveBalance ?? 12000, cash_purpose: "protected_reserve",
  }];
  if (options.deployableCash) accounts.push({
    id: "cash", name: "Cash", account_type: "savings",
    balance: options.deployableCash, cash_purpose: "unallocated",
  });
  const retirementAccounts = hsaAccounts.map(hsa);
  if (options.addIra) retirementAccounts.push({
    id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira",
    balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 7000, employer_contributed_ytd: 0, match_status: "not_offered",
  });
  if (options.addWorkplace) retirementAccounts.push({
    id: "workplace-a", owner_person_id: "a", name: "A 401k", account_type: "401k",
    balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
    plan_eligible_compensation_annual: 120000,
  });

  const factsByOwner = new Map<Owner, HsaInput>();
  for (const account of hsaAccounts) if (!factsByOwner.has(account.owner)) factsByOwner.set(account.owner, account);

  return {
    householdId: "hsa-household-uncertainty",
    people: [
      { id: "a", display_name: "A", relationship: "self",
        birth_date: options.aBirthDate ?? "1990-01-01", planned_retirement_age: 65,
        covered_by_workplace_retirement_plan: false,
        estimated_taxable_compensation_annual: 120000, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner",
        birth_date: options.bBirthDate ?? "1990-01-01", planned_retirement_age: 65,
        covered_by_workplace_retirement_plan: false,
        estimated_taxable_compensation_annual: 120000, is_active: true, is_dependent: false },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income",
      monthly_amount: options.monthlyIncome ?? 4000, monthly_gross_amount: 10000,
      income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Essentials",
      monthly_amount: options.monthlyExpense ?? 3000, is_essential: true }],
    accounts,
    debts: [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 100,
      interest_rate: 20, minimum_payment: 0, is_past_due: false, is_in_collections: false,
      has_legal_or_tax_priority: false }],
    goals: [], insuranceExposures: [], retirementAccounts,
    hsaTaxYearProfiles: (["a", "b"] as Owner[]).map((personId) => ({
      id: `profile-${personId}`,
      person_id: personId,
      tax_year: TAX_YEAR,
      medicare_effective_on: null,
      last_month_rule_status: "not_elected",
      testing_period_status: "not_applicable",
      data_version: 1,
    })),
    hsaMonthStatuses: (["a", "b"] as Owner[]).flatMap((personId) => {
      const fact = factsByOwner.get(personId);
      const eligibility = fact?.eligible === true ? "eligible" : fact?.eligible === false ? "ineligible" : "unknown";
      const coverage = fact?.coverage ?? "unknown";
      return Array.from({ length: 12 }, (_, index) => ({
        id: `month-${personId}-${index + 1}`,
        person_id: personId,
        tax_year: TAX_YEAR,
        month: index + 1,
        eligibility_status: eligibility,
        coverage_status: coverage,
        evidence_status: "confirmed",
      }));
    }),
    hsaMarriedAllocations: options.marriedAllocation ? [{
      id: "allocation",
      tax_year: TAX_YEAR,
      person_one_id: "a",
      person_two_id: "b",
      person_one_ordinary_amount: options.marriedAllocation.a,
      person_two_ordinary_amount: options.marriedAllocation.b,
      data_version: 1,
    }] : [],
    preferences: {
      emergency_fund_months_override: 3, known_income_disruption: false,
      debt_vs_investing: "balanced", job_replacement_difficulty: "easy",
      desired_retirement_monthly_spending: 5000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      tax_profile_year: 2026, tax_filing_status: "married_filing_jointly",
      estimated_modified_agi: 120000,
    },
  };
}

function opportunities(input: MoneyPriorityRawSnapshot) {
  return evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
}

function assertAllHsaUnknown(input: MoneyPriorityRawSnapshot, expectedReason: RegExp): void {
  const hsaOpportunities = opportunities(input).filter((item) => item.accountType === "hsa");
  assert.ok(hsaOpportunities.length > 0);
  assert.ok(hsaOpportunities.every((item) => item.state === "more_information_needed"));
  assert.ok(hsaOpportunities.every((item) => item.remainingAnnualRoom === null));
  assert.ok(hsaOpportunities.some((item) => item.missingData.some((reason) => expectedReason.test(reason))));
  const engine = runMoneyPriorityEngine(input, AS_OF_DATE);
  assert.equal(engine.build.retirementAccountAllocations
    .filter((item) => item.accountId.startsWith("hsa-")).length, 0);
  assert.ok(engine.retirementCapacityLedger.entries
    .filter((item) => item.accountType === "hsa").every((item) => !item.verified));
}

test("unknown spouse eligibility blocks family-sharing room when it can change the allocation", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), /eligibility/);
});

test("known self-only spouse stays actionable when the other self-only spouse eligibility is unknown", () => {
  const result = opportunities(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "self_only" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "self_only" },
  ]));
  assert.equal(result.find((item) => item.accountId === "hsa-a")?.remainingAnnualRoom, 4400);
  assert.equal(result.find((item) => item.accountId === "hsa-a")?.state, "available");
  assert.equal(result.find((item) => item.accountId === "hsa-b")?.state, "more_information_needed");
});

test("explicitly ineligible spouse does not block known family-covered spouse", () => {
  const result = opportunities(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: false, coverage: "family", employeeYtd: 0 },
  ]));
  assert.equal(result.find((item) => item.accountId === "hsa-a")?.remainingAnnualRoom, 8750);
  assert.equal(result.find((item) => item.accountId === "hsa-b")?.state, "not_eligible");
});

test("unknown spouse coverage blocks self-only room when family sharing could apply", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "self_only" },
    { id: "hsa-b", owner: "b", eligible: true, coverage: null },
  ]), /coverage/);
});

test("explicit alternate allocation makes the $8,000/$0 married-family case exactly $750", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family", employeeYtd: 8000 },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "family" },
  ], { marriedAllocation: { a: 8000, b: 750 } }), AS_OF_DATE);
  assert.equal(engine.retirementCapacityLedger.groups
    .find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 750);
  assert.equal(engine.build.retirementAccountAllocations
    .reduce((sum, item) => sum + item.allocatedAnnualAmount, 0), 750);
});

test("existing cash and Windfall cannot use unresolved HSA room", () => {
  const input = raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ], { deployableCash: 10000 });
  const engine = runMoneyPriorityEngine(input, AS_OF_DATE);
  assert.equal(engine.existingCash.deployments
    .filter((item) => item.category === "retirement").length, 0);
  const windfall = allocateWindfall(engine, {
    amount: 10000, source: "gift", taxTreatment: "known_non_taxable",
  });
  assert.equal(windfall.allocations.filter((item) => item.category === "retirement").length, 0);
});

test("Your Plan reports unknown unresolved HSA capacity without fabricating a conflict amount", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), AS_OF_DATE);
  const plan = evaluateUserPlan(engine, [], {
    additionalRetirementContributions: [{ accountId: "hsa-a", annualAmount: 3600, source: "other" }],
  });
  assert.ok(plan.impacts.some((item) => item.id === "user-plan-retirement-room-unknown"));
  assert.ok(plan.warnings.some((warning) => warning.includes("cannot be verified")));
  assert.ok(!plan.impacts.some((item) => item.id === "user-plan-retirement-room-conflict"));
});

test("unknown HSA structure does not block unrelated IRA or workplace-match routing", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ], { addIra: true, addWorkplace: true, monthlyIncome: 5000, reserveBalance: 8000 }), AS_OF_DATE);
  assert.ok(engine.recommendations.some((item) => item.allocations.some(
    (allocation) => allocation.category === "employer_match" && allocation.relatedEntityId === "workplace-a")));
  assert.ok(engine.build.retirementAccountAllocations.some((item) => item.accountId === "ira-a"));
  assert.ok(!engine.build.retirementAccountAllocations.some((item) => item.accountId.startsWith("hsa-")));
});

test("hypothetical rerun preserves unresolved normalized HSA facts", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), AS_OF_DATE);
  const rerun = runHypotheticalMoneyPriorityEngine(engine, {
    addExpenses: [{ id: "future", name: "Future", category: "other", monthlyAmount: 100, isEssential: true, cashFlowTreatment: "required" }],
  }).engine;
  assert.deepEqual(rerun.snapshot.hsa, engine.snapshot.hsa);
  assert.ok(rerun.build.retirementAccounts.opportunities
    .filter((item) => item.accountType === "hsa")
    .every((item) => item.state === "more_information_needed"));
});

test("normalized eligibility resolution materially refreshes while input reordering does not", () => {
  const unresolved = raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 0 },
  ]);
  const resolved = structuredClone(unresolved);
  resolved.hsaMonthStatuses = (resolved.hsaMonthStatuses ?? []).map((row) =>
    row.person_id === "b" ? { ...row, eligibility_status: "eligible" } : row);
  const before = runMoneyPriorityEngine(unresolved, AS_OF_DATE);
  const after = runMoneyPriorityEngine(resolved, AS_OF_DATE);
  assert.equal(assessRecommendationRefresh(before, after).state, "materially_changed");

  const reordered = structuredClone(unresolved);
  reordered.people = [...(reordered.people ?? [])].reverse();
  reordered.retirementAccounts = [...(reordered.retirementAccounts ?? [])].reverse();
  reordered.hsaTaxYearProfiles = [...(reordered.hsaTaxYearProfiles ?? [])].reverse();
  reordered.hsaMonthStatuses = [...(reordered.hsaMonthStatuses ?? [])].reverse();
  assert.equal(assessRecommendationRefresh(before,
    runMoneyPriorityEngine(reordered, AS_OF_DATE)).state, "current");
});
