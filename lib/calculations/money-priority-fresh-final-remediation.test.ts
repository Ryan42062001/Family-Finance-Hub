import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine as runEngine } from "./money-priority-engine.ts";
import { withNormalizedHsaFacts } from "./hsa-test-fixtures.ts";
import {
  buildMoneyPrioritySnapshot,
  MoneyPrioritySnapshotValidationError,
  parseStrictBoolean,
  type MoneyPriorityRawSnapshot,
} from "./money-priority-snapshot.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";
import {
  deriveRecommendedPlanAllocations,
  evaluateUserPlan,
  type MoneyPlanOverride,
} from "./money-priority-user-plan.ts";

const AS_OF_DATE = "2026-09-01";

const runMoneyPriorityEngine: typeof runEngine = (raw, asOfDate, policy) =>
  runEngine(withNormalizedHsaFacts(raw), asOfDate, policy);

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "fresh-final-remediation",
    people: [{
      id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, estimated_taxable_compensation_annual: 120000,
      covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false,
    }],
    income: [{
      id: "income", owner_person_id: "p1", name: "Salary", monthly_amount: 5000,
      monthly_gross_amount: 10000, is_active: true, is_variable: false,
    }],
    expenses: [{ id: "expense", name: "Essentials", monthly_amount: 4000, is_essential: true }],
    accounts: [{
      id: "reserve", name: "Reserve", account_type: "savings", balance: 12000,
      cash_purpose: "protected_reserve",
    }],
    debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: [{
      id: "ira", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira",
      balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 6300, employer_contributed_ytd: 0, match_status: "not_offered",
    }],
    preferences: {
      emergency_fund_months_override: 3, known_income_disruption: false,
      debt_vs_investing: "balanced", job_replacement_difficulty: "easy",
      desired_retirement_monthly_spending: 5000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000,
    },
  };
}

function addDeployableCash(raw: MoneyPriorityRawSnapshot, deployable: number): void {
  raw.accounts!.push({
    id: "unallocated", name: "Unallocated", account_type: "savings",
    balance: 2000 + deployable, cash_purpose: "unallocated",
  });
}

function windfallRetirement(raw: MoneyPriorityRawSnapshot, amount = 10000) {
  const engine = runMoneyPriorityEngine(withNormalizedHsaFacts(raw), AS_OF_DATE);
  const result = allocateWindfall(engine, {
    amount, source: "gift", taxTreatment: "known_non_taxable",
  });
  const retirement = result.allocations.filter((item) => item.category === "retirement");
  return { engine, result, retirement };
}

function annualEngineClaims(engine: ReturnType<typeof runMoneyPriorityEngine>): number {
  return engine.retirementCapacityLedger.entries.reduce((sum, entry) =>
    sum + entry.consumed.one_time + entry.consumed.secure + entry.consumed.build, 0);
}

function retirementOverride(
  engine: ReturnType<typeof runMoneyPriorityEngine>,
  monthlyAmount: number,
  category: "retirement" | "employer_match" = "retirement",
): MoneyPlanOverride {
  const allocation = deriveRecommendedPlanAllocations(engine).find((item) => item.category === category);
  assert.ok(allocation, `Expected an actionable ${category} allocation.`);
  return { allocationId: allocation.allocationId, monthlyAmount };
}

function roomConflict(result: ReturnType<typeof evaluateUserPlan>): number {
  return result.impacts.find((item) => item.id === "user-plan-retirement-room-conflict")
    ?.retirement?.contributionRoomConflict ?? 0;
}

test("Windfall cannot reopen Roth IRA room exhausted by Build", () => {
  const { engine, retirement } = windfallRetirement(baseRaw());
  assert.equal(engine.build.retirementAccountAllocations[0]?.allocatedMonthlyAmount, 100);
  assert.equal(engine.retirementCapacityLedger.entries.find((item) => item.accountId === "ira")?.remainingAnnualRoom, 0);
  assert.equal(retirement.length, 0);
  assert.equal(annualEngineClaims(engine), 1200);
});

