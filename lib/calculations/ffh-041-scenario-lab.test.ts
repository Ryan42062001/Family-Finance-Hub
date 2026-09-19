import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot, MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  executeScenarioPairComparison,
  executeScenarioRebase,
  executeScenarioRun,
  scenarioEngineSummary,
  type ScenarioExecutionDependencies,
} from "../scenarios/scenario-execution.ts";
import { scenarioBaselineDescriptor } from "../scenarios/scenario-fingerprint.ts";
import {
  createScenarioDraft,
  discardScenarioDraft,
  duplicateScenarioDraft,
  editScenarioDraft,
  resetScenarioDraft,
  scenarioDraftCanCompare,
} from "../scenarios/scenario-drafts.ts";
import { SCENARIO_DEFINITION_VERSION, type ScenarioDefinition } from "../scenarios/scenario-definition.ts";

const AS_OF = "2026-09-18";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "server-household",
    people: [{
      id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 67, covered_by_workplace_retirement_plan: true,
      estimated_taxable_compensation_annual: 100000, is_dependent: false, is_active: true,
    }],
    income: [{
      id: "income", owner_person_id: "p", name: "Income", income_type: "employment",
      monthly_amount: 7000, monthly_gross_amount: 10000, is_variable: false, is_active: true,
    }],
    expenses: [{
      id: "housing", name: "Housing", category: "housing", monthly_amount: 2500,
      is_essential: true, cash_flow_treatment: "required",
    }],
    accounts: [
      { id: "cash", name: "Cash", account_type: "checking", balance: 5000, cash_purpose: "unallocated" },
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" },
    ],
    debts: [{
      id: "card", name: "Card", debt_type: "credit_card", current_balance: 4000, interest_rate: 18,
      minimum_payment: 200, rate_type: "fixed", is_past_due: false, is_in_collections: false, has_legal_or_tax_priority: false,
    }],
    retirementAccounts: [{
      id: "work", owner_person_id: "p", name: "401k", account_type: "401k", balance: 100000,
      monthly_employee_contribution: 500, monthly_employer_contribution: 200,
      employee_contributed_ytd: 4000, employer_contributed_ytd: 1600,
      plan_eligible_compensation_annual: 100000, full_match_employee_contribution_monthly: 500,
      match_status: "fully_captured",
    }],
    goals: [{
      id: "goal", name: "Goal", target_amount: 12000, current_amount: 500, target_date: "2027-09-18",
      priority: 2, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
      consequence_level: "moderate", planned_monthly_contribution: 100, core_need_amount: 8000,
      goal_intelligence_confirmed: true, underlying_need: "Need", desired_solution: "Plan", goal_nature: "mixed",
      underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely",
      expected_borrowing_amount: null, expected_borrowing_apr: null,
    }],
    insuranceExposures: [{
      id: "insurance", person_id: "p", name: "Health", insurance_type: "health",
      deductible_amount: 2000, family_deductible_amount: null, out_of_pocket_max: 6000,
      percentage_deductible: null, insured_value: null, is_relevant_to_reserve: true,
    }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", roth_vs_traditional: "unspecified",
      risk_tolerance: "moderate", retirement_priority: "balanced", job_replacement_difficulty: "easy",
      known_income_disruption: false, known_income_disruption_end_date: null,
      desired_retirement_monthly_spending: 3000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      expected_hsa_medical_spending_annual: null, tax_profile_year: 2026,
      tax_filing_status: "single", estimated_modified_agi: 100000, lived_with_spouse_during_tax_year: null,
    },
  };
}

function engine(source = raw(), asOf = AS_OF) {
  return runMoneyPriorityEngine(source, asOf);
}

function definition(fingerprint: string, overrides: Partial<ScenarioDefinition> = {}): ScenarioDefinition {
  return {
    version: SCENARIO_DEFINITION_VERSION,
    scenarioId: "scenario-1",
    baselineReference: { fingerprint, referenceId: null },
    recurringOverrides: [],
    oneTimeEvents: [],
    specializedIntent: null,
    ...overrides,
  };
}

function submission(source = raw(), overrides: Partial<ScenarioDefinition> = {}) {
  const baseline = engine(source);
  const descriptor = scenarioBaselineDescriptor(baseline);
  return {
    definition: definition(descriptor.fingerprint, overrides),
    baselineFingerprint: descriptor.fingerprint,
    baselinePolicyBasis: descriptor.policyBasis,
  };
}

function dependencies(
  snapshot: MoneyPrioritySnapshot,
  options: { authenticated?: boolean; householdId?: string | null; asOfDate?: string; onLoad?: (id: string) => void } = {},
): ScenarioExecutionDependencies {
  return {
    resolveAuthority: async () => ({
      authenticated: options.authenticated ?? true,
      householdId: options.householdId === undefined ? "server-household" : options.householdId,
    }),
    loadSnapshot: async (id) => {
      options.onLoad?.(id);
      return structuredClone(snapshot);
    },
    asOfDate: () => options.asOfDate ?? AS_OF,
  };
}

