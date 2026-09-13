import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBuildStage } from "./money-priority-build.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import { consumeRetirementCapacity, consumeRetirementCapacityForEqualOwnerTie, createRetirementCapacityLedger, remainingRetirementCapacity, retirementCapacityInvariantHolds } from "./money-priority-retirement-capacity.ts";

function scenario() {
  return buildMoneyPrioritySnapshot({
    householdId: "ffh-013",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 0, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 10000 },
  });
}

function buildRoutingScenario() {
  return buildMoneyPrioritySnapshot({
    householdId: "ffh-013-build",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000.01, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 0, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    income: [
      { id: "income-a", owner_person_id: "a", name: "Job", monthly_amount: 5000, monthly_gross_amount: 10000, is_active: true },
    ],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    preferences: {
      tax_profile_year: 2026,
      tax_filing_status: "married_filing_jointly",
      estimated_modified_agi: 10000.01,
      retirement_spending_basis: "today_dollars",
    },
  });
}

function withFacts(compA: number | null, compB: number | null, ytdA: number | null, ytdB: number | null, reverse = false) {
  const value = scenario();
  const people = value.people.map((person) => ({ ...person, estimatedTaxableCompensationAnnual: person.id === "a" ? compA : compB }));
  const accounts = value.retirementAccounts.map((account) => ({ ...account, employeeContributedYtd: account.ownerPersonId === "a" ? ytdA : ytdB }));
  return { ...value, people: reverse ? [...people].reverse() : people, retirementAccounts: reverse ? [...accounts].reverse() : accounts };
}

test("MFJ scarce compensation exposes owner-conditional maxima without sorted-owner preallocation", () => {
  const result = evaluateRetirementAccountOpportunities(scenario());
  const room = Object.fromEntries(result.opportunities.map((item) => [item.ownerPersonId, item.remainingAnnualRoom]));
  assert.deepEqual(room, { a: 7500, b: 7500 });
  assert.deepEqual([...new Set(result.opportunities.map((item) => item.sharedCapacityRemainingRoom))], [10000]);
});

test("actual asymmetric YTD consumes the shared ledger exactly once", () => {
  const result = evaluateRetirementAccountOpportunities(withFacts(10000, 0, 7500, 0));
  const room = Object.fromEntries(result.opportunities.map((item) => [item.ownerPersonId, item.remainingAnnualRoom]));
  assert.deepEqual(room, { a: 0, b: 2500 });
  const ledger = createRetirementCapacityLedger(result);
  // Shared and owner ledgers must both preserve the conditional room.
  assert.equal(consumeRetirementCapacity(ledger, "ira-b", "build", 5000).consumedAnnualAmount, 2500);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), 0);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("both partial YTD and exact joint-compensation exhaustion are conserved", () => {
  const partial = evaluateRetirementAccountOpportunities(withFacts(10000, 0, 2500, 2500));
  assert.deepEqual(partial.opportunities.map((item) => item.remainingAnnualRoom), [5000, 5000]);
  const exhausted = evaluateRetirementAccountOpportunities(withFacts(10000, 0, 5000, 5000));
  assert.deepEqual(exhausted.opportunities.map((item) => item.remainingAnnualRoom), [0, 0]);
});

test("higher-compensation spouse keeps the own-compensation ceiling while lower spouse receives conditional room", () => {
  const result = evaluateRetirementAccountOpportunities(withFacts(6000, 4000, 0, 0));
  assert.deepEqual(result.opportunities.map((item) => item.remainingAnnualRoom), [6000, 7500]);
  assert.deepEqual(result.opportunities.map((item) => item.sharedCapacityRemainingRoom), [10000, 10000]);
});

test("missing spouse IRA inventory and unknown YTD are targeted rather than inferred as zero", () => {
  const noSpouseAccount = scenario();
  noSpouseAccount.retirementAccounts = noSpouseAccount.retirementAccounts.filter((item) => item.ownerPersonId === "a");
  const absent = evaluateRetirementAccountOpportunities(noSpouseAccount).opportunities[0]!;
  assert.equal(absent.state, "more_information_needed");
  assert.equal(absent.remainingAnnualRoom, null);
  assert.ok(absent.missingData.some((item) => item.includes("absence of a recorded IRA account")));
  const unknown = evaluateRetirementAccountOpportunities(withFacts(10000, 0, 0, null));
  assert.ok(unknown.opportunities.every((item) => item.state === "more_information_needed"));
});