test("Windfall cannot reopen HSA room exhausted by Secure employer match", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [
    { id: "hsa-a", owner_person_id: "p1", name: "Direct HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 7550, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered" },
    { id: "hsa-b", owner_person_id: "p1", name: "Matched HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_fully_captured",
      full_match_employee_contribution_monthly: 300 },
  ];
  const { engine, retirement } = windfallRetirement(raw);
  assert.equal(engine.retirementCapacityLedger.groups.find((item) => item.id === "hsa:p1")?.consumed.secure, 1200);
  assert.equal(retirement.length, 0);
});

test("Windfall cannot reopen room exhausted by existing-cash retirement deployment", () => {
  const raw = baseRaw();
  addDeployableCash(raw, 1200);
  const { engine, retirement } = windfallRetirement(raw);
  assert.equal(engine.existingCash.deployments.find((item) => item.category === "retirement")?.amount, 1200);
  assert.equal(engine.retirementCapacityLedger.entries.find((item) => item.accountId === "ira")?.consumed.one_time, 1200);
  assert.equal(retirement.length, 0);
});

test("Windfall uses only $300 left after Build consumes $900", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 4075;
  const { engine, retirement } = windfallRetirement(raw);
  assert.equal(engine.retirementCapacityLedger.entries.find((item) => item.accountId === "ira")?.consumed.build, 900);
  assert.equal(retirement.reduce((sum, item) => sum + item.allocatedAmount, 0), 300);
});

test("Windfall keeps two IRAs under one owner shared limit", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 4000;
  raw.retirementAccounts = ["ira-a", "ira-b"].map((id) => ({
    id, owner_person_id: "p1", name: id, account_type: id === "ira-a" ? "traditional_ira" : "roth_ira",
    balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
  }));
  const { retirement } = windfallRetirement(raw, 20000);
  assert.equal(retirement.reduce((sum, item) => sum + item.allocatedAmount, 0), 7500);
});

test("Windfall keeps married-family HSA allocations under the shared family limit", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 4000;
  raw.people = [
    { ...raw.people![0], id: "p1", relationship: "self" },
    { ...raw.people![0], id: "p2", relationship: "spouse_partner" },
  ];
  raw.retirementAccounts = ["p1", "p2"].map((owner) => ({
    id: `hsa-${owner}`, owner_person_id: owner, name: owner, account_type: "hsa", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0,
    hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered",
  }));
  const { retirement } = windfallRetirement(raw, 20000);
  assert.equal(retirement.reduce((sum, item) => sum + item.allocatedAmount, 0), 8750);
});

test("one-time use in HSA group does not subtract room from a separate IRA group", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 4000;
  raw.retirementAccounts = [
    { id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 7550, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered" },
    { id: "ira", owner_person_id: "p1", name: "IRA", account_type: "roth_ira", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 6300, employer_contributed_ytd: 0, match_status: "not_offered" },
  ];
  addDeployableCash(raw, 1200);
  const { engine, retirement } = windfallRetirement(raw);
  assert.equal(engine.existingCash.deployments.find((item) => item.category === "retirement")?.relatedEntityId, "hsa");
  assert.equal(retirement.find((item) => item.relatedEntityId === "ira")?.allocatedAmount, 1200);
});

test("catch-up room consumed by Build cannot be reused by Windfall", () => {
  const raw = baseRaw();
  raw.people![0].birth_date = "1970-01-01";
  raw.retirementAccounts![0].employee_contributed_ytd = 7500;
  const { engine, retirement } = windfallRetirement(raw);
  const entry = engine.retirementCapacityLedger.entries.find((item) => item.accountId === "ira")!;
  assert.equal(entry.originalRemainingAnnualRoom, 1100);
  assert.equal(entry.catchUpRemainingRoom, 0);
  assert.equal(retirement.length, 0);
});

test("unknown retirement capacity never becomes a Windfall contribution", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].employee_contributed_ytd = null;
  assert.equal(windfallRetirement(raw).retirement.length, 0);
});

