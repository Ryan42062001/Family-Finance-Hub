import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import {
  consumeRetirementCapacityForEqualOwnerTie,
  createRetirementCapacityLedger,
  retirementCapacityInvariantHolds,
} from "./money-priority-retirement-capacity.ts";

function rawScenario(
  compA: number,
  compB: number,
  ytdA: number,
  ytdB: number,
  monthlyA = 0,
  monthlyB = 0,
) {
  return {
    householdId: "ffh-013-final-audit",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: compA, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: compB, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: monthlyA, monthly_employer_contribution: 0, employee_contributed_ytd: ytdA, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: monthlyB, monthly_employer_contribution: 0, employee_contributed_ytd: ytdB, employer_contributed_ytd: 0 },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income", monthly_amount: 5000, monthly_gross_amount: 6000, is_active: true }],
    expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    preferences: {
      tax_profile_year: 2026,
      tax_filing_status: "married_filing_jointly",
      estimated_modified_agi: Math.max(1, compA + compB),
      retirement_spending_basis: "today_dollars",
    },
  };
}

function evaluate(
  compA: number,
  compB: number,
  ytdA: number,
  ytdB: number,
  monthlyA = 0,
  monthlyB = 0,
  asOfDate: string | null = null,
  reversePeople = false,
  reverseAccounts = false,
) {
  const snapshot = buildMoneyPrioritySnapshot(rawScenario(compA, compB, ytdA, ytdB, monthlyA, monthlyB));
  return evaluateRetirementAccountOpportunities({
    ...snapshot,
    people: reversePeople ? [...snapshot.people].reverse() : snapshot.people,
    retirementAccounts: reverseAccounts ? [...snapshot.retirementAccounts].reverse() : snapshot.retirementAccounts,
  }, undefined, asOfDate);
}

function ownerRooms(result: ReturnType<typeof evaluateRetirementAccountOpportunities>) {
  return Object.fromEntries(result.opportunities
    .filter((item) => item.accountType === "traditional_ira" || item.accountType === "roth_ira")
    .map((item) => [item.ownerPersonId, item.remainingAnnualRoom]));
}

function mfjGroups(result: ReturnType<typeof evaluateRetirementAccountOpportunities>) {
  return [...new Set(result.opportunities
    .map((item) => item.sharedCapacityGroup)
    .filter((group): group is string => group?.startsWith("ira:mfj-compensation:") === true))];
}

test("T1 non-scarce unequal owner excess remains owner-local", () => {
  const result = evaluate(100000, 50000, 8000, 0);
  assert.deepEqual(ownerRooms(result), { a: 0, b: 7500 });
  assert.deepEqual(mfjGroups(result), []);
  assert.ok(result.warnings.some((warning) => warning.includes("A's") && warning.includes("additional IRA room for this owner is zero")));
});

test("T1 reverse owner excess preserves the unaffected spouse's independent room", () => {
  const result = evaluate(100000, 50000, 0, 8000);
  assert.deepEqual(ownerRooms(result), { a: 7500, b: 0 });
  assert.deepEqual(mfjGroups(result), []);
  assert.ok(result.warnings.some((warning) => warning.includes("B's") && warning.includes("additional IRA room for this owner is zero")));
});

test("T1 person and account order reversal cannot change owner-local non-scarce results", () => {
  const expected = ownerRooms(evaluate(100000, 50000, 8000, 0));
  assert.deepEqual(ownerRooms(evaluate(100000, 50000, 8000, 0, 0, 0, null, true, false)), expected);
  assert.deepEqual(ownerRooms(evaluate(100000, 50000, 8000, 0, 0, 0, null, false, true)), expected);
  assert.deepEqual(ownerRooms(evaluate(100000, 50000, 8000, 0, 0, 0, null, true, true)), expected);
});

test("T1 preserves cleared A03 and A04 scarce unequal fail-closed behavior", () => {
  const a03 = evaluate(10000, 5000, 8000, 0);
  assert.deepEqual(ownerRooms(a03), { a: 0, b: 0 });
  assert.equal(mfjGroups(a03).length, 1);
  assert.ok(a03.warnings.some((warning) => warning.includes("owner compensation ceiling")));

  const a04 = evaluate(4000, 2000, 5000, 0);
  assert.deepEqual(ownerRooms(a04), { a: 0, b: 0 });
  assert.equal(mfjGroups(a04).length, 1);
  assert.ok(a04.warnings.some((warning) => warning.includes("affected shared MFJ group is zero")));
});