test("possible supported excess clamps additional room and warns without correction advice", () => {
  const result = evaluateRetirementAccountOpportunities(withFacts(4000, 2000, 5000, 6000));
  assert.ok(result.opportunities.every((item) => item.remainingAnnualRoom === 0));
  assert.ok(result.warnings.some((item) => item.includes("exceed supported joint compensation")));
  assert.ok(result.warnings.some((item) => item.includes("supported owner compensation ceiling")));
});

test("person and account input order cannot change owner results or shared identity", () => {
  const summarize = (reverse: boolean) => evaluateRetirementAccountOpportunities(withFacts(10000, 0, 2500, 0, reverse)).opportunities
    .map((item) => ({ owner: item.ownerPersonId, room: item.remainingAnnualRoom, group: item.sharedCapacityGroup }))
    .sort((left, right) => left.owner!.localeCompare(right.owner!));
  assert.deepEqual(summarize(false), summarize(true));
});

test("one-cent shared remainder is consumed once with stable final-cent handling", () => {
  const result = evaluateRetirementAccountOpportunities(withFacts(10000.01, 0, 0, 0));
  const ledger = createRetirementCapacityLedger(result);
  assert.equal(consumeRetirementCapacity(ledger, "ira-a", "build", 5000).consumedAnnualAmount, 5000);
  assert.equal(consumeRetirementCapacity(ledger, "ira-b", "build", 5000.01).consumedAnnualAmount, 5000.01);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), 0);
  assert.equal(remainingRetirementCapacity(ledger, "ira-b"), 0);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("financially tied spouse routes use equal fulfillment and stable final-cent assignment", () => {
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(withFacts(10000.01, 0, 0, 0)));
  const allocations = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-b", "ira-a"], "build", 5000.01);
  assert.deepEqual(allocations.map((item) => [item.accountId, item.consumedAnnualAmount]), [["ira-a", 2500.01], ["ira-b", 2500]]);
  assert.equal(ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))?.remainingAnnualRoom, 5000);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("A01 annual tied demand is capped to the common shared group before equal fulfillment", () => {
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(withFacts(10000.01, 0, 0, 0)));
  const allocations = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-b", "ira-a"], "one_time", 15000);
  assert.deepEqual(allocations.map((item) => [item.accountId, item.consumedAnnualAmount]), [
    ["ira-a", 5000.01],
    ["ira-b", 5000],
  ]);
  assert.equal(allocations.reduce((sum, item) => sum + item.consumedAnnualAmount, 0), 10000.01);
  assert.equal(ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))?.remainingAnnualRoom, 0);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("A01 account-ID reversal changes only the unavoidable final cent", () => {
  const allocate = (ids: [string, string]) => {
    const value = withFacts(10000.01, 0, 0, 0);
    value.retirementAccounts[0]!.id = ids[0];
    value.retirementAccounts[1]!.id = ids[1];
    const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(value));
    return consumeRetirementCapacityForEqualOwnerTie(ledger, [...ids].reverse(), "windfall", 15000)
      .map((item) => ({ owner: ledger.entries.find((entry) => entry.accountId === item.accountId)!.ownerPersonId, amount: item.consumedAnnualAmount }))
      .sort((a, b) => a.owner!.localeCompare(b.owner!));
  };
  const ordinary = allocate(["ira-a", "ira-b"]);
  const reversed = allocate(["z-ira-a", "a-ira-b"]);
  assert.equal(ordinary.reduce((sum, item) => sum + item.amount, 0), 10000.01);
  assert.equal(reversed.reduce((sum, item) => sum + item.amount, 0), 10000.01);
  assert.ok(Math.abs(Math.round(ordinary[0]!.amount * 100) - Math.round(ordinary[1]!.amount * 100)) <= 1);
  assert.ok(Math.abs(Math.round(reversed[0]!.amount * 100) - Math.round(reversed[1]!.amount * 100)) <= 1);
});

test("A02 zero YTD active monthly IRA schedule reserves planning room without becoming YTD", () => {
  const value = withFacts(10000, 0, 0, 0);
  value.retirementAccounts[0]!.monthlyEmployeeContribution = 625;
  const opportunities = evaluateRetirementAccountOpportunities(value);
  assert.equal(opportunities.opportunities[0]!.contributedYtd, 0);
  assert.equal(opportunities.opportunities[0]!.planningReservationAnnual, 7500);
  const ledger = createRetirementCapacityLedger(opportunities);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), 0);
  assert.equal(remainingRetirementCapacity(ledger, "ira-b"), 2500);
  assert.equal(ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))?.consumed.scheduled, 7500);
});

