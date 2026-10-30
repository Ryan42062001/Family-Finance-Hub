\set ON_ERROR_STOP on
\set VERBOSITY terse
\set QUIET on
-- FFH-P01 SOURCE-ONLY prepared matrix. DO NOT RUN until fresh Manager/Owner GO.
-- Requires the separately executed, passing preflight.sql on the SAME
-- disposable, empty, localhost-only PostgreSQL container at the same source SHA.
-- The only deliberate mutations occur in this single transaction and ROLLBACK.
-- PL/pgSQL BEGIN ... EXCEPTION blocks use PostgreSQL subtransactions
-- (savepoint-equivalent) to recover individually from expected errors.
BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '2s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL search_path = pg_catalog, public;
SELECT pg_advisory_xact_lock(620, 81);

-- Fail closed before creating ANY fixture, even in a disposable database.
DO $guard$
DECLARE t text;
BEGIN
  IF current_database() <> 'postgres' OR session_user <> 'postgres'
     OR current_user <> 'postgres' OR pg_is_in_recovery() THEN
    RAISE EXCEPTION 'MATRIX_WRONG_LOCAL_SESSION';
  END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 15 THEN
    RAISE EXCEPTION 'MATRIX_MIGRATION_PARITY_UNVERIFIED';
  END IF;
  IF (SELECT count(*) FROM auth.users) <> 0 OR
     (SELECT count(*) FROM auth.identities) <> 0 OR
     (SELECT count(*) FROM public.households) <> 0 OR
     (SELECT count(*) FROM public.household_members) <> 0 OR
     (SELECT count(*) FROM public.profiles) <> 0 THEN
    RAISE EXCEPTION 'MATRIX_NONEMPTY_BASELINE_NO_WRITES_PERMITTED';
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'accounts','income_sources','expenses','debts','retirement_accounts',
    'goals','household_people','insurance_exposures',
    'household_financial_preferences','person_hsa_tax_year_profiles',
    'person_hsa_month_statuses','household_hsa_married_allocations',
    'household_hsa_legal_spouse_authorities'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity
    ) THEN RAISE EXCEPTION 'MATRIX_MISSING_RLS table=%',t; END IF;
    IF (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname='authenticated') OR
       (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname='anon') THEN
      RAISE EXCEPTION 'MATRIX_BYPASS_ROLE';
    END IF;
    IF NOT has_table_privilege('authenticated',format('public.%I',t),'SELECT') OR
       NOT has_table_privilege('authenticated',format('public.%I',t),'INSERT') OR
       NOT has_table_privilege('authenticated',format('public.%I',t),'UPDATE') OR
       NOT has_table_privilege('authenticated',format('public.%I',t),'DELETE') THEN
      RAISE EXCEPTION 'MATRIX_POSITIVE_ROLE_GRANT_MISSING table=%',t;
    END IF;
    -- Supabase default grants may differ by table. Anon must have NO
    -- enabling RLS policy, but a grant is not itself a data disclosure.
    IF EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public'
      AND p.tablename=t AND ('anon'=ANY(p.roles) OR 'public'=ANY(p.roles))) THEN
      RAISE EXCEPTION 'MATRIX_UNEXPECTED_ANON_RLS_POLICY table=%',t;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['profiles','households','household_members'] LOOP
    IF NOT has_table_privilege('authenticated',format('public.%I',t),'SELECT') THEN
      RAISE EXCEPTION 'MATRIX_FOUNDATION_SELECT_GRANT_MISSING table=%',t;
    END IF;
  END LOOP;
  IF NOT has_table_privilege('authenticated','public.households','INSERT') OR
     NOT has_table_privilege('authenticated','public.households','UPDATE') OR
     NOT has_table_privilege('authenticated','public.profiles','INSERT') OR
     NOT has_table_privilege('authenticated','public.profiles','UPDATE') THEN
    RAISE EXCEPTION 'MATRIX_FOUNDATION_POSITIVE_GRANT_MISSING';
  END IF;
END
$guard$;

CREATE TEMP TABLE ffh_rls_receipts(
  category text NOT NULL,
  family text NOT NULL,
  passed boolean NOT NULL DEFAULT true
) ON COMMIT DROP;
CREATE TEMP TABLE ffh_rls_baselines(
  family text NOT NULL,
  scope text NOT NULL CHECK(scope IN ('A','B')),
  row_id uuid NOT NULL,
  digest text,
  PRIMARY KEY(family,scope)
) ON COMMIT DROP;

-- Safe, deterministic shape generator. Values are intentionally fictitious;
-- no emails, credentials, tokens, passwords or personal financial data.
CREATE FUNCTION pg_temp.ffh_fixture_sql(
  tab text, hh uuid, person1 uuid, person2 uuid, variant integer
) RETURNS text LANGUAGE plpgsql AS $fixture$
DECLARE nm text := 'ffh-local-' || variant::text;
        yr integer := 2026 + variant;