test("large projection shortfall cannot make Windfall exceed final ledger room", () => {
  const raw = baseRaw();
  raw.preferences!.desired_retirement_monthly_spending = 50000;
  raw.income![0].monthly_amount = 4075;
  const { engine, retirement } = windfallRetirement(raw, 100000);
  const windfall = retirement.reduce((sum, item) => sum + item.allocatedAmount, 0);
  assert.ok(engine.build.retirement.recommendedMonthlyIncrease > 1000);
  assert.equal(annualEngineClaims(engine) + windfall, 1200);
});

test("Your Plan treats an override as replacement and detects a two-IRA shared-limit conflict", () => {
  const raw = baseRaw();
  raw.retirementAccounts = ["ira-a", "ira-b"].map((id) => ({
    id, owner_person_id: "p1", name: id, account_type: id === "ira-a" ? "traditional_ira" : "roth_ira",
    balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
  }));
  const engine = runMoneyPriorityEngine(withNormalizedHsaFacts(raw), AS_OF_DATE);
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 1200)]);
  assert.equal(roomConflict(result), 6900);
  assert.equal(result.yourPlan.allocations.find((item) => item.category === "retirement")?.userMonthlyAmount, 1200);
});

test("Your Plan retains one-time IRA use before evaluating replacement recurring amount", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].employee_contributed_ytd = 0;
  addDeployableCash(raw, 5000);
  const engine = runMoneyPriorityEngine(withNormalizedHsaFacts(raw), AS_OF_DATE);
  assert.equal(engine.retirementCapacityLedger.entries[0].consumed.one_time, 5000);
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 625)]);
  assert.equal(roomConflict(result), 5000);
});

test("Your Plan warns when Build exhausted IRA room and override requests more", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].employee_contributed_ytd = 0;
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 1200)]);
  assert.equal(roomConflict(result), 6900);
});

test("an exhausted account exposes no actionable override target", () => {
  const raw = baseRaw();
  addDeployableCash(raw, 1200);
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const result = evaluateUserPlan(engine, [{
    allocationId: "build-retirement-household::retirement::ira", monthlyAmount: 100,
  }]);
  assert.equal(result.overrides.active.length, 0);
  assert.equal(result.overrides.superseded.length + result.overrides.invalid.length, 1);
});

test("Your Plan employer-match override includes room already used by Secure", () => {
  const raw = baseRaw();
  raw.people![0].covered_by_workplace_retirement_plan = true;
  raw.retirementAccounts = [{
    id: "workplace", owner_person_id: "p1", name: "401k", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 23300, employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 120000,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
  }];
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 400, "employer_match")]);
  assert.equal(roomConflict(result), 400);
});

test("Your Plan does not sum duplicate HSA opportunity room", () => {
  const raw = baseRaw();
  raw.retirementAccounts = ["hsa-a", "hsa-b"].map((id) => ({
    id, owner_person_id: "p1", name: id, account_type: "hsa", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0,
    hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered",
  }));
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 1000)]);
  assert.equal(roomConflict(result), 3250);
});

test("Your Plan keeps spouses' separate IRA limits separate", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 5250;
  raw.people = [
    { ...raw.people![0], id: "p1", relationship: "self" },
    { ...raw.people![0], id: "p2", relationship: "spouse_partner" },
  ];
  raw.retirementAccounts = ["p1", "p2"].map((owner) => ({
    id: `ira-${owner}`, owner_person_id: owner, name: owner, account_type: "roth_ira", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
  }));
  raw.preferences = { ...raw.preferences, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 100000 };
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const allocations = deriveRecommendedPlanAllocations(engine).filter((item) => item.category === "retirement");
  const overrides = allocations.map((item) => ({ allocationId: item.allocationId, monthlyAmount: 625 }));
  assert.equal(roomConflict(evaluateUserPlan(engine, overrides)), 0);
});

