-- FFH-010 / FFH-D005: canonical tax-year-bound HSA input contract.
-- This migration is additive. It deliberately does not backfill legacy
-- retirement_accounts.hsa_eligible / hsa_coverage_type into affirmative
-- person-month legal facts.

alter table public.retirement_accounts
  add column hsa_ytd_tax_year smallint null
  check (hsa_ytd_tax_year is null or hsa_ytd_tax_year between 2004 and 9999);

alter table public.retirement_accounts
  add constraint retirement_accounts_hsa_ytd_tax_year_scope_check
  check (hsa_ytd_tax_year is null or account_type = 'hsa');

comment on column public.retirement_accounts.hsa_ytd_tax_year is
  'Tax year explicitly binding employee_contributed_ytd and employer_contributed_ytd when the row is an HSA. Null means the legacy/current-year aggregate is not verified for legal-capacity use.';

create table public.person_hsa_tax_year_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null,
  tax_year smallint not null check (tax_year between 2004 and 9999),
  medicare_effective_on date null,
  last_month_rule_status text null
    check (last_month_rule_status is null or last_month_rule_status in ('not_elected','elected','unknown')),
  testing_period_status text null
    check (testing_period_status is null or testing_period_status in ('not_applicable','pending','satisfied','failed','unknown')),
  confirmed_at timestamptz null,
  data_version smallint not null default 1 check (data_version between 1 and 32767),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, household_id, tax_year),
  constraint person_hsa_tax_year_profiles_person_household_fkey
    foreign key (person_id, household_id)
    references public.household_people(id, household_id)
    on delete cascade
);

comment on table public.person_hsa_tax_year_profiles is
  'Canonical person + tax-year HSA legal-input profile. Account existence and legacy account eligibility hints are not authoritative person eligibility.';
comment on column public.person_hsa_tax_year_profiles.medicare_effective_on is
  'Known Medicare effective date relevant to HSA eligibility. Null means unknown/not supplied; it is never inferred from age.';
comment on column public.person_hsa_tax_year_profiles.last_month_rule_status is
  'Explicit household reliance status for the HSA last-month rule. Null/unknown is non-affirmative; elected is never inferred from December eligibility.';
comment on column public.person_hsa_tax_year_profiles.testing_period_status is
  'Testing-period planning status associated with explicit last-month-rule treatment; null/unknown remains unresolved.';

create table public.person_hsa_month_statuses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null,
  tax_year smallint not null check (tax_year between 2004 and 9999),
  month smallint not null check (month between 1 and 12),
  eligibility_status text not null default 'unknown'
    check (eligibility_status in ('eligible','ineligible','unknown')),
  coverage_status text not null default 'unknown'
    check (coverage_status in ('self_only','family','none','unknown')),
  evidence_status text not null default 'unknown'
    check (evidence_status in ('confirmed','planning_assumption','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, household_id, tax_year, month),
  constraint person_hsa_month_statuses_profile_fkey
    foreign key (person_id, household_id, tax_year)
    references public.person_hsa_tax_year_profiles(person_id, household_id, tax_year)
    on delete cascade
);

comment on table public.person_hsa_month_statuses is
  'Canonical month-level HSA eligibility/coverage facts or explicit planning assumptions. Unknown is a first-class non-affirmative state.';
comment on column public.person_hsa_month_statuses.evidence_status is
  'Distinguishes confirmed facts from explicit planning assumptions; unknown is never upgraded automatically.';

create table public.household_hsa_married_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  tax_year smallint not null check (tax_year between 2004 and 9999),
  person_one_id uuid not null,
  person_two_id uuid not null,
  person_one_ordinary_amount numeric(14,2) not null check (person_one_ordinary_amount >= 0),
  person_two_ordinary_amount numeric(14,2) not null check (person_two_ordinary_amount >= 0),
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, tax_year),
  check (person_one_id <> person_two_id),
  constraint household_hsa_married_allocations_person_one_fkey
    foreign key (person_one_id, household_id)
    references public.household_people(id, household_id)
    on delete cascade,
  constraint household_hsa_married_allocations_person_two_fkey
    foreign key (person_two_id, household_id)
    references public.household_people(id, household_id)
    on delete cascade
);

comment on table public.household_hsa_married_allocations is
  'Optional explicit tax-year alternate spouse allocation of the shared ordinary HSA base. Absence means no alternate agreement is persisted; the equal default remains derived policy.';

create index person_hsa_tax_year_profiles_household_year_idx
  on public.person_hsa_tax_year_profiles(household_id, tax_year);
create index person_hsa_month_statuses_household_year_idx
  on public.person_hsa_month_statuses(household_id, tax_year);
create index person_hsa_month_statuses_person_year_month_idx
  on public.person_hsa_month_statuses(person_id, tax_year, month);
create index household_hsa_married_allocations_household_year_idx
  on public.household_hsa_married_allocations(household_id, tax_year);

alter table public.person_hsa_tax_year_profiles enable row level security;
alter table public.person_hsa_month_statuses enable row level security;
alter table public.household_hsa_married_allocations enable row level security;

revoke all on table public.person_hsa_tax_year_profiles from anon, authenticated;
revoke all on table public.person_hsa_month_statuses from anon, authenticated;
revoke all on table public.household_hsa_married_allocations from anon, authenticated;

grant select, insert, update, delete on table public.person_hsa_tax_year_profiles to authenticated;
grant select, insert, update, delete on table public.person_hsa_month_statuses to authenticated;
grant select, insert, update, delete on table public.household_hsa_married_allocations to authenticated;

create policy person_hsa_tax_year_profiles_household_read
  on public.person_hsa_tax_year_profiles
  for select to authenticated
  using (private.can_read_household(household_id));
create policy person_hsa_tax_year_profiles_household_write_insert
  on public.person_hsa_tax_year_profiles
  for insert to authenticated
  with check (private.can_write_household_financials(household_id));
create policy person_hsa_tax_year_profiles_household_write_update
  on public.person_hsa_tax_year_profiles
  for update to authenticated
  using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy person_hsa_tax_year_profiles_household_write_delete
  on public.person_hsa_tax_year_profiles
  for delete to authenticated
  using (private.can_write_household_financials(household_id));

create policy person_hsa_month_statuses_household_read
  on public.person_hsa_month_statuses
  for select to authenticated
  using (private.can_read_household(household_id));
create policy person_hsa_month_statuses_household_write_insert
  on public.person_hsa_month_statuses
  for insert to authenticated
  with check (private.can_write_household_financials(household_id));
create policy person_hsa_month_statuses_household_write_update
  on public.person_hsa_month_statuses
  for update to authenticated
  using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy person_hsa_month_statuses_household_write_delete
  on public.person_hsa_month_statuses
  for delete to authenticated
  using (private.can_write_household_financials(household_id));

create policy household_hsa_married_allocations_household_read
  on public.household_hsa_married_allocations
  for select to authenticated
  using (private.can_read_household(household_id));
create policy household_hsa_married_allocations_household_write_insert
  on public.household_hsa_married_allocations
  for insert to authenticated
  with check (private.can_write_household_financials(household_id));
create policy household_hsa_married_allocations_household_write_update
  on public.household_hsa_married_allocations
  for update to authenticated
  using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy household_hsa_married_allocations_household_write_delete
  on public.household_hsa_married_allocations
  for delete to authenticated
  using (private.can_write_household_financials(household_id));
