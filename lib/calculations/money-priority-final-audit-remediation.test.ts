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
import {
  buildMoneyPrioritySnapshot,
  MoneyPrioritySnapshotValidationError,
  parseStrictNumber,
  type MoneyPriorityRawSnapshot,
} from "./money-priority-snapshot.ts";

function retirementRaw(room = 1200, matchMonthly = 300): MoneyPriorityRawSnapshot {
  return {
    householdId: "final-audit-remediation",
    people: [{
      id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, estimated_taxable_compensation_annual: 120000,
      covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false,
    }],
    income: [{ id: "income", owner_person_id: "p1", name: "Salary", monthly_amount: 5000, monthly_gross_amount: 10000, is_active: true }],
    expenses: [{ id: "expense", name: "Essentials", monthly_amount: 4000, is_essential: true }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [{
      id: "workplace", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 24500 - room, employer_contributed_ytd: 0,
      plan_eligible_compensation_annual: 120000,
      full_match_employee_contribution_monthly: matchMonthly, match_status: "not_fully_captured",
    }],
    goals: [], insuranceExposures: [],
    preferences: {
      emergency_fund_months_override: 3,
      known_income_disruption: false,
      desired_retirement_monthly_spending: 5000,
      planning_social_security_monthly: 0,
      planning_pension_monthly: 0,
    },
  };
}

function addDeployableCash(raw: MoneyPriorityRawSnapshot, amount: number): void {
  raw.accounts!.push({
    id: "unallocated", name: "Unallocated cash", account_type: "savings",
    balance: 2000 + amount, cash_purpose: "unallocated",
  });
}

function useSharedHsaCapacity(raw: MoneyPriorityRawSnapshot, room: number, matchMonthly: number): void {
  raw.retirementAccounts = [
    {
      id: "hsa-a", owner_person_id: "p1", name: "Direct HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 8750 - room, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered",
    },
    {
      id: "hsa-b", owner_person_id: "p1", name: "Matched HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family",
      full_match_employee_contribution_monthly: matchMonthly, match_status: "not_fully_captured",
    },
  ];
}

function retirementClaims(result: ReturnType<typeof runMoneyPriorityEngine>) {
  const oneTime = result.existingCash.deployments
    .filter((item) => item.category === "retirement")
    .reduce((sum, item) => sum + item.amount, 0);
  const secure = result.recommendations
    .filter((item) => item.stage === "secure")
    .flatMap((item) => item.allocations)
    .filter((item) => item.category === "employer_match")
    .reduce((sum, item) => sum + (item.annualAmount ?? 0), 0);
  const build = result.build.retirementAccountAllocations
    .reduce((sum, item) => sum + item.allocatedMonthlyAmount * 12, 0);
  return { oneTime, secure, build, total: oneTime + secure + build };
}

test("$1,200 room consumed by Secure leaves no Build legal room", () => {
  const result = runMoneyPriorityEngine(retirementRaw(1200, 300), "2026-09-01");
  assert.deepEqual(retirementClaims(result), { oneTime: 0, secure: 1200, build: 0, total: 1200 });
  assert.equal(result.build.retirementAccountAllocations.length, 0);
  assert.ok(result.build.unresolvedRetirementMonthlyAmount > 0);
  assert.ok(retirementCapacityInvariantHolds(result.retirementCapacityLedger));
});

test("$1,200 one-time retirement deployment leaves no Secure or Build room", () => {
  const raw = retirementRaw(1200, 300);
  useSharedHsaCapacity(raw, 1200, 300);
  addDeployableCash(raw, 1200);
  const result = runMoneyPriorityEngine(raw, "2026-09-01");
  assert.deepEqual(retirementClaims(result), { oneTime: 1200, secure: 0, build: 0, total: 1200 });
  assert.equal(result.existingCash.deployments.find((item) => item.category === "retirement")?.relatedEntityId, "hsa-a");
  assert.equal(result.residualNeeds.retirementAppliedByAccountId["hsa-a"], 1200);
  assert.ok(retirementCapacityInvariantHolds(result.retirementCapacityLedger));
});

test("one-time $400 plus Secure $500 leaves Build at most $300", () => {
  const raw = retirementRaw(1200, 125);
  useSharedHsaCapacity(raw, 1200, 125);
  addDeployableCash(raw, 400);
  const result = runMoneyPriorityEngine(raw, "2026-09-01");
  const claims = retirementClaims(result);
  assert.equal(claims.oneTime, 400);
  assert.equal(claims.secure, 500);
  assert.equal(claims.build, 300);
  assert.equal(claims.total, 1200);
  assert.ok(retirementCapacityInvariantHolds(result.retirementCapacityLedger));
});

test("Secure $300 leaves Build at most $900", () => {
  const result = runMoneyPriorityEngine(retirementRaw(1200, 75), "2026-09-01");
  assert.deepEqual(retirementClaims(result), { oneTime: 0, secure: 300, build: 900, total: 1200 });
});

test("missing legal capacity produces descriptive shortfall but no actionable retirement allocation", () => {
  const raw = retirementRaw();
  raw.retirementAccounts![0].employee_contributed_ytd = null;
  const result = runMoneyPriorityEngine(raw, "2026-09-01");
  assert.ok(result.build.retirement.recommendedMonthlyIncrease > 0);
  assert.equal(retirementClaims(result).total, 0);
  assert.equal(result.build.retirementAccountAllocations.length, 0);
  const planningNeed = result.recommendations.find((item) => item.id === "build-retirement-household");
  assert.equal(planningNeed?.state, "worth_considering");
  assert.equal(planningNeed?.allocations.length, 0);
  assert.ok((planningNeed?.tradeoffs[0] ?? "").includes("not an actionable contribution"));
});

test("retirement projection need remains visible while account contributions are capped to legal room", () => {
  const result = runMoneyPriorityEngine(retirementRaw(1200, 0), "2026-09-01");
  assert.ok(result.build.retirement.recommendedMonthlyIncrease > 100);
  assert.equal(retirementClaims(result).build, 1200);
  const actionable = result.recommendations.find((item) => item.id === "build-retirement-household");
  assert.equal(actionable?.allocations[0]?.relatedEntityId, "workplace");
  assert.equal(actionable?.allocations[0]?.annualAmount, 1200);
  assert.ok(result.build.unresolvedRetirementMonthlyAmount > 0);
});

test("IRA accounts consume one owner-level shared limit", () => {
  const raw = retirementRaw();
  raw.retirementAccounts = [
    { id: "ira-a", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered" },
    { id: "ira-b", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered" },
  ];
  raw.preferences = { ...raw.preferences, tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000 };
  const snapshot = buildMoneyPrioritySnapshot(raw);
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(snapshot));
  const first = consumeRetirementCapacity(ledger, "ira-a", "one_time", 5000);
  const second = consumeRetirementCapacity(ledger, "ira-b", "build", 5000);
  assert.equal(first.consumedAnnualAmount, 5000);
  assert.equal(second.consumedAnnualAmount, 2500);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), 0);
  assert.equal(remainingRetirementCapacity(ledger, "ira-b"), 0);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("multiple HSAs for one owner cannot duplicate the owner's shared room", () => {
  const raw = retirementRaw();
  raw.retirementAccounts = ["hsa-a", "hsa-b"].map((id) => ({
    id, owner_person_id: "p1", name: id, account_type: "hsa", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0,
    hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered",
  }));
  const snapshot = buildMoneyPrioritySnapshot(raw);
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(snapshot));
  assert.equal(consumeRetirementCapacity(ledger, "hsa-a", "one_time", 6000).consumedAnnualAmount, 6000);
  assert.equal(consumeRetirementCapacity(ledger, "hsa-b", "build", 6000).consumedAnnualAmount, 2750);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("age catch-up remains represented separately from ordinary annual-additions room", () => {
  const raw = retirementRaw(8000, 0);
  raw.people![0].birth_date = "1970-01-01";
  raw.retirementAccounts![0].employee_contributed_ytd = 24500;
  raw.retirementAccounts![0].prior_year_sponsor_wages = 100000;
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(raw)));
  const entry = ledger.entries.find((item) => item.accountId === "workplace")!;
  assert.equal(entry.catchUpRemainingRoom, 8000);
  assert.equal(consumeRetirementCapacity(ledger, "workplace", "build", 8000).consumedAnnualAmount, 8000);
  assert.equal(entry.catchUpRemainingRoom, 0);
  assert.equal(entry.annualAdditionsRemainingRoom, 47500);
});

test("strict parser accepts only finite numbers and plain trimmed decimal strings", () => {
  for (const [input, expected] of [[0, 0], [12.5, 12.5], ["0", 0], ["12.50", 12.5], [" 0.25 ", 0.25], ["-5", -5]] as const) {
    const parsed = parseStrictNumber(input);
    assert.equal(parsed.valid, true);
    if (parsed.valid) assert.equal(parsed.value, expected);
  }
  for (const input of ["", " ", "\t", "\n", false, true, [], {}, [1], "12abc", "1,000", "$100", "NaN", "Infinity", "-Infinity", Number.NaN, Infinity, -Infinity, null, undefined]) {
    assert.equal(parseStrictNumber(input).valid, false, `Unexpected numeric acceptance for ${String(input)}`);
  }
});

const requiredNumericFields: Array<[string, (raw: MoneyPriorityRawSnapshot, value: unknown) => void]> = [
  ["income", (raw, value) => { raw.income![0].monthly_amount = value; }],
  ["expense", (raw, value) => { raw.expenses![0].monthly_amount = value; }],
  ["account", (raw, value) => { raw.accounts![0].balance = value; }],
  ["debt balance", (raw, value) => { raw.debts = [{ id: "debt", current_balance: value, minimum_payment: 0 }]; }],
  ["debt minimum", (raw, value) => { raw.debts = [{ id: "debt", current_balance: 1, minimum_payment: value }]; }],
  ["retirement balance", (raw, value) => { raw.retirementAccounts![0].balance = value; }],
  ["retirement contribution", (raw, value) => { raw.retirementAccounts![0].monthly_employee_contribution = value; }],
  ["goal target", (raw, value) => { raw.goals = [{ id: "goal", target_amount: value, current_amount: 0, priority: 3 }]; }],
  ["goal current", (raw, value) => { raw.goals = [{ id: "goal", target_amount: 1, current_amount: value, priority: 3 }]; }],
];

for (const [field, mutate] of requiredNumericFields) {
  test(`${field} rejects coercible nonnumeric raw forms`, () => {
    for (const value of ["", " ", "\t\n", false, true, [], {}, [1], "12abc", Number.NaN, Infinity, -Infinity, null, undefined]) {
      const raw = retirementRaw();
      mutate(raw, value);
      assert.throws(() => buildMoneyPrioritySnapshot(raw), MoneyPrioritySnapshotValidationError);
    }
  });
}

test("combined malformed outflows cannot create synthetic monthly capacity", () => {
  const raw = retirementRaw(100, 500);
  raw.expenses![0].monthly_amount = " ";
  raw.debts = [{ id: "debt", name: "Debt", debt_type: "credit_card", current_balance: 1000, minimum_payment: false }];
  assert.throws(() => runMoneyPriorityEngine(raw, "2026-09-01"), (error) =>
    error instanceof MoneyPrioritySnapshotValidationError
      && error.issues.some((issue) => issue.path === "expenses[0].monthly_amount")
      && error.issues.some((issue) => issue.path === "debts[0].minimum_payment"));
});

test("goal runtime rules match persisted target and core-need constraints", () => {
  const validCases = [
    { target_amount: 1, current_amount: 0, priority: 3, core_need_amount: null },
    { target_amount: 100, current_amount: 0, priority: 3, core_need_amount: 100 },
    { target_amount: 100, current_amount: 0, priority: 3, core_need_amount: 99 },
  ];
  for (const goal of validCases) {
    const raw = retirementRaw(); raw.goals = [{ id: "goal", ...goal }];
    assert.doesNotThrow(() => buildMoneyPrioritySnapshot(raw));
  }
  for (const goal of [
    { target_amount: 0, current_amount: 0, priority: 3, core_need_amount: null },
    { target_amount: -1, current_amount: 0, priority: 3, core_need_amount: null },
    { target_amount: 100, current_amount: 0, priority: 3, core_need_amount: 101 },
  ]) {
    const raw = retirementRaw(); raw.goals = [{ id: "goal", ...goal }];
    assert.throws(() => buildMoneyPrioritySnapshot(raw), MoneyPrioritySnapshotValidationError);
  }
});

function entityAllocations(result: ReturnType<typeof runMoneyPriorityEngine>) {
  return result.recommendations.flatMap((recommendation) => recommendation.allocations.map((allocation) => ({
    stage: recommendation.stage,
    recommendationId: recommendation.id,
    category: allocation.category,
    entity: allocation.relatedEntityId,
    monthly: allocation.monthlyAmount,
    annual: allocation.annualAmount,
  }))).sort((a, b) => `${a.stage}:${a.recommendationId}:${a.category}:${a.entity ?? ""}`
    .localeCompare(`${b.stage}:${b.recommendationId}:${b.category}:${b.entity ?? ""}`));
}

test("equal employer-match accounts are shuffle-invariant at entity level", () => {
  const raw = retirementRaw();
  raw.people = ["a", "b"].map((id) => ({ id: `person-${id}`, display_name: id, relationship: id === "a" ? "self" : "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 60000, is_active: true, is_dependent: false }));
  raw.income = [{ id: "income", name: "Income", monthly_amount: 300, monthly_gross_amount: 10000, is_active: true }];
  raw.expenses = [{ id: "expense", name: "Expense", monthly_amount: 0, is_essential: true }];
  raw.accounts = [];
  raw.retirementAccounts = ["a", "b"].map((id) => ({
    id, owner_person_id: `person-${id}`, name: id, account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 60000,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
  }));
  const forward = runMoneyPriorityEngine(raw, "2026-09-01");
  raw.retirementAccounts.reverse();
  const reverse = runMoneyPriorityEngine(raw, "2026-09-01");
  assert.deepEqual(entityAllocations(forward), entityAllocations(reverse));
  assert.equal(entityAllocations(forward).find((item) => item.category === "employer_match")?.entity, "a");
});

test("equal-APR Secure debts are shuffle-invariant at entity level", () => {
  const raw = retirementRaw();
  raw.income![0].monthly_amount = 500;
  raw.income![0].monthly_gross_amount = null;
  raw.expenses![0].monthly_amount = 0;
  raw.accounts = [];
  raw.retirementAccounts = [];
  raw.debts = ["a", "b", "c"].map((id) => ({
    id, name: id, debt_type: "credit_card", current_balance: 1000,
    minimum_payment: 0, interest_rate: 20,
  }));
  const forward = runMoneyPriorityEngine(raw, "2026-09-01");
  raw.debts.reverse();
  const reverse = runMoneyPriorityEngine(raw, "2026-09-01");
  assert.deepEqual(entityAllocations(forward), entityAllocations(reverse));
  assert.equal(entityAllocations(forward).find((item) => item.category === "debt")?.entity, "a");
});

function authoritativeDestinations(result: ReturnType<typeof runMoneyPriorityEngine>) {
  return {
    recommendations: entityAllocations(result),
    existingCash: result.existingCash.deployments.map((deployment) => ({
      id: deployment.id,
      category: deployment.category,
      entity: deployment.relatedEntityId,
      amount: deployment.amount,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    retirement: result.build.retirementAccountAllocations.map((allocation) => ({
      accountId: allocation.accountId,
      monthly: allocation.allocatedMonthlyAmount,
    })).sort((a, b) => a.accountId.localeCompare(b.accountId)),
  };
}

test("complex authoritative recommendations are invariant across all collection permutations", () => {
  const raw = retirementRaw(2400, 150);
  raw.income = [
    { id: "income-b", owner_person_id: "p1", name: "Salary B", monthly_amount: 2600, monthly_gross_amount: 5200, is_active: true },
    { id: "income-a", owner_person_id: "p1", name: "Salary A", monthly_amount: 2400, monthly_gross_amount: 4800, is_active: true },
  ];
  raw.expenses = [
    { id: "expense-b", name: "Housing", monthly_amount: 2200, is_essential: true },
    { id: "expense-a", name: "Food", monthly_amount: 1300, is_essential: true },
  ];
  raw.accounts = [
    { id: "cash-b", name: "Unallocated B", account_type: "savings", balance: 2400, cash_purpose: "unallocated" },
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 10500, cash_purpose: "protected_reserve" },
    { id: "cash-a", name: "Unallocated A", account_type: "checking", balance: 2100, cash_purpose: "unallocated" },
  ];
  raw.debts = ["debt-b", "debt-a"].map((id) => ({
    id, name: id, debt_type: "credit_card", current_balance: 900,
    minimum_payment: 0, interest_rate: 20,
  }));
  raw.goals = [
    { id: "goal-b", name: "Required B", target_amount: 700, current_amount: 0, target_date: "2026-10-01", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" },
    { id: "goal-a", name: "Required A", target_amount: 700, current_amount: 0, target_date: "2026-10-01", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" },
  ];

  const baseline = authoritativeDestinations(runMoneyPriorityEngine(structuredClone(raw), "2026-09-01"));
  for (const keys of [
    ["retirementAccounts", "debts", "goals", "accounts", "income", "expenses"],
    ["goals", "income", "accounts"],
    ["retirementAccounts", "debts", "expenses"],
  ] as const) {
    const permutation = structuredClone(raw);
    for (const key of keys) permutation[key]!.reverse();
    assert.deepEqual(authoritativeDestinations(runMoneyPriorityEngine(permutation, "2026-09-01")), baseline);
  }
});

test("cross-module retirement ledger preserves reserve, debt, and required-goal flow", () => {
  const raw = retirementRaw(1200, 125);
  useSharedHsaCapacity(raw, 1200, 125);
  addDeployableCash(raw, 5000);
  raw.debts = [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 500, minimum_payment: 0, interest_rate: 20 }];
  raw.goals = [{ id: "required", name: "Required repair", target_amount: 600, current_amount: 0, target_date: "2026-10-01", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" }];
  const result = runMoneyPriorityEngine(raw, "2026-09-01");
  const claims = retirementClaims(result);
  assert.ok(claims.total <= 1200);
  assert.ok(result.existingCash.deployments.some((item) => item.category === "debt" && item.relatedEntityId === "card"));
  assert.ok(result.existingCash.deployments.some((item) => item.category === "goal" && item.relatedEntityId === "required"));
  assert.ok(result.build.retirement.recommendedMonthlyIncrease > 0);
  assert.ok(retirementCapacityInvariantHolds(result.retirementCapacityLedger));
});
