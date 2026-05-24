alter table public.profiles
add column if not exists is_admin boolean not null default false;

create or replace function public.current_user_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_user_id is null then
    return false;
  end if;

  select is_admin into v_is_admin
  from public.profiles
  where id = v_user_id;

  return coalesce(v_is_admin, false);
end;
$$;

create or replace function public.list_admin_bets(p_status text default 'Open')
returns setof public.bets
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select b.*
  from public.bets b
  where p_status is null or b.status = p_status
  order by b.created_at desc
  limit 100;
end;
$$;

create or replace function public.settle_bet(
  p_bet_id uuid,
  p_status text
)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet public.bets;
  v_settled_payout numeric(14, 2);
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('Won', 'Lost', 'Refund', 'Cancelled') then
    raise exception 'Unsupported settlement status';
  end if;

  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.status <> 'Open' then
    raise exception 'Only open bets can be settled';
  end if;

  v_settled_payout := case p_status
    when 'Won' then v_bet.payout
    when 'Refund' then v_bet.stake
    when 'Cancelled' then v_bet.stake
    else 0
  end;

  update public.bets
  set status = p_status,
      settled_payout = v_settled_payout,
      settled_at = now()
  where id = v_bet.id
  returning * into v_bet;

  if v_settled_payout > 0 then
    update public.profiles
    set balance = balance + v_settled_payout
    where id = v_bet.user_id;
  end if;

  return v_bet;
end;
$$;

revoke all on function public.current_user_is_admin() from public;
revoke all on function public.list_admin_bets(text) from public;
revoke all on function public.settle_bet(uuid, text) from public;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.list_admin_bets(text) to authenticated;
grant execute on function public.settle_bet(uuid, text) to authenticated;