test("A02 partial YTD is not double-counted with the active annual schedule", () => {
  const value = withFacts(10000, 0, 2500, 0);
  value.retirementAccounts[0]!.monthlyEmployeeContribution = 625;
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(value));
  assert.equal(ledger.entries.find((item) => item.accountId === "ira-a")?.plannedReservationAnnual, 5000);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), 0);
  assert.equal(remainingRetirementCapacity(ledger, "ira-b"), 2500);
});

test("A02 both spouses and multiple IRA accounts reserve each owner schedule exactly once", () => {
  const value = withFacts(10000, 0, 0, 0);
  value.retirementAccounts[0]!.monthlyEmployeeContribution = 200;
  value.retirementAccounts[1]!.monthlyEmployeeContribution = 200;
  value.retirementAccounts.push({ ...value.retirementAccounts[0]!, id: "roth-a", name: "A Roth", type: "roth_ira", monthlyEmployeeContribution: 112.5, employeeContributedYtd: 0 });
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(value));
  const shared = ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  assert.equal(shared.consumed.scheduled, 6150);
  assert.equal(shared.remainingAnnualRoom, 3850);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), 3750);
  assert.equal(remainingRetirementCapacity(ledger, "roth-a"), 3750);
  assert.equal(remainingRetirementCapacity(ledger, "ira-b"), 3850);
});

test("A02 staged Existing Cash, Build, and Windfall consumers cannot reuse scheduled capacity", () => {
  const value = withFacts(10000, 0, 0, 0);
  value.retirementAccounts[0]!.monthlyEmployeeContribution = 500;
  const ledger = createRetirementCapacityLedger(evaluateRetirementAccountOpportunities(value));
  const existingCash = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "one_time", 2000);
  const build = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "build", 2000);
  const windfall = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "windfall", 2000);
  const routed = [...existingCash, ...build, ...windfall].reduce((sum, item) => sum + item.consumedAnnualAmount, 0);
  const shared = ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  assert.equal(shared.consumed.scheduled, 6000);
  assert.equal(routed, 4000);
  assert.equal(shared.remainingAnnualRoom, 0);
  assert.equal(shared.consumed.scheduled + routed, shared.originalRemainingAnnualRoom);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("A03 authoritative YTD creates and enforces the shared feasible set after pre-YTD equality", () => {
  const summarize = (reverse: boolean) => evaluateRetirementAccountOpportunities(withFacts(10000, 5000, 8000, 0, reverse));
  for (const result of [summarize(false), summarize(true)]) {
    assert.ok(result.opportunities.every((item) => item.remainingAnnualRoom === 0));
    assert.ok(result.opportunities.every((item) => item.sharedCapacityGroup?.startsWith("ira:mfj-compensation:")));
    assert.ok(result.warnings.some((item) => item.includes("owner compensation ceiling")));
  }
});

test("A04 owner-only excess for either spouse and joint excess fail closed for the pair", () => {
  const higherOwnerExcess = evaluateRetirementAccountOpportunities(withFacts(4000, 2000, 5000, 0));
  assert.ok(higherOwnerExcess.opportunities.every((item) => item.remainingAnnualRoom === 0));
  assert.ok(higherOwnerExcess.warnings.some((item) => item.includes("A's") && item.includes("owner compensation ceiling")));

  const lowerOwnerExcess = evaluateRetirementAccountOpportunities(withFacts(10000, 2000, 0, 8000));
  assert.ok(lowerOwnerExcess.opportunities.every((item) => item.remainingAnnualRoom === 0));
  assert.ok(lowerOwnerExcess.warnings.some((item) => item.includes("B's") && item.includes("owner compensation ceiling")));

  const jointExcess = evaluateRetirementAccountOpportunities(withFacts(4000, 2000, 4000, 3000));
  assert.ok(jointExcess.opportunities.every((item) => item.remainingAnnualRoom === 0));
  assert.ok(jointExcess.warnings.some((item) => item.includes("exceed supported joint compensation")));
});

