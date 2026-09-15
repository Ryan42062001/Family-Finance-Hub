import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { withConfirmedLegacyGoalFacts } from "./legacy-goal-test-fixtures.ts";

const AS_OF = "2026-08-30";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "refresh-h",
    people: [{ id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false }],
    income: [{ id: "income", owner_person_id: "p", name: "Job", monthly_amount: 7000, monthly_gross_amount: 10000, is_variable: false, is_active: true }],
    expenses: [{ id: "essential", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true }],
    accounts: [
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
      { id: "checking", name: "Checking", account_type: "checking", balance: 4500, cash_purpose: "operating_cash" },
    ],
    debts: [], goals: [], retirementAccounts: [], insuranceExposures: [],
    preferences: {
      emergency_fund_months_override: 3,
      debt_vs_investing: "balanced",
      job_replacement_difficulty: "easy",
      desired_retirement_monthly_spending: null,
      retirement_spending_basis: "unknown",
      tax_profile_year: 2026,
      tax_filing_status: "single",
      estimated_modified_agi: 100000,
    },
  };
}

function engine(source = raw(), date = AS_OF): MoneyPriorityEngineResult { return runMoneyPriorityEngine(withConfirmedLegacyGoalFacts(source), date); }
function cloneResult(value: MoneyPriorityEngineResult): MoneyPriorityEngineResult { return structuredClone(value); }

test("false-positive control: small financially relevant cash change is refresh recommended when action is unchanged", () => {
  const before = raw(); const after = structuredClone(before); after.accounts![1].balance = 4501.37;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "refresh_recommended");
  assert.notEqual(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
  assert.equal(result.recommendationFingerprint, result.previousRecommendationFingerprint);
});

test("money values that normalize to the same cent do not create staleness", () => {
  const before = raw(); const after = structuredClone(before); after.accounts![1].balance = 4500.004;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "current");
  assert.equal(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
});

test("non-money APR precision is not incorrectly rounded to cents", () => {
  const before = raw();
  before.debts!.push({ id: "loan", name: "Loan", debt_type: "personal_loan", current_balance: 1000, interest_rate: 4.001, minimum_payment: 10 });
  const after = structuredClone(before); after.debts![0].interest_rate = 4.002;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.notEqual(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
  assert.ok(result.detectedChanges.some((change) => change.category === "debt" && change.field === "annualInterestRate"));
});

test("stable-id entity ordering is fingerprint independent", () => {
  const before = raw(); before.accounts!.push({ id: "z", name: "Z", account_type: "savings", balance: 200, cash_purpose: "earmarked_goal", related_goal_id: "g" });
  before.goals!.push({ id: "g", name: "Goal", target_amount: 200, current_amount: 200, target_date: "2027-01-01", priority: 3, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "flexible", consequence_level: "low" });
  const after = structuredClone(before); after.accounts!.reverse(); after.goals!.reverse();
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "current");
  assert.equal(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
});

test("explanation prose does not define recommendation identity", () => {
  const previous = engine(); const current = cloneResult(previous);
  current.recommendations = current.recommendations.map((item) => ({ ...item, title: `Changed ${item.title}`, explanation: `Changed ${item.explanation}`, whyNow: ["Different wording"], tradeoffs: ["Different wording"] }));
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "current");
  assert.equal(result.recommendationFingerprint, result.previousRecommendationFingerprint);
});

test("policy-only basis change with equivalent recommendation requests refresh", () => {
  const previous = engine(); const current = cloneResult(previous); current.policyVersion = "future-policy-test";
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "refresh_recommended");
  assert.ok(result.detectedChanges.some((change) => change.category === "policy" && change.field === "policyVersion"));
  assert.equal(result.currentPolicyBasis.moneyPriorityPolicyVersion, "future-policy-test");
});

test("planning-assumption-only change with equivalent recommendation requests refresh", () => {
  const previous = engine(); const current = cloneResult(previous); current.planningAssumptionsVersion = "future-assumptions-test";
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "refresh_recommended");
  assert.ok(result.detectedChanges.some((change) => change.category === "assumptions"));
});

test("tax-policy-only change with equivalent recommendation requests refresh", () => {
  const previous = engine(); const current = cloneResult(previous); current.taxPolicyVersion = "future-tax-test";
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "refresh_recommended");
  assert.ok(result.detectedChanges.some((change) => change.field === "taxPolicyVersion"));
});

