-- Phase checks for migration 20261119100000 (FFH-P11), run inside the one-paste hosted apply file.
-- Format: ONE SELECT returning (check_name text, ok boolean). Aggregate counts only; never select household rows.
select 'no set-aside trackers invented' as check_name,
       not exists (select 1 from public.bill_set_asides) as ok
union all
select 'set-aside table has row level security',
       (select relrowsecurity from pg_class where oid = 'public.bill_set_asides'::regclass)
union all
select 'signed-out visitors have no access to set-asides',
       not (has_table_privilege('anon', 'public.bill_set_asides', 'SELECT')
         or has_table_privilege('anon', 'public.bill_set_asides', 'INSERT')
         or has_table_privilege('anon', 'public.bill_set_asides', 'UPDATE')
         or has_table_privilege('anon', 'public.bill_set_asides', 'DELETE'))
union all
select 'set-aside trigger function not callable by API roles',
       not (has_function_privilege('anon', 'private.bill_set_aside_before_write()', 'EXECUTE')
         or has_function_privilege('authenticated', 'private.bill_set_aside_before_write()', 'EXECUTE'))
union all
select 'P09 monthly planning amounts still derived exactly',
       not exists (select 1 from public.expenses where monthly_amount <> case recurrence
         when 'monthly' then payment_amount when 'quarterly' then ceil(payment_amount * 100 / 3) / 100
         else ceil(payment_amount * 100 / 12) / 100 end)
