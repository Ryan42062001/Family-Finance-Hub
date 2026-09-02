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
import {
  deriveRecommendedPlanAllocations,
  evaluateUserPlan,
} from "./money-priority-user-plan.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";

const AS_OF_DATE = "2026-09-01";

type HsaOwner = "a" | "b";

function hsaAccount(
  id: string,
  owner: HsaOwner,
  employeeYtd: number,
  employerYtd = 0,
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
    hsa_eligible: true,
    hsa_coverage_type: "family",
    match_status: "not_offered",
  };
}

function marriedHsaRaw(options: {
  aYtd?: number;
  bYtd?: number;
  aBirthDate?: string;
  bBirthDate?: string;
  monthlyIncome?: number;
  monthlyExpense?: number;
  accounts?: Record<string, unknown>[];
  hsaAccounts?: Record<string, unknown>[];
} = {}): MoneyPriorityRawSnapshot {
  const {
    aYtd = 0,
    bYtd = 0,
    aBirthDate = "1990-01-01",
    bBirthDate = "1990-01-01",
    monthlyIncome = 3000,
    monthlyExpense = 3000,
  } = options;
  return {
    householdId: "married-hsa-remediation",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: aBirthDate,
        planned_retirement_age: 65, covered_by_workplace_retirement_plan: false,
        estimated_taxable_compensation_annual: 120000, is_dependent: false, is_active: true },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: bBirthDate,
        planned_retirement_age: 65, covered_by_workplace_retirement_plan: false,
        estimated_taxable_compensation_annual: 120000, is_dependent: false, is_active: true },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income",
      monthly_amount: monthlyIncome, monthly_gross_amount: 10000,
      income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Required", category: "housing",
      monthly_amount: monthlyExpense, is_essential: true, cash_flow_treatment: "required" }],
    accounts: options.accounts ?? [{ id: "reserve", name: "Reserve", account_type: "savings",
      balance: 12000, cash_purpose: "protected_reserve" }],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: options.hsaAccounts ?? [
      hsaAccount("hsa-a", "a", aYtd),
      hsaAccount("hsa-b", "b", bYtd),
    ],
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
      tax_profile_year: 2026,
      tax_filing_status: "married_filing_jointly",
      estimated_modified_agi: 100000,
    },
  };
}

function ledgerFor(raw: MoneyPriorityRawSnapshot) {
  const snapshot = buildMoneyPrioritySnapshot(raw);
  return createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(snapshot));
}

function familyGroupRoom(raw: MoneyPriorityRawSnapshot): number {
  return ledgerFor(raw).groups.find((group) => group.id === "hsa:married-family")!
    .originalRemainingAnnualRoom;
}

for (const [aYtd, bYtd, expected] of [
  [0, 0, 8750],
  [4375, 0, 4375],
  [0, 4375, 4375],
  [6000, 1000, 1750],
  [8000, 0, 750],
  [8750, 0, 0],
  [0, 8750, 0],
  [5000, 3750, 0],
  [9000, 0, 0],
] as const) {
  test(`couple-wide ordinary HSA room: A ${aYtd}, B ${bYtd} leaves ${expected}`, () => {
    const raw = marriedHsaRaw({ aYtd, bYtd });
    const ledger = ledgerFor(raw);
    assert.equal(familyGroupRoom(raw), expected);
    assert.ok(ledger.entries.every((entry) => entry.originalRemainingAnnualRoom === expected));
    assert.equal(retirementCapacityInvariantHolds(ledger), true);
  });
}

test("exact $8,000/$0 failure is capped across Build, Windfall, and Your Plan", () => {
  const raw = marriedHsaRaw({ aYtd: 8000, bYtd: 0, monthlyIncome: 4000 });
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const group = engine.retirementCapacityLedger.groups.find(
    (item) => item.id === "hsa:married-family",
  )!;
  const buildAnnual = engine.build.retirementAccountAllocations.reduce(
    (sum, allocation) => sum + allocation.allocatedMonthlyAmount * 12,
    0,
  );
  const windfall = allocateWindfall(engine, {
    amount: 10000,
    source: "gift",
    taxTreatment: "known_non_taxable",
  });
  const windfallHsa = windfall.allocations
    .filter((allocation) => allocation.category === "retirement")
    .reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);
  const recommended = deriveRecommendedPlanAllocations(engine)
    .find((allocation) => allocation.category === "retirement")!;
  const yourPlan = evaluateUserPlan(engine, [{
    allocationId: recommended.allocationId,
    monthlyAmount: 300,
  }]);
  const conflict = yourPlan.impacts.find(
    (impact) => impact.id === "user-plan-retirement-room-conflict",
  )?.retirement?.contributionRoomConflict;

  assert.equal(group.originalRemainingAnnualRoom, 750);
  assert.equal(buildAnnual, 750);
  assert.equal(windfallHsa, 0);
  assert.equal(conflict, 2850);
  assert.equal(retirementCapacityInvariantHolds(engine.retirementCapacityLedger), true);
  assert.ok(8000 + group.consumed.one_time + group.consumed.secure
    + group.consumed.build + group.consumed.windfall <= 8750);
});

