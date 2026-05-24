import { AlertTriangle, BadgeDollarSign, History } from 'lucide-react';
import { SETTLEMENT_STATUSES } from '../config/app-config';
import { CurrencyAmount } from '../components/common/CurrencyAmount';
import { PageShell } from '../components/layout/FeedbackStates';

export function AdminResultsPage({ isAdmin, adminBets, adminBetsLoading, adminError, settlingLegId, onRefreshAdminBets, onSettleBetGroup }) {
  if (!isAdmin) {
    return (
      <PageShell>
        <section className="rounded-md bg-[#22252e] p-8 text-center">
          <AlertTriangle className="mx-auto text-[#ef4444]" size={38} />
          <h1 className="mt-4 text-xl font-black uppercase text-white">Admin access required</h1>
          <p className="mt-2 text-sm text-[#8a8e99]">Only admin profiles can settle bets.</p>
        </section>
      </PageShell>
    );
  }

  const adminBetRows = adminBets.flatMap((bet) => (
    bet.selections.map((selection, index) => ({
      bet,
      selection,
      selectionIndex: index + 1,
      selectionCount: bet.selections.length,
      rowId: `${bet.id}:${selection.id || index}`,
    }))
  )).filter(({ selection }) => (selection.status || 'Pending') === 'Pending');
  const adminBetGroups = Object.values(adminBetRows.reduce((groups, row) => {
    const groupId = row.selection.id || `${row.selection.matchId}:${row.selection.marketId}:${row.selection.outcomeId}:${row.selection.outcomeName}`;

    if (!groups[groupId]) {
      groups[groupId] = {
        groupId,
        selection: row.selection,
        rows: [],
      };
    }

    groups[groupId].rows.push(row);
    return groups;
  }, {}));

  return (
    <PageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BadgeDollarSign className="text-[#ffd200]" size={28} />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Admin Results</h1>
            <p className="text-sm text-[#8a8e99]">Settle open bets and credit wallet payouts from the backend.</p>
          </div>
        </div>
        <button type="button" onClick={onRefreshAdminBets} className="rounded-md bg-[#22252e] px-3 py-2 text-xs font-black uppercase text-white hover:bg-[#2a2e38]">
          Refresh Open Bets
        </button>
      </div>

      {adminError && <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">{adminError}</div>}

      {adminBetsLoading ? (
        <div className="rounded-md bg-[#22252e] p-5 text-sm text-[#8a8e99]">Loading open bets...</div>
      ) : adminBetGroups.length ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {adminBetGroups.map(({ groupId, selection, rows }) => {
            const totalStake = rows.reduce((sum, row) => sum + Number(row.bet.stake || 0), 0);
            const totalPayout = rows.reduce((sum, row) => sum + Number(row.bet.payout || 0), 0);
            const comboCount = rows.filter((row) => row.selectionCount > 1).length;

            return (
              <article key={groupId} className="rounded-md bg-[#22252e] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-black text-[#ffd200]">{groupId}</p>
                    <p className="mt-1 truncate text-xs text-[#8a8e99]">{rows.length} pending bet{rows.length > 1 ? 's' : ''} • {new Set(rows.map((row) => row.bet.userId)).size} user{new Set(rows.map((row) => row.bet.userId)).size > 1 ? 's' : ''}</p>
                    <p className="mt-1 text-xs text-[#8a8e99]">Oldest {new Date(Math.min(...rows.map((row) => new Date(row.bet.createdAt).getTime()))).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="rounded bg-[#1a1c24] px-2 py-1 text-xs font-black uppercase text-[#ffd200]">Pending</p>
                    {comboCount > 0 && <p className="mt-1 text-[10px] font-black uppercase text-[#8a8e99]">{comboCount} combo leg{comboCount > 1 ? 's' : ''}</p>}
                  </div>
                </div>

                <div className="mt-4 rounded bg-[#1a1c24] p-3">
                  <p className="truncate text-xs font-bold uppercase text-[#8a8e99]">{selection.sport} • {selection.tournament}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">{selection.matchTitle}</p>
                  <p className="mt-1 text-xs text-[#8a8e99]">{selection.marketName} • {selection.outcomeName} @ {Number(selection.odds).toFixed(2)}</p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#2a2e38] pt-3 text-xs">
                  <div>
                    <p className="uppercase text-[#8a8e99]">Stake</p>
                    <CurrencyAmount value={totalStake} />
                  </div>
                  <div>
                    <p className="uppercase text-[#8a8e99]">Leg Odds</p>
                    <p className="font-mono font-black text-white">{Number(selection.odds).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="uppercase text-[#8a8e99]">Win Payout</p>
                    <CurrencyAmount value={totalPayout} className="font-mono font-black text-[#10b981]" />
                  </div>
                </div>

                {comboCount > 0 && (
                  <div className="mt-3 rounded bg-[#1a1c24] px-3 py-2 text-xs text-[#8a8e99]">
                    Some rows are combo legs. Each affected full bet settles after all pending legs resolve, or immediately when any leg loses.
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SETTLEMENT_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onSettleBetGroup(rows, status)}
                      disabled={settlingLegId === groupId}
                      className={`rounded-md px-3 py-2 text-xs font-black uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${status === 'Won' ? 'bg-[#10b981]' : status === 'Lost' ? 'bg-[#ef4444]' : status === 'Refund' ? 'bg-[#ffd200]' : 'bg-[#8a8e99]'}`}
                    >
                      {settlingLegId === groupId ? 'Saving...' : status}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-md bg-[#22252e] p-8 text-center">
          <History className="mx-auto text-[#8a8e99]" size={38} />
          <h2 className="mt-4 text-sm font-black uppercase tracking-wide text-white">No open bets</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#8a8e99]">New open bets will appear here for manual settlement.</p>
        </section>
      )}
    </PageShell>
  );
}
