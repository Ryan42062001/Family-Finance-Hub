-- FFH-P07 independent review F02 (Ryan, 2026-11-14: fix before release). Check-ins can only be
-- written through the two check-in functions, which the database makes complete and audited:
--
-- * Signed-in users lose direct INSERT/UPDATE/DELETE on balance lines and direct INSERT/UPDATE on
--   check-ins. Reading is unchanged (any household member). Deleting a whole check-in (its lines go
--   with it) stays a direct, RLS-scoped owner/member action.
-- * create_monthly_check_in builds the balance lines itself from the household's Financial profile
--   (accounts counted in net worth, retirement accounts, debts) and requires exactly one amount entry
--   per item: none missing, none extra, none repeated. Names are copied by the database (C2).
-- * update_monthly_check_in requires exactly one amount per existing line of that check-in and always
--   stamps the check-in's updated_by/updated_at (C8).
-- * Both functions now run as SECURITY DEFINER with an empty search_path, so they work without the
--   table privileges above, and they check identity themselves: signed in; the household comes only
--   from the caller's own membership; owner or member (private.can_write_household_financials).
--   They never take a household from input. Viewers, outsiders and signed-out callers are refused.

revoke insert, update, delete on public.monthly_check_in_balances from authenticated;
revoke insert, update on public.monthly_check_ins from authenticated;

create or replace function public.create_monthly_check_in(
  p_month date,
  p_followed_plan boolean,
  p_balances jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_check_in uuid;
  v_line jsonb;
  v_item record;
  v_index integer := 0;
  v_entries integer;
  v_matched integer := 0;
begin
  if v_user is null then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;
  if p_month is null or p_followed_plan is null or p_balances is null
     or jsonb_typeof(p_balances) <> 'array' or jsonb_array_length(p_balances) > 300 then
    raise exception 'check-in: a required answer is missing or malformed' using errcode = '22023';
  end if;
  if extract(day from p_month) <> 1 then
    raise exception 'check-in: month must be the first day of a month' using errcode = '22023';
  end if;
  for v_line in select value from jsonb_array_elements(p_balances) loop
    if jsonb_typeof(v_line) <> 'object'
       or jsonb_typeof(v_line -> 'item_type') is distinct from 'string'
       or (v_line ->> 'item_type') not in ('account', 'retirement_account', 'debt')
       or jsonb_typeof(v_line -> 'item_id') is distinct from 'string'
       or (v_line ->> 'item_id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'check-in: a balance line is malformed' using errcode = '22023';
    end if;
    perform private.check_in_amount(v_line -> 'amount');
  end loop;
  -- No item may be listed twice.
  if (select count(*) from jsonb_array_elements(p_balances))
     <> (select count(distinct (e ->> 'item_type', lower(e ->> 'item_id'))) from jsonb_array_elements(p_balances) e) then
    raise exception 'check-in: a balance is listed more than once' using errcode = '22023';
  end if;

  -- One household per account (household_members_one_household_per_user).
  select m.household_id into v_household
  from public.household_members m
  where m.user_id = v_user;
  if v_household is null then
    raise exception 'permission denied: no household for this user' using errcode = '42501';
  end if;
  if not private.can_write_household_financials(v_household) then
    raise exception 'permission denied: viewers cannot save check-ins' using errcode = '42501';
  end if;

  insert into public.monthly_check_ins (household_id, check_in_month, followed_plan)
  values (v_household, p_month, p_followed_plan)
  returning id into v_check_in;

  -- The lines are the household's profile items, in profile order; every one needs an entry.
  for v_item in
    select 'account'::text as item_type, a.id, a.name, 1 as kind_order, a.created_at
      from public.accounts a where a.household_id = v_household and a.include_in_net_worth
    union all
    select 'retirement_account', r.id, r.name, 2, r.created_at
      from public.retirement_accounts r where r.household_id = v_household
    union all
    select 'debt', d.id, d.name, 3, d.created_at
      from public.debts d where d.household_id = v_household
    order by kind_order, created_at, id
  loop
    select e into v_line from jsonb_array_elements(p_balances) e
    where e ->> 'item_type' = v_item.item_type and lower(e ->> 'item_id') = v_item.id::text;
    if v_line is null then
      raise exception 'check-in: a balance is missing for a Financial profile item' using errcode = '22023';
    end if;
    insert into public.monthly_check_in_balances (household_id, check_in_id, item_type, name, amount, sort_order)
    values (v_household, v_check_in, v_item.item_type, left(v_item.name, 100),
            private.check_in_amount(v_line -> 'amount'), v_index);
    v_index := v_index + 1;
    v_matched := v_matched + 1;
  end loop;

  v_entries := jsonb_array_length(p_balances);
  if v_entries <> v_matched then
    raise exception 'check-in: a balance does not match a Financial profile item' using errcode = '22023';
  end if;
  return v_check_in;
end;
$$;

create or replace function public.update_monthly_check_in(
  p_check_in_id uuid,
  p_followed_plan boolean,
  p_amounts jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_line jsonb;
  v_rows integer;
  v_lines integer;
begin
  if v_user is null then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;
  if p_check_in_id is null or p_followed_plan is null or p_amounts is null
     or jsonb_typeof(p_amounts) <> 'array' or jsonb_array_length(p_amounts) > 300 then
    raise exception 'check-in: a required answer is missing or malformed' using errcode = '22023';
  end if;
  for v_line in select value from jsonb_array_elements(p_amounts) loop
    if jsonb_typeof(v_line) <> 'object' or jsonb_typeof(v_line -> 'id') is distinct from 'string'
       or (v_line ->> 'id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'check-in: a balance line is malformed' using errcode = '22023';
    end if;
    perform private.check_in_amount(v_line -> 'amount');
  end loop;
  if (select count(*) from jsonb_array_elements(p_amounts))
     <> (select count(distinct lower(e ->> 'id')) from jsonb_array_elements(p_amounts) e) then
    raise exception 'check-in: a balance is listed more than once' using errcode = '22023';
  end if;

  select m.household_id into v_household
  from public.household_members m
  where m.user_id = v_user;
  -- The same refusal for "not yours", "not found" and "viewer", so nothing is disclosed.
  if v_household is null or not private.can_write_household_financials(v_household)
     or not exists (select 1 from public.monthly_check_ins c
                    where c.id = p_check_in_id and c.household_id = v_household) then
    raise exception 'permission denied: check-in not found or not editable' using errcode = '42501';
  end if;

  select count(*) into v_lines from public.monthly_check_in_balances
  where check_in_id = p_check_in_id and household_id = v_household;
  if v_lines <> jsonb_array_length(p_amounts) then
    raise exception 'check-in: every balance line needs exactly one amount' using errcode = '22023';
  end if;

  for v_line in select value from jsonb_array_elements(p_amounts) loop
    update public.monthly_check_in_balances
    set amount = private.check_in_amount(v_line -> 'amount')
    where id = (v_line ->> 'id')::uuid and check_in_id = p_check_in_id and household_id = v_household;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'check-in: a balance line does not belong to this check-in' using errcode = '22023';
    end if;
  end loop;

  -- Always stamps updated_by/updated_at (trigger); the planned cash-flow snapshot stays frozen.
  update public.monthly_check_ins set followed_plan = p_followed_plan
  where id = p_check_in_id and household_id = v_household;
end;
$$;

revoke all on function public.create_monthly_check_in(date, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.update_monthly_check_in(uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.create_monthly_check_in(date, boolean, jsonb) to authenticated;
grant execute on function public.update_monthly_check_in(uuid, boolean, jsonb) to authenticated;