test("tax-year rollover cannot remain silently current", () => {
  const previous = engine(); const current = cloneResult(previous); current.taxYear = previous.taxYear + 1;
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "refresh_recommended");
  assert.ok(result.detectedChanges.some((change) => change.field === "taxYear"));
});

test("harmless explicit time passage with equivalent recommendation is refresh recommended", () => {
  const result = assessRecommendationRefresh(engine(raw(), "2026-08-30"), engine(raw(), "2026-08-31"));
  assert.equal(result.state, "refresh_recommended");
  assert.ok(result.detectedChanges.some((change) => change.category === "time"));
});

test("new funding gap is a critical transition", () => {
  const previous = engine(); const current = cloneResult(previous);
  current.feasibility = { ...current.feasibility, status: "funding_gap", planFundingGap: 100 };
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "critical_change");
  assert.deepEqual(result.stateTransition, { previousFeasibilityStatus: previous.feasibility.status, currentFeasibilityStatus: "funding_gap" });
});

test("funding-gap amount change while already in gap is material rather than silently current", () => {
  const previous = engine(); previous.feasibility = { ...previous.feasibility, status: "funding_gap", planFundingGap: 100 };
  const current = cloneResult(previous); current.feasibility.planFundingGap = 250;
  const result = assessRecommendationRefresh(previous, current);
  assert.equal(result.state, "materially_changed");
});

test("monthly capacity change is inspectable without automatically implying recommendation impact", () => {
  const previous = engine(); const current = cloneResult(previous); current.feasibility.monthlyPlanCapacity += 1;
  const result = assessRecommendationRefresh(previous, current);
  assert.ok(result.detectedChanges.some((change) => change.category === "feasibility" && change.field === "monthlyPlanCapacity"));
  assert.equal(result.recommendationFingerprint, result.previousRecommendationFingerprint);
});

test("new high-interest debt creates critical Secure transition", () => {
  const before = raw(); const after = structuredClone(before);
  after.debts!.push({ id: "card", name: "Card", debt_type: "credit_card", current_balance: 5000, interest_rate: 20, minimum_payment: 150, is_past_due: false, is_in_collections: false, has_legal_or_tax_priority: false });
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "critical_change");
  assert.ok(result.addedRecommendations.some((change) => change.recommendationId.includes("secure-debt-high-card")));
});

test("ordinary low-rate debt balance change is not automatically critical", () => {
  const before = raw(); before.debts!.push({ id: "low", name: "Low", debt_type: "personal_loan", current_balance: 5000, interest_rate: 2, minimum_payment: 100 });
  const after = structuredClone(before); after.debts![0].current_balance = 4900;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.notEqual(result.state, "critical_change");
  assert.ok(result.detectedChanges.some((change) => change.category === "debt" && change.field === "balance"));
});

test("protected reserve depletion that creates Secure action is critical", () => {
  const before = raw(); const after = structuredClone(before); after.accounts![0].balance = 1000;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "critical_change");
  assert.ok(result.addedRecommendations.some((change) => change.recommendationId === "secure-full-emergency-fund" || change.recommendationId === "secure-deductible-gap"));
});

test("new employer-match gap is a critical opportunity transition", () => {
  const before = raw();
  before.retirementAccounts!.push({ id: "r", owner_person_id: "p", name: "401k", account_type: "401k", balance: 50000, monthly_employee_contribution: 500, monthly_employer_contribution: 250, employee_contributed_ytd: 4000, employer_contributed_ytd: 2000, plan_eligible_compensation_annual: 120000, full_match_employee_contribution_monthly: 500, match_status: "fully_captured" });
  const after = structuredClone(before); after.retirementAccounts![0].monthly_employee_contribution = 0; after.retirementAccounts![0].match_status = "not_fully_captured";
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "critical_change");
  assert.ok(result.addedRecommendations.some((change) => change.recommendationId.includes("secure-match-gap-r")));
});

test("committed expense classification change is detected without collapsing essential semantics", () => {
  const before = raw(); before.expenses!.push({ id: "contract", name: "Contract", category: "other", monthly_amount: 300, is_essential: false, cash_flow_treatment: "discretionary" });
  const after = structuredClone(before); after.expenses![1].cash_flow_treatment = "required";
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.ok(result.detectedChanges.some((change) => change.category === "expense" && change.field === "cashFlowTreatment"));
  assert.equal(engine(after).snapshot.aggregates.monthlyEssentialExpenses, engine(before).snapshot.aggregates.monthlyEssentialExpenses);
  assert.ok(engine(after).snapshot.aggregates.monthlyRequiredOutflow > engine(before).snapshot.aggregates.monthlyRequiredOutflow);
});

