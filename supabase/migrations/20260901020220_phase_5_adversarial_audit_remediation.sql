-- Phase 5 adversarial-audit remediation: role-aware household authorization,
-- immutable creator identity, and plan-specific workplace compensation.

create or replace function private.can_read_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_write_household_financials(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
      and hm.role in ('owner', 'member')
  );
$$;

create or replace function private.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
      and hm.role = 'owner'
  );
$$;

revoke all on function private.can_read_household(uuid) from public, anon, authenticated;
revoke all on function private.can_write_household_financials(uuid) from public, anon, authenticated;
revoke all on function private.is_household_owner(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.can_read_household(uuid) to authenticated;
grant execute on function private.can_write_household_financials(uuid) to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;

create or replace function private.preserve_household_created_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'households.created_by is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.preserve_household_created_by() from public, anon, authenticated;

drop trigger if exists preserve_household_created_by_trigger on public.households;
create trigger preserve_household_created_by_trigger
before update on public.households
for each row execute function private.preserve_household_created_by();

drop policy if exists households_select_members on public.households;
drop policy if exists households_update_members on public.households;
create policy households_select_members on public.households
  for select to authenticated using (private.can_read_household(id));
create policy households_update_owners on public.households
  for update to authenticated
  using (private.is_household_owner(id))
  with check (private.is_household_owner(id));

drop policy if exists household_members_select_same_household on public.household_members;
create policy household_members_select_same_household on public.household_members
  for select to authenticated using (private.can_read_household(household_id));

-- Household financial records are readable by every household role, but only
-- owners and members may create, change, or remove them.
drop policy if exists accounts_member_select on public.accounts;
drop policy if exists accounts_member_insert on public.accounts;
drop policy if exists accounts_member_update on public.accounts;
drop policy if exists accounts_member_delete on public.accounts;
create policy accounts_household_read on public.accounts for select to authenticated using (private.can_read_household(household_id));
create policy accounts_household_write_insert on public.accounts for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy accounts_household_write_update on public.accounts for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy accounts_household_write_delete on public.accounts for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists income_sources_member_select on public.income_sources;
drop policy if exists income_sources_member_insert on public.income_sources;
drop policy if exists income_sources_member_update on public.income_sources;
drop policy if exists income_sources_member_delete on public.income_sources;
create policy income_sources_household_read on public.income_sources for select to authenticated using (private.can_read_household(household_id));
create policy income_sources_household_write_insert on public.income_sources for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy income_sources_household_write_update on public.income_sources for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy income_sources_household_write_delete on public.income_sources for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists expenses_member_select on public.expenses;
drop policy if exists expenses_member_insert on public.expenses;
drop policy if exists expenses_member_update on public.expenses;
drop policy if exists expenses_member_delete on public.expenses;
create policy expenses_household_read on public.expenses for select to authenticated using (private.can_read_household(household_id));
create policy expenses_household_write_insert on public.expenses for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy expenses_household_write_update on public.expenses for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy expenses_household_write_delete on public.expenses for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists debts_member_select on public.debts;
drop policy if exists debts_member_insert on public.debts;
drop policy if exists debts_member_update on public.debts;
drop policy if exists debts_member_delete on public.debts;
create policy debts_household_read on public.debts for select to authenticated using (private.can_read_household(household_id));
create policy debts_household_write_insert on public.debts for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy debts_household_write_update on public.debts for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy debts_household_write_delete on public.debts for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists retirement_accounts_member_select on public.retirement_accounts;
drop policy if exists retirement_accounts_member_insert on public.retirement_accounts;
drop policy if exists retirement_accounts_member_update on public.retirement_accounts;
drop policy if exists retirement_accounts_member_delete on public.retirement_accounts;
create policy retirement_accounts_household_read on public.retirement_accounts for select to authenticated using (private.can_read_household(household_id));
create policy retirement_accounts_household_write_insert on public.retirement_accounts for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy retirement_accounts_household_write_update on public.retirement_accounts for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy retirement_accounts_household_write_delete on public.retirement_accounts for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists goals_member_select on public.goals;
drop policy if exists goals_member_insert on public.goals;
drop policy if exists goals_member_update on public.goals;
drop policy if exists goals_member_delete on public.goals;
create policy goals_household_read on public.goals for select to authenticated using (private.can_read_household(household_id));
create policy goals_household_write_insert on public.goals for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy goals_household_write_update on public.goals for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy goals_household_write_delete on public.goals for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists household_people_member_select on public.household_people;
drop policy if exists household_people_member_insert on public.household_people;
drop policy if exists household_people_member_update on public.household_people;
drop policy if exists household_people_member_delete on public.household_people;
create policy household_people_household_read on public.household_people for select to authenticated using (private.can_read_household(household_id));
create policy household_people_household_write_insert on public.household_people for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy household_people_household_write_update on public.household_people for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy household_people_household_write_delete on public.household_people for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists insurance_exposures_member_select on public.insurance_exposures;
drop policy if exists insurance_exposures_member_insert on public.insurance_exposures;
drop policy if exists insurance_exposures_member_update on public.insurance_exposures;
drop policy if exists insurance_exposures_member_delete on public.insurance_exposures;
create policy insurance_exposures_household_read on public.insurance_exposures for select to authenticated using (private.can_read_household(household_id));
create policy insurance_exposures_household_write_insert on public.insurance_exposures for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy insurance_exposures_household_write_update on public.insurance_exposures for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy insurance_exposures_household_write_delete on public.insurance_exposures for delete to authenticated using (private.can_write_household_financials(household_id));

drop policy if exists household_financial_preferences_member_select on public.household_financial_preferences;
drop policy if exists household_financial_preferences_member_insert on public.household_financial_preferences;
drop policy if exists household_financial_preferences_member_update on public.household_financial_preferences;
drop policy if exists household_financial_preferences_member_delete on public.household_financial_preferences;
create policy household_financial_preferences_household_read on public.household_financial_preferences for select to authenticated using (private.can_read_household(household_id));
create policy household_financial_preferences_household_write_insert on public.household_financial_preferences for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy household_financial_preferences_household_write_update on public.household_financial_preferences for update to authenticated using (private.can_write_household_financials(household_id)) with check (private.can_write_household_financials(household_id));
create policy household_financial_preferences_household_write_delete on public.household_financial_preferences for delete to authenticated using (private.can_write_household_financials(household_id));

alter table public.retirement_accounts
  add column if not exists plan_eligible_compensation_annual numeric(14,2) null
  check (plan_eligible_compensation_annual is null or plan_eligible_compensation_annual >= 0);

comment on column public.retirement_accounts.plan_eligible_compensation_annual is
  'Current-year compensation attributable to this specific sponsoring plan for contribution-limit purposes; distinct from person-wide compensation and prior-year sponsor wages.';
