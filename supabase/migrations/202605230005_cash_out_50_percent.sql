create or replace function public.cash_out_bet(p_bet_id uuid)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet public.bets;
  v_cash_out numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_bet
  from public.bets
  where id = p_bet_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.status <> 'Open' then
    raise exception 'Only open bets can be cashed out';
  end if;

  v_cash_out := round(v_bet.stake * 0.50, 2);

  update public.bets
  set status = 'Cashed Out',
      settled_payout = v_cash_out,
      settled_at = now()
  where id = v_bet.id
  returning * into v_bet;

  update public.profiles
  set balance = balance + v_cash_out
  where id = v_user_id;

  return v_bet;
end;
$$;

revoke all on function public.cash_out_bet(uuid) from public;
grant execute on function public.cash_out_bet(uuid) to authenticated;
