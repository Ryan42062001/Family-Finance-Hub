import assert from "node:assert/strict";
import test from "node:test";

import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import {
  consumeRetirementCapacity,
  createRetirementCapacityLedger,
  remainingRetirementCapacity,
  retirementCapacityInvariantHolds,
} from "./money-priority-retirement-capacity.ts";

const YEAR = 2026;

function person(id: string, relationship = "self", birthDate = "1990-01-01") {
  return {
    id,
    display_name: id.toUpperCase(),
    relationship,
    birth_date: birthDate,
    estimated_taxable_compensation_annual: 100000,
    covered_by_workplace_retirement_plan: false,
    is_dependent: false,
    is_active: true,
  };
}

function hsaAccount(id: string, owner: string, employeeYtd = 0, employerYtd = 0, taxYear: number | null = YEAR) {
  return {
    id,
    owner_person_id: owner,
    name: id,
    account_type: "hsa",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: employeeYtd,
    employer_contributed_ytd: employerYtd,
    hsa_ytd_tax_year: taxYear,
    hsa_eligible: true,
    hsa_coverage_type: "family",
    match_status: "not_offered",
  };
}

function profile(id: string, options: { medicare?: string | null; lastMonth?: "not_elected" | "elected" | "unknown"; testing?: "not_applicable" | "pending" | "satisfied" | "failed" | "unknown" } = {}) {
  return {
    id: `profile-${id}`,
    person_id: id,
    tax_year: YEAR,
    medicare_effective_on: options.medicare ?? null,
    last_month_rule_status: options.lastMonth ?? "not_elected",
    testing_period_status: options.testing ?? "not_applicable",
    data_version: 1,
  };
}

function months(id: string, values: Array<{ eligibility?: "eligible" | "ineligible" | "unknown"; coverage?: "self_only" | "family" | "none" | "unknown"; evidence?: "confirmed" | "planning_assumption" | "unknown" }> = []) {
  return Array.from({ length: 12 }, (_, index) => {
    const item = values[index] ?? {};
    return {
      id: `month-${id}-${index + 1}`,
      person_id: id,
      tax_year: YEAR,
      month: index + 1,
      eligibility_status: item.eligibility ?? "eligible",
      coverage_status: item.coverage ?? "self_only",
      evidence_status: item.evidence ?? "confirmed",
    };
  });
}

function raw(options: {
  people?: Record<string, unknown>[];
  accounts?: Record<string, unknown>[];
  profiles?: Record<string, unknown>[];
  months?: Record<string, unknown>[];
  allocations?: Record<string, unknown>[];
  authorities?: Record<string, unknown>[];
} = {}): MoneyPriorityRawSnapshot {
  return {
    householdId: "ffh-012",
    people: options.people ?? [person("a")],
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: options.accounts ?? [hsaAccount("hsa-a", "a")],
    hsaTaxYearProfiles: options.profiles ?? [profile("a")],
    hsaMonthStatuses: options.months ?? months("a"),
    hsaMarriedAllocations: options.allocations ?? [],
    hsaLegalSpouseAuthorities: options.authorities ?? [],
    preferences: { tax_profile_year: YEAR, tax_filing_status: "single", estimated_modified_agi: 100000 },
  };
}

function opportunity(input: MoneyPriorityRawSnapshot, id = "hsa-a") {
  return evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities.find((item) => item.accountId === id)!;
}

