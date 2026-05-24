import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Flame, Search, Star } from 'lucide-react';
import { PiClockCountdownFill } from 'react-icons/pi';
import { MatchBettingService } from '../lib/matchbetting-service';
import { CATEGORY_META } from '../config/app-config';
import { LiveSignal } from '../components/common/LiveSignal';
import { Pagination } from '../components/common/Pagination';
import { EmptyMatches, ErrorState, LoadingState, PageShell } from '../components/layout/FeedbackStates';
import { HighlightMatchCard, StandardMatchCard } from '../components/matches/MatchCards';
import { OddsButton } from '../components/matches/OddsButton';
import { TeamLogo } from '../components/matches/TeamLogo';
import {
  filterBySearch,
  getAllFeedMatches,
  getMatchCollection,
  getSelectionId,
  groupOddsByMarket,
  sortMatchesByTime,
  splitTeams,
} from '../lib/match-utils';

const service = new MatchBettingService();

function getOutcomeSortMeta(odd, teamOrder = {}) {
  const name = String(odd?.outcomeName || '');
  const side = name.match(/\b(over|under)\b/i)?.[1]?.toLowerCase() || '';
  const handicapMatch = name.match(/\(([+-]+\d+(?:\.\d+)?)\)/);
  const handicapValue = handicapMatch ? Number(handicapMatch[1].replace(/^\+\+/, '+')) : Number.NaN;
  const line = Number(name.match(/[+-]?\d+(?:\.\d+)?/)?.[0]);
  const isHandicap = Number.isFinite(handicapValue);
  const teamName = name.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase();

  return {
    isHandicap,
    handicapLine: isHandicap ? Math.abs(handicapValue) : Number.NEGATIVE_INFINITY,
    teamOrder: teamOrder[teamName] ?? 99,
    line: Number.isFinite(line) ? line : Number.POSITIVE_INFINITY,
    sideOrder: side === 'over' ? 0 : side === 'under' ? 1 : 2,
    name,
  };
}

function sortMarketOdds(odds, match) {
  const teams = splitTeams(match?.title);
  const teamOrder = {
    [teams.home.toLowerCase()]: 0,
    [teams.away.toLowerCase()]: 1,
  };

  return [...odds].sort((left, right) => {
    const leftMeta = getOutcomeSortMeta(left, teamOrder);
    const rightMeta = getOutcomeSortMeta(right, teamOrder);

    if (leftMeta.isHandicap || rightMeta.isHandicap) {
      return rightMeta.handicapLine - leftMeta.handicapLine
        || leftMeta.teamOrder - rightMeta.teamOrder
        || leftMeta.name.localeCompare(rightMeta.name);
    }

    return leftMeta.line - rightMeta.line
      || leftMeta.sideOrder - rightMeta.sideOrder
      || leftMeta.name.localeCompare(rightMeta.name);
  });
}

function isHandicapMarket(name, odds) {
  return /handicap/i.test(name) || odds.some((odd) => getOutcomeSortMeta(odd, {}).isHandicap);
}

function getMarketSortMeta(name) {
  const normalizedName = String(name || '');
  const mapNumber = Number(normalizedName.match(/\bmap\s*(\d+)\b/i)?.[1]);
  const marketOrder = /winner/i.test(normalizedName) ? 0
    : /total/i.test(normalizedName) ? 1
      : /handicap/i.test(normalizedName) ? 2
        : 3;

  return {
    mapNumber: Number.isFinite(mapNumber) ? mapNumber : Number.POSITIVE_INFINITY,
    marketOrder,
    name: normalizedName,
  };
}

function sortMarketEntries(entries) {
  return [...entries].sort(([leftName], [rightName]) => {
    const leftMeta = getMarketSortMeta(leftName);
    const rightMeta = getMarketSortMeta(rightName);

    return leftMeta.mapNumber - rightMeta.mapNumber
      || leftMeta.marketOrder - rightMeta.marketOrder
      || leftMeta.name.localeCompare(rightMeta.name);
  });
}

