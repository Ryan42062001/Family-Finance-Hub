-- FFH-023 / FFH-022: explicit pair- and HSA-tax-year-bound legal-spouse authority.
-- Additive and unknown-safe: no existing relationship, filing-status, allocation,
-- or prior-year row is promoted or backfilled.

create table public.household_hsa_legal_spouse_authorities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  tax_year smallint not null check (tax_year between 2004 and 9999),
  person_one_id uuid not null,
  person_two_id uuid not null,
  authority_status text not null default 'unknown'
    check (authority_status in ('confirmed_legal_spouses','confirmed_not_legal_spouses','unknown')),
  confirmation_source text null check (confirmation_source is null or char_length(confirmation_source) between 1 and 200),
  confirmed_at timestamptz null,
  data_version smallint not null default 1 check (data_version between 1 and 32767),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, tax_year, person_one_id, person_two_id),
  check (person_one_id < person_two_id),
  constraint household_hsa_legal_spouse_authorities_person_one_fkey
    foreign key (person_one_id, household_id)
    references public.household_people(id, household_id)
    on delete cascade,
  constraint household_hsa_legal_spouse_authorities_person_two_fkey
    foreign key (person_two_id, household_id)
    references public.household_people(id, household_id)
    on delete cascade
);

comment on table public.household_hsa_legal_spouse_authorities is
  'Explicit pair-specific legal-spouse authority for HSA sharing in one tax year. Missing is unknown; relationship, filing status, allocations, and prior years are non-authoritative.';
comment on column public.household_hsa_legal_spouse_authorities.authority_status is
  'Confirmed legal spouses, confirmed non-spouses, or unknown for HSA spouse-sharing. No state is inferred from spouse_partner or tax filing status.';
comment on column public.household_hsa_legal_spouse_authorities.confirmation_source is
  'User-facing provenance describing the explicit confirmation source; it is not a legal-status derivation rule.';

create index household_hsa_legal_spouse_authorities_household_year_idx
  on public.household_hsa_legal_spouse_authorities(household_id, tax_year);

alter table public.household_hsa_legal_spouse_authorities enable row level security;
revoke all on table public.household_hsa_legal_spouse_authorities from anon, authenticated;
grant select, insert, update, delete on table public.household_hsa_legal_spouse_authorities to authenticated;

create policy household_hsa_legal_spouse_authorities_household_read
  on public.household_hsa_legal_spouse_authorities
  for select to authenticated
  using (private.can_read_household(household_id));
create policy household_hsa_legal_spouse_authorities_household_write_insert
  on public.household_hsa_legal_spouse_authorities
  for insert to authenticated
  with check (private.can_write_household_financials(household_id));
create policy household_hsa_legal_spouse_authorities_household_write_update
  on public.household_hsa_legal_spouse_authorities
  for update to authenticated
  using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy household_hsa_legal_spouse_authorities_household_write_delete
  on public.household_hsa_legal_spouse_authorities
  for delete to authenticated
  using (private.can_write_household_financials(household_id));
