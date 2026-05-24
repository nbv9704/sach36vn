import { CurrencyAmount, CurrencyIcon } from '../components/common/CurrencyAmount';
import { PageShell } from '../components/layout/FeedbackStates';
import { getEarnedStats, getSpentStats } from '../lib/match-utils';

const DAY_MS = 24 * 60 * 60 * 1000;

const TIME_REWARDS = [
  { id: 'daily', title: 'Daily Drop', amount: 25, cooldownMs: DAY_MS, note: 'Claim once every 24 hours.' },
  { id: 'weekly', title: 'Weekly Reload', amount: 100, cooldownMs: 7 * DAY_MS, note: 'Claim once every 7 days.' },
  { id: 'monthly', title: 'Monthly Boost', amount: 300, cooldownMs: 30 * DAY_MS, note: 'Claim once every 30 days.' },
];

const TASKS = [
  { id: 'place_1', title: 'First Slip', description: 'Place 1 bet.', target: 1, reward: 5, type: 'betCount' },
  { id: 'place_3', title: 'Warm Up', description: 'Place 3 bets.', target: 3, reward: 10, type: 'betCount' },
  { id: 'place_5', title: 'Ticket Starter', description: 'Place 5 bets.', target: 5, reward: 15, type: 'betCount' },
  { id: 'place_10', title: 'Regular Player', description: 'Place 10 bets.', target: 10, reward: 30, type: 'betCount' },
  { id: 'place_25', title: 'Grinder', description: 'Place 25 bets.', target: 25, reward: 75, type: 'betCount' },
  { id: 'place_50', title: 'Volume Bettor', description: 'Place 50 bets.', target: 50, reward: 150, type: 'betCount' },
  { id: 'single_10', title: 'Single Specialist', description: 'Place 10 single bets.', target: 10, reward: 25, type: 'singleCount' },
  { id: 'combo_1', title: 'Combo Rookie', description: 'Place 1 combo bet.', target: 1, reward: 15, type: 'comboCount' },
  { id: 'combo_3', title: 'Combo Builder', description: 'Place 3 combo bets.', target: 3, reward: 35, type: 'comboCount' },
  { id: 'combo_5', title: 'Combo Hunter', description: 'Place 5 combo bets.', target: 5, reward: 60, type: 'comboCount' },
  { id: 'stake_50', title: 'Stake 50', description: 'Stake 50 total.', target: 50, reward: 10, type: 'stakeTotal' },
  { id: 'stake_100', title: 'Stake 100', description: 'Stake 100 total.', target: 100, reward: 20, type: 'stakeTotal' },
  { id: 'stake_250', title: 'Stake 250', description: 'Stake 250 total.', target: 250, reward: 45, type: 'stakeTotal' },
  { id: 'stake_500', title: 'Stake 500', description: 'Stake 500 total.', target: 500, reward: 90, type: 'stakeTotal' },
  { id: 'stake_1000', title: 'Stake 1K', description: 'Stake 1000 total.', target: 1000, reward: 180, type: 'stakeTotal' },
  { id: 'win_1', title: 'First Win', description: 'Win 1 bet.', target: 1, reward: 50, type: 'statusCount', status: 'Won' },
  { id: 'win_3', title: 'Win Streak I', description: 'Win 3 bets.', target: 3, reward: 100, type: 'statusCount', status: 'Won' },
  { id: 'win_5', title: 'Win Streak II', description: 'Win 5 bets.', target: 5, reward: 175, type: 'statusCount', status: 'Won' },
  { id: 'win_10', title: 'Sharp Run', description: 'Win 10 bets.', target: 10, reward: 350, type: 'statusCount', status: 'Won' },
  { id: 'cashout_1', title: 'Smart Exit', description: 'Cash out 1 bet.', target: 1, reward: 25, type: 'statusCount', status: 'Cashed Out' },
  { id: 'cashout_3', title: 'Exit Manager', description: 'Cash out 3 bets.', target: 3, reward: 70, type: 'statusCount', status: 'Cashed Out' },
  { id: 'refund_1', title: 'Void Survivor', description: 'Have 1 refunded bet.', target: 1, reward: 20, type: 'statusCount', status: 'Refund' },
  { id: 'odds_2', title: 'Even Money+', description: 'Place a leg at odds 2.00+.', target: 1, reward: 20, type: 'oddsCount', minOdds: 2 },
  { id: 'odds_3', title: 'High Odds Shot', description: 'Place a leg at odds 3.00+.', target: 1, reward: 35, type: 'oddsCount', minOdds: 3 },
  { id: 'odds_5', title: 'Longshot Ticket', description: 'Place a leg at odds 5.00+.', target: 1, reward: 75, type: 'oddsCount', minOdds: 5 },
  { id: 'football_3', title: 'Football Board', description: 'Place 3 football bets.', target: 3, reward: 25, type: 'sportCount', pattern: /football|soccer/i },
  { id: 'csgo_3', title: 'CS Specialist', description: 'Place 3 CS bets.', target: 3, reward: 25, type: 'sportCount', pattern: /cs|counter/i },
  { id: 'lol_3', title: 'Rift Player', description: 'Place 3 League of Legends bets.', target: 3, reward: 25, type: 'sportCount', pattern: /league of legends|lol/i },
  { id: 'market_winner_5', title: 'Winner Markets', description: 'Place 5 winner-market bets.', target: 5, reward: 30, type: 'marketCount', pattern: /winner/i },
  { id: 'market_total_5', title: 'Totals Player', description: 'Place 5 total-market bets.', target: 5, reward: 30, type: 'marketCount', pattern: /total/i },
];