test("cash-purpose classification change is financially relevant", () => {
  const before = raw(); const after = structuredClone(before); after.accounts![1].cash_purpose = "unallocated";
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.ok(result.detectedChanges.some((change) => change.category === "cash" && change.field === "cashPurpose"));
  assert.notEqual(result.state, "current");
});

test("tax-profile changes are classified separately", () => {
  const before = raw(); const after = structuredClone(before); after.preferences!.estimated_modified_agi = 160000;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.ok(result.detectedChanges.some((change) => change.category === "tax_profile"));
});

test("known income disruption activation remains critical and explicit", () => {
  const before = raw(); const after = structuredClone(before); after.preferences!.known_income_disruption = true; after.preferences!.known_income_disruption_end_date = "2027-02-28";
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "critical_change");
  assert.ok(result.detectedChanges.some((change) => change.category === "risk"));
});

test("added removed and changed recommendation collections mirror the combined diff", () => {
  const before = raw(); const after = structuredClone(before); after.debts!.push({ id: "card", name: "Card", debt_type: "credit_card", current_balance: 5000, interest_rate: 20, minimum_payment: 150 });
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.recommendationChanges.length, result.addedRecommendations.length + result.removedRecommendations.length + result.changedRecommendations.length);
});

test("display names do not change goal identity or financial fingerprint", () => {
  const before = raw(); before.goals!.push({ id: "goal", name: "Original", target_amount: 1000, current_amount: 500, target_date: "2027-08-30", priority: 3, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "flexible", consequence_level: "low" });
  const after = structuredClone(before); after.goals![0].name = "Renamed";
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
  assert.equal(result.state, "current");
});

test("removed recommendation is exposed separately", () => {
  const before = raw(); before.debts!.push({ id: "card", name: "Card", debt_type: "credit_card", current_balance: 5000, interest_rate: 20, minimum_payment: 150 });
  const result = assessRecommendationRefresh(engine(before), engine(raw()));
  assert.ok(result.removedRecommendations.some((change) => change.recommendationId.includes("card")));
});

test("previous overrides are reconciled after the current Recommended Plan and are not mutated", () => {
  const source = raw(); source.goals!.push({ id: "goal", name: "Goal", target_amount: 12000, current_amount: 0, target_date: "2027-08-30", priority: 2, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "flexible", consequence_level: "moderate" });
  const current = engine(source);
  const allocation = current.recommendations.flatMap((recommendation) => recommendation.allocations.map((item) => ({ recommendation, item }))).find(({ item }) => item.relatedEntityId === "goal");
  assert.ok(allocation);
  const allocationId = `${allocation!.recommendation.id}::${allocation!.item.category}::${allocation!.item.relatedEntityId ?? "household"}`;
  const overrides = [{ allocationId, monthlyAmount: Math.max(0, allocation!.item.monthlyAmount) }];
  const beforeOverrides = structuredClone(overrides); const beforeEngine = structuredClone(current);
  const result = assessRecommendationRefresh(current, current, overrides);
  assert.equal(result.overrideStatuses[0].allocationId, allocationId);
  assert.deepEqual(overrides, beforeOverrides);
  assert.deepEqual(current, beforeEngine);
});

test("stale override is never silently retargeted", () => {
  const overrides = [{ allocationId: "old-recommendation::debt::paid", monthlyAmount: 100 }];
  const result = assessRecommendationRefresh(engine(), engine(), overrides);
  assert.equal(result.overrideStatuses[0].allocationId, overrides[0].allocationId);
  assert.notEqual(result.overrideStatuses[0].status, "active");
});

test("assessment is deterministic and does not mutate either authoritative result", () => {
  const previous = engine(); const current = engine(); const beforePrevious = structuredClone(previous); const beforeCurrent = structuredClone(current);
  const first = assessRecommendationRefresh(previous, current); const second = assessRecommendationRefresh(previous, current);
  assert.deepEqual(first, second);
  assert.deepEqual(previous, beforePrevious); assert.deepEqual(current, beforeCurrent);
});
