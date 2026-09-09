import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

test("hypothetical reruns preserve the normalized HSA input contract without recalculating it in the application layer", () => {
  const raw: MoneyPriorityRawSnapshot = {
    householdId: "hsa-contract-rerun",
    people: [{ id: "self", display_name: "Self", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, covered_by_workplace_retirement_plan: false, estimated_taxable_compensation_annual: 100000, is_dependent: false, is_active: true }],
    income: [{ id: "income", owner_person_id: "self", name: "Income", monthly_amount: 5000, monthly_gross_amount: 8000, income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "housing", name: "Housing", category: "housing", monthly_amount: 2500, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }],
    retirementAccounts: [{ id: "hsa", owner_person_id: "self", name: "HSA", account_type: "hsa", balance: 1000, monthly_employee_contribution: 100, monthly_employer_contribution: 50, employee_contributed_ytd: 1200, employer_contributed_ytd: 600, hsa_ytd_tax_year: 2026, hsa_eligible: null, hsa_coverage_type: null }],
    hsaTaxYearProfiles: [{ id: "profile", person_id: "self", tax_year: 2026, medicare_effective_on: null, last_month_rule_status: "not_elected", testing_period_status: "not_applicable", confirmed_at: "2026-09-01T00:00:00.000Z", data_version: 1 }],
    hsaMonthStatuses: [{ id: "month", person_id: "self", tax_year: 2026, month: 9, eligibility_status: "eligible", coverage_status: "self_only", evidence_status: "confirmed" }],
    goals: [],
    debts: [],
    insuranceExposures: [],
  };
  const current = runMoneyPriorityEngine(raw, "2026-09-01");
  const rerun = runHypotheticalMoneyPriorityEngine(current, { addExpenses: [{ id: "future", name: "Future expense", category: "other", monthlyAmount: 50, isEssential: true, cashFlowTreatment: "required" }] }).engine;
  assert.deepEqual(rerun.snapshot.hsa, current.snapshot.hsa);
  assert.equal(rerun.snapshot.retirementAccounts[0]?.hsaYtdTaxYear, 2026);
});
