import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import {
  createRetirementCapacityLedger,
  remainingRetirementCapacity,
} from "./money-priority-retirement-capacity.ts";

function rawScenario(
  compA: number,
  compB: number,
  ytdA: number | null,
  ytdB: number | null,
  options: { omitBAccount?: boolean; multipleBAccounts?: boolean } = {},
) {
  const retirementAccounts: Array<Record<string, unknown>> = [
    {
      id: "ira-a",
      owner_person_id: "a",
      name: "A IRA",
      account_type: "traditional_ira",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: ytdA,
      employer_contributed_ytd: 0,
    },
  ];
  if (!options.omitBAccount) {
    retirementAccounts.push({
      id: "ira-b",
      owner_person_id: "b",
      name: "B IRA",
      account_type: "traditional_ira",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: ytdB,
      employer_contributed_ytd: 0,
    });
  }
  if (options.multipleBAccounts) {
    retirementAccounts.push({
      id: "roth-b",
      owner_person_id: "b",
      name: "B Roth",
      account_type: "roth_ira",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: 0,
      employer_contributed_ytd: 0,
    });
  }
  return {
    householdId: "ffh-013-final-audit-remediation-2",
    people: [
      {
        id: "a",
        display_name: "A",
        relationship: "self",
        birth_date: "1990-01-01",
        estimated_taxable_compensation_annual: compA,
        covered_by_workplace_retirement_plan: false,
        is_active: true,
        is_dependent: false,
      },
      {
        id: "b",
        display_name: "B",
        relationship: "spouse_partner",
        birth_date: "1990-01-01",
        estimated_taxable_compensation_annual: compB,
        covered_by_workplace_retirement_plan: false,
        is_active: true,
        is_dependent: false,
      },
    ],
    retirementAccounts,
    income: [{ id: "income", owner_person_id: "a", name: "Income", monthly_amount: 5000, monthly_gross_amount: 6000, is_active: true }],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
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
  ytdA: number | null,
  ytdB: number | null,
  options: {
    omitBAccount?: boolean;
    multipleBAccounts?: boolean;
    reversePeople?: boolean;
    reverseAccounts?: boolean;
  } = {},
) {
  const snapshot = buildMoneyPrioritySnapshot(rawScenario(compA, compB, ytdA, ytdB, options));
  return evaluateRetirementAccountOpportunities({
    ...snapshot,
    people: options.reversePeople ? [...snapshot.people].reverse() : snapshot.people,
    retirementAccounts: options.reverseAccounts ? [...snapshot.retirementAccounts].reverse() : snapshot.retirementAccounts,
  });
}

function iraOpportunities(result: ReturnType<typeof evaluateRetirementAccountOpportunities>) {
  return result.opportunities.filter((item) => item.accountType === "traditional_ira" || item.accountType === "roth_ira");
}

function ownerRooms(result: ReturnType<typeof evaluateRetirementAccountOpportunities>) {
  const rooms = new Map<string, number | null>();
  for (const opportunity of iraOpportunities(result)) {
    if (opportunity.ownerPersonId && !rooms.has(opportunity.ownerPersonId)) {
      rooms.set(opportunity.ownerPersonId, opportunity.remainingAnnualRoom);
    }
  }
  return Object.fromEntries([...rooms.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function ownerStates(result: ReturnType<typeof evaluateRetirementAccountOpportunities>) {
  const states = new Map<string, Set<string>>();
  for (const opportunity of iraOpportunities(result)) {
    if (!opportunity.ownerPersonId) continue;
    const current = states.get(opportunity.ownerPersonId) ?? new Set<string>();
    current.add(opportunity.state);
    states.set(opportunity.ownerPersonId, current);
  }
  return Object.fromEntries([...states.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ownerId, values]) => [ownerId, [...values].sort()]));
}

test("R01 missing spouse aggregate IRA YTD fails the affected MFJ relationship closed at the pre-YTD equality boundary", () => {
  const result = evaluate(10000, 5000, 0, null);
  assert.deepEqual(ownerRooms(result), { a: null, b: null });
  assert.deepEqual(ownerStates(result), {
    a: ["more_information_needed"],
    b: ["more_information_needed"],
  });
  for (const opportunity of iraOpportunities(result)) {
    assert.ok(opportunity.missingData.some((item) => item.includes("B's authoritative total Traditional and Roth IRA contributions YTD")));
  }

  const ledger = createRetirementCapacityLedger(result);
  for (const entry of ledger.entries.filter((item) => item.accountType === "traditional_ira" || item.accountType === "roth_ira")) {
    assert.equal(entry.verified, false);
    assert.equal(entry.originalRemainingAnnualRoom, null);
    assert.equal(remainingRetirementCapacity(ledger, entry.accountId), null);
  }
});

test("R01 resolving the missing spouse aggregate YTD to known zero restores the known feasible set", () => {
  const result = evaluate(10000, 5000, 0, 0);
  assert.deepEqual(ownerRooms(result), { a: 7500, b: 7500 });
  assert.deepEqual(ownerStates(result), { a: ["available"], b: ["available"] });
});

test("R01 resolving the missing spouse aggregate YTD to $8,000 preserves A03-style shared fail-closed behavior", () => {
  const result = evaluate(10000, 5000, 0, 8000);
  assert.deepEqual(ownerRooms(result), { a: 0, b: 0 });
  assert.ok(iraOpportunities(result).every((item) => item.sharedCapacityGroup?.startsWith("ira:mfj-compensation:") === true));
  assert.ok(result.warnings.some((warning) => warning.includes("affected shared MFJ group is zero")));
});

test("R01 reverses spouse roles without changing the missing-material-fact outcome", () => {
  const result = evaluate(5000, 10000, null, 0);
  assert.deepEqual(ownerRooms(result), { a: null, b: null });
  assert.deepEqual(ownerStates(result), {
    a: ["more_information_needed"],
    b: ["more_information_needed"],
  });
  assert.ok(iraOpportunities(result).every((item) => item.missingData.some((reason) => reason.includes("A's authoritative total Traditional and Roth IRA contributions YTD"))));
});

test("R01 missing-YTD result is invariant to person and account ordering", () => {
  const expectedRooms = ownerRooms(evaluate(10000, 5000, 0, null));
  const expectedStates = ownerStates(evaluate(10000, 5000, 0, null));
  for (const options of [
    { reversePeople: true },
    { reverseAccounts: true },
    { reversePeople: true, reverseAccounts: true },
  ]) {
    const result = evaluate(10000, 5000, 0, null, options);
    assert.deepEqual(ownerRooms(result), expectedRooms);
    assert.deepEqual(ownerStates(result), expectedStates);
  }
});

test("R01 aggregate unknown propagates across multiple Traditional and Roth IRA records", () => {
  const result = evaluate(10000, 5000, 0, null, { multipleBAccounts: true });
  assert.deepEqual(ownerRooms(result), { a: null, b: null });
  assert.equal(iraOpportunities(result).filter((item) => item.ownerPersonId === "b").length, 2);
  assert.ok(iraOpportunities(result).every((item) => item.state === "more_information_needed"));
});

test("R01 absence of a recorded spouse IRA account is not proof of zero aggregate YTD when shared capacity can bind", () => {
  const result = evaluate(10000, 5000, 0, null, { omitBAccount: true });
  const a = iraOpportunities(result).find((item) => item.ownerPersonId === "a")!;
  assert.equal(a.state, "more_information_needed");
  assert.equal(a.remainingAnnualRoom, null);
  assert.ok(a.missingData.some((item) => item.includes("B's authoritative total Traditional and Roth IRA contributions YTD")));
  const ledger = createRetirementCapacityLedger(result);
  assert.equal(remainingRetirementCapacity(ledger, "ira-a"), null);
});

test("R01 preserves owner-local missing-YTD behavior when equal compensation creates no spousal shared feasible set", () => {
  const result = evaluate(10000, 10000, 0, null);
  assert.deepEqual(ownerRooms(result), { a: 7500, b: null });
  assert.deepEqual(ownerStates(result), {
    a: ["available"],
    b: ["more_information_needed"],
  });
  assert.ok(iraOpportunities(result).every((item) => item.sharedCapacityGroup?.startsWith("ira:mfj-compensation:") !== true));
});

test("R02 all materially equivalent current-year contribution-month consumers use the neutral shared authority", () => {
  const calculationDirectory = new URL("./", import.meta.url);
  const productionFiles = readdirSync(calculationDirectory)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

  const directCalendarImplementations = productionFiles.filter((name) => {
    const source = readFileSync(new URL(name, calculationDirectory), "utf8");
    return /12\s*-\s*[^\n;]*getUTCMonth\(\)/.test(source);
  });
  assert.deepEqual(directCalendarImplementations, []);

  for (const consumer of [
    "money-priority-retirement-accounts.ts",
    "money-priority-retirement-floor.ts",
    "money-priority-secure.ts",
  ]) {
    const source = readFileSync(new URL(consumer, calculationDirectory), "utf8");
    assert.match(source, /import \{ remainingContributionMonths \} from "\.\/money-priority-contribution-period\.ts";/);
    assert.doesNotMatch(source, /function remainingContributionMonths\s*\(/);
  }
});