function married(options: { aYtd?: number; bYtd?: number; aBirth?: string; bBirth?: string; accounts?: Record<string, unknown>[]; allocations?: Record<string, unknown>[] } = {}) {
  const aYtd = options.aYtd ?? 0;
  const bYtd = options.bYtd ?? 0;
  return raw({
    people: [person("a", "self", options.aBirth ?? "1990-01-01"), person("b", "spouse_partner", options.bBirth ?? "1990-01-01")],
    accounts: options.accounts ?? [hsaAccount("hsa-a", "a", aYtd), hsaAccount("hsa-b", "b", bYtd)],
    profiles: [profile("a"), profile("b")],
    months: [...months("a", Array.from({ length: 12 }, () => ({ coverage: "family" as const }))), ...months("b", Array.from({ length: 12 }, () => ({ coverage: "family" as const })))],
    allocations: options.allocations,
    authorities: [{ id: "authority", tax_year: YEAR, person_one_id: "a", person_two_id: "b", authority_status: "confirmed_legal_spouses", confirmation_source: "explicit_household_confirmation", confirmed_at: "2026-01-01T00:00:00.000Z", data_version: 1 }],
  });
}

test("full-year self-only capacity uses tax-year-bound employee plus employer YTD", () => {
  const value = opportunity(raw({ accounts: [hsaAccount("hsa-a", "a", 1000, 400)] }));
  assert.equal(value.annualLimit, 4400);
  assert.equal(value.contributedYtd, 1400);
  assert.equal(value.remainingAnnualRoom, 3000);
  assert.equal(value.hsaCapacityBasis, "period_aware");
});

test("partial-year eligibility prorates the ordinary limit instead of using a legacy annual boolean", () => {
  const statuses = months("a", Array.from({ length: 12 }, (_, index) => index < 6 ? {} : { eligibility: "ineligible" as const, coverage: "none" as const }));
  const value = opportunity(raw({ months: statuses }));
  assert.equal(value.annualLimit, 2200);
  assert.equal(value.remainingAnnualRoom, 2200);
});

test("coverage changes are month-sensitive", () => {
  const statuses = months("a", Array.from({ length: 12 }, (_, index) => ({ coverage: index < 6 ? "self_only" as const : "family" as const })));
  assert.equal(opportunity(raw({ months: statuses })).annualLimit, 6575);
});

test("Medicare effective August removes August through December capacity and can expose excess", () => {
  const input = raw({ accounts: [hsaAccount("hsa-a", "a", 3000)], profiles: [profile("a", { medicare: "2026-08-01" })] });
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  const value = result.opportunities[0]!;
  assert.equal(value.annualLimit, 2566.67);
  assert.equal(value.remainingAnnualRoom, 0);
  assert.ok(result.warnings.some((item) => item.includes("possible_excess_hsa_contribution")));
});

test("last-month rule is never inferred and explicit election is conditional", () => {
  const late = Array.from({ length: 12 }, (_, index) => index === 11 ? { eligibility: "eligible" as const, coverage: "self_only" as const } : { eligibility: "ineligible" as const, coverage: "none" as const });
  const ordinary = opportunity(raw({ profiles: [profile("a", { lastMonth: "not_elected" })], months: months("a", late) }));
  assert.equal(ordinary.annualLimit, 366.67);
  const conditionalResult = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(raw({ profiles: [profile("a", { lastMonth: "elected", testing: "pending" })], months: months("a", late) })));
  assert.equal(conditionalResult.opportunities[0]?.annualLimit, 4400);
  assert.equal(conditionalResult.opportunities[0]?.hsaCapacityBasis, "conditional_last_month_rule");
  assert.ok(conditionalResult.warnings.some((item) => item.includes("hsa_conditional_last_month_rule_testing_period")));
});

test("failed last-month testing period recomputes ordinary capacity", () => {
  const late = Array.from({ length: 12 }, (_, index) => index === 11 ? { eligibility: "eligible" as const, coverage: "self_only" as const } : { eligibility: "ineligible" as const, coverage: "none" as const });
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(raw({ profiles: [profile("a", { lastMonth: "elected", testing: "failed" })], months: months("a", late) })));
  assert.equal(result.opportunities[0]?.annualLimit, 366.67);
  assert.ok(result.warnings.some((item) => item.includes("testing_period_failed")));
});

