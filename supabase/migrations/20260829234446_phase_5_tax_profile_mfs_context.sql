alter table public.household_financial_preferences
  add column if not exists lived_with_spouse_during_tax_year boolean;

comment on column public.household_financial_preferences.lived_with_spouse_during_tax_year is 'Planning flag used for married-filing-separately IRA eligibility rules.';