function getMarketGridClass(count, name, odds) {
  if (isHandicapMarket(name, odds)) return 'grid gap-2 p-3 sm:grid-cols-2';
  if (count === 4) return 'grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4';
  if (count === 2) return 'grid gap-2 p-3 sm:grid-cols-2';
  return 'grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3';
}

function marketMatchesTab(name, tab) {
  if (tab === 'main') return true;
  if (tab === 'match') return !/\bmap\s*\d+\b/i.test(name);
  if (tab.startsWith('map-')) {
    const mapNumber = tab.replace('map-', '');
    return new RegExp(`\\bmap\\s*${mapNumber}\\b`, 'i').test(name);
  }
  return true;
}

function filterMarketEntries(entries, activeTab, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return entries.filter(([name, odds]) => {
    if (!marketMatchesTab(name, activeTab)) return false;
    if (!normalizedQuery) return true;

    return [name, ...odds.flatMap((odd) => [odd.marketName, odd.outcomeName])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });
}

function getMarketTabs(entries) {
  const mapNumbers = [...new Set(entries
    .map(([name]) => Number(String(name).match(/\bmap\s*(\d+)\b/i)?.[1]))
    .filter(Number.isFinite))]
    .sort((left, right) => left - right);

  return [
    { id: 'main', label: 'Main', count: entries.length },
    { id: 'match', label: 'Match', count: entries.filter(([name]) => marketMatchesTab(name, 'match')).length },
    ...mapNumbers.map((mapNumber) => ({
      id: `map-${mapNumber}`,
      label: `Map ${mapNumber}`,
      count: entries.filter(([name]) => marketMatchesTab(name, `map-${mapNumber}`)).length,
    })),
  ];
}

export function HomePage({ matchesByCategory, loading, error, onRetry, onSelectOdd, selections, searchQuery, favoriteMatchIds, onToggleFavorite, quickBetFeedbackId }) {
  const liveMatches = filterBySearch(getMatchCollection(matchesByCategory, 'live'), searchQuery);
  const upcomingMatches = filterBySearch(getMatchCollection(matchesByCategory, 'prematch'), searchQuery);
  const matches = sortMatchesByTime([...liveMatches, ...upcomingMatches]);
  const highlights = sortMatchesByTime([
    ...liveMatches.slice(0, 10),
    ...upcomingMatches.slice(0, 10),
  ]).slice(0, 10);

  const displayLiveMatches = liveMatches.slice(0, 12);
  const displayUpcomingMatches = upcomingMatches.slice(0, 12);

  if (loading && matches.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <PageShell>
      <section className="overflow-hidden rounded-md bg-[linear-gradient(120deg,#111827,#35215f_55%,#111827)] p-5 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd200]">Featured tournament</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">CS ASIA CHAMPIONSHIP</h1>
            <p className="mt-3 max-w-xl text-sm text-white/70">Live markets, map handicaps, totals, and match winners from the current Betby feed.</p>
          </div>
          <div className="hidden h-40 rounded-md border border-white/10 bg-white/10 md:block">
            <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.2em] text-white/50">Esports graphic</div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Highlights</h2>
          <Link to="/category/csgo" className="text-xs font-bold uppercase text-[#ffd200]">View all</Link>
        </div>
        {highlights.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {highlights.map((match) => (
              <div key={match.id} className="w-[355px] shrink-0">
                <HighlightMatchCard match={match} live={liveMatches.some((liveMatch) => liveMatch.id === match.id)} onSelectOdd={onSelectOdd} selections={selections} quickBetFeedbackId={quickBetFeedbackId} />
              </div>
            ))}
          </div>
        ) : <EmptyMatches />}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <LiveSignal size={20} />
          <h2 className="text-lg font-black uppercase tracking-wide text-white">Live</h2>
        </div>
        {displayLiveMatches.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {displayLiveMatches.map((match) => <StandardMatchCard key={match.id} match={match} live onSelectOdd={onSelectOdd} selections={selections} isFavorite={favoriteMatchIds.includes(match.id)} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
          </div>
        ) : <EmptyMatches />}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <PiClockCountdownFill size={20} className="text-[#19d8ff]" />
          <h2 className="text-lg font-black uppercase tracking-wide text-white">Upcoming</h2>
        </div>
        {displayUpcomingMatches.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {displayUpcomingMatches.map((match) => <StandardMatchCard key={match.id} match={match} onSelectOdd={onSelectOdd} selections={selections} isFavorite={favoriteMatchIds.includes(match.id)} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
          </div>
        ) : <EmptyMatches title="No upcoming events in this feed" />}
      </section>
    </PageShell>
  );
}

export function LivePage({ matchesByCategory, loading, error, onRetry, onSelectOdd, selections, searchQuery, favoriteMatchIds, onToggleFavorite, quickBetFeedbackId }) {
  const matches = filterBySearch(getMatchCollection(matchesByCategory, 'live'), searchQuery);

  if (loading && matches.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <Flame className="text-[#ef4444]" size={28} />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Live Matches</h1>
          <p className="text-sm text-[#8a8e99]">{matches.length} live events sorted by earliest start time.</p>
        </div>
      </div>

      {matches.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => <StandardMatchCard key={match.id} match={match} live onSelectOdd={onSelectOdd} selections={selections} isFavorite={favoriteMatchIds.includes(match.id)} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
        </section>
      ) : <EmptyMatches title="No live matches available" />}
    </PageShell>
  );
}