test("unknown material month produces targeted information-needed and legacy hints do not rescue it", () => {
  const statuses = months("a");
  statuses[4] = { ...statuses[4], eligibility_status: "unknown", coverage_status: "unknown", evidence_status: "unknown" };
  const value = opportunity(raw({ months: statuses }));
  assert.equal(value.state, "more_information_needed");
  assert.equal(value.remainingAnnualRoom, null);
  assert.ok(value.missingData.some((item) => item.includes("month 5")));
});

test("HSA YTD from another tax year is not treated as current-year legal authority", () => {
  const value = opportunity(raw({ accounts: [hsaAccount("hsa-a", "a", 1000, 0, 2025)] }));
  assert.equal(value.state, "more_information_needed");
  assert.equal(value.contributedYtd, null);
  assert.ok(value.missingData.some((item) => item.includes("not bound to tax year 2026")));
});

test("married family defaults to equal ordinary allocation", () => {
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(married()));
  const a = result.opportunities.find((item) => item.accountId === "hsa-a")!;
  const b = result.opportunities.find((item) => item.accountId === "hsa-b")!;
  assert.equal(a.annualLimit, 4375);
  assert.equal(b.annualLimit, 4375);
  assert.equal(a.sharedCapacityRemainingRoom, 8750);
  assert.equal(b.sharedCapacityRemainingRoom, 8750);
});

test("partial-year married equal allocation never creates a legal cent", () => {
  const input = married();
  input.hsaMonthStatuses = [
    ...months("a", Array.from({ length: 12 }, (_, index) => index < 7
      ? { coverage: "family" as const }
      : { eligibility: "ineligible" as const, coverage: "none" as const })),
    ...months("b", Array.from({ length: 12 }, (_, index) => index < 7
      ? { coverage: "family" as const }
      : { eligibility: "ineligible" as const, coverage: "none" as const })),
  ];
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  const a = result.opportunities.find((item) => item.accountId === "hsa-a")!;
  const b = result.opportunities.find((item) => item.accountId === "hsa-b")!;
  assert.equal(a.annualLimit, 2552.08);
  assert.equal(b.annualLimit, 2552.09);
  assert.equal(a.annualLimit! + b.annualLimit!, 5104.17);
  assert.equal(a.sharedCapacityRemainingRoom, 5104.17);
  assert.equal(b.sharedCapacityRemainingRoom, 5104.17);
});

test("Build aggregate monthly retirement allocation exactly equals routed account allocations", () => {
  const input = married();
  input.income = [{
    id: "income", name: "Income", monthly_amount: 10000,
    monthly_gross_amount: 10000, is_active: true,
  }];
  input.expenses = [];
  const result = runMoneyPriorityEngine(input, "2026-01-01");
  const aggregate = result.build.allocations.find((item) => item.category === "retirement")?.allocatedMonthlyAmount;
  const routed = result.build.retirementAccountAllocations.reduce(
    (sum, item) => Math.round((sum + item.allocatedMonthlyAmount) * 100) / 100,
    0,
  );
  assert.equal(aggregate, 729.16);
  assert.equal(routed, 729.16);
  assert.equal(result.build.unresolvedRetirementMonthlyAmount, 470.84);
});

test("confirmed non-spouse partners are evaluated independently", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities![0]!.authority_status = "confirmed_not_legal_spouses";
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  const hsas = result.opportunities.filter((item) => item.accountType === "hsa");
  assert.deepEqual(hsas.map((item) => item.annualLimit), [8750, 8750]);
  assert.deepEqual(hsas.map((item) => item.sharedCapacityGroup), ["hsa:a", "hsa:b"]);
});

test("missing legal-spouse authority blocks material family sharing", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities = [];
  const hsas = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
  assert.ok(hsas.every((item) => item.state === "more_information_needed"));
  assert.ok(hsas.every((item) => item.missingData.some((message) => message.includes("Legal-spouse authority"))));
});

test("MFJ filing status cannot create legal-spouse authority", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities = [];
  input.preferences = { ...input.preferences, tax_filing_status: "married_filing_jointly" };
  assert.ok(evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities
    .every((item) => item.state === "more_information_needed"));
});

