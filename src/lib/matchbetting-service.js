import { CSGOEmpireMatchBettingClient } from './csgoempire-client';

export const CATEGORY_FILTERS = {
  csgo: { label: 'CS:GO / CS2', sportId: 109 },
  valorant: { label: 'Valorant', sportId: 194 },
  lol: { label: 'League of Legends', sportId: 110 },
  football: { label: 'Football', sportId: 1 },
};

export const OVERVIEW_CATEGORIES = ['csgo', 'valorant', 'lol', 'football'];

function formatScore(score) {
  if (!score) {
    return '';
  }

  if (typeof score === 'string' || typeof score === 'number') {
    return String(score);
  }

  if (typeof score !== 'object') {
    return '';
  }

  const homeScore = score.home_score ?? score.homeScore ?? score.home;
  const awayScore = score.away_score ?? score.awayScore ?? score.away;

  return homeScore !== undefined && awayScore !== undefined
    ? `${homeScore} - ${awayScore}`
    : '';
}

export class MatchBettingService {
  constructor() {
    this.client = new CSGOEmpireMatchBettingClient();
  }

  async getMatches({ category, type = 'live' }) {
    const result = await this.client.getSnapshot(type, { category });
    const events = Array.isArray(result?.events) ? result.events : [];

    return events.map((event) => ({
      ...event,
      score: formatScore(event.score),
      odds: Array.isArray(event.odds) ? event.odds : [],
      mainOdds: Array.isArray(event.mainOdds) ? event.mainOdds : [],
    }));
  }

  async getEventDetails({ eventId, type }) {
    const result = await this.client.getEventDetails(eventId, type);
    const event = result?.event;

    if (!event) {
      throw new Error(result?.error || 'Event details not found');
    }

    return {
      ...event,
      score: formatScore(event.score),
      odds: Array.isArray(event.odds) ? event.odds : [],
      mainOdds: Array.isArray(event.mainOdds) ? event.mainOdds : [],
    };
  }
}
