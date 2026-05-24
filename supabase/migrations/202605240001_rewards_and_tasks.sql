create table if not exists public.time_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null check (reward_type in ('daily', 'weekly', 'monthly')),
  last_claimed_at timestamptz not null default now(),
  primary key (user_id, reward_type)
);

create table if not exists public.task_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.time_reward_claims enable row level security;
alter table public.task_reward_claims enable row level security;

drop policy if exists "time_reward_claims_select_own" on public.time_reward_claims;
create policy "time_reward_claims_select_own"
on public.time_reward_claims for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "task_reward_claims_select_own" on public.task_reward_claims;
create policy "task_reward_claims_select_own"
on public.task_reward_claims for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.get_rewards_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_time_rewards jsonb := '{}'::jsonb;
  v_task_claims jsonb := '{}'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(jsonb_object_agg(reward_type, last_claimed_at), '{}'::jsonb)
  into v_time_rewards
  from public.time_reward_claims
  where user_id = v_user_id;

  select coalesce(jsonb_object_agg(task_id, claimed_at), '{}'::jsonb)
  into v_task_claims
  from public.task_reward_claims
  where user_id = v_user_id;

  return jsonb_build_object(
    'timeRewards', v_time_rewards,
    'taskClaims', v_task_claims
  );
end;
$$;

create or replace function public.claim_time_reward(p_reward_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount numeric(14, 2);
  v_cooldown interval;
  v_last_claimed_at timestamptz;
  v_balance numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_amount := case p_reward_type
    when 'daily' then 25
    when 'weekly' then 100
    when 'monthly' then 300
    else null
  end;

  v_cooldown := case p_reward_type
    when 'daily' then interval '24 hours'
    when 'weekly' then interval '7 days'
    when 'monthly' then interval '30 days'
    else null
  end;

  if v_amount is null or v_cooldown is null then
    raise exception 'Unsupported reward type';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select last_claimed_at into v_last_claimed_at
  from public.time_reward_claims
  where user_id = v_user_id and reward_type = p_reward_type
  for update;

  if v_last_claimed_at is not null and now() < v_last_claimed_at + v_cooldown then
    raise exception 'Reward is still on cooldown';
  end if;

  insert into public.time_reward_claims (user_id, reward_type, last_claimed_at)
  values (v_user_id, p_reward_type, now())
  on conflict (user_id, reward_type)
  do update set last_claimed_at = excluded.last_claimed_at;

  update public.profiles
  set balance = balance + v_amount
  where id = v_user_id
  returning balance into v_balance;

  return jsonb_build_object(
    'rewardType', p_reward_type,
    'amount', v_amount,
    'balance', v_balance,
    'claimedAt', now()
  );
end;
$$;

create or replace function public.get_task_reward_config(
  p_task_id text,
  out reward numeric,
  out target integer
)
language plpgsql
stable
as $$
begin
  reward := case p_task_id
    when 'place_1' then 5
    when 'place_3' then 10
    when 'place_5' then 15
    when 'place_10' then 30
    when 'place_25' then 75
    when 'place_50' then 150
    when 'single_10' then 25
    when 'combo_1' then 15
    when 'combo_3' then 35
    when 'combo_5' then 60
    when 'stake_50' then 10
    when 'stake_100' then 20
    when 'stake_250' then 45
    when 'stake_500' then 90
    when 'stake_1000' then 180
    when 'win_1' then 50
    when 'win_3' then 100
    when 'win_5' then 175
    when 'win_10' then 350
    when 'cashout_1' then 25
    when 'cashout_3' then 70
    when 'refund_1' then 20
    when 'odds_2' then 20
    when 'odds_3' then 35
    when 'odds_5' then 75
    when 'football_3' then 25
    when 'csgo_3' then 25
    when 'lol_3' then 25
    when 'market_winner_5' then 30
    when 'market_total_5' then 30
    else null
  end;

  target := case p_task_id
    when 'place_1' then 1
    when 'place_3' then 3
    when 'place_5' then 5
    when 'place_10' then 10
    when 'place_25' then 25
    when 'place_50' then 50
    when 'single_10' then 10
    when 'combo_1' then 1
    when 'combo_3' then 3
    when 'combo_5' then 5
    when 'stake_50' then 50
    when 'stake_100' then 100
    when 'stake_250' then 250
    when 'stake_500' then 500
    when 'stake_1000' then 1000
    when 'win_1' then 1
    when 'win_3' then 3
    when 'win_5' then 5
    when 'win_10' then 10
    when 'cashout_1' then 1
    when 'cashout_3' then 3
    when 'refund_1' then 1
    when 'odds_2' then 1
    when 'odds_3' then 1
    when 'odds_5' then 1
    when 'football_3' then 3
    when 'csgo_3' then 3
    when 'lol_3' then 3
    when 'market_winner_5' then 5
    when 'market_total_5' then 5
    else null
  end;
end;
$$;

create or replace function public.get_task_reward_progress(p_user_id uuid, p_task_id text)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  v_progress numeric := 0;
begin
  case p_task_id
    when 'place_1', 'place_3', 'place_5', 'place_10', 'place_25', 'place_50' then
      select count(*) into v_progress from public.bets where user_id = p_user_id;
    when 'single_10' then
      select count(*) into v_progress from public.bets where user_id = p_user_id and jsonb_array_length(selections) = 1;
    when 'combo_1', 'combo_3', 'combo_5' then
      select count(*) into v_progress from public.bets where user_id = p_user_id and jsonb_array_length(selections) > 1;
    when 'stake_50', 'stake_100', 'stake_250', 'stake_500', 'stake_1000' then
      select coalesce(sum(stake), 0) into v_progress from public.bets where user_id = p_user_id;
    when 'win_1', 'win_3', 'win_5', 'win_10' then
      select count(*) into v_progress from public.bets where user_id = p_user_id and status = 'Won';
    when 'cashout_1', 'cashout_3' then
      select count(*) into v_progress from public.bets where user_id = p_user_id and status = 'Cashed Out';
    when 'refund_1' then
      select count(*) into v_progress from public.bets where user_id = p_user_id and status = 'Refund';
    when 'odds_2' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where (s->>'odds')::numeric >= 2);
    when 'odds_3' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where (s->>'odds')::numeric >= 3);
    when 'odds_5' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where (s->>'odds')::numeric >= 5);
    when 'football_3' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where lower(coalesce(s->>'sport', '')) similar to '%(football|soccer)%');
    when 'csgo_3' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where lower(coalesce(s->>'sport', '')) similar to '%(cs|counter)%');
    when 'lol_3' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where lower(coalesce(s->>'sport', '')) similar to '%(league of legends|lol)%');
    when 'market_winner_5' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where lower(coalesce(s->>'marketName', '')) like '%winner%');
    when 'market_total_5' then
      select count(*) into v_progress
      from public.bets b
      where b.user_id = p_user_id
        and exists (select 1 from jsonb_array_elements(b.selections) s where lower(coalesce(s->>'marketName', '')) like '%total%');
    else
      raise exception 'Unsupported task id';
  end case;

  return floor(coalesce(v_progress, 0))::integer;
