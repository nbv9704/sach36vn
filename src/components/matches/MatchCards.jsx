import { Link } from 'react-router-dom';
import { ChevronDown, Star, Zap } from 'lucide-react';
import { LiveSignal } from '../common/LiveSignal';
import { firstOdds, formatTime, getCurrentMapLabel, getSelectionId, splitTeams } from '../../lib/match-utils';
import { OddsButton } from './OddsButton';
import { TeamLogo } from './TeamLogo';

export function StandardMatchCard({ match, live = false, onSelectOdd, selections = [], isFavorite = false, onToggleFavorite, quickBetFeedbackId = '' }) {
  const { home, away } = splitTeams(match.title);
  const odds = firstOdds(match, 2);
  const [homeMapScore = '0', awayMapScore = '0'] = String(match.score || '0 - 0').split(/\s*-\s*/).slice(0, 2);
  const seriesScore = match.seriesScore || match.totalScore || match.matchScore;
  const hasSeriesScore = Boolean(seriesScore);
  const [homeSeriesScore = '-', awaySeriesScore = '-'] = seriesScore ? String(seriesScore).split(/\s*-\s*/).slice(0, 2) : ['-', '-'];
  const currentMapLabel = getCurrentMapLabel(seriesScore, match.period, match.sport);

  return (
    <article className="relative min-w-0 overflow-hidden rounded-lg bg-[#22232c] p-4 transition hover:bg-[#282a35]">
      <button
        type="button"
        onClick={() => onToggleFavorite?.(match.id)}
        className={`absolute right-4 top-4 z-10 rounded-md p-1 transition ${isFavorite ? 'text-[#ffd200]' : 'text-[#565a67] hover:text-[#ffd200]'}`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star size={14} className={isFavorite ? 'fill-current' : ''} />
      </button>
      {live && <LiveSignal size={14} className="absolute right-5 top-10 z-10" />}
      <Link to={`/match/${match.id}`} className="block">
        <div className="pr-8 text-xs font-black text-[#8f93a1]">
          <div className="min-w-0 truncate">
            {match.sport} • {match.tournament}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs font-black">
          {live ? (
            <span className="text-[#31a7ff]">{currentMapLabel}</span>
          ) : (
            <span className="text-[#a7aab6]">{formatTime(match.scheduledAt)}</span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo name={home} />
              <span className="truncate text-sm font-black text-[#ffffff]">{home}</span>
            </div>
            {live && (
              <div className="flex items-center gap-3 font-mono text-sm font-black">
                <span className="w-4 text-right text-white">{homeMapScore}</span>
                {hasSeriesScore && <span className="flex h-6 min-w-7 items-center justify-center rounded-lg bg-[#333541] px-2 text-[#d8d9df] ring-1 ring-white/10">{homeSeriesScore}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo name={away} />
              <span className="truncate text-sm font-black text-[#ffffff]">{away}</span>
            </div>
            {live && (
              <div className="flex items-center gap-3 font-mono text-sm font-black">
                <span className="w-4 text-right text-white">{awayMapScore}</span>
                {hasSeriesScore && <span className="flex h-6 min-w-7 items-center justify-center rounded-lg bg-[#333541] px-2 text-[#d8d9df] ring-1 ring-white/10">{awaySeriesScore}</span>}
              </div>
            )}
          </div>
        </div>
      </Link>

      <p className="mt-4 text-center text-xs font-black text-[#8a8e99]">Winner</p>
      <div className={`mt-2 grid min-w-0 gap-1.5 ${odds.length ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_34px]' : 'grid-cols-1'}`}>
        {odds.map((odd) => (
          <OddsButton
            key={`${match.id}-${odd.marketId}-${odd.outcomeId}-${odd.outcomeName}`}
            odd={odd}
            compact
            muted
            selected={selections.some((selection) => selection.id === getSelectionId(match, odd))}
            quickBetSuccess={quickBetFeedbackId === getSelectionId(match, odd)}
            onSelect={() => onSelectOdd?.(match, odd)}
          />
        ))}
        <Link to={`/match/${match.id}`} className="flex min-h-10 items-center justify-center rounded bg-[#343541] text-[#a7aab6] transition hover:bg-[#424552] hover:text-white">
          <ChevronDown size={16} />
        </Link>
      </div>
    </article>
  );
}

export function HighlightMatchCard({ match, live = false, onSelectOdd, selections = [], quickBetFeedbackId = '' }) {
  const { home, away } = splitTeams(match.title);
  const odds = firstOdds(match, 2);
  const [homeScore = '0', awayScore = '0'] = String(match.score || '0 - 0').split(/\s*-\s*/).slice(0, 2);

  return (
    <article className="relative h-full overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top_left,#2b2d3a,#1d1f2a_62%)] p-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <Link to={`/match/${match.id}`} className="block">
        <div className="flex items-center justify-between gap-3 text-xs font-black text-[#a7aab6]">
          <p className="min-w-0 truncate">{match.sport} • {match.tournament}</p>
          <p className={`flex shrink-0 items-center gap-1 ${live ? 'text-[#ef4444]' : 'text-[#d8d9df]'}`}>{live ? <LiveSignal size={14} /> : formatTime(match.scheduledAt)}</p>
        </div>

        <div className="mt-7 grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 flex-col items-center text-center">
            <TeamLogo name={home} />
            <p className="mt-2 w-full max-w-[105px] truncate text-sm font-black text-white">{home}</p>
          </div>

          {live ? (
            <div className="mx-auto flex w-[88px] items-center justify-center gap-2">
              <span className="flex h-9 w-8 items-center justify-center rounded-lg bg-[#686b76] font-mono text-lg font-black text-white ring-1 ring-white/25">{homeScore}</span>
              <span className="flex h-9 w-8 items-center justify-center rounded-lg bg-[#686b76] font-mono text-lg font-black text-white ring-1 ring-white/25">{awayScore}</span>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#19d8ff] text-[#19d8ff]">
              <Zap size={18} />
            </div>
          )}

          <div className="flex min-w-0 flex-col items-center text-center">
            <TeamLogo name={away} />
            <p className="mt-2 w-full max-w-[105px] truncate text-sm font-black text-white">{away}</p>
          </div>
        </div>
      </Link>

      <p className="mt-7 text-center text-xs font-black text-[#8a8e99]">Winner</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {odds.map((odd, index) => {
          const selectionId = getSelectionId(match, odd);
          const highlighted = selections.some((selection) => selection.id === selectionId) || quickBetFeedbackId === selectionId;

          return (
            <button
              key={`${match.id}-${odd.marketId}-${odd.outcomeId}-${odd.outcomeName}`}
              type="button"
              disabled={odd.blocked || quickBetFeedbackId === selectionId}
              onClick={() => onSelectOdd?.(match, odd)}
              className={`flex items-center justify-between rounded-md px-3 py-3 text-xs font-black transition-all duration-300 disabled:cursor-not-allowed ${highlighted ? 'scale-[0.98] bg-[#ffd200] text-black' : 'bg-[#747783] text-white hover:bg-[#858894]'}`}
            >
              <span>{index + 1}</span>
              <span className="font-mono">{quickBetFeedbackId === selectionId ? '✓ ' : ''}{Number(odd.odds).toFixed(2)}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
