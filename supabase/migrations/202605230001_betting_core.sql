create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14, 2) not null default 1000.00 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Open' check (status in ('Open', 'Won', 'Lost', 'Cashed Out', 'Cancelled', 'Refund')),
  selections jsonb not null check (jsonb_typeof(selections) = 'array' and jsonb_array_length(selections) > 0),
  stake numeric(14, 2) not null check (stake > 0),
  total_odds numeric(14, 4) not null check (total_odds > 0),
  payout numeric(14, 2) not null check (payout >= 0),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists bets_user_created_idx on public.bets (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.bets enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "bets_select_own" on public.bets;
create policy "bets_select_own"
on public.bets for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.get_wallet()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select balance into v_balance
  from public.profiles
  where id = v_user_id;

  return coalesce(v_balance, 0);
end;
$$;

create or replace function public.place_bet(
  p_selections jsonb,
  p_stake numeric,
  p_total_odds numeric,
  p_payout numeric
)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet public.bets;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_stake is null or p_stake <= 0 then
    raise exception 'Stake must be greater than zero';
  end if;

  if p_total_odds is null or p_total_odds <= 0 then
    raise exception 'Total odds must be greater than zero';
  end if;

  if p_payout is null or p_payout < 0 then
    raise exception 'Payout must be zero or greater';
  end if;

  if p_selections is null or jsonb_typeof(p_selections) <> 'array' or jsonb_array_length(p_selections) = 0 then
    raise exception 'At least one selection is required';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  update public.profiles
  set balance = balance - p_stake
  where id = v_user_id
    and balance >= p_stake;

  if not found then
    raise exception 'Insufficient balance';
  end if;

  insert into public.bets (user_id, selections, stake, total_odds, payout)
  values (v_user_id, p_selections, round(p_stake, 2), p_total_odds, round(p_payout, 2))
  returning * into v_bet;

  return v_bet;
end;
$$;

revoke all on function public.get_wallet() from public;
revoke all on function public.place_bet(jsonb, numeric, numeric, numeric) from public;
grant execute on function public.get_wallet() to authenticated;
grant execute on function public.place_bet(jsonb, numeric, numeric, numeric) to authenticated;