test("A05 household-facing reasons identify conditional maxima as non-additive", () => {
  const result = evaluateRetirementAccountOpportunities(withFacts(10000, 0, 0, 0));
  assert.deepEqual(result.opportunities.map((item) => item.remainingAnnualRoom), [7500, 7500]);
  assert.ok(result.opportunities.every((item) => item.reasons.some((reason) => reason.includes("conditional, not additive") && reason.includes("$10000.00"))));
  const ledger = createRetirementCapacityLedger(result);
  assert.equal(ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))?.remainingAnnualRoom, 10000);
  assert.equal(consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "one_time", 15000)
    .reduce((sum, item) => sum + item.consumedAnnualAmount, 0), 10000);
});

test("A05 household recommendation cannot present two conditional maxima as additive room", () => {
  const engine = runMoneyPriorityEngine({
    householdId: "ffh-013-a05",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 0, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income", monthly_amount: 5000, monthly_gross_amount: 6000, is_active: true }],
    expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 10000 },
  }, "2026-08-29");
  const recommendation = engine.recommendations.find((item) => item.id === "build-retirement-account-options");
  assert.ok(recommendation?.explanation.includes("conditional and non-additive"));
  assert.ok(recommendation?.explanation.includes("shared MFJ compensation capacity"));
  assert.ok(!recommendation?.explanation.includes("$15000.00 of planning room remaining"));
});

test("FFH-013-M01 Build recurring routes reconcile exactly at the $10,000.01 shared-pool boundary", () => {
  const result = evaluateBuildStage(buildRoutingScenario(), "2026-08-29");
  const retirementAllocation = result.allocations.find((item) => item.category === "retirement");
  const routes = [...result.retirementAccountAllocations].sort((a, b) => a.accountId.localeCompare(b.accountId));
  const routedMonthly = Math.round(routes.reduce((sum, route) => sum + route.allocatedMonthlyAmount, 0) * 100) / 100;
  const routedAnnual = Math.round(routes.reduce((sum, route) => sum + route.allocatedAnnualAmount, 0) * 100) / 100;

  assert.equal(retirementAllocation?.allocatedMonthlyAmount, 833.33);
  assert.equal(routedMonthly, retirementAllocation?.allocatedMonthlyAmount);
  assert.deepEqual(routes.map((route) => [route.accountId, route.allocatedMonthlyAmount, route.allocatedAnnualAmount]), [
    ["ira-a", 416.67, 5000.04],
    ["ira-b", 416.66, 4999.92],
  ]);
  assert.equal(routedAnnual, 9999.96);
  assert.equal(result.retirementCapacityLedger.groups.find((group) => group.id.startsWith("ira:mfj-compensation:"))?.remainingAnnualRoom, 0.05);
  assert.ok(retirementCapacityInvariantHolds(result.retirementCapacityLedger));

  const reordered = buildRoutingScenario();
  const reorderedResult = evaluateBuildStage({
    ...reordered,
    retirementAccounts: [...reordered.retirementAccounts].reverse(),
  }, "2026-08-29");
  const reorderedRoutes = [...reorderedResult.retirementAccountAllocations]
    .sort((a, b) => a.accountId.localeCompare(b.accountId));
  assert.equal(
    reorderedResult.allocations.find((item) => item.category === "retirement")?.allocatedMonthlyAmount,
    retirementAllocation?.allocatedMonthlyAmount,
  );
  assert.deepEqual(reorderedRoutes, routes);
});

test("multiple Traditional and Roth accounts cannot multiply either owner's or household room", () => {
  const value = withFacts(10000, 0, 1000, 500);
  value.retirementAccounts.push(
    { ...value.retirementAccounts[0]!, id: "roth-a", name: "A Roth", type: "roth_ira", employeeContributedYtd: 500 },
    { ...value.retirementAccounts[1]!, id: "roth-b", name: "B Roth", type: "roth_ira", employeeContributedYtd: 500 },
  );
  const result = evaluateRetirementAccountOpportunities(value);
  const ledger = createRetirementCapacityLedger(result);
  assert.equal(consumeRetirementCapacity(ledger, "ira-a", "one_time", 6000).consumedAnnualAmount, 6000);
  assert.equal(consumeRetirementCapacity(ledger, "roth-a", "build", 1000).consumedAnnualAmount, 0);
  assert.equal(consumeRetirementCapacity(ledger, "ira-b", "build", 3000).consumedAnnualAmount, 1500);
  assert.equal(consumeRetirementCapacity(ledger, "roth-b", "windfall", 1000).consumedAnnualAmount, 0);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});
