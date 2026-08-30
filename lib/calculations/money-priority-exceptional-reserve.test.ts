import assert from "node:assert/strict";
import test from "node:test";

import { assessEmergencyReserve } from "./money-priority-core.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { evaluateSecureStage } from "./money-priority-secure.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function raw(overrides: Partial<MoneyPriorityRawSnapshot> = {}): MoneyPriorityRawSnapshot {
  return {
    householdId: "h",
    people: [],
    income: [
      { id: "i1", name: "Income A", monthly_amount: 2500, monthly_gross_amount: 3500, is_active: true },
      { id: "i2", name: "Income B", monthly_amount: 2500, monthly_gross_amount: 3500, is_active: true },
    ],
    expenses: [
      { id: "essential", name: "Essential", monthly_amount: 1000, is_essential: true },
      { id: "committed", name: "Committed", monthly_amount: 500, is_essential: false, cash_flow_treatment: "required" },
      { id: "discretionary", name: "Discretionary", monthly_amount: 300, is_essential: false },
    ],
    accounts: [],
    debts: [{ id: "debt", name: "Debt", debt_type: "personal_loan", current_balance: 1000, minimum_payment: 100, interest_rate: 3 }],
    retirementAccounts: [], goals: [], insuranceExposures: [],
    preferences: { job_replacement_difficulty: "easy", known_income_disruption: false },
    ...overrides,
  };
}

function assess(overrides: Partial<MoneyPriorityRawSnapshot> = {}, asOfDate = "2026-01-01") {
  return assessEmergencyReserve(buildMoneyPrioritySnapshot(raw(overrides)), asOfDate);
}

test("ordinary risk mapping remains exactly 3, 4, 5, and 6 months", () => {
  assert.deepEqual([
    assess(),
    assess({ income: [{ id: "i", monthly_amount: 5000, is_active: true }] }),
    assess({
      people: [{ id: "p", is_active: true, is_dependent: true }],
      income: [{ id: "i", monthly_amount: 5000, is_active: true, is_variable: true }],
    }),
    assess({
      people: [{ id: "p", is_active: true, is_dependent: true }],
      income: [{ id: "i", monthly_amount: 5000, is_active: true, is_variable: true }],
      preferences: { known_income_disruption: false, job_replacement_difficulty: "difficult" },
    }),
  ].map((item) => [item.ordinaryRiskTier, item.ordinaryRecommendedMonths]), [
    ["low", 3], ["moderate", 4], ["elevated", 5], ["high", 6],
  ]);
});

test("stacking all ordinary risks never exceeds six without a usable exceptional trigger", () => {
  const result = assess({
    people: [{ id: "p", is_active: true, is_dependent: true }],
    income: [{ id: "i", monthly_amount: 5000, is_active: true, is_variable: true }],
    preferences: { known_income_disruption: true, job_replacement_difficulty: "difficult" },
  });
  assert.equal(result.ordinaryRecommendedMonths, 6);
  assert.equal(result.engineRecommendedMonths, 6);
  assert.equal(result.exceptionalMode, "more_information_needed");
});

test("ordinary factors alone never create exceptional months", () => {
  const cases = [
    { income: [{ id: "i", monthly_amount: 5000, is_active: true }] },
    { people: [{ id: "p", is_active: true, is_dependent: true }] },
    { income: [{ id: "a", monthly_amount: 2500, is_active: true, is_variable: true }, { id: "b", monthly_amount: 2500, is_active: true }] },
    { preferences: { known_income_disruption: false, job_replacement_difficulty: "difficult" } },
    { income: [{ id: "a", monthly_amount: 4500, is_active: true }, { id: "b", monthly_amount: 500, is_active: true }] },
  ];
  for (const value of cases) {
    const result = assess(value);
    assert.ok(result.engineRecommendedMonths <= 6);
    assert.equal(result.exceptionalTriggerExists, false);
  }
});

test("future disruption duration plus two-month recovery buffer drives exceptional recommendation", () => {
  const result = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy",
  } });
  assert.equal(result.disruptionMonths, 6);
  assert.equal(result.recoveryBufferMonths, 2);
  assert.equal(result.exceptionalCandidateMonths, 8);
  assert.equal(result.engineRecommendedMonths, 8);
  assert.equal(result.exceptionalMode, "temporary_exception");
});

test("ordinary recommendation wins over a short exceptional candidate", () => {
  const result = assess({
    people: [{ id: "p", is_active: true, is_dependent: true }],
    income: [{ id: "i", monthly_amount: 5000, is_active: true, is_variable: true }],
    preferences: { known_income_disruption: true, known_income_disruption_end_date: "2026-03-01", job_replacement_difficulty: "difficult" },
  });
  assert.equal(result.exceptionalCandidateMonths, 4);
  assert.equal(result.engineRecommendedMonths, 6);
  assert.equal(result.exceptionalMode, "none");
});

