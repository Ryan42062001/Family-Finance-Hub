-- Phase checks for migration 20261120100000 (FFH-P11 audit remediation P11-01..03), run inside the one-paste hosted
-- apply file. Format: ONE SELECT returning (check_name text, ok boolean). Aggregate checks only; never select rows.
select 'every saved set-aside amount is a valid whole-cent amount' as check_name,
       not exists (select 1 from public.bill_set_asides
         where reserved_amount = 'NaN'::numeric or reserved_amount < 0 or reserved_amount > 999999999999.99
            or reserved_amount <> round(reserved_amount, 2)) as ok
union all
select 'clients cannot write set-aside ids, versions or audit columns',
       not (has_column_privilege('authenticated', 'public.bill_set_asides', 'id', 'UPDATE')
         or has_column_privilege('authenticated', 'public.bill_set_asides', 'version', 'UPDATE')
         or has_column_privilege('authenticated', 'public.bill_set_asides', 'created_by', 'UPDATE')
         or has_column_privilege('authenticated', 'public.bill_set_asides', 'id', 'INSERT')
         or has_column_privilege('authenticated', 'public.bill_set_asides', 'version', 'INSERT')
         or has_column_privilege('authenticated', 'public.bill_set_asides', 'created_by', 'INSERT'))
union all
select 'clients can still write the set-aside input columns',
       has_column_privilege('authenticated', 'public.bill_set_asides', 'reserved_amount', 'UPDATE')
       and has_column_privilege('authenticated', 'public.bill_set_asides', 'cycle_due_date', 'UPDATE')
       and has_column_privilege('authenticated', 'public.bill_set_asides', 'expense_id', 'INSERT')
union all
select 'signed-out visitors still have no access to set-asides',
       not (has_table_privilege('anon', 'public.bill_set_asides', 'SELECT')
         or has_column_privilege('anon', 'public.bill_set_asides', 'reserved_amount', 'UPDATE'))
union all
select 'set-aside trigger function not callable by API roles',
       not (has_function_privilege('anon', 'private.bill_set_aside_before_write()', 'EXECUTE')
         or has_function_privilege('authenticated', 'private.bill_set_aside_before_write()', 'EXECUTE'))