BEGIN
  CASE tab
  WHEN 'accounts' THEN
    RETURN format('INSERT INTO public.accounts(household_id,name,account_type) VALUES(%L,%L,%L) RETURNING id',hh,nm,'checking');
  WHEN 'income_sources' THEN
    RETURN format('INSERT INTO public.income_sources(household_id,name,monthly_amount) VALUES(%L,%L,1) RETURNING id',hh,nm);
  WHEN 'expenses' THEN
    RETURN format('INSERT INTO public.expenses(household_id,name,category,monthly_amount) VALUES(%L,%L,%L,1) RETURNING id',hh,nm,'other');
  WHEN 'debts' THEN
    RETURN format('INSERT INTO public.debts(household_id,name,debt_type,current_balance) VALUES(%L,%L,%L,1) RETURNING id',hh,nm,'other');
  WHEN 'retirement_accounts' THEN
    RETURN format('INSERT INTO public.retirement_accounts(household_id,name,account_type,balance) VALUES(%L,%L,%L,1) RETURNING id',hh,nm,'hsa');
  WHEN 'goals' THEN
    RETURN format('INSERT INTO public.goals(household_id,name,target_amount) VALUES(%L,%L,1) RETURNING id',hh,nm);
  WHEN 'household_people' THEN
    RETURN format('INSERT INTO public.household_people(household_id,display_name) VALUES(%L,%L) RETURNING id',hh,nm);
  WHEN 'insurance_exposures' THEN
    RETURN format('INSERT INTO public.insurance_exposures(household_id,name,insurance_type) VALUES(%L,%L,%L) RETURNING id',hh,nm,'pet');
  WHEN 'household_financial_preferences' THEN
    RETURN format('INSERT INTO public.household_financial_preferences(household_id) VALUES(%L) RETURNING household_id',hh);
  WHEN 'person_hsa_tax_year_profiles' THEN
    RETURN format('INSERT INTO public.person_hsa_tax_year_profiles(household_id,person_id,tax_year) VALUES(%L,%L,%s) RETURNING id',hh,person1,yr);
  WHEN 'person_hsa_month_statuses' THEN
    RETURN format('INSERT INTO public.person_hsa_month_statuses(household_id,person_id,tax_year,month) VALUES(%L,%L,2026,%s) RETURNING id',hh,person1,variant+1);
  WHEN 'household_hsa_married_allocations' THEN
    RETURN format('INSERT INTO public.household_hsa_married_allocations(household_id,tax_year,person_one_id,person_two_id,person_one_ordinary_amount,person_two_ordinary_amount) VALUES(%L,%s,%L,%L,1,1) RETURNING id',hh,yr,person1,person2);
  WHEN 'household_hsa_legal_spouse_authorities' THEN
    RETURN format('INSERT INTO public.household_hsa_legal_spouse_authorities(household_id,tax_year,person_one_id,person_two_id) VALUES(%L,%s,%L,%L) RETURNING id',hh,yr,person1,person2);
  ELSE RAISE EXCEPTION 'MATRIX_UNRECOGNIZED_FINANCIAL_FAMILY';
  END CASE;
END
$fixture$;