test("FFH-041 fingerprint is deterministic and stable across ordering, display-only names, and cent-equivalent money", () => {
  const original = raw();
  const first = scenarioBaselineDescriptor(engine(original));
  const reordered = structuredClone(original);
  reordered.accounts = [...(reordered.accounts ?? [])].reverse();
  reordered.people![0].display_name = "Renamed";
  reordered.accounts![0].name = "Renamed account";
  reordered.accounts![0].balance = Number(reordered.accounts![0].balance) + 0.004;
  const second = scenarioBaselineDescriptor(engine(reordered));
  assert.equal(second.fingerprint, first.fingerprint);
  assert.deepEqual(second.policyBasis, first.policyBasis);
});

test("FFH-041 material financial, policy, and explicit as-of changes create a different fingerprint", () => {
  const baseline = engine();
  const descriptor = scenarioBaselineDescriptor(baseline);

  const changedMoney = raw();
  changedMoney.accounts![0].balance = 5000.01;
  assert.notEqual(scenarioBaselineDescriptor(engine(changedMoney)).fingerprint, descriptor.fingerprint);

  const changedPolicy = structuredClone(baseline);
  changedPolicy.policyVersion = baseline.policyVersion + "-changed";
  assert.notEqual(scenarioBaselineDescriptor(changedPolicy).fingerprint, descriptor.fingerprint);

  assert.notEqual(scenarioBaselineDescriptor(engine(raw(), "2026-09-19")).fingerprint, descriptor.fingerprint);
});

test("FFH-041 unauthenticated run rejects before loading household data", async () => {
  let loads = 0;
  const snapshot = engine().snapshot;
  const result = await executeScenarioRun(submission(), dependencies(snapshot, {
    authenticated: false, householdId: null, onLoad: () => { loads += 1; },
  }));
  assert.equal(result.status, "unauthorized");
  assert.equal(loads, 0);
});

test("FFH-041 household authority is server-derived and a client household-id spoof is rejected", async () => {
  const snapshot = engine().snapshot;
  const loaded: string[] = [];
  const payload = { ...submission(), householdId: "attacker-household" };
  const result = await executeScenarioRun(payload, dependencies(snapshot, { onLoad: (id) => loaded.push(id) }));
  assert.equal(result.status, "invalid");
  assert.deepEqual(loaded, ["server-household"]);
  assert.ok(result.issues.some((item) => item.path === "request.householdId" && item.code === "unknown_field"));
});

test("FFH-041 every explicit run reloads the server baseline exactly once", async () => {
  const snapshot = engine().snapshot;
  let loads = 0;
  const deps = dependencies(snapshot, { onLoad: () => { loads += 1; } });
  const payload = submission();
  assert.equal((await executeScenarioRun(payload, deps)).status, "valid");
  assert.equal((await executeScenarioRun(payload, deps)).status, "valid");
  assert.equal(loads, 2);
});

test("FFH-041 stale baseline fails closed before scenario execution", async () => {
  const original = raw();
  const payload = submission(original, {
    recurringOverrides: [{ type: "expense", id: "change", expenseId: "housing", monthlyAmount: 1000 }],
  });
  const changed = raw();
  changed.income![0].monthly_amount = 6000;
  const result = await executeScenarioRun(payload, dependencies(engine(changed).snapshot));
  assert.equal(result.status, "stale_baseline");
  assert.equal(result.scenarioSummary, null);
  assert.equal(result.provenance, null);
});

test("FFH-041 protected/malformed client fields still fail through the accepted Core validator", async () => {
  const baseline = engine();
  const descriptor = scenarioBaselineDescriptor(baseline);
  const malicious = {
    definition: {
      ...definition(descriptor.fingerprint),
      recurringOverrides: [{
        type: "retirement_account",
        id: "protected",
        accountId: "work",
        employeeContributedYtd: 999999,
      }],
    },
    baselineFingerprint: descriptor.fingerprint,
    baselinePolicyBasis: descriptor.policyBasis,
  };
  const result = await executeScenarioRun(malicious, dependencies(baseline.snapshot));
  assert.equal(result.status, "invalid");
  assert.ok(result.issues.some((item) => item.code === "protected_field"));
});

