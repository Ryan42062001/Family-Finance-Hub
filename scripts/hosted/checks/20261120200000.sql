-- Phase checks for migration 20261120200000 (FFH-P12 income pay schedules), run inside the one-paste hosted apply file.
-- Format: ONE SELECT returning (check_name text, ok boolean). Aggregate counts and catalog facts only; never selects
-- household rows.
select 'no pay schedules invented' as check_name,
       not exists (select 1 from public.income_pay_schedules) as ok
union all
select 'pay schedule table has row level security',
       (select relrowsecurity from pg_class where oid = 'public.income_pay_schedules'::regclass)
union all
select 'signed-out visitors have no access to pay schedules',
       not (has_table_privilege('anon', 'public.income_pay_schedules', 'SELECT')
         or has_table_privilege('anon', 'public.income_pay_schedules', 'INSERT')
         or has_table_privilege('anon', 'public.income_pay_schedules', 'UPDATE')
         or has_table_privilege('anon', 'public.income_pay_schedules', 'DELETE'))
union all
select 'clients write only the schedule input columns',
       has_column_privilege('authenticated', 'public.income_pay_schedules', 'expected_deposit_amount', 'UPDATE')
       and not has_column_privilege('authenticated', 'public.income_pay_schedules', 'household_id', 'UPDATE')
       and not has_column_privilege('authenticated', 'public.income_pay_schedules', 'income_source_id', 'UPDATE')
       and not has_column_privilege('authenticated', 'public.income_pay_schedules', 'version', 'UPDATE')
       and not has_column_privilege('authenticated', 'public.income_pay_schedules', 'created_by', 'UPDATE')
       and not has_column_privilege('authenticated', 'public.income_pay_schedules', 'id', 'INSERT')
       and not has_column_privilege('authenticated', 'public.income_pay_schedules', 'version', 'INSERT')
union all
select 'pay schedule trigger function not callable by API roles',
       not (has_function_privilege('anon', 'private.income_pay_schedule_before_write()', 'EXECUTE')
         or has_function_privilege('authenticated', 'private.income_pay_schedule_before_write()', 'EXECUTE'))
union all
select 'pay schedules follow their income source by household-aware key (delete cascades)',
       exists (select 1 from pg_constraint where conname = 'income_pay_schedules_income_source_household_fkey'
               and conrelid = 'public.income_pay_schedules'::regclass and confdeltype = 'c')
union all
select 'P09 monthly planning amounts still derived exactly',
       not exists (select 1 from public.expenses where monthly_amount <> case recurrence
         when 'monthly' then payment_amount when 'quarterly' then ceil(payment_amount * 100 / 3) / 100
         else ceil(payment_amount * 100 / 12) / 100 end)
