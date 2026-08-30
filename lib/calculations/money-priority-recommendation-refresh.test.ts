import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "h",
    people: [{ id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false }],
    income: [{ id: "i", owner_person_id: "p", name: "Job", monthly_amount: 7000, monthly_gross_amount: 10000, is_active: true }],
    expenses: [{ id: "e", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true }],
    accounts: [{ id: "cash", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }],
    debts: [], goals: [], retirementAccounts: [], insuranceExposures: [],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy", desired_retirement_monthly_spending: null, retirement_spending_basis: "unknown", tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000 },
  };
}

function engine(source = raw(), date = "2026-08-30") { return runMoneyPriorityEngine(source, date); }

test("identical authoritative basis is current and deterministic", () => {
  const a = engine(); const first = assessRecommendationRefresh(a, a); const second = assessRecommendationRefresh(a, a);
  assert.equal(first.state, "current"); assert.deepEqual(first, second);
  assert.equal(first.financialBasisFingerprint, first.previousFinancialBasisFingerprint);
});

test("explicit as-of-date change never relies on wall clock", () => {
  const result = assessRecommendationRefresh(engine(raw(), "2026-08-30"), engine(raw(), "2026-08-31"));
  assert.ok(result.detectedChanges.some((c) => c.category === "time" && c.field === "asOfDate"));
  assert.notEqual(result.state, "current");
});

test("small cash change is distinguished from recommendation impact", () => {
  const before = raw(); const after = structuredClone(before); (after.accounts[0] as any).balance = 12001.37;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.ok(result.detectedChanges.some((c) => c.category === "cash" && c.field === "balance"));
  assert.ok(["refresh_recommended", "materially_changed"].includes(result.state));
});

test("income loss that creates an unsafe plan is critical", () => {
  const before = raw(); const after = structuredClone(before); (after.income[0] as any).monthly_amount = 0; (after.income[0] as any).monthly_gross_amount = 0;
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.state, "critical_change");
  assert.ok(result.detectedChanges.some((c) => c.category === "income"));
});

test("new high-interest debt is detected through authoritative outputs", () => {
  const before = raw(); const after = structuredClone(before);
  (after.debts as any[]).push({ id: "card", name: "Card", debt_type: "credit_card", balance: 5000, annual_interest_rate: 24, minimum_payment: 150, is_past_due: false, is_in_collections: false, has_legal_or_tax_priority: false });
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.ok(result.detectedChanges.some((c) => c.category === "debt" && c.entityId === "card"));
  assert.ok(["materially_changed", "critical_change"].includes(result.state));
});

test("goal addition is detected without title-based identity", () => {
  const before = raw(); const after = structuredClone(before);
  (after.goals as any[]).push({ id: "goal-1", name: "Car", target_amount: 12000, current_amount: 1000, target_date: "2027-08-30", priority: 3, goal_class: "required", necessity: "necessary", deadline_flexibility: "fixed", consequence_level: "high" });
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.ok(result.detectedChanges.some((c) => c.category === "goal" && c.entityId === "goal-1"));
});

test("previous and current engine inputs remain immutable", () => {
  const previous = engine(); const current = engine(); const beforePrevious = structuredClone(previous); const beforeCurrent = structuredClone(current);
  assessRecommendationRefresh(previous, current, []);
  assert.deepEqual(previous, beforePrevious); assert.deepEqual(current, beforeCurrent);
});

test("old override is never silently retargeted", () => {
  const current = engine();
  const result = assessRecommendationRefresh(current, current, [{ allocationId: "gone::debt::gone", monthlyAmount: 100 }]);
  assert.equal(result.overrideStatuses.length, 1);
  assert.equal(result.overrideStatuses[0].allocationId, "gone::debt::gone");
  assert.notEqual(result.overrideStatuses[0].status, "active");
});

test("fingerprints ignore display-name-only changes", () => {
  const before = raw(); const after = structuredClone(before); (after.people[0] as any).display_name = "Renamed Adult"; (after.accounts[0] as any).name = "Renamed Reserve";
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
});

test("equivalent entity ordering has the same basis fingerprint", () => {
  const before = raw();
  (before.accounts as any[]).push({ id: "cash-2", name: "Other", account_type: "checking", balance: 500, cash_purpose: "operating_cash" });
  const after = structuredClone(before); after.accounts.reverse();
  const result = assessRecommendationRefresh(engine(before), engine(after));
  assert.equal(result.financialBasisFingerprint, result.previousFinancialBasisFingerprint);
});
