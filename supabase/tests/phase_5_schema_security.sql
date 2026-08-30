-- Phase 5 schema and security regression checks.
-- Safe to run repeatedly. Raises an exception on any failed assertion.

do $$
declare
  target_table text;
  policy_count integer;
  rls_enabled boolean;
  target_constraint text;
begin
  foreach target_table in array array[
    'household_people',
    'household_financial_preferences',
    'insurance_exposures'
  ]
  loop
    select c.relrowsecurity
      into rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = target_table;

    if rls_enabled is distinct from true then
      raise exception 'RLS is not enabled on public.%', target_table;
    end if;

    select count(*)
      into policy_count
      from pg_policies
     where schemaname = 'public'
       and tablename = target_table
       and roles @> array['authenticated']::name[];

    if policy_count <> 4 then
      raise exception 'Expected four authenticated CRUD policies on public.%, found %', target_table, policy_count;
    end if;

    if not has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE') then
      raise exception 'Authenticated CRUD grants are incomplete on public.%', target_table;
    end if;
  end loop;

  foreach target_constraint in array array[
    'income_sources_owner_person_household_fkey',
    'retirement_accounts_owner_person_household_fkey',
    'insurance_exposures_person_household_fkey',
    'accounts_related_goal_household_fkey',
    'accounts_related_debt_household_fkey'
  ]
  loop
    if not exists (
      select 1
        from pg_constraint
       where conname = target_constraint
         and contype = 'f'
         and array_length(conkey, 1) = 2
    ) then
      raise exception 'Missing household-aware composite foreign key %', target_constraint;
    end if;
  end loop;

  if exists (
    select 1
      from pg_tables
     where schemaname = 'public'
       and tablename in ('household_people', 'household_financial_preferences', 'insurance_exposures')
       and not rowsecurity
  ) then
    raise exception 'At least one Phase 5 public table is exposed without RLS';
  end if;
end
$$;