test("P03 September active schedule reserves supported future owner room, not twelve-month target minus YTD", () => {
  const result = evaluate(10000, 0, 7000, 0, 500, 0, "2026-09-01");
  const a = result.opportunities.find((item) => item.accountId === "ira-a")!;
  assert.equal(a.contributedYtd, 7000);
  assert.equal(a.remainingAnnualRoom, 500);
  assert.equal(a.planningReservationAnnual, 2000);

  const ledger = createRetirementCapacityLedger(result);
  const entry = ledger.entries.find((item) => item.accountId === "ira-a")!;
  const shared = ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  assert.equal(entry.plannedReservationAnnual, 500);
  assert.equal(shared.consumed.scheduled, 500);
  assert.equal(shared.remainingAnnualRoom, 2500);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("P03 December low-YTD schedule reserves only the remaining current-year month", () => {
  const result = evaluate(10000, 0, 0, 0, 500, 0, "2026-12-01");
  const a = result.opportunities.find((item) => item.accountId === "ira-a")!;
  assert.equal(a.planningReservationAnnual, 500);
  const ledger = createRetirementCapacityLedger(result);
  const shared = ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  assert.equal(shared.consumed.scheduled, 500);
  assert.equal(shared.remainingAnnualRoom, 9500);
});

test("P03 both spouses and multiple IRA accounts reserve future schedules without multiplying shared room", () => {
  const snapshot = buildMoneyPrioritySnapshot(rawScenario(10000.01, 0, 2500, 500, 200, 200));
  snapshot.retirementAccounts.push({
    ...snapshot.retirementAccounts[0]!,
    id: "roth-a",
    name: "A Roth",
    type: "roth_ira",
    monthlyEmployeeContribution: 112.5,
    employeeContributedYtd: 500,
  });
  const result = evaluateRetirementAccountOpportunities(snapshot, undefined, "2026-09-01");
  const ledger = createRetirementCapacityLedger(result);
  const shared = ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  const scheduled = result.opportunities.reduce((sum, item) => sum + (item.planningReservationAnnual ?? 0), 0);
  assert.equal(scheduled, 2050);
  assert.ok(shared.consumed.scheduled <= shared.originalRemainingAnnualRoom);
  assert.ok(retirementCapacityInvariantHolds(ledger));

  const reordered = evaluateRetirementAccountOpportunities({
    ...snapshot,
    people: [...snapshot.people].reverse(),
    retirementAccounts: [...snapshot.retirementAccounts].reverse(),
  }, undefined, "2026-09-01");
  const reorderedLedger = createRetirementCapacityLedger(reordered);
  assert.equal(
    reorderedLedger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))?.consumed.scheduled,
    shared.consumed.scheduled,
  );
});

test("P03 staged consumers cannot reuse the scheduled shared reservation", () => {
  const result = evaluate(10000, 0, 7000, 0, 500, 0, "2026-09-01");
  const ledger = createRetirementCapacityLedger(result);
  const existing = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "one_time", 1000);
  const build = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "build", 1000);
  const windfall = consumeRetirementCapacityForEqualOwnerTie(ledger, ["ira-a", "ira-b"], "windfall", 1000);
  const routed = [...existing, ...build, ...windfall].reduce((sum, item) => sum + item.consumedAnnualAmount, 0);
  const shared = ledger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  assert.equal(shared.consumed.scheduled, 500);
  assert.equal(routed, 2500);
  assert.equal(shared.remainingAnnualRoom, 0);
  assert.equal(shared.consumed.scheduled + routed, shared.originalRemainingAnnualRoom);
  assert.ok(retirementCapacityInvariantHolds(ledger));
});

test("P03 production engine uses its as-of date for the current-year IRA reservation horizon", () => {
  const result = runMoneyPriorityEngine(rawScenario(10000, 0, 7000, 0, 500, 0), "2026-09-01");
  const shared = result.retirementCapacityLedger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"))!;
  assert.equal(shared.consumed.scheduled, 500);
  assert.ok(retirementCapacityInvariantHolds(result.retirementCapacityLedger));
});
