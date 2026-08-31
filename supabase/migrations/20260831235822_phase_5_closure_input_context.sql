alter table public.expenses
  add column if not exists cash_flow_treatment text not null default 'discretionary';

alter table public.expenses
  drop constraint if exists expenses_cash_flow_treatment_check,
  add constraint expenses_cash_flow_treatment_check
    check (cash_flow_treatment in ('required','discretionary'));

alter table public.debts
  add column if not exists student_loan_source text,
  add column if not exists student_loan_repayment_plan text,
  add column if not exists student_loan_forgiveness_strategy text,
  add column if not exists student_loan_strategy_active boolean,
  add column if not exists current_required_monthly_payment numeric(14,2),
  add column if not exists qualifying_payments_made integer,
  add column if not exists qualifying_payments_required integer,
  add column if not exists estimated_forgiveness_amount numeric(14,2),
  add column if not exists estimated_forgiveness_date date,
  add column if not exists forgiveness_tax_treatment text,
  add column if not exists estimated_forgiveness_tax_liability numeric(14,2),
  add column if not exists employer_direct_loan_assistance_monthly numeric(14,2),
  add column if not exists employer_direct_loan_assistance_remaining numeric(14,2),
  add column if not exists qualified_student_loan_payment_retirement_match_offered boolean,
  add column if not exists qualified_payment_required_for_full_retirement_match numeric(14,2),
  add column if not exists expected_student_loan_based_employer_match_monthly numeric(14,2);

alter table public.debts
  drop constraint if exists debts_student_loan_source_check,
  add constraint debts_student_loan_source_check check (student_loan_source is null or student_loan_source in ('federal','private','unknown')),
  drop constraint if exists debts_student_loan_repayment_plan_check,
  add constraint debts_student_loan_repayment_plan_check check (student_loan_repayment_plan is null or student_loan_repayment_plan in ('standard','tiered_standard','ibr','icr','paye','rap','other','unknown')),
  drop constraint if exists debts_student_loan_forgiveness_strategy_check,
  add constraint debts_student_loan_forgiveness_strategy_check check (student_loan_forgiveness_strategy is null or student_loan_forgiveness_strategy in ('none','pslf','idr','teacher','health_service','other','unknown')),
  drop constraint if exists debts_current_required_monthly_payment_check,
  add constraint debts_current_required_monthly_payment_check check (current_required_monthly_payment is null or current_required_monthly_payment >= 0),
  drop constraint if exists debts_qualifying_payments_made_check,
  add constraint debts_qualifying_payments_made_check check (qualifying_payments_made is null or qualifying_payments_made >= 0),
  drop constraint if exists debts_qualifying_payments_required_check,
  add constraint debts_qualifying_payments_required_check check (qualifying_payments_required is null or qualifying_payments_required >= 0),
  drop constraint if exists debts_estimated_forgiveness_amount_check,
  add constraint debts_estimated_forgiveness_amount_check check (estimated_forgiveness_amount is null or estimated_forgiveness_amount >= 0),
  drop constraint if exists debts_forgiveness_tax_treatment_check,
  add constraint debts_forgiveness_tax_treatment_check check (forgiveness_tax_treatment is null or forgiveness_tax_treatment in ('federally_tax_free','potentially_taxable','unknown')),
  drop constraint if exists debts_estimated_forgiveness_tax_liability_check,
  add constraint debts_estimated_forgiveness_tax_liability_check check (estimated_forgiveness_tax_liability is null or estimated_forgiveness_tax_liability >= 0),
  drop constraint if exists debts_employer_direct_loan_assistance_monthly_check,
  add constraint debts_employer_direct_loan_assistance_monthly_check check (employer_direct_loan_assistance_monthly is null or employer_direct_loan_assistance_monthly >= 0),
  drop constraint if exists debts_employer_direct_loan_assistance_remaining_check,
  add constraint debts_employer_direct_loan_assistance_remaining_check check (employer_direct_loan_assistance_remaining is null or employer_direct_loan_assistance_remaining >= 0),
  drop constraint if exists debts_qualified_payment_required_for_full_retirement_match_check,
  add constraint debts_qualified_payment_required_for_full_retirement_match_check check (qualified_payment_required_for_full_retirement_match is null or qualified_payment_required_for_full_retirement_match >= 0),
  drop constraint if exists debts_expected_student_loan_based_employer_match_monthly_check,
  add constraint debts_expected_student_loan_based_employer_match_monthly_check check (expected_student_loan_based_employer_match_monthly is null or expected_student_loan_based_employer_match_monthly >= 0);

alter table public.retirement_accounts
  add column if not exists simple_higher_limit_eligible boolean,
  add column if not exists employer_contribution_type text,
  add column if not exists prior_year_sponsor_wages numeric(14,2),
  add column if not exists roth_catch_up_supported boolean,
  add column if not exists sep_eligible_compensation_annual numeric(14,2),
  add column if not exists sep_compensation_calculation_supported boolean;

alter table public.retirement_accounts
  drop constraint if exists retirement_accounts_employer_contribution_type_check,
  add constraint retirement_accounts_employer_contribution_type_check check (employer_contribution_type is null or employer_contribution_type in ('match','nonelective','profit_sharing','other','unknown')),
  drop constraint if exists retirement_accounts_prior_year_sponsor_wages_check,
  add constraint retirement_accounts_prior_year_sponsor_wages_check check (prior_year_sponsor_wages is null or prior_year_sponsor_wages >= 0),
  drop constraint if exists retirement_accounts_sep_eligible_compensation_annual_check,
  add constraint retirement_accounts_sep_eligible_compensation_annual_check check (sep_eligible_compensation_annual is null or sep_eligible_compensation_annual >= 0);

comment on column public.expenses.cash_flow_treatment is 'Phase 5 recurring cash-flow treatment for nonessential expenses; essential expenses remain required in normalization.';
comment on column public.debts.student_loan_strategy_active is 'Household-confirmed planning flag only; Family Finance Hub does not certify program eligibility.';
comment on column public.retirement_accounts.prior_year_sponsor_wages is 'Prior-year wages from the sponsoring employer used only for Roth catch-up planning.';