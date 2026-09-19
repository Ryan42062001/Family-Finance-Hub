-- FFH-011 — explicit SIMPLE plan-limit contract.
--
-- The pre-existing simple_higher_limit_eligible boolean was added without a
-- statutory definition, tax-year binding, or user-facing confirmation flow.
-- Preserve it as a legacy hint only. New authoritative plan-category facts are
-- explicit, tax-year-bound, and intentionally not backfilled from that boolean.

alter table public.retirement_accounts
  add column if not exists simple_plan_limit_category text null,
  add column if not exists simple_plan_limit_tax_year smallint null;

alter table public.retirement_accounts
  drop constraint if exists retirement_accounts_simple_plan_limit_contract_check,
  add constraint retirement_accounts_simple_plan_limit_contract_check check (
    (simple_plan_limit_category is null and simple_plan_limit_tax_year is null)
    or (
      account_type = 'simple_ira'
      and simple_plan_limit_category in ('standard', 'certain_applicable_higher')
      and simple_plan_limit_tax_year between 1900 and 9999
    )
  );

comment on column public.retirement_accounts.simple_higher_limit_eligible is
  'Legacy ambiguous SIMPLE higher-limit hint only. It is not authoritative evidence that a plan is in the statutory certain-applicable-SIMPLE category and must not be promoted without explicit reconfirmation under the FFH-011 contract.';

comment on column public.retirement_accounts.simple_plan_limit_category is
  'Explicit SIMPLE employee-limit category for the paired tax year: standard or certain_applicable_higher. certain_applicable_higher means the plan/employer documentation confirms the statutory certain-applicable-SIMPLE higher-limit category; Family Finance Hub does not infer this category from employee count, account name, or the legacy boolean.';

comment on column public.retirement_accounts.simple_plan_limit_tax_year is
  'Tax year for simple_plan_limit_category. Null with a null category means unconfirmed/unknown. The category is not automatically carried into another tax year.';

-- Intentionally no UPDATE/backfill from simple_higher_limit_eligible. Existing
-- true/false values remain legacy hints until the household explicitly confirms
-- a category for a tax year through the new contract.
