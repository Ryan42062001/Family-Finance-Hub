-- Phase 5A: one household-level planning fact separates expected current HSA
-- medical spending from long-term HSA accumulation. Existing household RLS
-- continues to protect this preferences row.

alter table public.household_financial_preferences
  add column expected_hsa_medical_spending_annual numeric(14,2) null
  check (
    expected_hsa_medical_spending_annual is null
    or expected_hsa_medical_spending_annual >= 0
  );

comment on column public.household_financial_preferences.expected_hsa_medical_spending_annual is
  'Expected annual HSA distributions/current medical spending used to distinguish long-term HSA accumulation from current medical funding; null means unknown.';
