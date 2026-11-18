-- FFH-P08 authorization coverage probe (proposal §11.5; review findings TM-03 and N04).
-- Read-only catalog check: every way into public/private data must require private.session_ok(), directly or
-- through one of the four gated household helpers, or be on the short reviewed allowlist below.
-- Then mutation tests: each unsafe object is created inside BEGIN ... ROLLBACK and must make the probe fail.
-- Run by scripts/rls-ci/run-matrix.sh on the disposable CI database only.
\set ON_ERROR_STOP on

CREATE FUNCTION pg_temp.ffh_coverage() RETURNS SETOF text LANGUAGE sql STABLE AS $probe$
  WITH ns AS (SELECT oid, nspname FROM pg_namespace WHERE nspname IN ('public', 'private')),
  ext_members AS (SELECT objid FROM pg_depend WHERE deptype = 'e'),
  gate AS (SELECT '(private\.)?(session_ok|can_read_household|can_write_household_financials|is_household_owner|is_household_member)\('::text AS re),
  allow_fn(sig) AS (VALUES ('private.session_ok()'), ('private.check_in_amount(jsonb)'), ('public.my_security_status()')),
  fns AS (
    SELECT p.oid, ns.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS label,
           ns.nspname || '.' || p.proname || '(' || coalesce(nullif(regexp_replace(oidvectortypes(p.proargtypes), '\s', '', 'g'), ''), '') || ')' AS sig,
           p.prosrc
    FROM pg_proc p JOIN ns ON ns.oid = p.pronamespace
    WHERE p.prorettype <> 'trigger'::regtype AND p.oid NOT IN (SELECT objid FROM ext_members)
  )
  -- Tables must have RLS.
  SELECT 'table-without-rls:' || c.relname FROM pg_class c JOIN ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  WHERE c.relkind IN ('r', 'p') AND NOT c.relrowsecurity AND c.oid NOT IN (SELECT objid FROM ext_members)
  UNION ALL
  -- No policy may apply to anon or PUBLIC.
  SELECT 'policy-for-anon:' || pol.polname FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid
  JOIN ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  WHERE 0 = ANY(pol.polroles) OR (SELECT oid FROM pg_roles WHERE rolname = 'anon') = ANY(pol.polroles)
  UNION ALL
  -- Every policy expression goes through the gate.
  SELECT 'policy-ungated:' || pol.polname FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid
  JOIN ns ON ns.oid = c.relnamespace AND ns.nspname = 'public', gate
  WHERE NOT (coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')) ~ gate.re
  UNION ALL
  -- The four helpers themselves call session_ok().
  SELECT 'helper-ungated:' || f.label FROM fns f
  WHERE f.label ~ '^private\.(can_read_household|can_write_household_financials|is_household_owner|is_household_member)\('
    AND f.prosrc !~ 'private\.session_ok\(\)'
  UNION ALL
  -- Views must run as the caller (so table RLS applies); materialized views must not be readable.
  SELECT 'view-not-security-invoker:' || c.relname FROM pg_class c JOIN ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  WHERE c.relkind = 'v' AND NOT coalesce(c.reloptions, '{}') && ARRAY['security_invoker=true', 'security_invoker=on']
  UNION ALL
  SELECT 'matview-readable:' || c.relname FROM pg_class c JOIN ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  WHERE c.relkind = 'm' AND (has_table_privilege('anon', c.oid, 'SELECT') OR has_table_privilege('authenticated', c.oid, 'SELECT'))
  UNION ALL
  -- No function is callable by anon; every function callable by authenticated is gated or allowlisted.
  SELECT 'function-callable-by-anon:' || f.label FROM fns f WHERE has_function_privilege('anon', f.oid, 'EXECUTE')
  UNION ALL
  SELECT 'function-ungated:' || f.label FROM fns f
  WHERE has_function_privilege('authenticated', f.oid, 'EXECUTE')
    AND f.sig NOT IN (SELECT sig FROM allow_fn)
    AND f.prosrc !~ 'private\.(session_ok\(\)|recent_reauth\()'
  UNION ALL
  -- New functions that our migrations create in public (as postgres) must not be executable by
  -- PUBLIC/anon/authenticated by default. Supabase's internal supabase_admin defaults are outside our control and
  -- only apply to platform-created objects, which the function checks above still cover.
  SELECT 'default-execute-grant:' || coalesce(r.rolname, 'PUBLIC') FROM pg_default_acl d
  JOIN ns ON ns.oid = d.defaclnamespace AND ns.nspname = 'public'
  JOIN pg_roles owner_role ON owner_role.oid = d.defaclrole AND owner_role.rolname = 'postgres'
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a LEFT JOIN pg_roles r ON r.oid = a.grantee
  WHERE d.defaclobjtype = 'f' AND a.privilege_type = 'EXECUTE'
    AND (a.grantee = 0 OR r.rolname IN ('anon', 'authenticated'));
$probe$;

-- 1. The real schema is clean.
DO $clean$
DECLARE v text;
BEGIN
  FOR v IN SELECT * FROM pg_temp.ffh_coverage() LOOP
    RAISE WARNING 'COVERAGE_VIOLATION %', v;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_temp.ffh_coverage()) THEN
    RAISE EXCEPTION 'COVERAGE_FAIL';
  END IF;