-- Every simulated user query is executed while the *effective* SQL role is
-- authenticated or anon, with auth.uid() verified in that precise context.
-- The SQL statement is never printed; only nonsecret category/table counters.
-- An expected RLS error must be SQLSTATE 42501 AND mention row-level security.
-- A grant failure must be an actual permission error, not a CHECK/FK error.
CREATE FUNCTION pg_temp.ffh_probe(
  who uuid, stmt text, mode text, expected integer,
  probe_category text, probe_family text, wanted_constraint text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $probe$
DECLARE observed integer;
        error_state text;
        error_message text;
        error_constraint text;
        denied boolean := false;
        role_name text := CASE WHEN who IS NULL THEN 'anon' ELSE 'authenticated' END;
BEGIN
  IF current_user <> 'postgres' OR session_user <> 'postgres' THEN
    RAISE EXCEPTION 'MATRIX_PROBE_SETUP_NOT_PRIVILEGED';
  END IF;
  EXECUTE format('SET LOCAL ROLE %I', role_name);
  PERFORM set_config('request.jwt.claim.sub',COALESCE(who::text,''),true);
  IF current_user <> role_name OR
     (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user) OR
     auth.uid() IS DISTINCT FROM who THEN
    RAISE EXCEPTION 'MATRIX_EFFECTIVE_ROLE_OR_CLAIM_MISMATCH';
  END IF;
  BEGIN
    IF mode='COUNT' THEN
      EXECUTE stmt INTO observed;
    ELSE
      EXECUTE stmt;
      GET DIAGNOSTICS observed = ROW_COUNT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      error_state=RETURNED_SQLSTATE,
      error_message=MESSAGE_TEXT,
      error_constraint=CONSTRAINT_NAME;
    IF mode IN ('RLS','DENY') AND error_state='42501'
       AND error_message ILIKE '%row-level security%' THEN
      denied := true;
    ELSIF mode IN ('GRANT','FORBIDDEN','ANON_SELECT','ANON_WRITE','ANON_INSERT')
       AND error_state='42501'
       AND (error_message ILIKE '%permission denied%'
            OR (mode <> 'GRANT' AND error_message ILIKE '%row-level security%')) THEN
      denied := true;
    ELSIF mode='FK' AND error_state='23503'
       AND error_constraint=wanted_constraint THEN
      denied := true;
    ELSIF mode='IMMUTABLE' AND error_state='42501'
       AND error_message ILIKE '%created_by is immutable%' THEN
      denied := true;
    ELSE
      RAISE EXCEPTION 'MATRIX_WRONG_ERROR category=% family=% state=%',probe_category,probe_family,error_state;
    END IF;
  END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub','',true);
  IF mode IN ('COUNT','ROWS') THEN
    IF denied OR observed IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'MATRIX_EXPECTED_ROWCOUNT category=% family=%',probe_category,probe_family;
    END IF;
  ELSIF mode IN ('RLS','GRANT','ANON_INSERT','FK','IMMUTABLE') THEN
    IF NOT denied THEN
      RAISE EXCEPTION 'MATRIX_DENIAL_NOT_OBSERVED category=% family=%',probe_category,probe_family;
    END IF;
  ELSIF mode IN ('DENY','FORBIDDEN','ANON_SELECT','ANON_WRITE') THEN
    IF NOT denied AND observed IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'MATRIX_UNAUTHORIZED_WRITE category=% family=%',probe_category,probe_family;
    END IF;
  ELSE
    RAISE EXCEPTION 'MATRIX_INVALID_EXPECTATION category=%',probe_category;
  END IF;
  INSERT INTO pg_temp.ffh_rls_receipts(category,family) VALUES(probe_category,probe_family);
END
$probe$;

-- Positive owner/member controls must actually complete all four operations.
-- They cannot be substituted with grants, catalog inspection or syntax checks.
CREATE FUNCTION pg_temp.ffh_positive(
  who uuid, hh uuid, tab text, insert_sql text
) RETURNS void LANGUAGE plpgsql AS $positive$
DECLARE pk text := CASE WHEN tab='household_financial_preferences' THEN 'household_id' ELSE 'id' END;
        new_id uuid; n integer;
BEGIN
  IF current_user <> 'postgres' OR who IS NULL THEN
    RAISE EXCEPTION 'MATRIX_POSITIVE_SETUP_ROLE_INVALID';
  END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',who::text,true);
  IF current_user <> 'authenticated' OR auth.uid() IS DISTINCT FROM who OR
     (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user) THEN
    RAISE EXCEPTION 'MATRIX_POSITIVE_ROLE_BYPASS';
  END IF;
  EXECUTE insert_sql INTO new_id;
  IF new_id IS NULL THEN RAISE EXCEPTION 'MATRIX_POSITIVE_INSERT_NULL family=%',tab; END IF;
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I=$1 AND household_id=$2',tab,pk)
    INTO n USING new_id,hh;
  IF n <> 1 THEN RAISE EXCEPTION 'MATRIX_POSITIVE_SELECT_FAIL family=%',tab; END IF;
  EXECUTE format('UPDATE public.%I SET updated_at=now()+interval ''1 second'' WHERE %I=$1 AND household_id=$2',tab,pk)
    USING new_id,hh;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'MATRIX_POSITIVE_UPDATE_FAIL family=%',tab; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE %I=$1 AND household_id=$2',tab,pk)
    USING new_id,hh;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'MATRIX_POSITIVE_DELETE_FAIL family=%',tab; END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub','',true);
  INSERT INTO pg_temp.ffh_rls_receipts(category,family)
    VALUES('positive-select-insert-update-delete',tab);
END
$positive$;

CREATE FUNCTION pg_temp.ffh_digest(tab text, pk uuid) RETURNS text
LANGUAGE plpgsql AS $digest$
DECLARE res text;
        key_col text := CASE WHEN tab='household_financial_preferences' THEN 'household_id' ELSE 'id' END;
BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'MATRIX_DIGEST_PRIVILEGED_WITNESS_REQUIRED'; END IF;
  EXECUTE format('SELECT md5(row_to_json(t)::text) FROM public.%I t WHERE %I=$1',tab,key_col)
    INTO res USING pk;
  IF res IS NULL THEN RAISE EXCEPTION 'MATRIX_BASELINE_ROW_MISSING family=%',tab; END IF;
  RETURN res;
END
$digest$;

-- One transaction, fixture-only and no external Auth API. If any assertion
-- fails, psql ON_ERROR_STOP terminates; closing the session rolls back.
DO $matrix$
<<matrix_block>>
DECLARE
  a_owner uuid := gen_random_uuid();
  a_member uuid := gen_random_uuid();
  a_viewer uuid := gen_random_uuid();
  b_owner uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  pa1 uuid; pa2 uuid; pb1 uuid; pb2 uuid;
  p1 uuid; p2 uuid;
  family text; hh uuid; who uuid; scope_name text;
  row_id uuid; baseline_id uuid; base_digest text; now_digest text;
  pk text; sql_insert text; q text;
  target_scope text;
  principal record;
  checked integer;
  family_names text[] := ARRAY[
    'accounts','income_sources','expenses','debts','retirement_accounts',
    'goals','household_people','insurance_exposures',
    'household_financial_preferences','person_hsa_tax_year_profiles',
    'person_hsa_month_statuses','household_hsa_married_allocations',
    'household_hsa_legal_spouse_authorities'
  ];
BEGIN
  -- All auth.users rows have null email/password. They exist ONLY inside the
  -- uncommitted transaction to satisfy real auth-user foreign keys.
  INSERT INTO auth.users(id,instance_id,aud,role) VALUES
    (a_owner,'00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (a_member,'00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (a_viewer,'00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (b_owner,'00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (outsider,'00000000-0000-0000-0000-000000000000','authenticated','authenticated');
  PERFORM set_config('request.jwt.claim.sub',a_owner::text,true);
  INSERT INTO public.households(id,name,created_by) VALUES(a,'ffh-local-household-a',a_owner);
  PERFORM set_config('request.jwt.claim.sub',b_owner::text,true);
  INSERT INTO public.households(id,name,created_by) VALUES(b,'ffh-local-household-b',b_owner);
  PERFORM set_config('request.jwt.claim.sub','',true);
  IF (SELECT count(*) FROM public.household_members WHERE household_id=a AND user_id=a_owner AND role='owner') <> 1 OR
     (SELECT count(*) FROM public.household_members WHERE household_id=b AND user_id=b_owner AND role='owner') <> 1 THEN
    RAISE EXCEPTION 'MATRIX_CREATOR_MEMBERSHIP_TRIGGER_FAIL';
  END IF;
  INSERT INTO public.household_members(household_id,user_id,role)
    VALUES(a,a_member,'member'),(a,a_viewer,'viewer');
  INSERT INTO pg_temp.ffh_rls_receipts(category,family) VALUES('creator-bootstrap','households');

  INSERT INTO public.household_people(household_id,display_name) VALUES(a,'synthetic-a-person-1') RETURNING id INTO pa1;
  INSERT INTO public.household_people(household_id,display_name) VALUES(a,'synthetic-a-person-2') RETURNING id INTO pa2;
  INSERT INTO public.household_people(household_id,display_name) VALUES(b,'synthetic-b-person-1') RETURNING id INTO pb1;
  INSERT INTO public.household_people(household_id,display_name) VALUES(b,'synthetic-b-person-2') RETURNING id INTO pb2;
  SELECT least(pa1,pa2),greatest(pa1,pa2) INTO pa1,pa2;
  SELECT least(pb1,pb2),greatest(pb1,pb2) INTO pb1,pb2;
  -- HSA month statuses require a same-household tax-year parent profile.
  EXECUTE pg_temp.ffh_fixture_sql('person_hsa_tax_year_profiles',a,pa1,pa2,0) INTO row_id;
  INSERT INTO pg_temp.ffh_rls_baselines(family,scope,row_id) VALUES('person_hsa_tax_year_profiles','A',row_id);
  EXECUTE pg_temp.ffh_fixture_sql('person_hsa_tax_year_profiles',b,pb1,pb2,0) INTO row_id;
  INSERT INTO pg_temp.ffh_rls_baselines(family,scope,row_id) VALUES('person_hsa_tax_year_profiles','B',row_id);

  -- Full CRUD positive controls (13 families x owner A, member A, owner B).
  -- Parents exist; no conflicting one-row preferences/allocation yet.
  FOREACH family IN ARRAY family_names LOOP
    PERFORM pg_temp.ffh_positive(a_owner,a,family,pg_temp.ffh_fixture_sql(family,a,pa1,pa2,1));
    PERFORM pg_temp.ffh_positive(a_member,a,family,pg_temp.ffh_fixture_sql(family,a,pa1,pa2,2));
    PERFORM pg_temp.ffh_positive(b_owner,b,family,pg_temp.ffh_fixture_sql(family,b,pb1,pb2,3));
  END LOOP;

  -- Establish immutable synthetic A/B baselines, including parent rows.
  FOREACH family IN ARRAY family_names LOOP
    FOR checked IN 1..2 LOOP
      scope_name := CASE WHEN checked=1 THEN 'A' ELSE 'B' END;
      hh := CASE WHEN checked=1 THEN a ELSE b END;
      p1 := CASE WHEN checked=1 THEN pa1 ELSE pb1 END;
      p2 := CASE WHEN checked=1 THEN pa2 ELSE pb2 END;
      IF family='household_people' THEN
        row_id := p1;
      ELSIF family='person_hsa_tax_year_profiles' THEN
        SELECT f.row_id INTO row_id FROM pg_temp.ffh_rls_baselines f
        WHERE f.family=matrix_block.family AND f.scope=scope_name;
      ELSE
        EXECUTE pg_temp.ffh_fixture_sql(family,hh,p1,p2,0) INTO row_id;
      END IF;
      IF family NOT IN ('household_people','person_hsa_tax_year_profiles') THEN
        INSERT INTO pg_temp.ffh_rls_baselines(family,scope,row_id) VALUES(matrix_block.family,scope_name,matrix_block.row_id);
      ELSIF family='household_people' THEN
        INSERT INTO pg_temp.ffh_rls_baselines(family,scope,row_id) VALUES(matrix_block.family,scope_name,matrix_block.row_id);
      END IF;
      UPDATE pg_temp.ffh_rls_baselines f SET digest=pg_temp.ffh_digest(matrix_block.family,matrix_block.row_id)
      WHERE f.family=matrix_block.family AND f.scope=scope_name;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM pg_temp.ffh_rls_baselines) <> 26 THEN
    RAISE EXCEPTION 'MATRIX_INCOMPLETE_FINANCIAL_BASELINE';
  END IF;

  -- Role-specific negative matrix and B/A unchanged-row oracle.
  FOR principal IN SELECT * FROM (VALUES
    ('a-owner-to-b',a_owner,'B'),
    ('a-member-to-b',a_member,'B'),
    ('a-viewer-to-b',a_viewer,'B'),
    ('b-owner-to-a',b_owner,'A'),
    ('outsider-to-a',outsider,'A'),
    ('outsider-to-b',outsider,'B'),
    ('anon-to-a',NULL::uuid,'A'),
    ('anon-to-b',NULL::uuid,'B')
  ) AS p(label,user_id,target) LOOP
    target_scope := principal.target;
    hh := CASE WHEN target_scope='A' THEN a ELSE b END;
    p1 := CASE WHEN target_scope='A' THEN pa1 ELSE pb1 END;
    p2 := CASE WHEN target_scope='A' THEN pa2 ELSE pb2 END;
    FOR checked IN 1..13 LOOP
      family := family_names[checked];
      pk := CASE WHEN family='household_financial_preferences' THEN 'household_id' ELSE 'id' END;
      SELECT f.row_id,f.digest INTO baseline_id,base_digest
      FROM pg_temp.ffh_rls_baselines f WHERE f.family=matrix_block.family AND f.scope=target_scope;
      -- Both exact known-ID and broad household enumeration must disclose 0.
      PERFORM pg_temp.ffh_probe(principal.user_id,
        format('SELECT count(*) FROM public.%I WHERE %I=%L AND household_id=%L',family,pk,baseline_id,hh),
        CASE WHEN principal.user_id IS NULL THEN 'ANON_SELECT' ELSE 'COUNT' END,0,
        'foreign-exact-select',family);
      PERFORM pg_temp.ffh_probe(principal.user_id,
        format('SELECT count(*) FROM public.%I WHERE household_id=%L',family,hh),
        CASE WHEN principal.user_id IS NULL THEN 'ANON_SELECT' ELSE 'COUNT' END,0,
        'foreign-broad-select',family);
      sql_insert := pg_temp.ffh_fixture_sql(family,hh,p1,p2,4);
      PERFORM pg_temp.ffh_probe(principal.user_id,sql_insert,
        CASE WHEN principal.user_id IS NULL THEN 'ANON_INSERT' ELSE 'RLS' END,NULL,
        'foreign-insert',family);
      PERFORM pg_temp.ffh_probe(principal.user_id,
        format('UPDATE public.%I SET updated_at=now()+interval ''3 seconds'' WHERE %I=%L AND household_id=%L',family,pk,baseline_id,hh),
        CASE WHEN principal.user_id IS NULL THEN 'ANON_WRITE' ELSE 'DENY' END,0,
        'foreign-update',family);
      PERFORM pg_temp.ffh_probe(principal.user_id,
        format('DELETE FROM public.%I WHERE %I=%L AND household_id=%L',family,pk,baseline_id,hh),
        CASE WHEN principal.user_id IS NULL THEN 'ANON_WRITE' ELSE 'DENY' END,0,
        'foreign-delete',family);
      -- Observe through the actual owner role; then compare every whole-row
      -- digest with the original fixture, not just a count or missing UI row.
      PERFORM pg_temp.ffh_probe(CASE WHEN target_scope='A' THEN a_owner ELSE b_owner END,
        format('SELECT count(*) FROM public.%I WHERE %I=%L AND household_id=%L',family,pk,baseline_id,hh),
        'COUNT',1,'owner-unchanged-visible',family);
      now_digest := pg_temp.ffh_digest(family,baseline_id);
      IF now_digest IS DISTINCT FROM base_digest THEN
        RAISE EXCEPTION 'MATRIX_CROSS_HOUSEHOLD_ROW_CHANGED family=%',family;
      END IF;
      INSERT INTO pg_temp.ffh_rls_receipts(category,family) VALUES('cross-household-unchanged',family);
    END LOOP;
  END LOOP;

  -- Viewer can read A but cannot mutate even its own household.
  FOREACH family IN ARRAY family_names LOOP
    pk := CASE WHEN family='household_financial_preferences' THEN 'household_id' ELSE 'id' END;
    SELECT f.row_id,f.digest INTO baseline_id,base_digest
    FROM pg_temp.ffh_rls_baselines f WHERE f.family=matrix_block.family AND f.scope='A';
    PERFORM pg_temp.ffh_probe(a_viewer,
      format('SELECT count(*) FROM public.%I WHERE %I=%L AND household_id=%L',family,pk,baseline_id,a),
      'COUNT',1,'viewer-own-read',family);
    PERFORM pg_temp.ffh_probe(a_viewer,pg_temp.ffh_fixture_sql(family,a,pa1,pa2,4),
      'RLS',NULL,'viewer-own-insert-denied',family);
    PERFORM pg_temp.ffh_probe(a_viewer,
      format('UPDATE public.%I SET updated_at=now()+interval ''4 seconds'' WHERE %I=%L',family,pk,baseline_id),
      'DENY',0,'viewer-own-update-denied',family);
    PERFORM pg_temp.ffh_probe(a_viewer,
      format('DELETE FROM public.%I WHERE %I=%L',family,pk,baseline_id),
      'DENY',0,'viewer-own-delete-denied',family);
    IF pg_temp.ffh_digest(family,baseline_id) IS DISTINCT FROM base_digest THEN
      RAISE EXCEPTION 'MATRIX_VIEWER_MUTATED_BASELINE family=%',family;
    END IF;
  END LOOP;

  -- Allowed source A -> unauthorized destination B must be rejected by
  -- UPDATE USING/WITH CHECK, and A's original row remains byte-equivalent.
  FOREACH family IN ARRAY family_names LOOP
    IF family='household_financial_preferences' THEN CONTINUE; END IF;
    SELECT f.row_id,f.digest INTO baseline_id,base_digest FROM pg_temp.ffh_rls_baselines f
    WHERE f.family=matrix_block.family AND f.scope='A';
    PERFORM pg_temp.ffh_probe(a_owner,
      format('UPDATE public.%I SET household_id=%L WHERE id=%L AND household_id=%L',family,b,baseline_id,a),
      'DENY',0,'reassignment-a-to-b-denied',family);
    IF pg_temp.ffh_digest(family,baseline_id) IS DISTINCT FROM base_digest THEN
      RAISE EXCEPTION 'MATRIX_REASSIGNMENT_CHANGED_SOURCE family=%',family;
    END IF;
  END LOOP;
  -- Preferences PK is household_id, so moving to B's existing PK must not
  -- pass; this is tested as a separate controlled policy/PK case.
  SELECT f.row_id,f.digest INTO baseline_id,base_digest FROM pg_temp.ffh_rls_baselines f
  WHERE f.family='household_financial_preferences' AND f.scope='A';
  PERFORM pg_temp.ffh_probe(a_owner,
    format('UPDATE public.household_financial_preferences SET household_id=%L WHERE household_id=%L',b,a),
    'DENY',0,'reassignment-preferences-denied','household_financial_preferences');
  IF pg_temp.ffh_digest('household_financial_preferences',baseline_id) IS DISTINCT FROM base_digest THEN
    RAISE EXCEPTION 'MATRIX_PREFERENCES_REASSIGNMENT_CHANGED_SOURCE';
  END IF;

  -- Cross reassign in reverse (B owner -> A), with B row unchanged.
  FOREACH family IN ARRAY family_names LOOP
    SELECT f.row_id,f.digest INTO baseline_id,base_digest
    FROM pg_temp.ffh_rls_baselines f
    WHERE f.family=matrix_block.family AND f.scope='B';
    pk := CASE WHEN family='household_financial_preferences' THEN 'household_id' ELSE 'id' END;
    PERFORM pg_temp.ffh_probe(b_owner,format(
      'UPDATE public.%I SET household_id=%L WHERE %I=%L AND household_id=%L',
      family,a,pk,baseline_id,b),'DENY',0,'reassignment-b-to-a-denied',family);
    IF pg_temp.ffh_digest(family,baseline_id) IS DISTINCT FROM base_digest THEN
      RAISE EXCEPTION 'MATRIX_REVERSE_REASSIGNMENT_CHANGED_SOURCE family=%',family;
    END IF;
  END LOOP;

  -- Same-household parent references are already exercised by successful HSA
  -- and other positive fixtures; explicit mismatched composite FK probes
  -- must fail with the named FK SQLSTATE 23503 (not an RLS/permission error).
  FOR principal IN SELECT * FROM (VALUES
    (a_owner,a,pb1,pb2,'A'),
    (b_owner,b,pa1,pa2,'B')
  ) AS p(user_id,own_house,foreign_person1,foreign_person2,own_scope) LOOP
    SELECT f.row_id INTO baseline_id FROM pg_temp.ffh_rls_baselines f
    WHERE f.family='goals' AND f.scope=CASE WHEN principal.own_scope='A' THEN 'B' ELSE 'A' END;
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.person_hsa_tax_year_profiles(household_id,person_id,tax_year) VALUES(%L,%L,2033)',
      principal.own_house,principal.foreign_person1),'FK',NULL,'cross-fk','person_hsa_tax_year_profiles',
      'person_hsa_tax_year_profiles_person_household_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.income_sources(household_id,name,owner_person_id) VALUES(%L,%L,%L)',
      principal.own_house,'synthetic-cross-fk',principal.foreign_person1),'FK',NULL,'cross-fk','income_sources',
      'income_sources_owner_person_household_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.retirement_accounts(household_id,name,account_type,owner_person_id) VALUES(%L,%L,%L,%L)',
      principal.own_house,'synthetic-cross-fk','hsa',principal.foreign_person1),'FK',NULL,'cross-fk','retirement_accounts',
      'retirement_accounts_owner_person_household_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.insurance_exposures(household_id,name,insurance_type,person_id) VALUES(%L,%L,%L,%L)',
      principal.own_house,'synthetic-cross-fk','pet',principal.foreign_person1),'FK',NULL,'cross-fk','insurance_exposures',
      'insurance_exposures_person_household_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.accounts(household_id,name,account_type,cash_purpose,related_goal_id) VALUES(%L,%L,%L,%L,%L)',
      principal.own_house,'synthetic-cross-fk','checking','earmarked_goal',baseline_id),'FK',NULL,'cross-fk','accounts',
      'accounts_related_goal_household_fkey');
    SELECT f.row_id INTO baseline_id FROM pg_temp.ffh_rls_baselines f
    WHERE f.family='debts' AND f.scope=CASE WHEN principal.own_scope='A' THEN 'B' ELSE 'A' END;
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.accounts(household_id,name,account_type,cash_purpose,related_debt_id) VALUES(%L,%L,%L,%L,%L)',
      principal.own_house,'synthetic-cross-fk','checking','debt_backed_reserve',baseline_id),'FK',NULL,'cross-fk','accounts',
      'accounts_related_debt_household_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.person_hsa_month_statuses(household_id,person_id,tax_year,month) VALUES(%L,%L,2026,12)',
      principal.own_house,principal.foreign_person1),'FK',NULL,'cross-fk','person_hsa_month_statuses',
      'person_hsa_month_statuses_profile_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.household_hsa_married_allocations(household_id,tax_year,person_one_id,person_two_id,person_one_ordinary_amount,person_two_ordinary_amount) VALUES(%L,2033,%L,%L,1,1)',
      principal.own_house,principal.foreign_person1,principal.foreign_person2),'FK',NULL,'cross-fk','household_hsa_married_allocations',
      'household_hsa_married_allocations_person_one_fkey');
    PERFORM pg_temp.ffh_probe(principal.user_id,format(
      'INSERT INTO public.household_hsa_legal_spouse_authorities(household_id,tax_year,person_one_id,person_two_id) VALUES(%L,2033,%L,%L)',
      principal.own_house,principal.foreign_person1,principal.foreign_person2),'FK',NULL,'cross-fk','household_hsa_legal_spouse_authorities',
      'household_hsa_legal_spouse_authorities_person_one_fkey');
  END LOOP;

  -- Foundation: profiles are self-scoped; memberships are same-household
  -- visible but cannot be directly edited using authenticated privileges.
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'INSERT INTO public.profiles(id,display_name) VALUES(%L,%L)',a_owner,'synthetic-profile'),'ROWS',1,
    'profile-self-insert','profiles');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'SELECT count(*) FROM public.profiles WHERE id=%L',a_owner),'COUNT',1,
    'profile-self-select','profiles');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'UPDATE public.profiles SET display_name=%L WHERE id=%L','synthetic-profile-updated',a_owner),
    'ROWS',1,'profile-self-update','profiles');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'INSERT INTO public.profiles(id,display_name) VALUES(%L,%L)',b_owner,'foreign-profile'),'RLS',NULL,
    'profile-cross-insert','profiles');
  INSERT INTO public.profiles(id,display_name) VALUES(b_owner,'synthetic-b-profile');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'SELECT count(*) FROM public.profiles WHERE id=%L',b_owner),'COUNT',0,
    'profile-cross-select','profiles');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'UPDATE public.profiles SET display_name=%L WHERE id=%L','foreign-attempt',b_owner),
    'DENY',0,'profile-cross-update','profiles');
  PERFORM pg_temp.ffh_probe(a_member,format(
    'SELECT count(*) FROM public.households WHERE id=%L',a),'COUNT',1,
    'household-member-read','households');
  PERFORM pg_temp.ffh_probe(a_viewer,format(
    'SELECT count(*) FROM public.households WHERE id=%L',a),'COUNT',1,
    'household-viewer-read','households');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'SELECT count(*) FROM public.households WHERE id=%L',b),'COUNT',0,
    'household-cross-read','households');
  PERFORM pg_temp.ffh_probe(b_owner,format(
    'SELECT count(*) FROM public.households WHERE id=%L',a),'COUNT',0,
    'household-reverse-cross-read','households');
  PERFORM pg_temp.ffh_probe(outsider,format(
    'SELECT count(*) FROM public.households WHERE id IN (%L,%L)',a,b),'COUNT',0,
    'household-outsider-read','households');
  PERFORM pg_temp.ffh_probe(NULL::uuid,
    'SELECT count(*) FROM public.households','ANON_SELECT',0,'household-anon-read','households');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'UPDATE public.households SET updated_at=now()+interval ''3 seconds'' WHERE id=%L',a),
    'ROWS',1,'household-owner-update','households');
  PERFORM pg_temp.ffh_probe(a_member,format(
    'UPDATE public.households SET updated_at=now()+interval ''5 seconds'' WHERE id=%L',a),
    'DENY',0,'household-member-update-denied','households');
  PERFORM pg_temp.ffh_probe(a_viewer,format(
    'UPDATE public.households SET updated_at=now()+interval ''5 seconds'' WHERE id=%L',a),
    'DENY',0,'household-viewer-update-denied','households');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'UPDATE public.households SET created_by=%L WHERE id=%L',b_owner,a),
    'IMMUTABLE',NULL,'creator-immutable','households');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'INSERT INTO public.households(name,created_by) VALUES(%L,%L)',
    'synthetic-not-owned',b_owner),'RLS',NULL,'creator-forged-insert','households');
  PERFORM pg_temp.ffh_probe(a_viewer,format(
    'SELECT count(*) FROM public.household_members WHERE household_id=%L',a),
    'COUNT',3,'membership-viewer-own-read','household_members');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'SELECT count(*) FROM public.household_members WHERE household_id=%L',b),
    'COUNT',0,'membership-cross-read','household_members');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'DELETE FROM public.household_members WHERE household_id=%L',a),
    'FORBIDDEN',NULL,'membership-delete-forbidden','household_members');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'UPDATE public.household_members SET role=%L WHERE household_id=%L AND user_id=%L',
    'owner',a,a_viewer),'FORBIDDEN',NULL,'membership-update-forbidden','household_members');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'INSERT INTO public.household_members(household_id,user_id,role) VALUES(%L,%L,%L)',
    b,a_owner,'member'),'FORBIDDEN',NULL,'membership-insert-forbidden','household_members');

  -- Additional independent foundation role checks: self-profile RLS,
  -- anonymous/grant-denied behavior, outsider and reverse membership access.
  PERFORM pg_temp.ffh_probe(a_member,format(
    'INSERT INTO public.profiles(id,display_name) VALUES(%L,%L)',a_member,'synthetic-member-profile'),
    'ROWS',1,'profile-member-self-insert','profiles');
  PERFORM pg_temp.ffh_probe(a_viewer,format(
    'INSERT INTO public.profiles(id,display_name) VALUES(%L,%L)',a_viewer,'synthetic-viewer-profile'),
    'ROWS',1,'profile-viewer-self-insert','profiles');
  PERFORM pg_temp.ffh_probe(outsider,format(
    'INSERT INTO public.profiles(id,display_name) VALUES(%L,%L)',outsider,'synthetic-outsider-profile'),
    'ROWS',1,'profile-outsider-self-insert','profiles');
  PERFORM pg_temp.ffh_probe(a_viewer,format(
    'SELECT count(*) FROM public.profiles WHERE id=%L',a_viewer),
    'COUNT',1,'profile-viewer-self-select','profiles');
  PERFORM pg_temp.ffh_probe(outsider,format(
    'SELECT count(*) FROM public.profiles WHERE id=%L',outsider),
    'COUNT',1,'profile-outsider-self-select','profiles');
  PERFORM pg_temp.ffh_probe(b_owner,format(
    'SELECT count(*) FROM public.profiles WHERE id=%L',a_owner),
    'COUNT',0,'profile-reverse-cross-select','profiles');
  PERFORM pg_temp.ffh_probe(NULL::uuid,'SELECT count(*) FROM public.profiles',
    'ANON_SELECT',0,'profile-anon-read','profiles');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'DELETE FROM public.profiles WHERE id=%L',a_owner),
    'FORBIDDEN',0,'profile-delete-not-policy-authorized','profiles');
  PERFORM pg_temp.ffh_probe(a_member,format(
    'SELECT count(*) FROM public.household_members WHERE household_id=%L',a),
    'COUNT',3,'membership-member-own-read','household_members');
  PERFORM pg_temp.ffh_probe(b_owner,format(
    'SELECT count(*) FROM public.household_members WHERE household_id=%L',b),
    'COUNT',1,'membership-b-owner-own-read','household_members');
  PERFORM pg_temp.ffh_probe(b_owner,format(
    'SELECT count(*) FROM public.household_members WHERE household_id=%L',a),
    'COUNT',0,'membership-b-to-a-denied','household_members');
  PERFORM pg_temp.ffh_probe(outsider,
    'SELECT count(*) FROM public.household_members',
    'COUNT',0,'membership-outsider-denied','household_members');
  PERFORM pg_temp.ffh_probe(NULL::uuid,
    'SELECT count(*) FROM public.household_members',
    'ANON_SELECT',0,'membership-anon-denied','household_members');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'UPDATE public.households SET updated_at=now()+interval ''6 seconds'' WHERE id=%L',b),
    'DENY',0,'household-a-to-b-update-denied','households');
  PERFORM pg_temp.ffh_probe(b_owner,format(
    'UPDATE public.households SET updated_at=now()+interval ''6 seconds'' WHERE id=%L',a),
    'DENY',0,'household-b-to-a-update-denied','households');
  PERFORM pg_temp.ffh_probe(outsider,format(
    'UPDATE public.households SET updated_at=now()+interval ''6 seconds'' WHERE id=%L',a),
    'DENY',0,'household-outsider-update-denied','households');
  PERFORM pg_temp.ffh_probe(NULL::uuid,format(
    'UPDATE public.households SET updated_at=now()+interval ''6 seconds'' WHERE id=%L',b),
    'ANON_WRITE',0,'household-anon-update-denied','households');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'DELETE FROM public.households WHERE id=%L',a),
    'FORBIDDEN',0,'household-delete-not-policy-authorized','households');

  -- Privileged *fixture-only* membership transition, never authenticated app
  -- membership management. This must instantly remove member read/write.
  DELETE FROM public.household_members WHERE household_id=a AND user_id=a_member;
  GET DIAGNOSTICS checked=ROW_COUNT;
  IF checked <> 1 THEN RAISE EXCEPTION 'MATRIX_MEMBER_REVOCATION_FIXTURE_FAIL'; END IF;
  PERFORM pg_temp.ffh_probe(a_member,format(
    'SELECT count(*) FROM public.households WHERE id=%L',a),'COUNT',0,
    'member-revocation-household-read','households');
  PERFORM pg_temp.ffh_probe(a_member,format(
    'SELECT count(*) FROM public.accounts WHERE household_id=%L',a),'COUNT',0,
    'member-revocation-financial-read','accounts');
  PERFORM pg_temp.ffh_probe(a_member,pg_temp.ffh_fixture_sql('expenses',a,pa1,pa2,8),
    'RLS',NULL,'member-revocation-financial-write','expenses');
  PERFORM pg_temp.ffh_probe(a_owner,format(
    'SELECT count(*) FROM public.accounts WHERE household_id=%L',a),'COUNT',1,
    'owner-unaffected-by-revocation','accounts');
  INSERT INTO pg_temp.ffh_rls_receipts(category,family)
    VALUES('membership-revocation','household_members');

  -- Final private oracle: all A/B baselines except deliberate owner metadata
  -- update remain identical and all 26 synthetic financial rows still exist.
  FOR principal IN SELECT * FROM pg_temp.ffh_rls_baselines LOOP
    now_digest := pg_temp.ffh_digest(principal.family,principal.row_id);
    IF now_digest IS DISTINCT FROM principal.digest THEN
      RAISE EXCEPTION 'MATRIX_FINAL_BASELINE_CHANGED family=%',principal.family;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_temp.ffh_rls_receipts WHERE NOT passed)>0 THEN
    RAISE EXCEPTION 'MATRIX_FAILED_RECEIPT';
  END IF;