test("7 through 9 months are temporary and 10 through 12 are severe", () => {
  const dates = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"];
  const results = dates.map((end) => assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: end, job_replacement_difficulty: "easy",
  } }));
  assert.deepEqual(results.map((item) => item.engineRecommendedMonths), [7, 8, 9, 10, 11, 12]);
  assert.deepEqual(results.map((item) => item.exceptionalMode), [
    "temporary_exception", "temporary_exception", "temporary_exception",
    "severe_exception", "severe_exception", "severe_exception",
  ]);
});

test("long disruption is capped at the automatic twelve-month maximum", () => {
  const result = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2028-01-01", job_replacement_difficulty: "easy",
  } });
  assert.ok((result.exceptionalCandidateMonths ?? 0) > 12);
  assert.equal(result.exceptionalRecommendedMonths, 12);
  assert.equal(result.engineRecommendedMonths, 12);
});

test("missing disruption date requests information without inventing exceptional months", () => {
  const result = assess({ preferences: { known_income_disruption: true, job_replacement_difficulty: "easy" } });
  assert.equal(result.exceptionalMode, "more_information_needed");
  assert.ok(result.missingData[0]?.includes("expected duration"));
  assert.ok(result.engineRecommendedMonths <= 6);
});

test("calendar-invalid disruption date requests information without exceptional months", () => {
  const result = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-02-30", job_replacement_difficulty: "easy",
  } });
  assert.equal(result.exceptionalMode, "more_information_needed");
  assert.ok(result.missingData[0]?.includes("invalid"));
  assert.ok(result.engineRecommendedMonths <= 6);
});

test("past and same-day disruption dates are stale rather than exceptional", () => {
  for (const end of ["2025-12-31", "2026-01-01"]) {
    const result = assess({ preferences: {
      known_income_disruption: true, known_income_disruption_end_date: end, job_replacement_difficulty: "easy",
    } });
    assert.equal(result.exceptionalMode, "none");
    assert.ok(result.warnings[0]?.includes("stale"));
    assert.ok(result.engineRecommendedMonths <= 6);
  }
});

test("future end date is ignored when disruption flag is false", () => {
  const result = assess({ preferences: {
    known_income_disruption: false, known_income_disruption_end_date: "2027-01-01", job_replacement_difficulty: "easy",
  } });
  assert.equal(result.exceptionalTriggerExists, false);
  assert.equal(result.disruptionMonths, null);
  assert.equal(result.exceptionalReasons.length, 0);
});

test("date math is anchored to asOfDate and deterministic", () => {
  const input = { preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-09-01", job_replacement_difficulty: "easy",
  } };
  const january = assess(input, "2026-01-01");
  const march = assess(input, "2026-03-01");
  assert.deepEqual(january, assess(input, "2026-01-01"));
  assert.ok((january.disruptionMonths ?? 0) > (march.disruptionMonths ?? 0));
});

test("ordinary and exceptional explanations remain separate", () => {
  const result = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy",
  } });
  assert.ok(result.ordinaryReasons.some((reason) => reason.includes("ordinary risk factor")));
  assert.ok(result.exceptionalReasons.some((reason) => reason.includes("remaining")));
});

test("higher override raises effective target without relabeling engine policy", () => {
  const result = assess({ preferences: {
    known_income_disruption: false, emergency_fund_months_override: 9, job_replacement_difficulty: "easy",
  } });
  assert.equal(result.engineRecommendedMonths, 3);
  assert.equal(result.householdOverrideMonths, 9);
  assert.equal(result.effectiveRecommendedMonths, 9);
  assert.equal(result.source, "household_override");
  assert.equal(result.exceptionalMode, "none");
});

test("lower override cannot erase a concrete exceptional need", () => {
  const result = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-09-01",
    emergency_fund_months_override: 3, job_replacement_difficulty: "easy",
  } });
  assert.equal(result.engineRecommendedMonths, 10);
  assert.equal(result.householdOverrideMonths, 3);
  assert.equal(result.effectiveRecommendedMonths, 10);
  assert.equal(result.source, "exceptional_policy");
});

test("equal override preserves engine rationale and override above twelve remains explicit preference", () => {
  const equal = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-09-01",
    emergency_fund_months_override: 10, job_replacement_difficulty: "easy",
  } });
  assert.equal(equal.source, "exceptional_policy");
  const higher = assess({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2028-01-01",
    emergency_fund_months_override: 15, job_replacement_difficulty: "easy",
  } });
  assert.equal(higher.engineRecommendedMonths, 12);
  assert.equal(higher.effectiveRecommendedMonths, 15);
  assert.equal(higher.source, "household_override");
});

