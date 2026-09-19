import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import {
  consumeRetirementCapacity,
  createRetirementCapacityLedger,
  remainingRetirementCapacity,
  retirementCapacityInvariantHolds,
} from "./money-priority-retirement-capacity.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateUserPlan } from "./money-priority-user-plan.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";

const AS_OF_DATE = "2026-09-01";
const YEAR = 2026;
type HsaOwner = "a" | "b";

function hsaAccount(
  id: string,
  owner: HsaOwner,
  employeeYtd = 0,
  employerYtd = 0,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    owner_person_id: owner,
    name: `${owner.toUpperCase()} HSA ${id}`,
    account_type: "hsa",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: employeeYtd,
    employer_contributed_ytd: employerYtd,
    hsa_ytd_tax_year: YEAR,
    match_status: "not_offered",
    ...overrides,
  };
}

function person(id: HsaOwner, relationship: "self" | "spouse_partner", birthDate: string) {
  return {
    id,
    display_name: id.toUpperCase(),
    relationship,
    birth_date: birthDate,
    planned_retirement_age: 65,
    covered_by_workplace_retirement_plan: false,
    estimated_taxable_compensation_annual: 120000,
    is_dependent: false,
    is_active: true,
  };
}

function profile(id: HsaOwner) {
  return {
    id: `profile-${id}`,
    person_id: id,
    tax_year: YEAR,
    medicare_effective_on: null,
    last_month_rule_status: "not_elected",
    testing_period_status: "not_applicable",
    data_version: 1,
  };
}

function months(id: HsaOwner) {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `month-${id}-${index + 1}`,
    person_id: id,
    tax_year: YEAR,
    month: index + 1,
    eligibility_status: "eligible",
    coverage_status: "family",
    evidence_status: "confirmed",
  }));
}

function marriedHsaRaw(options: {
  aYtd?: number;
  bYtd?: number;
  aBirthDate?: string;
  bBirthDate?: string;
  monthlyIncome?: number;
  monthlyExpense?: number;
  cash?: number;
  hsaAccounts?: Record<string, unknown>[];
  allocation?: { a: number; b: number };
} = {}): MoneyPriorityRawSnapshot {
  const aYtd = options.aYtd ?? 0;
  const bYtd = options.bYtd ?? 0;
  const accounts: Record<string, unknown>[] = [{
    id: "reserve", name: "Reserve", account_type: "savings",
    balance: 12000, cash_purpose: "protected_reserve",
  }];
  if ((options.cash ?? 0) > 0) accounts.push({
    id: "cash", name: "Cash", account_type: "savings",
    balance: options.cash, cash_purpose: "unallocated",
  });
  return {
    householdId: "married-hsa-remediation",
    people: [
      person("a", "self", options.aBirthDate ?? "1990-01-01"),
      person("b", "spouse_partner", options.bBirthDate ?? "1990-01-01"),
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income",
      monthly_amount: options.monthlyIncome ?? 3000, monthly_gross_amount: 10000,
      income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Required", category: "housing",
      monthly_amount: options.monthlyExpense ?? 3000, is_essential: true,
      cash_flow_treatment: "required" }],
    accounts,
    debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: options.hsaAccounts ?? [
      hsaAccount("hsa-a", "a", aYtd),
      hsaAccount("hsa-b", "b", bYtd),
    ],
    hsaTaxYearProfiles: [profile("a"), profile("b")],
    hsaMonthStatuses: [...months("a"), ...months("b")],
    hsaLegalSpouseAuthorities: [{
      id: "authority", tax_year: YEAR, person_one_id: "a", person_two_id: "b",
      authority_status: "confirmed_legal_spouses", confirmation_source: "test_confirmation",
      confirmed_at: "2026-01-01T00:00:00.000Z", data_version: 1,
    }],
    hsaMarriedAllocations: options.allocation ? [{
      id: "allocation",
      tax_year: YEAR,
      person_one_id: "a",
      person_two_id: "b",
      person_one_ordinary_amount: options.allocation.a,
      person_two_ordinary_amount: options.allocation.b,
      data_version: 1,
    }] : [],
    preferences: {
      emergency_fund_months_override: 3,
      debt_vs_investing: "balanced",
      roth_vs_traditional: "unspecified",
      risk_tolerance: "moderate",
      retirement_priority: "balanced",
      job_replacement_difficulty: "easy",
      known_income_disruption: false,
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0,
      planning_pension_monthly: 0,
      tax_profile_year: YEAR,
      tax_filing_status: "married_filing_jointly",
      estimated_modified_agi: 100000,
    },
  };
}