END
$matrix$;

-- No raw fixture IDs, SQL values or JWT claims in receipts.
SELECT 'MATRIX_ASSERTIONS_PASS=' || count(*)::text AS result FROM pg_temp.ffh_rls_receipts;
SELECT 'MATRIX_FINANCIAL_FAMILIES=' || count(DISTINCT family)::text AS result
  FROM pg_temp.ffh_rls_receipts WHERE category='positive-select-insert-update-delete';
SELECT 'MATRIX_BASELINE_ROWS=' || count(*)::text AS result FROM pg_temp.ffh_rls_baselines;
ROLLBACK;
\echo MATRIX_ROLLBACK_COMPLETE
-- Read-only post-rollback zero-residue witness; the execution guard required
-- an entirely empty baseline, so counts must be zero again.
DO $zero$
DECLARE t text; n integer;
BEGIN
  IF (SELECT count(*) FROM auth.users)<>0 OR
     (SELECT count(*) FROM auth.identities)<>0 OR
     (SELECT count(*) FROM public.households)<>0 OR
     (SELECT count(*) FROM public.household_members)<>0 OR
     (SELECT count(*) FROM public.profiles)<>0 THEN
    RAISE EXCEPTION 'MATRIX_ROLLBACK_RESIDUE_FOUND_FOUNDATION';
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'accounts','income_sources','expenses','debts','retirement_accounts',
    'goals','household_people','insurance_exposures',
    'household_financial_preferences','person_hsa_tax_year_profiles',
    'person_hsa_month_statuses','household_hsa_married_allocations',
    'household_hsa_legal_spouse_authorities'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'MATRIX_ROLLBACK_RESIDUE_FOUND family=%',t; END IF;
  END LOOP;
END
$zero$;
\echo MATRIX_ZERO_RESIDUE_PASS