test("Windfall alone cannot exceed the corrected $750 family room", () => {
  const engine = runMoneyPriorityEngine(marriedHsaRaw({ aYtd: 8000 }), AS_OF_DATE);
  const windfall = allocateWindfall(engine, {
    amount: 10000,
    source: "gift",
    taxTreatment: "known_non_taxable",
  });
  assert.equal(windfall.allocations
    .filter((allocation) => allocation.category === "retirement")
    .reduce((sum, allocation) => sum + allocation.allocatedAmount, 0), 750);
});

test("existing cash consumes corrected HSA room before Secure, Build, and Windfall", () => {
  const raw = marriedHsaRaw({
    aYtd: 8000,
    accounts: [
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000,
        cash_purpose: "protected_reserve" },
      { id: "cash", name: "Cash", account_type: "savings", balance: 10000,
        cash_purpose: "unallocated" },
    ],
  });
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const group = engine.retirementCapacityLedger.groups.find(
    (item) => item.id === "hsa:married-family",
  )!;
  const windfall = allocateWindfall(engine, {
    amount: 10000,
    source: "gift",
    taxTreatment: "known_non_taxable",
  });
  assert.equal(group.consumed.one_time, 750);
  assert.equal(group.consumed.secure, 0);
  assert.equal(group.consumed.build, 0);
  assert.equal(windfall.allocations.filter((item) => item.category === "retirement").length, 0);
});

test("Secure HSA payroll match consumes only corrected family room", () => {
  const hsaA = hsaAccount("hsa-a", "a", 8000);
  const hsaB = {
    ...hsaAccount("hsa-b", "b", 0),
    match_status: "not_fully_captured",
    full_match_employee_contribution_monthly: 300,
  };
  const raw = marriedHsaRaw({
    aYtd: 8000,
    monthlyIncome: 4000,
    hsaAccounts: [hsaA, hsaB],
  });
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const group = engine.retirementCapacityLedger.groups.find(
    (item) => item.id === "hsa:married-family",
  )!;
  assert.equal(group.consumed.secure, 750);
  assert.equal(group.remainingAnnualRoom, 0);
  assert.equal(engine.build.retirementAccountAllocations.length, 0);
});

