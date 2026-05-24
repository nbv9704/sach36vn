export function getMatchCollection(matchesByCategory, type = 'live') {
  return sortMatchesByTime(Object.values(matchesByCategory).flatMap((entry) => entry?.[type] || []));
}

export function sortMatchesByTime(matches) {
  return [...matches].sort((left, right) => {
    const leftTime = getMatchTimeMs(left?.scheduledAt);
    const rightTime = getMatchTimeMs(right?.scheduledAt);

    return leftTime - rightTime;
  });
}

export function getMatchTimeMs(value) {
  if (value === null || value === undefined || value === '') {
    return Number.POSITIVE_INFINITY;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue > 100000000000 ? numericValue : numericValue * 1000;
  }

  const parsedValue = Date.parse(String(value));
  return Number.isFinite(parsedValue) ? parsedValue : Number.POSITIVE_INFINITY;
}

export function getAllFeedMatches(matchesByCategory) {
  return sortMatchesByTime(Object.values(matchesByCategory).flatMap((entry) => [
    ...(entry?.live || []),
    ...(entry?.prematch || []),
  ]));
}

export function findLatestSelectionOdd(matchesByCategory, selection) {
  const match = getAllFeedMatches(matchesByCategory).find((item) => item.id === selection.matchId);
  const odds = [...(match?.mainOdds || []), ...(match?.odds || [])];

  return odds.find((odd) => (
    String(odd.marketId) === String(selection.marketId)
    && String(odd.outcomeId) === String(selection.outcomeId)
    && String(odd.outcomeName) === String(selection.outcomeName)
  ));
}

export function normalizeSearchText(match) {
  return [match.title, match.sport, match.tournament, match.period].join(' ').toLowerCase();
}

export function filterBySearch(matches, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return matches;
  return matches.filter((match) => normalizeSearchText(match).includes(normalizedQuery));
}

export function getSelectionId(match, odd) {
  return `${match.id}:${odd.marketId}:${odd.outcomeId}:${odd.outcomeName}`;
}

export function getTotalOdds(selections) {
  const total = selections.reduce((product, selection) => {
    const odds = Number(selection.odds);
    return Number.isFinite(odds) ? product * odds : product;
  }, 1);

  return selections.length ? total : 0;
}

export function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

export function statusTextClass(status) {
  return {
    Pending: 'text-[#ffd200]',
    Open: 'text-[#ffd200]',
    Won: 'text-[#10b981]',
    Lost: 'text-[#ef4444]',
    Refund: 'text-[#8a8e99]',
    Cancelled: 'text-[#8a8e99]',
    'Cashed Out': 'text-[#f59e0b]',
  }[status] || 'text-[#8a8e99]';
}

export function getSpentStats(bets) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;

  return bets.reduce((stats, bet) => {
    const createdAt = new Date(bet.createdAt).getTime();
    if (!Number.isFinite(createdAt)) return stats;

    const age = now - createdAt;
    const stake = Number(bet.stake || 0);

    if (age <= dayMs) stats.daily += stake;
    if (age <= weekMs) stats.weekly += stake;
    if (age <= monthMs) stats.monthly += stake;

    return stats;
  }, { daily: 0, weekly: 0, monthly: 0 });
}

export function getEarnedStats(bets) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;

  return bets.reduce((stats, bet) => {
    const settledAt = new Date(bet.settledAt || bet.createdAt).getTime();
    if (!Number.isFinite(settledAt)) return stats;

    const age = now - settledAt;
    const earned = Number(bet.settledPayout || 0);

    if (age <= dayMs) stats.daily += earned;
    if (age <= weekMs) stats.weekly += earned;
    if (age <= monthMs) stats.monthly += earned;

    return stats;
  }, { daily: 0, weekly: 0, monthly: 0 });
}

export function splitTeams(title) {
  const parts = String(title || '').split(/\s+vs\s+/i);

  return {
    home: parts[0] || 'Team 1',
    away: parts[1] || 'Team 2',
  };
}