export function FavoritesPage({ matchesByCategory, loading, error, onRetry, onSelectOdd, selections, searchQuery, favoriteMatchIds, onToggleFavorite, quickBetFeedbackId }) {
  const favoriteLiveMatches = filterBySearch(
    getMatchCollection(matchesByCategory, 'live').filter((match) => favoriteMatchIds.includes(match.id)),
    searchQuery,
  );
  const favoriteUpcomingMatches = filterBySearch(
    getMatchCollection(matchesByCategory, 'prematch').filter((match) => favoriteMatchIds.includes(match.id)),
    searchQuery,
  );
  const hasFavoriteMatches = favoriteLiveMatches.length > 0 || favoriteUpcomingMatches.length > 0;

  if (loading && !hasFavoriteMatches) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <Star className="fill-current text-[#ffd200]" size={28} />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Favorites</h1>
          <p className="text-sm text-[#8a8e99]">Saved matches from live and upcoming feeds.</p>
        </div>
      </div>

      {hasFavoriteMatches ? (
        <>
          <section>
            <div className="mb-4 flex items-center gap-3">
              <LiveSignal size={20} />
              <h2 className="text-lg font-black uppercase tracking-wide text-white">Live Favorites</h2>
            </div>
            {favoriteLiveMatches.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {favoriteLiveMatches.map((match) => <StandardMatchCard key={match.id} match={match} live onSelectOdd={onSelectOdd} selections={selections} isFavorite onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
              </div>
            ) : <EmptyMatches title="No live favorite matches" />}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <PiClockCountdownFill size={20} className="text-[#19d8ff]" />
              <h2 className="text-lg font-black uppercase tracking-wide text-white">Upcoming Favorites</h2>
            </div>
            {favoriteUpcomingMatches.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {favoriteUpcomingMatches.map((match) => <StandardMatchCard key={match.id} match={match} onSelectOdd={onSelectOdd} selections={selections} isFavorite onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
              </div>
            ) : <EmptyMatches title="No upcoming favorite matches" />}
          </section>
        </>
      ) : <EmptyMatches title="No favorite matches yet" />}
    </PageShell>
  );
}

export function CategoryPage({ matchesByCategory, loading, error, onRetry, onSelectOdd, selections, searchQuery, favoriteMatchIds, onToggleFavorite, quickBetFeedbackId }) {
  const { id = 'csgo' } = useParams();
  const pageScope = `${id}:${searchQuery}`;
  const [livePageState, setLivePageState] = useState({ scope: pageScope, page: 1 });
  const [upcomingPageState, setUpcomingPageState] = useState({ scope: pageScope, page: 1 });

  const meta = CATEGORY_META[id] || CATEGORY_META.csgo;
  const matches = filterBySearch(sortMatchesByTime(matchesByCategory[id]?.live || []), searchQuery);
  const upcomingMatches = filterBySearch(sortMatchesByTime(matchesByCategory[id]?.prematch || []), searchQuery);

  const totalLivePages = Math.max(1, Math.ceil(matches.length / 12));
  const livePage = Math.min(livePageState.scope === pageScope ? livePageState.page : 1, totalLivePages);
  const paginatedLive = matches.slice((livePage - 1) * 12, livePage * 12);

  const totalUpcomingPages = Math.max(1, Math.ceil(upcomingMatches.length / 12));
  const upcomingPage = Math.min(upcomingPageState.scope === pageScope ? upcomingPageState.page : 1, totalUpcomingPages);
  const paginatedUpcoming = upcomingMatches.slice((upcomingPage - 1) * 12, upcomingPage * 12);

  if (loading && matches.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <PageShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a8e99]">Category</p>
          <h1 className="text-3xl font-black tracking-tight text-white">{meta.title}</h1>
        </div>
        <div className="text-xs font-bold uppercase text-[#8a8e99]">{matches.length} live • {upcomingMatches.length} upcoming</div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {meta.filters.map((filter, index) => (
          <button key={filter} type="button" className={`shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase ${index === 0 ? 'bg-[#ffd200] text-black' : 'bg-[#22252e] text-[#8a8e99] hover:bg-[#2a2e38] hover:text-white'}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {['Matches', 'Outrights'].map((item, index) => (
          <button key={item} type="button" className={`rounded-md px-4 py-2 text-xs font-black uppercase ${index === 0 ? 'bg-[#22252e] text-white' : 'bg-[#1a1c24] text-[#8a8e99]'}`}>
            {item}
          </button>
        ))}
      </div>

      <section className="rounded-md bg-[linear-gradient(120deg,#1a1c24,#222b48_55%,#1a1c24)] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd200]">League board</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">{meta.hero}</h2>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <LiveSignal size={20} />
          <h2 className="text-lg font-black uppercase tracking-wide text-white">Live</h2>
        </div>
        {matches.length ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedLive.map((match) => <StandardMatchCard key={match.id} match={match} live onSelectOdd={onSelectOdd} selections={selections} isFavorite={favoriteMatchIds.includes(match.id)} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
            </div>
            <Pagination currentPage={livePage} totalPages={totalLivePages} onPageChange={(page) => setLivePageState({ scope: pageScope, page })} />
          </>
        ) : <EmptyMatches title={`No live ${meta.title} events`} />}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <PiClockCountdownFill size={20} className="text-[#19d8ff]" />
          <h2 className="text-lg font-black uppercase tracking-wide text-white">Upcoming</h2>
        </div>
        {upcomingMatches.length ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedUpcoming.map((match) => <StandardMatchCard key={match.id} match={match} onSelectOdd={onSelectOdd} selections={selections} isFavorite={favoriteMatchIds.includes(match.id)} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />)}
            </div>
            <Pagination currentPage={upcomingPage} totalPages={totalUpcomingPages} onPageChange={(page) => setUpcomingPageState({ scope: pageScope, page })} />
          </>
        ) : <EmptyMatches title="No upcoming events in this feed" />}
      </section>
    </PageShell>
  );
}

function AccordionMarket({ name, odds, match, onSelectOdd, selections, quickBetFeedbackId = '' }) {
  const [open, setOpen] = useState(true);
  const sortedOdds = sortMarketOdds(odds, match);

  return (
    <article className="overflow-hidden rounded-md bg-[#22252e]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between bg-[#2a2e38] px-4 py-3 text-left">
        <span className="text-sm font-black uppercase tracking-wide text-white">{name}</span>
        <span className="flex items-center gap-2 text-xs font-bold text-[#8a8e99]">
          {odds.length}
          <ChevronDown size={16} className={open ? 'rotate-180 transition' : 'transition'} />
        </span>
      </button>
      {open && (
        <div className={getMarketGridClass(sortedOdds.length, name, sortedOdds)}>
          {sortedOdds.map((odd) => (
            <OddsButton
              key={`${name}-${odd.marketId}-${odd.outcomeId}-${odd.outcomeName}`}
              odd={odd}
              selected={selections.some((selection) => selection.id === getSelectionId(match, odd))}
              quickBetSuccess={quickBetFeedbackId === getSelectionId(match, odd)}
              onSelect={() => onSelectOdd(match, odd)}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export function MatchDetailPage({ matchesByCategory, onSelectOdd, selections, quickBetFeedbackId }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('main');
  const [marketSearch, setMarketSearch] = useState('');

  const cachedMatch = useMemo(() => {
    const matches = getAllFeedMatches(matchesByCategory);
    return matches.find((item) => item.id === id);
  }, [matchesByCategory, id]);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const type = cachedMatch ? (cachedMatch.isLive ? 'live' : 'prematch') : undefined;
      const data = await service.getEventDetails({ eventId: id, type });
      setMatch(data);
    } catch (err) {
      console.error('Failed to load event details:', err);
      if (cachedMatch) {
        setMatch(cachedMatch);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch match details');
      }
    } finally {
      setLoading(false);
    }
  }, [id, cachedMatch]);

  useEffect(() => {
    Promise.resolve().then(fetchDetails);
  }, [fetchDetails]);

  useEffect(() => {
    const intervalTime = cachedMatch?.isLive ? 10000 : 30000;
    const intervalId = window.setInterval(() => {
      Promise.resolve().then(fetchDetails);
    }, intervalTime);

    return () => window.clearInterval(intervalId);
  }, [fetchDetails, cachedMatch]);

  const detailedMatch = match?.id === id ? match : null;
  const displayMatch = detailedMatch || (!loading ? cachedMatch : null);
  const teams = splitTeams(displayMatch?.title);
  const marketGroups = groupOddsByMarket(displayMatch?.odds || []);
  const marketEntries = sortMarketEntries(Object.entries(marketGroups));
  const marketTabs = getMarketTabs(marketEntries);
  const filteredMarketEntries = filterMarketEntries(marketEntries, activeTab, marketSearch);

  if (loading && !detailedMatch) return <LoadingState />;
  if (error && !displayMatch) return <ErrorState message={error} onRetry={fetchDetails} />;
  if (!displayMatch) return <EmptyMatches title="Match not found" />;

  return (
    <PageShell>
      <button type="button" onClick={() => navigate(-1)} className="text-xs font-black uppercase text-[#ffd200]">Back to board</button>
      <section className="rounded-md bg-[#22252e] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a8e99]">{displayMatch.sport} • {displayMatch.tournament}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex items-center gap-3">
            <TeamLogo name={teams.home} />
            <h1 className="text-2xl font-black text-white">{teams.home}</h1>
          </div>
          <div className="rounded-md bg-[#1a1c24] px-5 py-3 text-center font-mono text-2xl font-black text-white">{displayMatch.score || '0 - 0'}</div>
          <div className="flex items-center gap-3 sm:justify-end">
            <h1 className="text-2xl font-black text-white">{teams.away}</h1>
            <TeamLogo name={teams.away} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {marketTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-black uppercase ${activeTab === tab.id ? 'bg-[#ffd200] text-black' : 'bg-[#22252e] text-[#8a8e99] hover:bg-[#2a2e38] hover:text-white'}`}
            >
              {tab.label}
              <span className="rounded bg-black/15 px-1.5 py-0.5 font-mono">{tab.count}</span>
            </button>
          ))}
        </div>

        <label className="flex min-h-10 items-center gap-2 rounded-md bg-[#22252e] px-3 ring-1 ring-[#2a2e38] focus-within:ring-[#ffd200] lg:w-[360px]">
          <Search size={16} className="shrink-0 text-[#8a8e99]" />
          <input
            value={marketSearch}
            onChange={(event) => setMarketSearch(event.target.value)}
            placeholder="Search markets or outcomes"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-[#8a8e99]"
          />
        </label>
      </div>

      <section className="space-y-3">
        {filteredMarketEntries.length ? filteredMarketEntries.map(([name, odds]) => {
          const displayName = name.includes(':') ? name.split(':').slice(1).join(':') : name;
          return <AccordionMarket key={name} name={displayName} odds={odds} match={displayMatch} onSelectOdd={onSelectOdd} selections={selections} quickBetFeedbackId={quickBetFeedbackId} />;
        }) : <EmptyMatches title="No odds match this filter" />}
      </section>
    </PageShell>
  );
}