test("negative and nonnumeric overrides are safely ignored", () => {
  assert.equal(assess({ preferences: { emergency_fund_months_override: -3 } }).householdOverrideMonths, null);
  assert.equal(assess({ preferences: { emergency_fund_months_override: "not-a-number" } }).householdOverrideMonths, null);
});

test("Secure uses one exceptional target based only on essentials plus debt minimums", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy",
  } }));
  const secure = evaluateSecureStage(snapshot, "2026-01-01");
  assert.equal(secure.emergencyReserveAssessment.effectiveRecommendedMonths, 8);
  assert.equal(secure.fullEmergencyTarget, 8800);
  assert.equal(secure.fullEmergencyGap, 8800);
});

test("committed and discretionary expenses do not inflate ordinary or exceptional targets", () => {
  const withExpenses = buildMoneyPrioritySnapshot(raw({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy",
  } }));
  const withoutExpenses = buildMoneyPrioritySnapshot(raw({
    expenses: [{ id: "essential", monthly_amount: 1000, is_essential: true }],
    preferences: { known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy" },
  }));
  assert.equal(evaluateSecureStage(withExpenses, "2026-01-01").fullEmergencyTarget,
    evaluateSecureStage(withoutExpenses, "2026-01-01").fullEmergencyTarget);
});

test("protected reserve offsets the single target once and gaps never become negative", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw({
    accounts: [{ id: "cash", account_type: "savings", balance: 10000, cash_purpose: "protected_reserve" }],
    preferences: { known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy" },
  }));
  const secure = evaluateSecureStage(snapshot, "2026-01-01");
  assert.equal(secure.fullEmergencyTarget, 8800);
  assert.equal(secure.fullEmergencyGap, 0);
});

test("engine propagates larger Secure need without exceeding cross-stage capacity", () => {
  const result = runMoneyPriorityEngine(raw({
    preferences: { known_income_disruption: true, known_income_disruption_end_date: "2026-09-01", job_replacement_difficulty: "easy" },
    goals: [{ id: "g", name: "Goal", target_amount: 12000, current_amount: 0, target_date: "2027-01-01", priority: 1, necessity: "required", goal_class: "necessary_protective", deadline_flexibility: "fixed", consequence_level: "high" }],
  }), "2026-01-01");
  const recurring = result.recommendations.flatMap((item) => item.allocations)
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  assert.equal(result.secure.emergencyReserveAssessment.engineRecommendedMonths, 10);
  assert.ok(recurring <= result.snapshot.aggregates.monthlyCashFlowBeforeSavings);
  assert.ok(result.build.totalAllocatedMonthly <= result.build.allocationMonthlyCapacity);
  assert.ok(result.optimize.remainingMonthlyCapacity <= result.build.remainingMonthlyCapacity);
});

test("unallocated existing cash responds to exceptional Secure need exactly once", () => {
  const result = runMoneyPriorityEngine(raw({
    accounts: [{ id: "cash", account_type: "savings", balance: 9000, cash_purpose: "unallocated" }],
    preferences: { known_income_disruption: true, known_income_disruption_end_date: "2026-07-01", job_replacement_difficulty: "easy" },
  }), "2026-01-01");
  const reserveDeployment = result.existingCash.deployments.find((item) => item.category === "reserve");
  assert.equal(reserveDeployment?.amount, 8800);
  assert.equal(result.residualNeeds.secureReserveApplied, 8800);
  assert.equal(result.secure.fullEmergencyGap, 0);
  assert.equal(result.snapshot.aggregates.protectedCash, 0);
  assert.equal(result.snapshot.aggregates.earmarkedCash, 0);
  assert.equal(result.snapshot.aggregates.debtBackedCash, 0);
  assert.equal(result.snapshot.aggregates.operatingCash, 0);
});

test("missing exceptional duration does not make unrelated stages unavailable", () => {
  const result = runMoneyPriorityEngine(raw({ preferences: {
    known_income_disruption: true, job_replacement_difficulty: "easy",
  } }), "2026-01-01");
  assert.equal(result.secure.emergencyReserveAssessment.exceptionalMode, "more_information_needed");
  assert.ok(result.recommendations.some((item) => item.id === "secure-exceptional-reserve-missing"));
  assert.ok(result.build.allocationMonthlyCapacity >= 0);
});

test("raw and normalized snapshots remain immutable", () => {
  const input = raw({ preferences: {
    known_income_disruption: true, known_income_disruption_end_date: "2026-09-01", job_replacement_difficulty: "easy",
  } });
  const rawBefore = structuredClone(input);
  const snapshot = buildMoneyPrioritySnapshot(input);
  const normalizedBefore = structuredClone(snapshot);
  assessEmergencyReserve(snapshot, "2026-01-01");
  evaluateSecureStage(snapshot, "2026-01-01");
  runMoneyPriorityEngine(input, "2026-01-01");
  assert.deepEqual(input, rawBefore);
  assert.deepEqual(snapshot, normalizedBefore);
});