export function formatTime(value) {
  const timestamp = getMatchTimeMs(value);

  if (!Number.isFinite(timestamp)) {
    return 'Live';
  }

  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function formatBetDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getSelectionDisplayDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getSelectionProgressColor(status) {
  return {
    Won: 'bg-[#6dff3f]',
    Lost: 'bg-[#ff4057]',
    Refund: 'bg-[#8a8e99]',
    Cancelled: 'bg-[#8a8e99]',
    Pending: 'bg-[#ffd200]',
  }[status || 'Pending'] || 'bg-[#ffd200]';
}

export function getCurrentMapLabel(seriesScore, fallbackPeriod, sport) {
  const isSoccer = /football|soccer/i.test(sport || '');

  if (isSoccer) {
    return getSoccerPeriodLabel(fallbackPeriod);
  }

  if (seriesScore) {
    const [homeSeriesScore, awaySeriesScore] = String(seriesScore).split(/\s*-\s*/).map((value) => Number(value));

    if (Number.isFinite(homeSeriesScore) && Number.isFinite(awaySeriesScore)) {
      return `Map ${homeSeriesScore + awaySeriesScore + 1}`;
    }
  }

  return fallbackPeriod && String(fallbackPeriod).toLowerCase() !== 'live' ? fallbackPeriod : 'Current map';
}

function getSoccerPeriodLabel(period) {
  if (!period) return 'Live';

  const raw = String(period).trim();
  const lower = raw.toLowerCase();

  if (/half\s*time/i.test(raw)) return 'Half time';
  if (/full\s*time/i.test(raw)) return 'Full time';
  if (/extra\s*time/i.test(raw)) return 'Extra time';
  if (/penalty|penalties/i.test(raw)) return 'Penalties';
  if (/break/i.test(raw)) return 'Break';
  if (/not\s*started/i.test(raw)) return 'Not started';

  // Try to extract minute and half from patterns like "1st half 31:00", "31' 1H", "2H 65:12", "1st half", etc.
  const minuteMatch = raw.match(/(?:^|\D)(\d{1,3})(?:\s*'|:|\s*(?:min|minute))/i);
  const minute = minuteMatch ? minuteMatch[1] : null;

  const halfNumber = /\b(1st|1h)\b/i.test(raw) ? '1st half'
    : /\b(2nd|2h)\b/i.test(raw) ? '2nd half'
      : /\bhalf\s*1\b/i.test(raw) ? '1st half'
        : /\bhalf\s*2\b/i.test(raw) ? '2nd half'
          : null;

  if (minute && halfNumber) return `${minute}' ${halfNumber}`;
  if (halfNumber) return halfNumber;
  if (minute) return `${minute}'`;

  if (lower === 'live') return 'Live';

  return raw;
}

export function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function isBetInDateFilter(bet, filter, customRange) {
  if (filter === 'Recent Bets') return true;

  const createdAt = new Date(bet.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return false;

  const now = Date.now();
  if (filter === 'Today') return createdAt >= startOfDay(now).getTime();
  if (filter === 'For Week') return createdAt >= now - 7 * 24 * 60 * 60 * 1000;
  if (filter === 'For Month') return createdAt >= now - 30 * 24 * 60 * 60 * 1000;

  if (filter === 'Custom') {
    if (!customRange.from || !customRange.to) return true;
    const from = startOfDay(customRange.from).getTime();
    const to = startOfDay(customRange.to).getTime() + 24 * 60 * 60 * 1000 - 1;
    return createdAt >= from && createdAt <= to;
  }

  return true;
}

export function firstOdds(match, count = 3) {
  const mainOdds = Array.isArray(match?.mainOdds) ? match.mainOdds : [];
  const odds = mainOdds.length ? mainOdds : match?.odds || [];
  return odds.slice(0, count);
}

export function groupOddsByMarket(odds = []) {
  return odds.reduce((groups, odd) => {
    const name = getMarketGroupName(odd.marketName);
    const key = `${odd.marketId || name}:${name}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(odd);
    return groups;
  }, {});
}

export function getMarketGroupName(name = 'Market') {
  const value = String(name).trim();

  if (/^total maps\s+[+-]?\d+(?:\.\d+)?$/i.test(value)) {
    return value.replace(/\s+[+-]?\d+(?:\.\d+)?$/u, '').trim();
  }

  if (/^map handicap\s+[+-]?\d+(?:\.\d+)?$/i.test(value)) {
    return value.replace(/\s+[+-]?\d+(?:\.\d+)?$/u, '').trim();
  }

  if (/^total kills\s+[+-]?\d+(?:\.\d+)?$/i.test(value)) {
    return value.replace(/\s+[+-]?\d+(?:\.\d+)?$/u, '').trim();
  }

  if (/^kills handicap\s+[+-]?\d+(?:\.\d+)?$/i.test(value)) {
    return value.replace(/\s+[+-]?\d+(?:\.\d+)?$/u, '').trim();
  }

  return value || 'Market';
}

export function loadFavoriteMatchIds() {
  try {
    const value = window.localStorage.getItem('sach36vn.favoriteMatchIds');
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}