END
$clean$;
\echo COVERAGE_CLEAN_PASS

-- 2. Mutation tests: each must be detected, then rolled back.
CREATE FUNCTION pg_temp.ffh_coverage_mutation(label text, ddl text, want text) RETURNS void LANGUAGE plpgsql AS $m$
BEGIN
  EXECUTE ddl;
  IF NOT EXISTS (SELECT 1 FROM pg_temp.ffh_coverage() v WHERE v LIKE want || '%') THEN
    RAISE EXCEPTION 'COVERAGE_MUTATION_NOT_DETECTED %', label;
  END IF;
  RAISE NOTICE 'COVERAGE_MUTATION_DETECTED %', label;
END
$m$;

BEGIN;
SELECT pg_temp.ffh_coverage_mutation('unsafe-view',
  'CREATE VIEW public.ffh_mut_view AS SELECT id, household_id FROM public.accounts', 'view-not-security-invoker:ffh_mut_view');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('readable-matview',
  'CREATE MATERIALIZED VIEW public.ffh_mut_mv AS SELECT 1 AS x; GRANT SELECT ON public.ffh_mut_mv TO authenticated', 'matview-readable:ffh_mut_mv');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('ungated-definer-function',
  'CREATE FUNCTION public.ffh_mut_fn() RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = '''' AS $f$ SELECT count(*) FROM public.accounts $f$;
   REVOKE ALL ON FUNCTION public.ffh_mut_fn() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.ffh_mut_fn() TO authenticated',
  'function-ungated:public.ffh_mut_fn');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('anon-function',
  'CREATE FUNCTION public.ffh_mut_anon() RETURNS int LANGUAGE sql AS $f$ SELECT 1 $f$; GRANT EXECUTE ON FUNCTION public.ffh_mut_anon() TO anon',
  'function-callable-by-anon:public.ffh_mut_anon');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('ungated-policy',
  'CREATE POLICY ffh_mut_policy ON public.accounts FOR SELECT TO authenticated USING (true)', 'policy-ungated:ffh_mut_policy');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('anon-policy',
  'CREATE POLICY ffh_mut_anon_policy ON public.accounts FOR SELECT TO anon USING (private.can_read_household(household_id))', 'policy-for-anon:ffh_mut_anon_policy');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('table-without-rls',
  'CREATE TABLE public.ffh_mut_table (id int)', 'table-without-rls:ffh_mut_table');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('ungated-helper',
  'CREATE OR REPLACE FUNCTION private.can_read_household(target_household_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '''' AS $f$ SELECT true $f$',
  'helper-ungated:private.can_read_household');
ROLLBACK;
BEGIN;
SELECT pg_temp.ffh_coverage_mutation('default-execute-grant',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon', 'default-execute-grant:anon');
ROLLBACK;

-- 3. Nothing from the mutations survived.
DO $after$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_temp.ffh_coverage()) OR to_regclass('public.ffh_mut_view') IS NOT NULL
     OR to_regclass('public.ffh_mut_table') IS NOT NULL OR to_regprocedure('public.ffh_mut_fn()') IS NOT NULL THEN
    RAISE EXCEPTION 'COVERAGE_MUTATION_RESIDUE';
  END IF;
END
$after$;
\echo COVERAGE_PASS MUTATIONS=9