test("Your Plan respects IRA catch-up and reports only the excess", () => {
  const raw = baseRaw();
  raw.people![0].birth_date = "1970-01-01";
  raw.retirementAccounts![0].employee_contributed_ytd = 0;
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  assert.equal(roomConflict(evaluateUserPlan(engine, [retirementOverride(engine, 700)])), 0);
  assert.equal(roomConflict(evaluateUserPlan(engine, [retirementOverride(engine, 800)])), 1000);
});

test("Your Plan reports unknown additional retirement capacity instead of zero conflict assurance", () => {
  const engine = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE);
  const result = evaluateUserPlan(engine, [], {
    additionalRetirementContributions: [{ accountId: "unknown-account", annualAmount: 1000, source: "other" }],
  });
  assert.ok(result.impacts.some((item) => item.id === "user-plan-retirement-room-unknown"));
  assert.ok(result.warnings.some((item) => item.includes("cannot be verified")));
});

test("valid Your Plan increase within account and shared room has no false warning", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].employee_contributed_ytd = 0;
  raw.income![0].monthly_amount = 4100;
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 500)]);
  assert.equal(roomConflict(result), 0);
  assert.equal(result.warnings.some((item) => item.includes("contribution room")), false);
});

test("Windfall and Your Plan are jointly checked while Recommended Plan remains immutable", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [
    { id: "hsa-a", owner_person_id: "p1", name: "Direct HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 7550, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered" },
    { id: "hsa-b", owner_person_id: "p1", name: "Matched HSA", account_type: "hsa", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_fully_captured",
      full_match_employee_contribution_monthly: 125 },
  ];
  addDeployableCash(raw, 400);
  const engine = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const before = structuredClone(engine);
  const windfall = allocateWindfall(engine, { amount: 10000, source: "gift", taxTreatment: "known_non_taxable" });
  const windfallContributions = windfall.allocations
    .filter((item) => item.category === "retirement" && item.relatedEntityId)
    .map((item) => ({ accountId: item.relatedEntityId!, annualAmount: item.allocatedAmount, source: "windfall" as const }));
  const result = evaluateUserPlan(engine, [retirementOverride(engine, 100)], {
    additionalRetirementContributions: windfallContributions,
  });
  assert.equal(engine.retirementCapacityLedger.entries.reduce((sum, item) => sum + item.consumed.one_time, 0), 400);
  assert.equal(engine.retirementCapacityLedger.entries.reduce((sum, item) => sum + item.consumed.secure, 0), 500);
  assert.equal(engine.retirementCapacityLedger.entries.reduce((sum, item) => sum + item.consumed.build, 0), 300);
  assert.equal(windfallContributions.reduce((sum, item) => sum + item.annualAmount, 0), 0);
  assert.equal(roomConflict(result), 900);
  assert.deepEqual(engine, before);
});

test("strict boolean parser accepts only actual booleans", () => {
  assert.deepEqual(parseStrictBoolean(true), { valid: true, value: true });
  assert.deepEqual(parseStrictBoolean(false), { valid: true, value: false });
  for (const value of [null, undefined, "true", "false", 1, 0, [], {}, ["false"], new Boolean(false)]) {
    assert.equal(parseStrictBoolean(value).valid, false);
  }
});

test("optional-default booleans preserve missing defaults and explicit false", () => {
  const raw = baseRaw();
  delete raw.income![0].is_active;
  delete raw.expenses![0].is_essential;
  const defaults = buildMoneyPrioritySnapshot(raw);
  assert.equal(defaults.income[0].isActive, true);
  assert.equal(defaults.expenses[0].isEssential, true);
  raw.income![0].is_active = false;
  raw.expenses![0].is_essential = false;
  const explicit = buildMoneyPrioritySnapshot(raw);
  assert.equal(explicit.income[0].isActive, false);
  assert.equal(explicit.expenses[0].isEssential, false);
});

test("nullable booleans preserve null and actual false", () => {
  const raw = baseRaw();
  raw.people![0].covered_by_workplace_retirement_plan = null;
  raw.retirementAccounts![0].roth_catch_up_supported = false;
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.people[0].coveredByWorkplaceRetirementPlan, null);
  assert.equal(snapshot.retirementAccounts[0].rothCatchUpSupported, false);
});