function ledgerFor(raw: MoneyPriorityRawSnapshot) {
  return createRetirementCapacityLedger(
    evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(raw)),
  );
}

test("equal married-family default exposes $4,375 owner ceilings and one $8,750 shared constraint", () => {
  const ledger = ledgerFor(marriedHsaRaw());
  assert.equal(remainingRetirementCapacity(ledger, "hsa-a"), 4375);
  assert.equal(remainingRetirementCapacity(ledger, "hsa-b"), 4375);
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 8750);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("uneven YTD that cannot fit the equal default requests an alternate spouse agreement", () => {
  const opportunities = evaluateRetirementAccountOpportunities(
    buildMoneyPrioritySnapshot(marriedHsaRaw({ aYtd: 6000, bYtd: 1000 })),
  ).opportunities;
  assert.ok(opportunities.every((item) => item.state === "more_information_needed"));
  assert.ok(opportunities.every((item) => item.missingData.some(
    (message) => message.includes("alternate allocation could fit"),
  )));
});

test("explicit $8,000/$750 allocation leaves exactly $750 of couple room", () => {
  const ledger = ledgerFor(marriedHsaRaw({
    aYtd: 8000,
    allocation: { a: 8000, b: 750 },
  }));
  assert.equal(remainingRetirementCapacity(ledger, "hsa-a"), 0);
  assert.equal(remainingRetirementCapacity(ledger, "hsa-b"), 750);
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 750);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("Build consumes corrected explicit married-family room before Windfall", () => {
  const engine = runMoneyPriorityEngine(marriedHsaRaw({
    aYtd: 8000,
    allocation: { a: 8000, b: 750 },
    monthlyIncome: 4000,
  }), AS_OF_DATE);
  const buildHsaAnnual = engine.build.retirementAccountAllocations
    .filter((item) => item.accountId === "hsa-b")
    .reduce((sum, item) => sum + item.allocatedAnnualAmount, 0);
  assert.equal(buildHsaAnnual, 750);
  const windfall = allocateWindfall(engine, {
    amount: 10000,
    source: "gift",
    taxTreatment: "known_non_taxable",
  });
  assert.equal(windfall.allocations.filter((item) =>
    item.category === "retirement" && item.relatedEntityId === "hsa-b").length, 0);
  assert.equal(retirementCapacityInvariantHolds(engine.retirementCapacityLedger), true);
});

test("existing cash cannot deploy more than the corrected $750 HSA room", () => {
  const engine = runMoneyPriorityEngine(marriedHsaRaw({
    aYtd: 8000,
    allocation: { a: 8000, b: 750 },
    cash: 10000,
  }), AS_OF_DATE);
  const group = engine.retirementCapacityLedger.groups.find((item) => item.id === "hsa:married-family")!;
  assert.equal(group.consumed.one_time, 750);
  assert.equal(group.remainingAnnualRoom, 0);
  assert.equal(engine.build.retirementAccountAllocations.filter((item) => item.accountId === "hsa-a" || item.accountId === "hsa-b").length, 0);
});

test("Secure HSA payroll match is constrained by the same corrected room", () => {
  const engine = runMoneyPriorityEngine(marriedHsaRaw({
    aYtd: 8000,
    allocation: { a: 8000, b: 750 },
    monthlyIncome: 4000,
    hsaAccounts: [
      hsaAccount("hsa-a", "a", 8000),
      hsaAccount("hsa-b", "b", 0, 0, {
        match_status: "not_fully_captured",
        full_match_employee_contribution_monthly: 300,
      }),
    ],
  }), AS_OF_DATE);
  const group = engine.retirementCapacityLedger.groups.find((item) => item.id === "hsa:married-family")!;
  assert.equal(group.consumed.secure, 750);
  assert.equal(group.remainingAnnualRoom, 0);
  assert.equal(retirementCapacityInvariantHolds(engine.retirementCapacityLedger), true);
});

test("one age-55 spouse keeps a distinct catch-up unavailable to the younger spouse", () => {
  const ledger = ledgerFor(marriedHsaRaw({ aBirthDate: "1970-01-01" }));
  assert.equal(remainingRetirementCapacity(ledger, "hsa-a"), 5375);
  assert.equal(remainingRetirementCapacity(ledger, "hsa-b"), 4375);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-b", "build", 5000).consumedAnnualAmount, 4375);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-a", "build", 6000).consumedAnnualAmount, 5375);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("ordinary-versus-catch-up deposit labels are not required when owner ceilings are known", () => {
  const opportunities = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(
    marriedHsaRaw({ aYtd: 4500, bYtd: 1000, aBirthDate: "1970-01-01" }),
  )).opportunities;
  const a = opportunities.find((item) => item.accountId === "hsa-a")!;
  assert.equal(a.state, "available");
  assert.equal(a.remainingAnnualRoom, 875);
  assert.ok(!a.missingData.some((item) => item.includes("ordinary") && item.includes("catch-up")));
});

test("multiple HSA accounts do not multiply an owner's or couple's remaining capacity", () => {
  const ledger = ledgerFor(marriedHsaRaw({
    hsaAccounts: [
      hsaAccount("a-1", "a"),
      hsaAccount("a-2", "a"),
      hsaAccount("b-1", "b"),
      hsaAccount("b-2", "b"),
    ],
  }));
  assert.equal(consumeRetirementCapacity(ledger, "a-1", "one_time", 3000).consumedAnnualAmount, 3000);
  assert.equal(consumeRetirementCapacity(ledger, "a-2", "build", 3000).consumedAnnualAmount, 1375);
  assert.equal(consumeRetirementCapacity(ledger, "b-1", "windfall", 5000).consumedAnnualAmount, 4375);
  assert.equal(remainingRetirementCapacity(ledger, "b-2"), 0);
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.remainingAnnualRoom, 0);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("Your Plan reports unknown room instead of inventing a conflict when spouse allocation is unresolved", () => {
  const engine = runMoneyPriorityEngine(marriedHsaRaw({ aYtd: 6000, bYtd: 1000 }), AS_OF_DATE);
  const plan = evaluateUserPlan(engine, [], {
    additionalRetirementContributions: [{ accountId: "hsa-a", annualAmount: 100, source: "other" }],
  });
  assert.ok(plan.impacts.some((item) => item.id === "user-plan-retirement-room-unknown"));
  assert.ok(!plan.impacts.some((item) => item.id === "user-plan-retirement-room-conflict"));
});

test("equivalent person, account, profile, and month ordering preserves married HSA results", () => {
  const first = marriedHsaRaw();
  const second = structuredClone(first);
  second.people = [...(second.people ?? [])].reverse();
  second.retirementAccounts = [...(second.retirementAccounts ?? [])].reverse();
  second.hsaTaxYearProfiles = [...(second.hsaTaxYearProfiles ?? [])].reverse();
  second.hsaMonthStatuses = [...(second.hsaMonthStatuses ?? [])].reverse();
  const summarize = (input: MoneyPriorityRawSnapshot) => {
    const ledger = ledgerFor(input);
    return {
      entries: ledger.entries.map((entry) => ({ id: entry.accountId, remaining: remainingRetirementCapacity(ledger, entry.accountId) })),
      groups: ledger.groups.map((group) => ({ id: group.id, remaining: group.remainingAnnualRoom })),
    };
  };
  assert.deepEqual(summarize(first), summarize(second));
});