end;
$$;

create or replace function public.claim_task_reward(p_task_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward numeric(14, 2);
  v_target integer;
  v_progress integer;
  v_balance numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select reward, target into v_reward, v_target
  from public.get_task_reward_config(p_task_id);

  if v_reward is null or v_target is null then
    raise exception 'Unsupported task id';
  end if;

  if exists (select 1 from public.task_reward_claims where user_id = v_user_id and task_id = p_task_id) then
    raise exception 'Task already claimed';
  end if;

  v_progress := public.get_task_reward_progress(v_user_id, p_task_id);

  if v_progress < v_target then
    raise exception 'Task is not complete';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into public.task_reward_claims (user_id, task_id, claimed_at)
  values (v_user_id, p_task_id, now());

  update public.profiles
  set balance = balance + v_reward
  where id = v_user_id
  returning balance into v_balance;

  return jsonb_build_object(
    'taskId', p_task_id,
    'amount', v_reward,
    'balance', v_balance,
    'claimedAt', now()
  );
end;
$$;

revoke all on function public.get_rewards_state() from public;
revoke all on function public.claim_time_reward(text) from public;
revoke all on function public.get_task_reward_config(text) from public;
revoke all on function public.get_task_reward_progress(uuid, text) from public;
revoke all on function public.claim_task_reward(text) from public;

grant execute on function public.get_rewards_state() to authenticated;
grant execute on function public.claim_time_reward(text) to authenticated;
grant execute on function public.claim_task_reward(text) to authenticated;
