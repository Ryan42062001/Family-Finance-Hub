alter table public.household_financial_preferences
  add column if not exists tax_profile_year smallint,
  add column if not exists tax_filing_status text,
  add column if not exists estimated_modified_agi numeric;

alter table public.household_financial_preferences
  drop constraint if exists household_financial_preferences_tax_profile_year_check,
  add constraint household_financial_preferences_tax_profile_year_check check (tax_profile_year is null or tax_profile_year between 2020 and 2100),
  drop constraint if exists household_financial_preferences_tax_filing_status_check,
  add constraint household_financial_preferences_tax_filing_status_check check (tax_filing_status is null or tax_filing_status in ('single', 'head_of_household', 'married_filing_jointly', 'married_filing_separately')),
  drop constraint if exists household_financial_preferences_estimated_modified_agi_check,
  add constraint household_financial_preferences_estimated_modified_agi_check check (estimated_modified_agi is null or estimated_modified_agi >= 0);

alter table public.household_people
  add column if not exists covered_by_workplace_retirement_plan boolean,
  add column if not exists estimated_taxable_compensation_annual numeric;

alter table public.household_people
  drop constraint if exists household_people_estimated_taxable_compensation_annual_check,
  add constraint household_people_estimated_taxable_compensation_annual_check check (estimated_taxable_compensation_annual is null or estimated_taxable_compensation_annual >= 0);

comment on column public.household_financial_preferences.tax_profile_year is 'Tax year for the household planning tax profile used by contribution eligibility calculations.';
comment on column public.household_financial_preferences.tax_filing_status is 'Planning tax filing status; not a filed tax return.';
comment on column public.household_financial_preferences.estimated_modified_agi is 'Estimated modified adjusted gross income for planning eligibility calculations.';
comment on column public.household_people.covered_by_workplace_retirement_plan is 'Whether this person is covered by a workplace retirement plan for IRA deduction planning.';
comment on column public.household_people.estimated_taxable_compensation_annual is 'Estimated annual taxable compensation used only for contribution-limit planning.';