test("single filing status cannot erase affirmative legal-spouse authority", () => {
  const input = married();
  input.preferences = { ...input.preferences, tax_filing_status: "single" };
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  assert.deepEqual(result.opportunities.map((item) => item.annualLimit), [4375, 4375]);
  assert.ok(result.warnings.some((message) => message.includes("hsa_legal_spouse_filing_status_mismatch")));
});

test("MFJ filing status cannot override confirmed non-spouse authority", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities![0]!.authority_status = "confirmed_not_legal_spouses";
  input.preferences = { ...input.preferences, tax_filing_status: "married_filing_jointly" };
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  assert.deepEqual(result.opportunities.map((item) => item.annualLimit), [8750, 8750]);
  assert.ok(result.warnings.some((message) => message.includes("hsa_non_spouse_filing_status_mismatch")));
});

test("married allocation cannot create authority", () => {
  const input = married({ allocations: [{ id: "alloc", tax_year: YEAR, person_one_id: "a", person_two_id: "b", person_one_ordinary_amount: 6000, person_two_ordinary_amount: 2750 }] });
  input.hsaLegalSpouseAuthorities = [];
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  assert.ok(result.opportunities.every((item) => item.state === "more_information_needed"));
  assert.ok(result.warnings.some((message) => message.includes("hsa_married_allocation_without_spouse_authority")));
});

test("unknown spouse authority preserves independently supported self-only capacity", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities = [];
  input.hsaMonthStatuses = [...months("a"), ...months("b")];
  const hsas = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
  assert.deepEqual(hsas.map((item) => item.annualLimit), [4400, 4400]);
  assert.ok(hsas.every((item) => item.state === "available"));
});

test("unknown authority blocks only spouse-dependent HSA routes", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities = [];
  input.retirementAccounts!.push({ id: "ira-a", owner_person_id: "a", name: "IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered" });
  const opportunities = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
  assert.ok(opportunities.filter((item) => item.accountType === "hsa").every((item) => item.state === "more_information_needed"));
  assert.equal(opportunities.find((item) => item.accountId === "ira-a")?.state, "available");
});

test("legal-spouse authority is isolated to its HSA tax year", () => {
  const input = married();
  input.hsaLegalSpouseAuthorities![0]!.tax_year = 2025;
  const hsas = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
  assert.ok(hsas.every((item) => item.state === "more_information_needed"));
});

test("pair and person input order cannot change affirmative spouse results", () => {
  const first = married();
  const second = married();
  second.people = [...second.people!].reverse();
  second.retirementAccounts = [...second.retirementAccounts!].reverse();
  second.hsaTaxYearProfiles = [...second.hsaTaxYearProfiles!].reverse();
  second.hsaMonthStatuses = [...second.hsaMonthStatuses!].reverse();
  const summarize = (input: MoneyPriorityRawSnapshot) => evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities
    .map((item) => ({ id: item.accountId, limit: item.annualLimit, group: item.sharedCapacityGroup, state: item.state }))
    .sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(summarize(first), summarize(second));
});

test("authority change invalidates stale shared-family recommendations", () => {
  const beforeRaw = married();
  beforeRaw.income = [{ id: "income", name: "Income", monthly_amount: 10000, monthly_gross_amount: 10000, is_active: true }];
  const afterRaw = structuredClone(beforeRaw);
  afterRaw.hsaLegalSpouseAuthorities![0]!.authority_status = "confirmed_not_legal_spouses";
  const before = runMoneyPriorityEngine(beforeRaw, "2026-01-01");
  const after = runMoneyPriorityEngine(afterRaw, "2026-01-01");
  const refresh = assessRecommendationRefresh(before, after);
  assert.notEqual(refresh.state, "current");
  assert.notDeepEqual(after.retirementCapacityLedger.groups, before.retirementCapacityLedger.groups);
});