export function BalancePage({ balance, bets, rewardsState, claimingRewardId, rewardError, onClaimTimeReward, onClaimTaskReward }) {
  const spent = getSpentStats(bets);
  const earned = getEarnedStats(bets);
  const timeClaims = rewardsState?.timeRewards || {};
  const taskClaims = rewardsState?.taskClaims || {};

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <CurrencyIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Balance</h1>
          <p className="text-sm text-[#8a8e99]">Wallet overview, spending, rewards, and completed tasks.</p>
        </div>
      </div>

      {rewardError && <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">{rewardError}</div>}

      <section className="grid gap-3 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="rounded-md bg-[#22252e] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a8e99]">Current Balance</p>
          <CurrencyAmount value={balance} className="mt-4 font-mono text-4xl font-black text-white" iconClassName="h-9 w-9" />
          <p className="mt-2 text-sm text-[#8a8e99]">Real wallet balance from Supabase profile.</p>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Spent 24H', spent.daily],
              ['Spent 7D', spent.weekly],
              ['Spent 30D', spent.monthly],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-[#22252e] p-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#8a8e99]">{label}</p>
                <CurrencyAmount value={value} className="mt-3 font-mono text-2xl font-black text-white" iconClassName="h-6 w-6" />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Earned 24H', earned.daily],
              ['Earned 7D', earned.weekly],
              ['Earned 30D', earned.monthly],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-[#22252e] p-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#8a8e99]">{label}</p>
                <CurrencyAmount value={value} className="mt-3 font-mono text-2xl font-black text-[#10b981]" iconClassName="h-6 w-6" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Time Rewards</h2>
            <p className="mt-1 text-xs text-[#8a8e99]">Claimable wallet credits with backend cooldown checks.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {TIME_REWARDS.map((reward) => {
            const status = getTimeRewardStatus(timeClaims[reward.id], reward.cooldownMs);
            const buttonText = claimingRewardId === reward.id ? 'Claiming...' : status.claimable ? 'Claim Now' : status.label;

            return (
              <article key={reward.id} className="rounded-md bg-[#22252e] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd200]">{reward.title}</p>
                <CurrencyAmount value={reward.amount} className="mt-3 font-mono text-2xl font-black text-white" iconClassName="h-6 w-6" />
                <p className="mt-2 text-sm text-[#8a8e99]">{reward.note}</p>
                <p className="mt-2 text-xs text-[#8a8e99]">Last claim: {status.lastClaimLabel}</p>
                <button
                  type="button"
                  onClick={() => onClaimTimeReward(reward.id)}
                  disabled={!status.claimable || claimingRewardId === reward.id}
                  className="mt-4 w-full rounded-md bg-[#ffd200] px-3 py-2 text-xs font-black uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#1a1c24] disabled:text-[#8a8e99]"
                >
                  {buttonText}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Tasks</h2>
            <p className="mt-1 text-xs text-[#8a8e99]">30 one-time tasks. Claims are rechecked by Supabase before crediting balance.</p>
          </div>
          <p className="text-xs font-black uppercase text-[#ffd200]">{getClaimedCount(taskClaims)} / {TASKS.length} claimed</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TASKS.map((task) => {
            const progress = getTaskProgress(bets, task);
            const cappedProgress = Math.min(progress, task.target);
            const percent = Math.min(100, Math.round((cappedProgress / task.target) * 100));
            const claimed = Boolean(taskClaims[task.id]);
            const complete = progress >= task.target;
            const isClaiming = claimingRewardId === task.id;

            return (
              <article key={task.id} className={`rounded-md p-4 ${claimed ? 'bg-[#1f2a27]' : 'bg-[#22252e]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black uppercase text-white">{task.title}</h3>
                    <p className="mt-1 text-xs text-[#8a8e99]">{task.description}</p>
                    <p className="mt-2 font-mono text-xs font-black text-[#ffd200]">{formatProgress(progress, task.target)} / {task.target}</p>
                  </div>
                  <span className="shrink-0 rounded bg-[#1a1c24] px-2 py-1">
                    <CurrencyAmount value={task.reward} className="font-mono text-xs font-black text-[#10b981]" iconClassName="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#1a1c24]">
                  <div className="h-full rounded-full bg-[#ffd200] transition-all" style={{ width: `${percent}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => onClaimTaskReward(task.id)}
                  disabled={!complete || claimed || isClaiming}
                  className="mt-4 w-full rounded-md bg-[#10b981] px-3 py-2 text-xs font-black uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#1a1c24] disabled:text-[#8a8e99]"
                >
                  {claimed ? 'Claimed' : isClaiming ? 'Claiming...' : complete ? 'Claim Reward' : 'In Progress'}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}

function getTimeRewardStatus(lastClaimedAt, cooldownMs) {
  if (!lastClaimedAt) {
    return { claimable: true, label: 'Claim Now', lastClaimLabel: 'Never' };
  }

  const claimedAt = new Date(lastClaimedAt).getTime();
  if (!Number.isFinite(claimedAt)) {
    return { claimable: true, label: 'Claim Now', lastClaimLabel: 'Unknown' };
  }

  const nextClaimAt = claimedAt + cooldownMs;
  const remainingMs = nextClaimAt - Date.now();

  return {
    claimable: remainingMs <= 0,
    label: remainingMs <= 0 ? 'Claim Now' : `Ready in ${formatDuration(remainingMs)}`,
    lastClaimLabel: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(claimedAt)),
  };
}

function getTaskProgress(bets, task) {
  switch (task.type) {
    case 'betCount':
      return bets.length;
    case 'singleCount':
      return bets.filter((bet) => bet.selections.length === 1).length;
    case 'comboCount':
      return bets.filter((bet) => bet.selections.length > 1).length;
    case 'stakeTotal':
      return Math.floor(bets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0));
    case 'statusCount':
      return bets.filter((bet) => bet.status === task.status).length;
    case 'oddsCount':
      return bets.filter((bet) => bet.selections.some((selection) => Number(selection.odds || 0) >= task.minOdds)).length;
    case 'sportCount':
      return bets.filter((bet) => bet.selections.some((selection) => task.pattern.test(selection.sport || ''))).length;
    case 'marketCount':
      return bets.filter((bet) => bet.selections.some((selection) => task.pattern.test(selection.marketName || ''))).length;
    default:
      return 0;
  }
}

function formatProgress(progress, target) {
  if (target >= 50) return Math.min(progress, target).toLocaleString();
  return Math.min(progress, target);
}

function formatDuration(ms) {
  const totalHours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days}d`;
  return `${hours}h`;
}

function getClaimedCount(taskClaims) {
  return Object.keys(taskClaims || {}).length;
}
