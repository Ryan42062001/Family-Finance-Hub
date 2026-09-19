create index household_people_household_id_idx on public.household_people(household_id);
create index household_people_linked_user_id_idx on public.household_people(linked_user_id) where linked_user_id is not null;
create index income_sources_owner_person_household_idx on public.income_sources(owner_person_id, household_id) where owner_person_id is not null;
create index retirement_accounts_owner_person_household_idx on public.retirement_accounts(owner_person_id, household_id) where owner_person_id is not null;