test("explicit alternate married allocation is tax-year-bound and owner-specific", () => {
  const allocation = { id: "alloc", tax_year: YEAR, person_one_id: "a", person_two_id: "b", person_one_ordinary_amount: 6000, person_two_ordinary_amount: 2750 };
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(married({ allocations: [allocation] })));
  assert.equal(result.opportunities.find((item) => item.accountId === "hsa-a")?.annualLimit, 6000);
  assert.equal(result.opportunities.find((item) => item.accountId === "hsa-b")?.annualLimit, 2750);
});

test("age-55 catch-up is prorated by eligible months and remains owner-specific", () => {
  const input = married({ aBirth: "1970-01-01" });
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input));
  assert.equal(result.opportunities.find((item) => item.accountId === "hsa-a")?.annualLimit, 5375);
  assert.equal(result.opportunities.find((item) => item.accountId === "hsa-b")?.annualLimit, 4375);
  assert.equal(result.opportunities.find((item) => item.accountId === "hsa-a")?.catchUpAmount, 1000);
});

test("R4 deposit labels are not required once the spouse allocation and owner ceilings are known", () => {
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(married({ aYtd: 4500, bYtd: 1000, aBirth: "1970-01-01" })));
  const a = result.opportunities.find((item) => item.accountId === "hsa-a")!;
  assert.equal(a.state, "available");
  assert.equal(a.remainingAnnualRoom, 875);
  assert.ok(!a.missingData.some((item) => item.includes("ordinary") && item.includes("catch-up")));
});

test("equal default incompatible with YTD asks for an alternate agreement when one could fit", () => {
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(married({ aYtd: 6000, bYtd: 1000 })));
  assert.ok(result.opportunities.every((item) => item.state === "more_information_needed"));
  assert.ok(result.opportunities.every((item) => item.missingData.some((message) => message.includes("alternate allocation could fit"))));
});

test("spouse without an HSA account still participates in married-family legal structure", () => {
  const input = married({ accounts: [hsaAccount("hsa-a", "a", 0)] });
  const a = opportunity(input);
  assert.equal(a.annualLimit, 4375);
  assert.equal(a.remainingAnnualRoom, 4375);
});

test("multiple HSA accounts do not multiply owner or couple capacity across consumers", () => {
  const input = married({ accounts: [hsaAccount("a1", "a", 0), hsaAccount("a2", "a", 0), hsaAccount("b1", "b", 0)] });
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)));
  assert.equal(remainingRetirementCapacity(ledger, "a1"), 4375);
  assert.equal(consumeRetirementCapacity(ledger, "a1", "one_time", 3000).consumedAnnualAmount, 3000);
  assert.equal(remainingRetirementCapacity(ledger, "a2"), 1375);
  assert.equal(consumeRetirementCapacity(ledger, "a2", "build", 3000).consumedAnnualAmount, 1375);
  assert.equal(remainingRetirementCapacity(ledger, "b1"), 4375);
  assert.equal(consumeRetirementCapacity(ledger, "b1", "windfall", 5000).consumedAnnualAmount, 4375);
  assert.equal(retirementCapacityInvariantHolds(ledger), true);
  assert.equal(ledger.groups.find((group) => group.id === "hsa:married-family")?.remainingAnnualRoom, 0);
});

test("equivalent spouse/account input permutations produce the same legal capacity by stable account ID", () => {
  const first = married();
  const second = married();
  second.people = [...(second.people ?? [])].reverse();
  second.retirementAccounts = [...(second.retirementAccounts ?? [])].reverse();
  second.hsaTaxYearProfiles = [...(second.hsaTaxYearProfiles ?? [])].reverse();
  second.hsaMonthStatuses = [...(second.hsaMonthStatuses ?? [])].reverse();
  const summarize = (input: MoneyPriorityRawSnapshot) => evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities
    .filter((item) => item.accountType === "hsa")
    .map((item) => ({ id: item.accountId, annualLimit: item.annualLimit, remaining: item.remainingAnnualRoom, state: item.state }))
    .sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(summarize(first), summarize(second));
});
