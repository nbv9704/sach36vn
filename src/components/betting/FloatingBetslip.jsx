import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeDollarSign, ChevronDown, Zap } from 'lucide-react';
import { QUICK_BET_PRESETS } from '../../config/app-config';
import { formatMoney, getTotalOdds } from '../../lib/match-utils';
import { CurrencyAmount, CurrencyIcon } from '../common/CurrencyAmount';

export function FloatingBetslip({ selections, quickBet, quickBetStake, onQuickBetChange, onQuickBetStakeChange, onRemoveSelection, onClear, onPlaceBet, balance, user, placeBetError, placingBet }) {
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState('10');
  const totalOdds = getTotalOdds(selections);
  const numericStake = Number(stake);
  const numericQuickBetStake = Number(quickBetStake);
  const canPlace = Boolean(user) && selections.length > 0 && Number.isFinite(numericStake) && numericStake > 0 && numericStake <= balance && !placingBet;
  const canQuickBet = Boolean(user) && Number.isFinite(numericQuickBetStake) && numericQuickBetStake > 0 && numericQuickBetStake <= balance && !placingBet;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-md shadow-2xl shadow-black/50">
      {open && (
        <div className="border border-[#2a2e38] bg-[#22252e] p-3 text-white">
          {quickBet ? (
            <div>
              <p className="text-sm font-bold leading-relaxed text-[#8a8e99]">
                QuickBet mode is on. After single click on any selection, it will place your bet immediately. See all your bets on <Link to="/my-bets" className="text-white underline decoration-[#8a8e99] underline-offset-2">My Bets</Link> page.
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {QUICK_BET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onQuickBetStakeChange(String(preset))}
                    className={`rounded-full px-4 py-3 font-mono text-sm font-black transition ${Number(quickBetStake) === preset ? 'bg-[#e05a00] text-black' : 'bg-[#363947] text-white hover:bg-[#434758]'}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <label className="mt-3 flex items-center rounded bg-[#1a1c24] px-3 py-2 ring-1 ring-[#2a2e38] focus-within:ring-[#ffd200]">
                <input
                  type="number"
                  min="1"
                  value={quickBetStake}
                  onChange={(event) => onQuickBetStakeChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-right font-mono text-lg font-black text-white outline-none"
                />
                <CurrencyIcon className="ml-2 h-4 w-4" />
                <span className={`ml-3 text-xl font-black ${canQuickBet ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>✓</span>
              </label>

              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white">
                <Zap size={14} className="text-[#e05a00]" />
                Quick Bet is active with <span className="font-mono">{formatMoney(quickBetStake)}</span><CurrencyIcon className="h-3.5 w-3.5" /> bet
              </div>

              {!user && <p className="mt-2 text-xs text-[#ef4444]">Login with Discord to use Quick Bet.</p>}
              {Number(quickBetStake) > balance && <p className="mt-2 text-xs text-[#ef4444]">Quick Bet stake exceeds wallet balance.</p>}
              {placeBetError && <p className="mt-2 text-xs text-[#ef4444]">{placeBetError}</p>}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wide">Selections</h2>
                <button type="button" onClick={onClear} className="text-xs font-bold uppercase text-[#8a8e99] hover:text-white">Clear</button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {selections.length ? selections.map((selection) => (
                  <div key={selection.id} className="rounded bg-[#1a1c24] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase text-[#8a8e99]">{selection.marketName}</p>
                        <p className="mt-1 truncate text-sm font-bold text-white">{selection.matchTitle}</p>
                        <p className="mt-1 text-xs text-[#8a8e99]">{selection.outcomeName}</p>
                      </div>
                      <button type="button" onClick={() => onRemoveSelection(selection.id)} className="text-[#8a8e99] hover:text-[#ef4444]">×</button>
                    </div>
                    <div className="mt-2 text-right font-mono text-sm font-black text-[#ffd200]">{selection.odds}</div>
                  </div>
                )) : (
                  <div className="rounded bg-[#1a1c24] p-5 text-center text-sm text-[#8a8e99]">Select odds to build your betslip.</div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <label className="col-span-2 block">
                  <span className="font-bold uppercase text-[#8a8e99]">Stake</span>
                  <input
                    type="number"
                    min="1"
                    value={stake}
                    onChange={(event) => setStake(event.target.value)}
                    className="mt-1 w-full rounded bg-[#1a1c24] px-3 py-2 font-mono text-white outline-none ring-1 ring-[#2a2e38] focus:ring-[#ffd200]"
                  />
                </label>
                <div className="rounded bg-[#1a1c24] p-2">
                  <p className="uppercase text-[#8a8e99]">Total Odds</p>
                  <p className="font-mono font-black text-white">{totalOdds ? totalOdds.toFixed(2) : '-'}</p>
                </div>
                <div className="rounded bg-[#1a1c24] p-2">
                  <p className="uppercase text-[#8a8e99]">Payout</p>
                  <CurrencyAmount value={totalOdds * (numericStake || 0)} className="font-mono font-black text-[#10b981]" />
                </div>
              </div>

              <button
                type="button"
                disabled={!canPlace}
                onClick={() => onPlaceBet(numericStake)}
                className="mt-3 w-full rounded bg-[#ffd200] px-4 py-3 text-xs font-black uppercase text-black disabled:opacity-40"
              >
                {placingBet ? 'Placing Bet' : 'Place Bet'}
              </button>
              {!user && <p className="mt-2 text-xs text-[#ef4444]">Login with Discord to place real database bets.</p>}
              {numericStake > balance && <p className="mt-2 text-xs text-[#ef4444]">Stake exceeds wallet balance.</p>}
              {placeBetError && <p className="mt-2 text-xs text-[#ef4444]">{placeBetError}</p>}
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 bg-[#ffd200] px-4 py-3 text-black">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex flex-1 items-center gap-2 text-left font-black">
          <BadgeDollarSign size={18} />
          Betslip
          <span className="rounded bg-black/10 px-2 py-0.5 font-mono text-xs">{selections.length}</span>
          <ChevronDown size={16} className={open ? 'rotate-180 transition' : 'transition'} />
        </button>
        <div className="h-6 w-px bg-black/20" />
        <button type="button" onClick={() => { onQuickBetChange(!quickBet); setOpen(true); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide">
          Quick Bet
          <span className={`relative flex h-5 w-10 items-center rounded-full ${quickBet ? 'bg-[#1a1c24]' : 'bg-black/20'}`}>
            <span className={`absolute flex h-5 w-5 items-center justify-center rounded-full transition ${quickBet ? 'left-5 bg-[#e05a00] text-black' : 'left-0 bg-black text-[#ffd200]'}`}>
              <Zap size={12} className="fill-current" />
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
