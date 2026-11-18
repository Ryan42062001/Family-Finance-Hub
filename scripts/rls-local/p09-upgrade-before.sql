-- FFH-P09 upgrade check, step 1 (LOCAL HARNESS ONLY, throw-away database): legacy synthetic rows written BEFORE the
-- P09 migration, in the shapes the released app wrote them (monthly_amount only).
\set ON_ERROR_STOP on
INSERT INTO auth.users(id,instance_id,aud,role) VALUES ('00000000-0000-4000-8000-000000000901','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000901',false);
INSERT INTO public.households(id,name,created_by) VALUES ('00000000-0000-4000-8000-000000000902','ZZ-P09 upgrade','00000000-0000-4000-8000-000000000901');
INSERT INTO public.expenses(household_id,name,category,monthly_amount,is_essential) VALUES
  ('00000000-0000-4000-8000-000000000902','ZZ rent','housing',1850.00,true),
  ('00000000-0000-4000-8000-000000000902','ZZ odd cents','other',33.33,false),
  ('00000000-0000-4000-8000-000000000902','ZZ zero','other',0,false),
  ('00000000-0000-4000-8000-000000000902','ZZ big','other',999999999999.99,true);
INSERT INTO public.debts(household_id,name,debt_type,current_balance,minimum_payment) VALUES
  ('00000000-0000-4000-8000-000000000902','ZZ card','credit_card',1200,45.67);
CREATE TABLE public.ffh_p09_before AS
  SELECT (SELECT string_agg(name||':'||monthly_amount, ',' ORDER BY name) FROM public.expenses) AS expenses,
         (SELECT string_agg(name||':'||minimum_payment, ',' ORDER BY name) FROM public.debts) AS debts;
