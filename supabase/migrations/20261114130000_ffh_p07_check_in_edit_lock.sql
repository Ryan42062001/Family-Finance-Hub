-- FFH-P07 independent re-review N01 (Ryan, 2026-11-14: fix before release). update_monthly_check_in
-- locked balance lines one by one in the order the caller listed them and updated the check-in row
-- last, so two editors saving the same check-in with lines in different orders could deadlock (one
-- save failed). It now locks the check-in row (FOR UPDATE) before touching any line, so concurrent
-- edits of one check-in are serialized. Only this function body changes; it stays SECURITY DEFINER
-- with search_path '' and keeps its owner and grants (create or replace).

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

  -- Review N01: lock the check-in row first, so simultaneous edits of the same check-in run one
  -- after the other instead of locking its lines in different orders and deadlocking.
  perform 1 from public.monthly_check_ins c
  where c.id = p_check_in_id and c.household_id = v_household
  for update;

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
