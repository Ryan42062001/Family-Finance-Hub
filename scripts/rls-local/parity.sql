-- FFH-P01 hosted-parity fingerprint. READ-ONLY: one SELECT over system catalogs.
-- It reads schema metadata only (table names, policies, grants, functions,
-- triggers, constraints, columns, migration versions). It never reads row
-- data, never writes, and outputs no secrets or household data.
--
-- CI runs it on the fresh local database built from the repo migrations and
-- compares the result with scripts/rls-local/parity.expected.txt. Ryan can paste the
-- same query into the hosted Supabase SQL editor; if every hash matches,
-- the hosted security-relevant schema equals the repo's.
WITH
pub_tables AS (
  SELECT c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
our_functions AS (
  SELECT p.oid, n.nspname, p.proname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.objid = p.oid AND d.deptype = 'e')
),
sections(section, item) AS (
  SELECT 'migrations', m.version
  FROM pg_catalog.pg_namespace mn
  CROSS JOIN LATERAL (
    SELECT (xpath('/row/v/text()', x))[1]::text AS version
    FROM unnest(xpath('/table/row',
      query_to_xml('SELECT version AS v FROM supabase_migrations.schema_migrations',
                   false, false, ''))) AS x
  ) m
  WHERE mn.nspname = 'supabase_migrations'
    AND to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
  UNION ALL
  SELECT 'rls', relname || ':' || relrowsecurity || ':' || relforcerowsecurity
  FROM pub_tables
  UNION ALL
  SELECT 'policies', concat_ws('|', tablename, policyname, permissive,
         (SELECT string_agg(r, ',' ORDER BY r) FROM unnest(roles) r),
         cmd, coalesce(qual, '-'), coalesce(with_check, '-'))
  FROM pg_policies WHERE schemaname = 'public'
  UNION ALL
  SELECT 'table_grants', concat_ws('|', table_name, grantee, privilege_type)
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  UNION ALL
  SELECT 'columns', concat_ws('|', c.table_name, c.column_name, c.data_type,
         c.is_nullable, coalesce(c.column_default, '-'))
  FROM information_schema.columns c
  JOIN pub_tables t ON t.relname = c.table_name
  WHERE c.table_schema = 'public'
  UNION ALL
  SELECT 'constraints', concat_ws('|', t.relname, k.conname, k.contype,
         pg_get_constraintdef(k.oid))
  FROM pg_constraint k JOIN pub_tables t ON t.oid = k.conrelid
  UNION ALL
  SELECT 'triggers', concat_ws('|', t.relname, g.tgname, g.tgfoid::regprocedure::text,
         g.tgenabled, g.tgtype)
  FROM pg_trigger g JOIN pub_tables t ON t.oid = g.tgrelid
  WHERE NOT g.tgisinternal
  UNION ALL
  SELECT 'functions', concat_ws('|', f.nspname, f.proname,
         pg_get_function_identity_arguments(p.oid), p.prosecdef, p.provolatile,
         coalesce(array_to_string(p.proconfig, ','), '-'), md5(p.prosrc))
  FROM our_functions f JOIN pg_proc p ON p.oid = f.oid
  UNION ALL
  SELECT 'function_grants', concat_ws('|', f.nspname, f.proname,
         pg_get_function_identity_arguments(f.oid), r.rolname,
         has_function_privilege(r.oid, f.oid, 'EXECUTE'))
  FROM our_functions f
  CROSS JOIN pg_roles r WHERE r.rolname IN ('anon', 'authenticated')
)
SELECT section, count(*) AS items, md5(string_agg(item, E'\n' ORDER BY item)) AS fingerprint
FROM sections
GROUP BY section
ORDER BY section;
