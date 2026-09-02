import { createClient } from "@/lib/supabase/server";
import { buildMoneyPrioritySnapshot, type MoneyPrioritySnapshot } from "@/lib/calculations/money-priority-snapshot";

export async function loadMoneyPrioritySnapshot(householdId: string): Promise<MoneyPrioritySnapshot> {
  const supabase = await createClient();

  const [people, income, expenses, accounts, debts, retirementAccounts, goals, insuranceExposures, preferences] = await Promise.all([
    supabase.from("household_people").select("id, display_name, relationship, birth_date, planned_retirement_age, covered_by_workplace_retirement_plan, estimated_taxable_compensation_annual, is_dependent, is_active").eq("household_id", householdId).order("created_at"),
    supabase.from("income_sources").select("id, owner_person_id, name, monthly_amount, monthly_gross_amount, income_type, is_variable, is_active").eq("household_id", householdId).order("created_at"),
    supabase.from("expenses").select("id, name, category, monthly_amount, is_essential, cash_flow_treatment").eq("household_id", householdId).order("created_at"),
    supabase.from("accounts").select("id, name, account_type, balance, cash_purpose, related_goal_id, related_debt_id").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("id, name, debt_type, current_balance, interest_rate, minimum_payment, rate_type, promo_rate_expires_on, post_promo_interest_rate, is_past_due, is_in_collections, has_legal_or_tax_priority, forgiveness_or_repayment_program, scheduled_payoff_date, student_loan_source, student_loan_repayment_plan, student_loan_forgiveness_strategy, student_loan_strategy_active, current_required_monthly_payment, qualifying_payments_made, qualifying_payments_required, estimated_forgiveness_amount, estimated_forgiveness_date, forgiveness_tax_treatment, estimated_forgiveness_tax_liability, employer_direct_loan_assistance_monthly, employer_direct_loan_assistance_remaining, qualified_student_loan_payment_retirement_match_offered, qualified_payment_required_for_full_retirement_match, expected_student_loan_based_employer_match_monthly").eq("household_id", householdId).order("created_at"),
    supabase.from("retirement_accounts").select("id, owner_person_id, name, account_type, balance, monthly_employee_contribution, monthly_employer_contribution, tax_treatment, employee_contributed_ytd, employer_contributed_ytd, annual_contribution_target, full_match_employee_contribution_monthly, match_status, hsa_coverage_type, hsa_eligible, simple_higher_limit_eligible, employer_contribution_type, plan_eligible_compensation_annual, prior_year_sponsor_wages, roth_catch_up_supported, sep_eligible_compensation_annual, sep_compensation_calculation_supported").eq("household_id", householdId).order("created_at"),
    supabase.from("goals").select("id, name, target_amount, current_amount, target_date, priority, goal_class, necessity, deadline_flexibility, consequence_level, planned_monthly_contribution, core_need_amount").eq("household_id", householdId).order("created_at"),
    supabase.from("insurance_exposures").select("id, person_id, name, insurance_type, deductible_amount, family_deductible_amount, out_of_pocket_max, percentage_deductible, insured_value, is_relevant_to_reserve").eq("household_id", householdId).order("created_at"),
    supabase.from("household_financial_preferences").select("emergency_fund_months_override, debt_vs_investing, roth_vs_traditional, risk_tolerance, retirement_priority, job_replacement_difficulty, known_income_disruption, known_income_disruption_end_date, desired_retirement_monthly_spending, retirement_spending_basis, planning_social_security_monthly, planning_pension_monthly, expected_hsa_medical_spending_annual, tax_profile_year, tax_filing_status, estimated_modified_agi, lived_with_spouse_during_tax_year").eq("household_id", householdId).maybeSingle(),
  ]);

  const results = [people, income, expenses, accounts, debts, retirementAccounts, goals, insuranceExposures, preferences];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return buildMoneyPrioritySnapshot({
    householdId,
    people: people.data,
    income: income.data,
    expenses: expenses.data,
    accounts: accounts.data,
    debts: debts.data,
    retirementAccounts: retirementAccounts.data,
    goals: goals.data,
    insuranceExposures: insuranceExposures.data,
    preferences: preferences.data,
  });
}
