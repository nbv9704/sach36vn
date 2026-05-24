import { startTransition, useState } from 'react';
import { ChevronDown, History } from 'lucide-react';
import { BET_DATE_FILTERS, BET_FILTERS, BETS_PER_PAGE } from '../config/app-config';
import { CurrencyAmount, CurrencyIcon } from '../components/common/CurrencyAmount';
import { PageShell } from '../components/layout/FeedbackStates';
import {
  formatBetDate,
  getSelectionDisplayDate,
  getSelectionProgressColor,
  isBetInDateFilter,
  startOfDay,
  statusTextClass,
} from '../lib/match-utils';

function BetHistoryCard({ bet, onCashOut, cashingOut }) {
  const statusClass = statusTextClass(bet.status);
  const isCombo = bet.selections.length > 1;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const visibleSelections = isCombo && !expanded ? [] : bet.selections;
  const ticketId = String(bet.id).replaceAll('-', '').slice(0, 18);

  const copyTicketId = async () => {
    await navigator.clipboard.writeText(bet.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <article className="rounded-lg bg-[#22232c] p-4 text-[#8a8e99] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-black uppercase text-white">{isCombo ? 'COMBO' : 'SINGLE'}</span>
          <span className="truncate text-xs font-black text-[#8a8e99]">{formatBetDate(bet.createdAt)}</span>
        </div>
        <div className="text-right">
          <p className={`text-xs font-black uppercase ${statusClass}`}>{bet.status}</p>
        </div>
      </div>

      {isCombo && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-3 w-full overflow-hidden rounded bg-[#343541] text-left">
          <div className="flex items-center justify-end gap-5 px-3 py-2">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#646878] px-1.5 text-xs font-black text-white">{bet.selections.length}</span>
            <ChevronDown size={16} className={`text-white transition ${expanded ? 'rotate-180' : ''}`} />
          </div>
          <div className="grid h-2 gap-0.5 bg-[#22232c]" style={{ gridTemplateColumns: `repeat(${bet.selections.length}, minmax(0, 1fr))` }}>
            {bet.selections.map((selection, index) => <span key={`${selection.id}-${index}`} className={getSelectionProgressColor(selection.status || 'Pending')} />)}
          </div>
        </button>
      )}

      <div className={visibleSelections.length ? 'mt-3 space-y-2' : 'mt-5'}>
        {visibleSelections.map((selection) => (
          <div key={selection.id} className="rounded bg-[#333540] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-[#8a8e99]">{getSelectionDisplayDate(bet.createdAt)}</p>
                <p className="mt-2 truncate text-xs font-black text-[#a7aab6]">{selection.sport} • {selection.tournament}</p>
                <p className="mt-2 truncate text-sm font-black text-white">
                  <span className="mr-2 font-mono text-[#bfe7ff]">{Number(selection.odds).toFixed(2)}</span>
                  {selection.matchTitle}
                </p>
                <p className="mt-2 truncate text-xs font-black text-[#8a8e99]">{selection.marketName} {selection.outcomeName}</p>
              </div>
              <p className={`shrink-0 text-xs font-black uppercase ${statusTextClass(selection.status || 'Pending')}`}>{selection.status || 'Pending'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-[10px] font-black uppercase">
        <div className="flex min-w-0 items-center gap-1 truncate">
          <span className="truncate">Ticket ID: <span className="font-mono">{ticketId}</span></span>
          <button type="button" onClick={copyTicketId} className="shrink-0 rounded px-1 text-[#a7aab6] transition hover:bg-[#343541] hover:text-white" aria-label="Copy ticket ID">
            {copied ? 'COPIED' : '⧉'}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-white"><CurrencyIcon className="h-3.5 w-3.5" /> <span className="italic text-[#ffd200]">SACH36VN</span></div>
      </div>

      <div className="mt-5 space-y-2 text-xs font-black">
        <div className="flex items-center justify-between gap-3">
          <p>Total Odds</p>
          <p className="font-mono text-white/70">{bet.totalOdds.toFixed(3)}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p>Stake</p>
          <CurrencyAmount value={bet.stake} className="font-mono font-black text-white/70" iconClassName="h-3.5 w-3.5" />
        </div>
      </div>

      {bet.status === 'Open' ? (
        <button
          type="button"
          onClick={() => onCashOut(bet)}
          disabled={cashingOut}
          className="mt-4 flex w-full items-center justify-between rounded-md bg-[#f59e0b] px-3 py-2 text-xs font-black uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{cashingOut ? 'Cashing out...' : 'Cash Out'}</span>
          <CurrencyAmount value={bet.stake * 0.5} className="font-mono font-black text-black" iconClassName="h-3.5 w-3.5" />
        </button>
      ) : bet.settledPayout > 0 ? (
        <div className="mt-4 flex items-center justify-between rounded-md bg-[#1a1c24] px-3 py-2 text-xs font-black uppercase text-[#f59e0b]">
          <span>Settled Payout</span>
          <CurrencyAmount value={bet.settledPayout} className="font-mono font-black text-[#f59e0b]" iconClassName="h-3.5 w-3.5" />
        </div>
      ) : null}
    </article>
  );
}

export function MyBetsPage({ loading, bets, onCashOut, cashingOutBetId, cashOutError }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('Recent Bets');
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()));
  const [draftRange, setDraftRange] = useState({ from: null, to: null });
  const [customRange, setCustomRange] = useState({ from: null, to: null });
  const statusFilteredBets = activeFilter === 'All'
    ? bets
    : bets.filter((bet) => bet.status.toLowerCase() === activeFilter.toLowerCase());
  const filteredBets = statusFilteredBets.filter((bet) => isBetInDateFilter(bet, dateFilter, customRange));
  const totalPages = Math.max(1, Math.ceil(filteredBets.length / BETS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageBets = filteredBets.slice((safeCurrentPage - 1) * BETS_PER_PAGE, safeCurrentPage * BETS_PER_PAGE);
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingDays = monthStart.getDay();
  const calendarDays = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1)),
  ];

  if (loading) return <MyBetsSkeleton />;

  const selectDatePreset = (filter) => {
    startTransition(() => {
      setDateFilter(filter);
      setCurrentPage(1);
    });
    if (filter === 'Custom') {
      setDateFilterOpen(true);
      return;
    }
    setDateFilterOpen(false);
  };

  const selectCustomDate = (date) => {
    setDraftRange((range) => {
      if (!range.from || (range.from && range.to) || date < range.from) {
        return { from: date, to: null };
      }
      return { from: range.from, to: date };
    });
  };

  const isSelectedCustomDate = (date) => {
    if (!date) return false;
    const time = startOfDay(date).getTime();
    const from = draftRange.from ? startOfDay(draftRange.from).getTime() : null;
    const to = draftRange.to ? startOfDay(draftRange.to).getTime() : null;
    return time === from || time === to || (from && to && time > from && time < to);
  };

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <History className="text-[#ffd200]" size={26} />
        <h1 className="text-3xl font-black tracking-tight text-white">My Bets</h1>
      </div>

      <div className="flex flex-col gap-3 rounded-md bg-[#22252e] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {BET_FILTERS.map((filter) => (
            <button key={filter} type="button" onClick={() => startTransition(() => { setActiveFilter(filter); setCurrentPage(1); })} className={`shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase ${activeFilter === filter ? 'bg-[#ffd200] text-black' : 'bg-[#1a1c24] text-[#8a8e99] hover:bg-[#2a2e38] hover:text-white'}`}>
              {filter}
            </button>
          ))}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setDateFilterOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-md bg-[#1a1c24] px-3 py-2 text-xs font-black uppercase text-[#8a8e99] lg:w-auto">
            {dateFilter}
            <ChevronDown size={15} className={dateFilterOpen ? 'rotate-180 transition' : 'transition'} />
          </button>

          {dateFilterOpen && (
            <div className="absolute right-0 top-12 z-30 w-[calc(100vw-2rem)] max-w-[300px] rounded-md bg-[#22232c] p-4 shadow-2xl shadow-black/50 ring-1 ring-[#2a2e38]">
              <div className="grid grid-cols-3 gap-3">
                {BET_DATE_FILTERS.slice(0, 3).map((filter) => (
                  <button key={filter} type="button" onClick={() => selectDatePreset(filter)} className={`rounded-full px-3 py-2 text-xs font-black ${dateFilter === filter ? 'bg-[#ffd200] text-black' : 'bg-[#343541] text-[#a7aab6]'}`}>{filter}</button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {BET_DATE_FILTERS.slice(3).map((filter) => (
                  <button key={filter} type="button" onClick={() => selectDatePreset(filter)} className={`rounded-full px-3 py-2 text-xs font-black ${dateFilter === filter ? 'bg-[#ffd200] text-black' : 'bg-[#343541] text-[#a7aab6]'}`}>{filter}</button>
                ))}
              </div>

              {dateFilter === 'Custom' && (
                <div className="mt-8">
                  <div className="flex items-center justify-between px-7">
                    <h3 className="text-base font-black text-white">{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(calendarMonth)}</h3>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="text-white"><ChevronDown size={18} className="rotate-90" /></button>
                      <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="text-white"><ChevronDown size={18} className="-rotate-90" /></button>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-7 gap-y-4 text-center text-sm font-black text-[#8a8e99]">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                    {calendarDays.map((date, index) => (
                      <button key={date ? date.toISOString() : `blank-${index}`} type="button" disabled={!date} onClick={() => selectCustomDate(date)} className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-black transition disabled:opacity-0 ${isSelectedCustomDate(date) ? 'bg-[#ffd200] text-black' : 'text-white hover:bg-[#343541]'}`}>
                        {date ? date.getDate() : ''}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => startTransition(() => { setDateFilter('Recent Bets'); setDraftRange({ from: null, to: null }); setCustomRange({ from: null, to: null }); setDateFilterOpen(false); setCurrentPage(1); })} className="rounded-full bg-[#343541] px-4 py-3 text-xs font-black text-[#a7aab6]">Cancel</button>
                    <button type="button" onClick={() => startTransition(() => { setCustomRange(draftRange); setDateFilterOpen(false); setCurrentPage(1); })} disabled={!draftRange.from || !draftRange.to} className="rounded-full bg-[#343541] px-4 py-3 text-xs font-black text-[#a7aab6] disabled:cursor-not-allowed disabled:opacity-60">Show Results</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {cashOutError && <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">{cashOutError}</div>}

      {filteredBets.length ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pageBets.map((bet) => <BetHistoryCard key={bet.id} bet={bet} onCashOut={onCashOut} cashingOut={cashingOutBetId === bet.id} />)}
          </section>

          <div className="flex flex-col gap-3 rounded-md bg-[#22252e] p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-black uppercase text-[#8a8e99]">
              Showing {(safeCurrentPage - 1) * BETS_PER_PAGE + 1}-{Math.min(safeCurrentPage * BETS_PER_PAGE, filteredBets.length)} of {filteredBets.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => startTransition(() => setCurrentPage((page) => Math.max(1, page - 1)))} disabled={safeCurrentPage === 1} className="rounded bg-[#1a1c24] px-3 py-2 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
              <span className="rounded bg-[#1a1c24] px-3 py-2 font-mono text-xs font-black text-[#ffd200]">{safeCurrentPage} / {totalPages}</span>
              <button type="button" onClick={() => startTransition(() => setCurrentPage((page) => Math.min(totalPages, page + 1)))} disabled={safeCurrentPage === totalPages} className="rounded bg-[#1a1c24] px-3 py-2 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      ) : (
        <section className="rounded-md bg-[#22252e] p-8 text-center">
          <History className="mx-auto text-[#8a8e99]" size={38} />
          <h2 className="mt-4 text-sm font-black uppercase tracking-wide text-white">No bets in this filter</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#8a8e99]">
            Place a bet from any live or upcoming market and it will appear here.
          </p>
        </section>
      )}
    </PageShell>
  );
}

function MyBetsSkeleton() {
  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-[#22252e] skeleton-shimmer" />
        <div className="h-8 w-40 rounded bg-[#22252e] skeleton-shimmer" />
      </div>

      <div className="h-16 rounded-md bg-[#22252e] skeleton-shimmer" />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 rounded-lg bg-[#22232c] skeleton-shimmer" />)}
      </section>
    </PageShell>
  );
}
