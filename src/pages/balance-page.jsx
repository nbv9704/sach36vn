import { CurrencyAmount, CurrencyIcon } from '../components/common/CurrencyAmount';
import { PageShell } from '../components/layout/FeedbackStates';
import { getEarnedStats, getSpentStats } from '../lib/match-utils';

export function BalancePage({ balance, bets }) {
  const spent = getSpentStats(bets);
  const earned = getEarnedStats(bets);
  const rewardCards = [
    { title: 'Daily', amount: 25, note: 'Available once every 24 hours' },
    { title: 'Weekly', amount: 100, note: 'Available once every 7 days' },
    { title: 'Monthly', amount: 300, note: 'Available once every 30 days' },
  ];
  const taskCards = [
    { title: 'Place 3 bets', progress: '0 / 3', reward: 15 },
    { title: 'Favorite 5 matches', progress: '0 / 5', reward: 10 },
    { title: 'Win one bet', progress: '0 / 1', reward: 50 },
  ];

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <CurrencyIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Balance</h1>
          <p className="text-sm text-[#8a8e99]">Wallet overview, spending, rewards, and tasks.</p>
        </div>
      </div>

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
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-white">Claim Rewards</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {rewardCards.map((reward) => (
            <article key={reward.title} className="rounded-md bg-[#22252e] p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd200]">{reward.title}</p>
              <CurrencyAmount value={reward.amount} className="mt-3 font-mono text-2xl font-black text-white" iconClassName="h-6 w-6" />
              <p className="mt-2 text-sm text-[#8a8e99]">{reward.note}</p>
              <button type="button" disabled className="mt-4 w-full rounded-md bg-[#1a1c24] px-3 py-2 text-xs font-black uppercase text-[#8a8e99] opacity-70">
                Claim Coming Soon
              </button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-white">Tasks</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {taskCards.map((task) => (
            <article key={task.title} className="rounded-md bg-[#22252e] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-white">{task.title}</h3>
                  <p className="mt-1 text-xs text-[#8a8e99]">Progress {task.progress}</p>
                </div>
                <span className="rounded bg-[#1a1c24] px-2 py-1">
                  <CurrencyAmount value={task.reward} className="font-mono text-xs font-black text-[#10b981]" iconClassName="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#1a1c24]">
                <div className="h-full w-0 rounded-full bg-[#ffd200]" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
