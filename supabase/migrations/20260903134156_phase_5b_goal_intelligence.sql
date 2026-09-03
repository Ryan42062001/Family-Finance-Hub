alter table public.goals
  add column goal_intelligence_confirmed boolean not null default false,
  add column underlying_need text null,
  add column desired_solution text null,
  add column goal_nature text null,
  add column underfunding_consequence text null,
  add column borrowing_likelihood text null,
  add column expected_borrowing_amount numeric(14,2) null,
  add column expected_borrowing_apr numeric(7,4) null;

alter table public.goals
  drop constraint goals_goal_class_check,
  drop constraint goals_necessity_check,
  drop constraint goals_deadline_flexibility_check,
  drop constraint goals_consequence_level_check,
  add constraint goals_goal_class_check check (goal_class = any (array['necessary_protective'::text,'major_life_goal'::text,'education'::text,'home_purchase'::text,'lifestyle_optional'::text,'other'::text,'unknown'::text])),
  add constraint goals_necessity_check check (necessity = any (array['required'::text,'important'::text,'optional'::text,'unknown'::text])),
  add constraint goals_deadline_flexibility_check check (deadline_flexibility = any (array['fixed'::text,'somewhat_flexible'::text,'flexible'::text,'unknown'::text])),
  add constraint goals_consequence_level_check check (consequence_level = any (array['critical'::text,'high'::text,'moderate'::text,'low'::text,'unknown'::text])),
  add constraint goals_underlying_need_length_check check (underlying_need is null or char_length(underlying_need) between 1 and 500),
  add constraint goals_desired_solution_length_check check (desired_solution is null or char_length(desired_solution) between 1 and 500),
  add constraint goals_nature_check check (goal_nature is null or goal_nature = any (array['preservation'::text,'improvement'::text,'mixed'::text,'unknown'::text])),
  add constraint goals_underfunding_consequence_check check (underfunding_consequence is null or underfunding_consequence = any (array['safely_delay'::text,'reduce_solution'::text,'inconvenience'::text,'likely_financing'::text,'higher_future_cost'::text,'employment_disruption'::text,'housing_disruption'::text,'health_safety'::text,'caregiving_disruption'::text,'contractual_payment'::text,'other_material'::text,'unknown'::text])),
  add constraint goals_borrowing_likelihood_check check (borrowing_likelihood is null or borrowing_likelihood = any (array['unlikely'::text,'possible'::text,'likely'::text,'unknown'::text])),
  add constraint goals_expected_borrowing_amount_check check (expected_borrowing_amount is null or expected_borrowing_amount >= 0),
  add constraint goals_expected_borrowing_apr_check check (expected_borrowing_apr is null or (expected_borrowing_apr >= 0 and expected_borrowing_apr <= 100));

comment on column public.goals.goal_intelligence_confirmed is
  'False for legacy rows whose earlier defaults are not confirmed user evidence; true when Phase 5B facts were explicitly collected.';
comment on column public.goals.core_need_amount is
  'Optional minimum amount that satisfies the underlying need; distinct from the full desired target and never inferred from category.';
