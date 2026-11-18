-- Hosted paste repair (Ryan runs it in the SQL Editor right after pasting a migration, BEFORE parity.sql).
-- Pasting a migration from a browser can turn line endings into CRLF, which changes the stored function bodies (and
-- the parity fingerprint) without changing behaviour. This re-creates every FFH function in public/private whose
-- source contains a carriage return from its own definition with the carriage returns removed. CREATE OR REPLACE
-- keeps the function's owner, grants and settings. Reads and changes no table data. Safe to run any number of times.
do $strip$
declare
  f record;
  fixed int := 0;
begin
  for f in
    select p.oid, n.nspname, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and position(E'\r' in p.prosrc) > 0
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute replace(pg_get_functiondef(f.oid), E'\r', '');
    fixed := fixed + 1;
    raise notice 'CR_STRIPPED %.%', f.nspname, f.proname;
  end loop;
  raise notice 'CR_STRIP_DONE functions_fixed=%', fixed;
end
$strip$;

select count(*) as functions_with_cr_left
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and position(E'\r' in p.prosrc) > 0;