test("FFH-041 explicit rebase preserves stable-ID intent and refuses deleted targets", async () => {
  const original = raw();
  const payload = submission(original, {
    recurringOverrides: [{ type: "income", id: "income-change", incomeId: "income", monthlyTakeHomeAmount: 6500 }],
  });

  const changed = raw();
  changed.expenses![0].monthly_amount = 2600;
  const rebased = await executeScenarioRebase(payload, dependencies(engine(changed).snapshot));
  assert.equal(rebased.status, "rebased");
  assert.ok(rebased.definition);
  assert.equal(rebased.definition?.recurringOverrides[0]?.type, "income");
  assert.equal(rebased.definition?.baselineReference.fingerprint, rebased.baseline?.fingerprint);
  assert.notEqual(rebased.definition?.baselineReference.fingerprint, payload.baselineFingerprint);

  const deleted = raw();
  deleted.income = [];
  const unresolved = await executeScenarioRebase(payload, dependencies(engine(deleted).snapshot));
  assert.equal(unresolved.status, "unresolved");
  assert.equal(unresolved.definition, null);
  assert.ok(unresolved.issues.some((item) => item.code === "missing_entity"));
});

test("FFH-041 lifecycle create/edit/reset/duplicate/compare/discard remains in-memory", async () => {
  const baselineEngine = engine();
  const baseline = scenarioBaselineDescriptor(baselineEngine);
  const created = createScenarioDraft("local-1", baseline, "A");
  assert.equal(created.definition.recurringOverrides.length, 0);

  const editedDefinition: ScenarioDefinition = {
    ...created.definition,
    recurringOverrides: [{ type: "expense", id: "e", expenseId: "housing", monthlyAmount: 2000 }],
  };
  const edited = editScenarioDraft(created, editedDefinition);
  assert.equal(edited.dirty, true);

  const duplicate = duplicateScenarioDraft(edited, "local-2");
  assert.equal(duplicate.localId, "local-2");
  assert.equal(duplicate.definition.scenarioId, "local-2");
  assert.deepEqual(duplicate.definition.recurringOverrides, edited.definition.recurringOverrides);

  const runA = await executeScenarioRun({
    definition: { ...edited.definition, baselineReference: { fingerprint: baseline.fingerprint, referenceId: null } },
    baselineFingerprint: baseline.fingerprint,
    baselinePolicyBasis: baseline.policyBasis,
  }, dependencies(baselineEngine.snapshot));
  const runB = await executeScenarioRun({
    definition: { ...duplicate.definition, baselineReference: { fingerprint: baseline.fingerprint, referenceId: null } },
    baselineFingerprint: baseline.fingerprint,
    baselinePolicyBasis: baseline.policyBasis,
  }, dependencies(baselineEngine.snapshot));
  const comparableA = { ...edited, baseline, result: runA, dirty: false };
  const comparableB = { ...duplicate, baseline, result: runB, dirty: false };
  assert.equal(scenarioDraftCanCompare(comparableA, comparableB), true);

  const reset = resetScenarioDraft(edited, baseline);
  assert.equal(reset.definition.recurringOverrides.length, 0);
  assert.equal(reset.dirty, false);
  assert.deepEqual(discardScenarioDraft([edited, duplicate], "local-1").map((item) => item.localId), ["local-2"]);
});

test("FFH-041 comparison DTO preserves authoritative amounts and explicit units", async () => {
  const baseline = engine();
  const descriptor = scenarioBaselineDescriptor(baseline);
  const left = {
    definition: definition(descriptor.fingerprint, {
      scenarioId: "left",
      recurringOverrides: [{ type: "income", id: "left-income", incomeId: "income", monthlyTakeHomeAmount: 6500 }],
    }),
    baselineFingerprint: descriptor.fingerprint,
    baselinePolicyBasis: descriptor.policyBasis,
  };
  const right = {
    definition: definition(descriptor.fingerprint, {
      scenarioId: "right",
      recurringOverrides: [{ type: "income", id: "right-income", incomeId: "income", monthlyTakeHomeAmount: 7500 }],
    }),
    baselineFingerprint: descriptor.fingerprint,
    baselinePolicyBasis: descriptor.policyBasis,
  };
  const pair = await executeScenarioPairComparison({ left, right }, dependencies(baseline.snapshot));
  assert.equal(pair.status, "valid");
  assert.ok(pair.leftSummary && pair.rightSummary && pair.comparison);
  assert.equal(pair.leftSummary?.feasibility.unit, "USD/month");
  assert.equal(pair.rightSummary?.feasibility.unit, "USD/month");
  for (const change of pair.comparison?.allocationChanges ?? []) assert.equal(change.unit, "USD/month");

  const summary = scenarioEngineSummary(baseline);
  assert.equal(summary.feasibility.monthlyPlanCapacity, baseline.feasibility.monthlyPlanCapacity);
  const firstAllocation = baseline.recommendations.flatMap((item) => item.allocations)[0];
  const dtoAllocation = summary.recommendations.flatMap((item) => item.allocations)[0];
  if (firstAllocation && dtoAllocation) {
    assert.equal(dtoAllocation.monthlyAmount, firstAllocation.monthlyAmount);
    assert.equal(dtoAllocation.annualAmount, firstAllocation.annualAmount);
    assert.equal(dtoAllocation.monthlyUnit, "USD/month");
    assert.equal(dtoAllocation.annualUnit, "USD/year");
  }
});