test("one age-55 spouse has a separate catch-up bucket unavailable to the younger spouse", () => {
  const ledger = ledgerFor(marriedHsaRaw({
    aYtd: 0,
    bYtd: 8000,
    aBirthDate: "1970-01-01",
  }));
  const family = ledger.groups.find((group) => group.id === "hsa:married-family")!;
  const aCatchUp = ledger.groups.find((group) => group.id === "hsa-owner:a")!;
  const bCatchUp = ledger.groups.find((group) => group.id === "hsa-owner:b")!;

  assert.equal(family.originalRemainingAnnualRoom, 750);
  assert.equal(aCatchUp.originalRemainingAnnualRoom, 1000);
  assert.equal(bCatchUp.originalRemainingAnnualRoom, 0);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-b", "build", 1750).consumedAnnualAmount, 750);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-a", "build", 1000).consumedAnnualAmount, 1000);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("both age-55 spouses keep distinct catch-up buckets after ordinary room is consumed", () => {
  const ledger = ledgerFor(marriedHsaRaw({
    aBirthDate: "1970-01-01",
    bBirthDate: "1970-01-01",
  }));
  assert.equal(remainingRetirementCapacity(ledger, "hsa-a"), 9750);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-a", "build", 9750).consumedAnnualAmount, 9750);
  assert.equal(remainingRetirementCapacity(ledger, "hsa-b"), 1000);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-b", "windfall", 2000).consumedAnnualAmount, 1000);
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.consumed.build, 8750);
  assert.equal(ledger.groups.find((group) => group.id === "hsa-owner:a")?.consumed.build, 1000);
  assert.equal(ledger.groups.find((group) => group.id === "hsa-owner:b")?.consumed.windfall, 1000);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("positive YTD for a catch-up-eligible spouse is information-needed when attribution is absent", () => {
  const raw = marriedHsaRaw({
    aYtd: 5000,
    bYtd: 1000,
    aBirthDate: "1970-01-01",
  });
  const opportunities = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(raw));
  const ledger = createRetirementCapacityLedger(opportunities);
  assert.ok(opportunities.opportunities.every((item) => item.state === "more_information_needed"));
  assert.ok(opportunities.opportunities.every((item) => item.missingData.some(
    (reason) => reason.includes("ordinary family contributions versus owner-specific catch-up"),
  )));
  assert.ok(ledger.entries.every((entry) => entry.verified === false));
  assert.ok(ledger.entries.every((entry) => remainingRetirementCapacity(ledger, entry.accountId) === null));
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  assert.equal(engine.build.retirementAccountAllocations.length, 0);
  const userPlan = evaluateUserPlan(engine, [], {
    additionalRetirementContributions: [{ accountId: "hsa-a", annualAmount: 100, source: "other" }],
  });
  assert.ok(userPlan.impacts.some((item) => item.id === "user-plan-retirement-room-unknown"));
  assert.ok(userPlan.warnings.some((item) => item.includes("cannot be verified")));
});

test("aggregate YTD above family plus all catch-ups exposes zero additional room", () => {
  const raw = marriedHsaRaw({
    aYtd: 11000,
    bYtd: 0,
    aBirthDate: "1970-01-01",
    bBirthDate: "1970-01-01",
  });
  const opportunities = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(raw));
  const ledger = createRetirementCapacityLedger(opportunities);
  assert.ok(opportunities.opportunities.every((item) => item.state === "limit_reached"));
  assert.ok(opportunities.opportunities.every((item) => item.reasons.some(
    (reason) => reason.includes("exceed the supported family ordinary limit"),
  )));
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 0);
  assert.ok(ledger.entries.every((entry) => remainingRetirementCapacity(ledger, entry.accountId) === 0));
});

test("four HSA accounts do not multiply uneven couple-wide room", () => {
  const accounts = [
    hsaAccount("a-1", "a", 3000),
    hsaAccount("a-2", "a", 3000),
    hsaAccount("b-1", "b", 1000),
    hsaAccount("b-2", "b", 0),
  ];
  const ledger = ledgerFor(marriedHsaRaw({ hsaAccounts: accounts }));
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 1750);
  assert.equal(consumeRetirementCapacity(ledger, "a-1", "one_time", 1000).consumedAnnualAmount, 1000);
  assert.equal(consumeRetirementCapacity(ledger, "a-2", "build", 1000).consumedAnnualAmount, 750);
  assert.equal(consumeRetirementCapacity(ledger, "b-1", "windfall", 1000).consumedAnnualAmount, 0);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
});

test("people and HSA account permutations preserve entity-level financial output", () => {
  const hsaAccounts = [
    hsaAccount("a-1", "a", 3000),
    hsaAccount("a-2", "a", 3000),
    hsaAccount("b-1", "b", 1000),
    hsaAccount("b-2", "b", 0),
  ];
  const original = marriedHsaRaw({ monthlyIncome: 4000, hsaAccounts });
  const permuted = structuredClone(original);
  permuted.people = [...(permuted.people ?? [])].reverse();
  permuted.retirementAccounts = [...(permuted.retirementAccounts ?? [])].reverse();
  const project = (raw: MoneyPriorityRawSnapshot) => {
    const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
    return {
      ledger: engine.retirementCapacityLedger.entries.map((entry) => ({
        accountId: entry.accountId,
        original: entry.originalRemainingAnnualRoom,
        remaining: entry.remainingAnnualRoom,
        consumed: entry.consumed,
      })),
      groups: engine.retirementCapacityLedger.groups,
      build: engine.build.retirementAccountAllocations,
      recommendations: engine.recommendations.map((item) => ({
        id: item.id,
        allocations: item.allocations,
      })),
    };
  };
  assert.deepEqual(project(permuted), project(original));
});
