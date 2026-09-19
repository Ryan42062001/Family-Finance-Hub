create table public.household_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  linked_user_id uuid null references auth.users(id) on delete set null,
  relationship text not null default 'other' check (relationship in ('self','spouse_partner','child','dependent_adult','other')),
  birth_date date null,
  planned_retirement_age smallint null check (planned_retirement_age is null or planned_retirement_age between 40 and 100),
  is_dependent boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);

alter table public.household_people enable row level security;
grant select, insert, update, delete on public.household_people to authenticated;
create policy household_people_member_select on public.household_people for select to authenticated using (private.is_household_member(household_id));
create policy household_people_member_insert on public.household_people for insert to authenticated with check (private.is_household_member(household_id));
create policy household_people_member_update on public.household_people for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy household_people_member_delete on public.household_people for delete to authenticated using (private.is_household_member(household_id));

alter table public.income_sources
  add column owner_person_id uuid null,
  add column monthly_gross_amount numeric(14,2) null check (monthly_gross_amount is null or monthly_gross_amount >= 0),
  add column income_type text not null default 'employment' check (income_type in ('employment','self_employment','commission','pension','social_security','rental','other')),
  add column is_variable boolean not null default false,
  add constraint income_sources_owner_person_household_fkey foreign key (owner_person_id, household_id) references public.household_people(id, household_id) on delete set null (owner_person_id);

alter table public.retirement_accounts
  add column owner_person_id uuid null,
  add column tax_treatment text null check (tax_treatment is null or tax_treatment in ('traditional','roth','mixed','not_applicable','unknown')),
  add column employee_contributed_ytd numeric(14,2) null check (employee_contributed_ytd is null or employee_contributed_ytd >= 0),
  add column employer_contributed_ytd numeric(14,2) null check (employer_contributed_ytd is null or employer_contributed_ytd >= 0),
  add column annual_contribution_target numeric(14,2) null check (annual_contribution_target is null or annual_contribution_target >= 0),
  add column full_match_employee_contribution_monthly numeric(14,2) null check (full_match_employee_contribution_monthly is null or full_match_employee_contribution_monthly >= 0),
  add column match_status text not null default 'unknown' check (match_status in ('not_offered','unknown','not_fully_captured','fully_captured')),
  add column hsa_coverage_type text null check (hsa_coverage_type is null or hsa_coverage_type in ('self_only','family','unknown')),
  add column hsa_eligible boolean null,
  add constraint retirement_accounts_owner_person_household_fkey foreign key (owner_person_id, household_id) references public.household_people(id, household_id) on delete set null (owner_person_id);

alter table public.retirement_accounts drop constraint retirement_accounts_account_type_check;
alter table public.retirement_accounts add constraint retirement_accounts_account_type_check check (account_type in ('401k','403b','457','traditional_ira','roth_ira','hsa','pension','tsp','simple_ira','sep_ira','other'));

create table public.household_financial_preferences (
  household_id uuid primary key references public.households(id) on delete cascade,
  emergency_fund_months_override numeric(3,1) null check (emergency_fund_months_override is null or emergency_fund_months_override between 1 and 12),
  debt_vs_investing text not null default 'balanced' check (debt_vs_investing in ('debt_focused','balanced','growth_focused')),
  roth_vs_traditional text not null default 'unspecified' check (roth_vs_traditional in ('roth','traditional','balanced','unspecified')),
  risk_tolerance text not null default 'moderate' check (risk_tolerance in ('conservative','moderate','aggressive')),
  retirement_priority text not null default 'balanced' check (retirement_priority in ('lower','balanced','higher')),
  job_replacement_difficulty text not null default 'unknown' check (job_replacement_difficulty in ('easy','moderate','difficult','unknown')),
  known_income_disruption boolean not null default false,
  known_income_disruption_end_date date null,
  desired_retirement_monthly_spending numeric(14,2) null check (desired_retirement_monthly_spending is null or desired_retirement_monthly_spending >= 0),
  retirement_spending_basis text not null default 'unknown' check (retirement_spending_basis in ('today_dollars','future_dollars','unknown')),
  planning_social_security_monthly numeric(14,2) null check (planning_social_security_monthly is null or planning_social_security_monthly >= 0),
  planning_pension_monthly numeric(14,2) null check (planning_pension_monthly is null or planning_pension_monthly >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (known_income_disruption or known_income_disruption_end_date is null)
);

alter table public.household_financial_preferences enable row level security;
grant select, insert, update, delete on public.household_financial_preferences to authenticated;
create policy household_financial_preferences_member_select on public.household_financial_preferences for select to authenticated using (private.is_household_member(household_id));
create policy household_financial_preferences_member_insert on public.household_financial_preferences for insert to authenticated with check (private.is_household_member(household_id));
create policy household_financial_preferences_member_update on public.household_financial_preferences for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy household_financial_preferences_member_delete on public.household_financial_preferences for delete to authenticated using (private.is_household_member(household_id));
