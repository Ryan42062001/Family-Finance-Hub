create unique index if not exists goals_id_household_id_uidx on public.goals (id, household_id);
create unique index if not exists debts_id_household_id_uidx on public.debts (id, household_id);

alter table public.accounts
  add column cash_purpose text not null default 'unallocated',
  add column related_goal_id uuid null,
  add column related_debt_id uuid null;

alter table public.accounts
  add constraint accounts_cash_purpose_check check (cash_purpose = any (array['unallocated'::text,'protected_reserve'::text,'earmarked_goal'::text,'debt_backed_reserve'::text,'operating_cash'::text,'not_applicable'::text])),
  add constraint accounts_related_goal_household_fkey foreign key (related_goal_id, household_id) references public.goals(id, household_id) on delete set null,
  add constraint accounts_related_debt_household_fkey foreign key (related_debt_id, household_id) references public.debts(id, household_id) on delete set null,
  add constraint accounts_cash_purpose_relation_check check (
    (cash_purpose = 'earmarked_goal' and related_goal_id is not null and related_debt_id is null)
    or (cash_purpose = 'debt_backed_reserve' and related_debt_id is not null and related_goal_id is null)
    or (cash_purpose not in ('earmarked_goal','debt_backed_reserve') and related_goal_id is null and related_debt_id is null)
  );

create table public.insurance_exposures (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid null,
  name text not null check (char_length(name) between 1 and 100),
  insurance_type text not null check (insurance_type = any (array['health'::text,'auto'::text,'homeowners'::text,'renters'::text,'umbrella'::text,'pet'::text,'other'::text])),
  deductible_amount numeric(14,2) null check (deductible_amount is null or deductible_amount >= 0),
  family_deductible_amount numeric(14,2) null check (family_deductible_amount is null or family_deductible_amount >= 0),
  out_of_pocket_max numeric(14,2) null check (out_of_pocket_max is null or out_of_pocket_max >= 0),
  percentage_deductible numeric(7,4) null check (percentage_deductible is null or (percentage_deductible >= 0 and percentage_deductible <= 1)),
  insured_value numeric(14,2) null check (insured_value is null or insured_value >= 0),
  is_relevant_to_reserve boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insurance_exposures_person_household_fkey foreign key (person_id, household_id) references public.household_people(id, household_id) on delete set null,
  constraint insurance_exposures_percentage_pair_check check ((percentage_deductible is null and insured_value is null) or (percentage_deductible is not null and insured_value is not null))
);

alter table public.insurance_exposures enable row level security;
grant select, insert, update, delete on public.insurance_exposures to authenticated;

create policy insurance_exposures_member_select on public.insurance_exposures for select to authenticated using (private.is_household_member(household_id));
create policy insurance_exposures_member_insert on public.insurance_exposures for insert to authenticated with check (private.is_household_member(household_id));
create policy insurance_exposures_member_update on public.insurance_exposures for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy insurance_exposures_member_delete on public.insurance_exposures for delete to authenticated using (private.is_household_member(household_id));

alter table public.debts
  add column rate_type text not null default 'fixed',
  add column promo_rate_expires_on date null,
  add column post_promo_interest_rate numeric(7,4) null,
  add column is_past_due boolean not null default false,
  add column is_in_collections boolean not null default false,
  add column has_legal_or_tax_priority boolean not null default false,
  add column forgiveness_or_repayment_program text null,
  add column scheduled_payoff_date date null;

alter table public.debts
  add constraint debts_rate_type_check check (rate_type = any (array['fixed'::text,'variable'::text,'promotional'::text,'unknown'::text])),
  add constraint debts_post_promo_interest_rate_check check (post_promo_interest_rate is null or (post_promo_interest_rate >= 0 and post_promo_interest_rate <= 100)),
  add constraint debts_promo_fields_check check ((rate_type = 'promotional' and promo_rate_expires_on is not null) or rate_type <> 'promotional'),
  add constraint debts_forgiveness_program_length_check check (forgiveness_or_repayment_program is null or char_length(forgiveness_or_repayment_program) <= 200);

alter table public.goals
  add column goal_class text not null default 'major_life_goal',
  add column necessity text not null default 'important',
  add column deadline_flexibility text not null default 'flexible',
  add column consequence_level text not null default 'moderate',
  add column planned_monthly_contribution numeric(14,2) null,
  add column core_need_amount numeric(14,2) null;

alter table public.goals
  add constraint goals_goal_class_check check (goal_class = any (array['necessary_protective'::text,'major_life_goal'::text,'education'::text,'home_purchase'::text,'lifestyle_optional'::text,'other'::text])),
  add constraint goals_necessity_check check (necessity = any (array['required'::text,'important'::text,'optional'::text])),
  add constraint goals_deadline_flexibility_check check (deadline_flexibility = any (array['fixed'::text,'somewhat_flexible'::text,'flexible'::text])),
  add constraint goals_consequence_level_check check (consequence_level = any (array['high'::text,'moderate'::text,'low'::text])),
  add constraint goals_planned_monthly_contribution_check check (planned_monthly_contribution is null or planned_monthly_contribution >= 0),
  add constraint goals_core_need_amount_check check (core_need_amount is null or (core_need_amount >= 0 and core_need_amount <= target_amount));

create index accounts_related_goal_household_idx on public.accounts (related_goal_id, household_id) where related_goal_id is not null;
create index accounts_related_debt_household_idx on public.accounts (related_debt_id, household_id) where related_debt_id is not null;
create index insurance_exposures_household_id_idx on public.insurance_exposures (household_id);
create index insurance_exposures_person_household_idx on public.insurance_exposures (person_id, household_id) where person_id is not null;
