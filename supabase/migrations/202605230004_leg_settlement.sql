create or replace function public.settle_bet_leg(
  p_bet_id uuid,
  p_selection_id text,
  p_status text
)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet public.bets;
  v_selections jsonb := '[]'::jsonb;
  v_selection jsonb;
  v_updated_selection jsonb;
  v_found boolean := false;
  v_has_pending boolean := false;
  v_has_lost boolean := false;
  v_has_refund boolean := false;
  v_final_status text := 'Open';
  v_settled_payout numeric(14, 2) := 0;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('Pending', 'Won', 'Lost', 'Refund', 'Cancelled') then
    raise exception 'Unsupported selection status';
  end if;

  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.status <> 'Open' then
    raise exception 'Only open bets can be settled by leg';
  end if;

  for v_selection in select * from jsonb_array_elements(v_bet.selections)
  loop
    if v_selection->>'id' = p_selection_id then
      v_found := true;
      v_updated_selection := jsonb_set(v_selection, '{status}', to_jsonb(p_status), true);
      v_selections := v_selections || jsonb_build_array(v_updated_selection);
    else
      v_updated_selection := v_selection;
      v_selections := v_selections || jsonb_build_array(v_selection);
    end if;

    if coalesce(v_updated_selection->>'status', 'Pending') = 'Pending' then
      v_has_pending := true;
    elsif v_updated_selection->>'status' = 'Lost' then
      v_has_lost := true;
    elsif v_updated_selection->>'status' in ('Refund', 'Cancelled') then
      v_has_refund := true;
    end if;
  end loop;

  if not v_found then
    raise exception 'Selection not found';
  end if;

  if v_has_lost then
    v_final_status := 'Lost';
    v_settled_payout := 0;
  elsif not v_has_pending then
    if v_has_refund then
      v_final_status := 'Refund';
      v_settled_payout := v_bet.stake;
    else
      v_final_status := 'Won';
      v_settled_payout := v_bet.payout;
    end if;
  end if;

  update public.bets
  set selections = v_selections,
      status = v_final_status,
      settled_payout = case when v_final_status = 'Open' then settled_payout else v_settled_payout end,
      settled_at = case when v_final_status = 'Open' then settled_at else now() end
  where id = v_bet.id
  returning * into v_bet;

  if v_final_status <> 'Open' and v_settled_payout > 0 then
    update public.profiles
    set balance = balance + v_settled_payout
    where id = v_bet.user_id;
  end if;

  return v_bet;
end;
$$;

revoke all on function public.settle_bet_leg(uuid, text, text) from public;
grant execute on function public.settle_bet_leg(uuid, text, text) to authenticated;
