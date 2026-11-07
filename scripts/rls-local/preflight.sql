\set ON_ERROR_STOP on
\set QUIET on
-- Read-only catalog and role preflight. No synthetic fixture writes are legal
-- before every assertion here succeeds on the disposable localhost database.
DO $pre$
DECLARE
  expected text[] := ARRAY[
    '0001','20260829182715','20260829183541','20260829223642',
    '20260829223716','20260829223935','20260829234300',
    '20260829234446','20260831235822','20260901020220',
    '20260902190000','20260903134156','20260909005000',
    '20260909033000','20260911170000'
  ];
  financial text[] := ARRAY[
    'accounts','income_sources','expenses','debts','retirement_accounts',
    'goals','household_people','insurance_exposures',
    'household_financial_preferences','person_hsa_tax_year_profiles',
    'person_hsa_month_statuses','household_hsa_married_allocations',
    'household_hsa_legal_spouse_authorities'
  ];
  t text;
  op text;
  p record;
  expected_name text;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PREFLIGHT_WRONG_LOCAL_DATABASE_OR_SETUP_ROLE';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='supabase_migrations') THEN
    RAISE EXCEPTION 'PREFLIGHT_MIGRATION_TRACKING_ABSENT';
  END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 15 OR
     (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = ANY(expected)) <> 15 THEN
    RAISE EXCEPTION 'PREFLIGHT_EXPECTED_15_CANONICAL_MIGRATIONS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') OR
     to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_LOCAL_SUPABASE_AUTH_SCHEMA_MISSING';
  END IF;
  FOREACH t IN ARRAY financial LOOP
    IF NOT EXISTS(
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relkind='r'
      AND c.relrowsecurity AND NOT c.relispartition
    ) THEN RAISE EXCEPTION 'PREFLIGHT_FINANCIAL_TABLE_RLS_MISSING %', t; END IF;
    FOREACH op IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      SELECT * INTO p FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd=op
      AND 'authenticated'=ANY(roles);
      IF NOT FOUND THEN RAISE EXCEPTION 'PREFLIGHT_MISSING_POLICY % %',t,op; END IF;
      IF op='SELECT' AND p.qual NOT LIKE '%can_read_household%' THEN
        RAISE EXCEPTION 'PREFLIGHT_READ_POLICY_MISMATCH %',t;
      END IF;
      IF op='INSERT' AND p.with_check NOT LIKE '%can_write_household_financials%' THEN
        RAISE EXCEPTION 'PREFLIGHT_INSERT_POLICY_MISMATCH %',t;
      END IF;
      IF op='UPDATE' AND (p.qual NOT LIKE '%can_write_household_financials%' OR
                          p.with_check NOT LIKE '%can_write_household_financials%') THEN
        RAISE EXCEPTION 'PREFLIGHT_UPDATE_POLICY_MISMATCH %',t;
      END IF;
      IF op='DELETE' AND p.qual NOT LIKE '%can_write_household_financials%' THEN
        RAISE EXCEPTION 'PREFLIGHT_DELETE_POLICY_MISMATCH %',t;
      END IF;
    END LOOP;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['households','profiles','household_members'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'PREFLIGHT_FOUNDATION_RLS_MISSING %',t;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['can_read_household','can_write_household_financials','is_household_owner'] LOOP
    IF to_regprocedure('private.'||t||'(uuid)') IS NULL THEN
      RAISE EXCEPTION 'PREFLIGHT_AUTH_HELPER_MISSING %',t;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.households'::regclass
      AND tgname='preserve_household_created_by_trigger' AND NOT tgisinternal) OR
     NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.households'::regclass
      AND tgname='household_creator_membership_trigger' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'PREFLIGHT_HOUSEHOLD_TRIGGER_MISSING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
     WHERE conrelid='public.households'::regclass AND conname='households_created_by_fkey') THEN
    RAISE EXCEPTION 'PREFLIGHT_CREATOR_FK_MISSING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='accounts_related_goal_household_fkey') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='person_hsa_month_statuses_profile_fkey') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='household_hsa_legal_spouse_authorities_person_one_fkey') THEN
    RAISE EXCEPTION 'PREFLIGHT_COMPOSITE_FK_MISSING';
  END IF;
  FOREACH t IN ARRAY ARRAY['authenticated','anon'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=t AND NOT rolbypassrls AND NOT rolsuper AND NOT rolcanlogin) THEN
      RAISE EXCEPTION 'PREFLIGHT_NONBYPASS_ROLE_INVALID %',t;
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='households' AND cmd='UPDATE'
        AND qual LIKE '%is_household_owner%' AND with_check LIKE '%is_household_owner%') THEN
    RAISE EXCEPTION 'PREFLIGHT_OWNER_ONLY_HOUSEHOLD_UPDATE_MISSING';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE tablename='households' AND cmd='DELETE') OR
     EXISTS(SELECT 1 FROM pg_policies WHERE tablename='household_members' AND cmd='DELETE') THEN
    RAISE EXCEPTION 'PREFLIGHT_UNEXPECTED_HOUSEHOLD_DELETE_POLICY';
  END IF;
  RAISE NOTICE 'PREFLIGHT_SOURCE_MIGRATIONS=15 FINANCIAL_RLS_TABLES=13 POLICY_CASES=52 FOUNDATION_TABLES=3';
END
$pre$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
DO $roles$
BEGIN
  IF current_user <> 'authenticated' OR (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user)
     OR auth.uid() IS DISTINCT FROM '00000000-0000-4000-8000-000000000099'::uuid THEN
    RAISE EXCEPTION 'PREFLIGHT_AUTHENTICATED_CLAIMS_OR_ROLE_INVALID';
  END IF;
END
$roles$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE anon;
DO $roles$
BEGIN
  IF current_user <> 'anon' OR (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user)
     OR auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_ANONYMOUS_CLAIMS_OR_ROLE_INVALID';
  END IF;
END
$roles$;
ROLLBACK;
\echo PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1