const booleanMutations: Array<[string, (raw: MoneyPriorityRawSnapshot, value: unknown) => void]> = [
  ["people[0].covered_by_workplace_retirement_plan", (raw, value) => { raw.people![0].covered_by_workplace_retirement_plan = value; }],
  ["people[0].is_dependent", (raw, value) => { raw.people![0].is_dependent = value; }],
  ["people[0].is_active", (raw, value) => { raw.people![0].is_active = value; }],
  ["income[0].is_variable", (raw, value) => { raw.income![0].is_variable = value; }],
  ["income[0].is_active", (raw, value) => { raw.income![0].is_active = value; }],
  ["expenses[0].is_essential", (raw, value) => { raw.expenses![0].is_essential = value; }],
  ["debts[0].is_past_due", (raw, value) => { raw.debts = [{ id: "d", current_balance: 1, minimum_payment: 0, is_past_due: value }]; }],
  ["debts[0].is_in_collections", (raw, value) => { raw.debts = [{ id: "d", current_balance: 1, minimum_payment: 0, is_in_collections: value }]; }],
  ["debts[0].has_legal_or_tax_priority", (raw, value) => { raw.debts = [{ id: "d", current_balance: 1, minimum_payment: 0, has_legal_or_tax_priority: value }]; }],
  ["debts[0].student_loan_strategy_active", (raw, value) => { raw.debts = [{ id: "d", current_balance: 1, minimum_payment: 0, student_loan_strategy_active: value }]; }],
  ["debts[0].qualified_student_loan_payment_retirement_match_offered", (raw, value) => { raw.debts = [{ id: "d", current_balance: 1, minimum_payment: 0, qualified_student_loan_payment_retirement_match_offered: value }]; }],
  ["retirementAccounts[0].hsa_eligible", (raw, value) => { raw.retirementAccounts![0].hsa_eligible = value; }],
  ["retirementAccounts[0].simple_higher_limit_eligible", (raw, value) => { raw.retirementAccounts![0].simple_higher_limit_eligible = value; }],
  ["retirementAccounts[0].roth_catch_up_supported", (raw, value) => { raw.retirementAccounts![0].roth_catch_up_supported = value; }],
  ["retirementAccounts[0].sep_compensation_calculation_supported", (raw, value) => { raw.retirementAccounts![0].sep_compensation_calculation_supported = value; }],
  ["insuranceExposures[0].is_relevant_to_reserve", (raw, value) => { raw.insuranceExposures = [{ id: "x", is_relevant_to_reserve: value }]; }],
  ["preferences.known_income_disruption", (raw, value) => { raw.preferences!.known_income_disruption = value; }],
  ["preferences.lived_with_spouse_during_tax_year", (raw, value) => { raw.preferences!.lived_with_spouse_during_tax_year = value; }],
];

test("every decision-relevant boolean field rejects coercible raw forms", () => {
  for (const [path, mutate] of booleanMutations) {
    for (const value of ["true", "false", 1, 0, [], {}, ["false"]]) {
      const raw = baseRaw();
      mutate(raw, value);
      assert.throws(() => buildMoneyPrioritySnapshot(raw), (error) =>
        error instanceof MoneyPrioritySnapshotValidationError
          && error.issues.some((issue) => issue.path === path && issue.code === "invalid_boolean"),
      `${path} accepted ${JSON.stringify(value)}`);
    }
  }
});

test("malformed active-income boolean is rejected before fake capacity can be created", () => {
  const raw = baseRaw();
  raw.income![0].is_active = "false";
  assert.throws(() => runMoneyPriorityEngine(raw, AS_OF_DATE), (error) =>
    error instanceof MoneyPrioritySnapshotValidationError
      && error.issues.some((issue) => issue.path === "income[0].is_active" && issue.code === "invalid_boolean"));
});
