declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type MatchType = 'live' | 'prematch';
type CategoryKey = keyof typeof CATEGORY_FILTERS;
type JsonObject = Record<string, unknown>;

type RequestParams = {
  type: MatchType | string;
  category: string;
  eventId?: string;
};


type NormalizedOdds = {
  marketId: unknown;
  marketName: string;
  outcomeId: unknown;
  outcomeName: string;
  odds: string | number;
  blocked: boolean;
};

type NormalizedEvent = {
  id: string;
  title: string;
  sportId: unknown;
  sport: string;
  tournament: string;
  scheduledAt: unknown;
  score: unknown;
  seriesScore?: unknown;
  period: unknown;
  isLive: boolean;
  odds: NormalizedOdds[];
  mainOdds: NormalizedOdds[];
};

type MarketDescriptions = Record<string, JsonObject>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const BETBY_BASE_URL = Deno.env.get('BETBY_BASE_URL') || 'https://api-h-c7818b61-608.sptpub.com';
const BRAND_ID = Deno.env.get('BETBY_BRAND_ID') || '2432911154364948480';
const LANGUAGE = Deno.env.get('BETBY_LANGUAGE') || 'en';
let marketDescriptionsCache: Promise<MarketDescriptions> | null = null;

const CATEGORY_FILTERS = {
  csgo: { label: 'CS:GO / CS2', sportId: 109 },
  valorant: { label: 'Valorant', sportId: 194 },
  lol: { label: 'League of Legends', sportId: 110 },
  football: { label: 'Football', sportId: 1 },
} as const;

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value ? value : fallback;
}

function getField(record: JsonObject, key: string): unknown {
  return record[key];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function getRequestParams(req: Request): Promise<RequestParams> {
  const url = new URL(req.url);
  const params: RequestParams = {
    type: url.searchParams.get('type') || 'live',
    category: url.searchParams.get('category') || '',
    eventId: url.searchParams.get('eventId') || undefined,
  };

  if (req.method !== 'POST') {
    return params;
  }

  return req.json()
    .then((body: unknown) => {
      const merged = {
        ...params,
        ...(isRecord(body) ? body : {}),
      };
      if (merged.eventId) {
        merged.eventId = String(merged.eventId);
      }
      return merged;
    })
    .catch(() => params) as Promise<RequestParams>;
}

async function betbyFetch(path: string): Promise<JsonObject> {
  const response = await fetch(`${BETBY_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Betby request failed ${response.status}: ${text.slice(0, 240)}`);
  }

  return isRecord(data) ? data : { value: data };
}

function uniq(values: unknown[]): unknown[] {
  return [...new Set(values.filter(Boolean))];
}

function asArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecordMap(value: unknown): Record<string, JsonObject> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, JsonObject] => isRecord(entry[1])),
  );
}

function collectEventMap(payload: JsonObject): JsonObject[] {
  const events = asRecordMap(getField(payload, 'events'));
  const sports = asRecordMap(getField(payload, 'sports'));
  const categories = asRecordMap(getField(payload, 'categories'));
  const tournaments = asRecordMap(getField(payload, 'tournaments'));

  return Object.entries(events).map(([id, event]) => ({
    ...event,
    id,
    _sports: sports,
    _categories: categories,
    _tournaments: tournaments,
  }));
}

function collectEvents(payload: unknown): JsonObject[] {
  if (!isRecord(payload)) {
    return [];
  }

  const directEvents = asArray(getField(payload, 'events'));
  const mappedEvents = collectEventMap(payload);
  const sectionEvents = [
    ...asArray(getField(payload, 'top_events')),
    ...asArray(getField(payload, 'rest_events')),
    ...asArray(getField(payload, 'live_events')),
    ...asArray(getField(payload, 'prematch_events')),
  ];

  const nestedEvents = Object.values(payload)
    .flatMap((value: unknown) => {
      if (Array.isArray(value)) {
        return value.filter((item: unknown) => {
          if (!isRecord(item)) return false;
          return Boolean(
            getField(item, 'id') &&
            (getField(item, 'competitors') || getField(item, 'markets') || getField(item, 'sport_id')),
          );
        });
      }
      if (isRecord(value)) {
        return [
          ...asArray(getField(value, 'events')),
          ...collectEventMap(value),
        ];
      }
      return [];
    });

  return [...directEvents, ...mappedEvents, ...sectionEvents, ...nestedEvents];
}

async function getSnapshotWithVersions(type: MatchType): Promise<{
  snapshot: JsonObject;
  versions: unknown[];
  payloads: JsonObject[];
}> {
  const mode: MatchType = type === 'prematch' ? 'prematch' : 'live';
  const snapshot = await betbyFetch(`/api/v4/${mode}/brand/${BRAND_ID}/${LANGUAGE}/0`);
  const versions = uniq([
    getField(snapshot, 'version'),
    ...asUnknownArray(getField(snapshot, 'top_events_versions')),
    ...asUnknownArray(getField(snapshot, 'rest_events_versions')),
  ]).slice(0, 5);

  const versionPayloads = await Promise.all(
    versions.map((version: unknown) => betbyFetch(`/api/v4/${mode}/brand/${BRAND_ID}/${LANGUAGE}/${String(version)}`).catch((error: Error) => ({ error: error.message }))),
  );

  return {
    snapshot,
    versions,
    payloads: versionPayloads,
  };
}

async function getMarketDescriptions(): Promise<MarketDescriptions> {
  if (!marketDescriptionsCache) {
    marketDescriptionsCache = betbyFetch(`/api/v3/descriptions/brand/${BRAND_ID}/markets/${LANGUAGE}`)
      .then((data) => asRecordMap(data))
      .catch(() => ({} as MarketDescriptions));
  }

  return marketDescriptionsCache!;
}

function parseVariant(variant = ''): Record<string, string> {
  return variant.split('|').reduce((values: Record<string, string>, part) => {
    const [key, value] = part.split('=');
    if (key && value !== undefined) {
      values[key] = value;
    }
    return values;
  }, {});
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getVariantValue(values: Record<string, string>, key: string): string | undefined {
  if (values[key] !== undefined) return values[key];
  const matchedKey = Object.keys(values).find((item) => item.toLowerCase() === key.toLowerCase());
  return matchedKey ? values[matchedKey] : undefined;
}

function resolveTemplateExpression(expression: string, values: Record<string, string>): string {
  const match = expression.trim().match(/^([a-zA-Z0-9_]+)(?:\s*([+-])\s*(\d+(?:\.\d+)?))?$/);
  if (!match) return '';

  const [, key, operator, operandRaw] = match;
  const rawValue = getVariantValue(values, key);
  if (rawValue === undefined) return '';

  const numericValue = Number(rawValue);
  if (!operator || !operandRaw || !Number.isFinite(numericValue)) {
    return rawValue;
  }

  const operand = Number(operandRaw);
  const resolved = operator === '+' ? numericValue + operand : numericValue - operand;
  return Number.isInteger(resolved) ? String(resolved) : String(resolved);
}

function applyDescriptionTemplate(template: string, variant = '', homeName = 'Home', awayName = 'Away'): string {
  const values = parseVariant(variant);

  return template
    .replaceAll('{$competitor1}', homeName)
    .replaceAll('{$competitor2}', awayName)
    .replace(/\{!mapnr\}\s+map/gi, values.mapnr ? `Map ${values.mapnr}` : 'Map')
    .replace(/\{!mapnr\}/g, values.mapnr ? `Map ${values.mapnr}` : 'Map')
    .replace(/\{!gamenr\}\s+game/gi, getVariantValue(values, 'gamenr') ? `Game ${getVariantValue(values, 'gamenr')}` : 'Game')
    .replace(/\{!gamenr\}/gi, getVariantValue(values, 'gamenr') ? `Game ${getVariantValue(values, 'gamenr')}` : 'Game')
    .replace(/\{\+hcp\}/g, values.hcp ? `+${values.hcp.replace(/^\+/, '')}` : '')
    .replace(/\{-hcp\}/g, values.hcp ? `-${values.hcp.replace(/^[+-]/, '')}` : '')
    .replace(/\{\{([^}]+)\}\}/g, (_match, expression: string) => resolveTemplateExpression(expression, values))
    .replace(/\{\(([^}]+)\)\}/g, (_match, expression: string) => resolveTemplateExpression(expression, values))
    .replace(/\{!([a-zA-Z0-9_]+)\}/g, (_match, key: string) => getVariantValue(values, key) || '')
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => getVariantValue(values, key) || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDescribedMarketName(marketId: string, variant: string, descriptions: MarketDescriptions): string {
  const description = descriptions[marketId];
  const template = isRecord(description) ? getString(getField(description, 'name')) : '';
  const values = parseVariant(variant);

  if (template) {
    const name = titleCase(applyDescriptionTemplate(template, variant));
    const shouldAppendValue = !/[{}]/.test(template) && (values.total || values.hcp || values.mapnr);
    return shouldAppendValue ? `${name} ${values.total || values.hcp || values.mapnr}` : name;
  }

  return getMarketName(marketId, variant);
}

function getDescribedOutcomeName(outcomeId: string, variant: string, descriptions: MarketDescriptions, marketId: string, homeName: string, awayName: string): string {
  const description = descriptions[marketId];
  const variantGroups = isRecord(description) ? getField(description, 'variants') : null;

  if (isRecord(variantGroups)) {
    const groups = asArray(getField(variantGroups, ''));
    const outcome = groups
      .flatMap((group: JsonObject) => asArray(getField(group, 'outcomes')))
      .find((item: JsonObject) => String(getField(item, 'id')) === outcomeId);
    const template = outcome ? getString(getField(outcome, 'name')) : '';

    if (template) {
      return titleCase(applyDescriptionTemplate(template, variant, homeName, awayName));
    }
  }

  return getMappedOutcomeName(outcomeId, variant);
}

function getCompetitors(event: JsonObject): { homeName: string; awayName: string } {
  const desc = isRecord(getField(event, 'desc')) ? getField(event, 'desc') as JsonObject : event;
  const competitors = asArray(getField(desc, 'competitors'));
  const home = competitors.find((team: JsonObject) => getField(team, 'qualifier') === 'home') || competitors[0] || {};
  const away = competitors.find((team: JsonObject) => getField(team, 'qualifier') === 'away') || competitors[1] || {};

  return {
    homeName: getString(getField(home, 'name'), getString(getField(desc, 'home_team'), getString(getField(desc, 'homeTeam'), getString(getField(desc, 'team1'), 'Team 1')))),
    awayName: getString(getField(away, 'name'), getString(getField(desc, 'away_team'), getString(getField(desc, 'awayTeam'), getString(getField(desc, 'team2'), 'Team 2')))),
  };
}

function getOutcomeName(outcomeId: string, variant = ''): string {
  const names: Record<string, string> = {
    '1': 'Home',
    '2': 'Draw',
    '3': 'Away',
    '4': 'Home',
    '5': 'Away',
    '12': variant ? `Over ${variant}` : 'Over',
    '13': variant ? `Under ${variant}` : 'Under',
    '74': 'Yes',
    '76': 'No',
    '1714': 'Home handicap',
    '1715': 'Away handicap',
    '1831': 'Over',
    '1832': 'Under',
  };

  return names[outcomeId] || `Outcome ${outcomeId}`;
}

function formatVariantValue(variant = ''): string {
  const [, value] = variant.split('=');
  return value || variant;
}

function getMarketName(marketId: string, variant = ''): string {
  const value = formatVariantValue(variant);
  const names: Record<string, string> = {
    '1': 'Match Winner',
    '2': 'Double Chance',
    '3': 'Handicap',
    '8': 'Total Goals',
    '18': value ? `Total Goals ${value}` : 'Total Goals',
    '19': value ? `Asian Handicap ${value}` : 'Asian Handicap',
    '20': 'Both Teams To Score',
    '29': 'Draw No Bet',
    '52': value ? `Map Handicap ${value}` : 'Map Handicap',
    '53': value ? `Map Total ${value}` : 'Map Total',
    '186': 'Match Winner',
    '187': value ? `Map Handicap ${value}` : 'Map Handicap',
    '327': value ? `Total Maps ${value}` : 'Total Maps',
  };

  return names[marketId] || (variant ? `Market ${marketId} ${value}` : `Market ${marketId}`);
}

function getMappedOutcomeName(outcomeId: string, variant = ''): string {
  const value = formatVariantValue(variant);
  const names: Record<string, string> = {
    '1': 'Home',
    '2': 'Draw',
    '3': 'Away',
    '4': 'Home',
    '5': 'Away',
    '12': value ? `Over ${value}` : 'Over',
    '13': value ? `Under ${value}` : 'Under',
    '74': 'Yes',
    '76': 'No',
    '1714': value ? `Home ${value}` : 'Home Handicap',
    '1715': value ? `Away ${value}` : 'Away Handicap',
    '1831': value ? `Over ${value}` : 'Over',
    '1832': value ? `Under ${value}` : 'Under',
  };

  return names[outcomeId] || getOutcomeName(outcomeId, value);
}

function normalizeScore(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (!isRecord(value)) {
    return '';
  }

  const homeScore = getField(value, 'home_score') ?? getField(value, 'homeScore') ?? getField(value, 'home');
  const awayScore = getField(value, 'away_score') ?? getField(value, 'awayScore') ?? getField(value, 'away');

  if (homeScore !== undefined && awayScore !== undefined) {
    return `${String(homeScore)} - ${String(awayScore)}`;
  }

  return '';
}

function getScorePair(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (!isRecord(value)) {
    return '';
  }

  const homeScore = getField(value, 'home_score') ?? getField(value, 'homeScore') ?? getField(value, 'home');
  const awayScore = getField(value, 'away_score') ?? getField(value, 'awayScore') ?? getField(value, 'away');

  return homeScore !== undefined && awayScore !== undefined ? `${String(homeScore)} - ${String(awayScore)}` : '';
}

function getCurrentPeriodScore(score: unknown): string {
  if (!isRecord(score)) {
    return getScorePair(score);
  }

  const periodScores = getField(score, 'period_scores') ?? getField(score, 'periodScores') ?? getField(score, 'periods');
  if (Array.isArray(periodScores) && periodScores.length) {
    const latestPeriod = [...periodScores].reverse().find((period) => Boolean(getScorePair(period)));
    const latestScore = getScorePair(latestPeriod);
    if (latestScore) {
      return latestScore;
    }
  }

  return getScorePair(score);
}

function normalizeOutcome(outcome: JsonObject, market: JsonObject): NormalizedOdds {
  const rawOdds = getField(outcome, 'odds') ?? getField(outcome, 'price') ?? getField(outcome, 'k') ?? getField(outcome, 'value');
  const numericOdds = typeof rawOdds === 'number' ? rawOdds : Number(rawOdds);
  const marketName = getString(getField(market, 'name'), getString(getField(market, 'market_name'), getString(getField(market, 'title'), 'Market')));
  const outcomeName = getString(getField(outcome, 'name'), getString(getField(outcome, 'outcome_name'), getString(getField(outcome, 'title'), getString(getField(outcome, 'label'), 'Outcome'))));

  return {
    marketId: getField(market, 'id') || getField(market, 'market_id'),
    marketName,
    outcomeId: getField(outcome, 'id') || getField(outcome, 'outcome_id'),
    outcomeName,
    odds: Number.isFinite(numericOdds) ? numericOdds.toFixed(2) : getString(rawOdds, '-'),
    blocked: Boolean(getField(outcome, 'blocked') || getField(outcome, 'status') === 'blocked'),
  };
}

function normalizeMarketMap(marketsValue: unknown, descriptions: MarketDescriptions, homeName: string, awayName: string): NormalizedOdds[] {
  const markets = asRecordMap(marketsValue);

  return Object.entries(markets).flatMap(([marketId, variants]) => {
    const variantMap = asRecordMap(variants);

    return Object.entries(variantMap).flatMap(([variant, outcomes]) => {
      const outcomeMap = asRecordMap(outcomes);

      return Object.entries(outcomeMap).map(([outcomeId, outcome]) => {
        const rawOdds = getField(outcome, 'odds') ?? getField(outcome, 'price') ?? getField(outcome, 'k') ?? getField(outcome, 'value');
        const numericOdds = typeof rawOdds === 'number' ? rawOdds : Number(rawOdds);

        return {
          marketId,
          marketName: getDescribedMarketName(marketId, variant, descriptions),
          outcomeId,
          outcomeName: getDescribedOutcomeName(outcomeId, variant, descriptions, marketId, homeName, awayName),
          odds: Number.isFinite(numericOdds) ? numericOdds.toFixed(2) : getString(rawOdds, '-'),
          blocked: Boolean(getField(outcome, 'blocked') || getField(outcome, 'b') || getField(outcome, 'status') === 'blocked'),
        };
      });
    });
  });
}

function normalizeEvent(event: JsonObject, type: MatchType, descriptions: MarketDescriptions): NormalizedEvent {
  const desc = isRecord(getField(event, 'desc')) ? getField(event, 'desc') as JsonObject : event;
  const { homeName, awayName } = getCompetitors(event);
  const marketsValue = getField(event, 'markets');
  const markets = asArray(marketsValue);
  const odds = markets.length
    ? markets.flatMap((market: JsonObject) => asArray(getField(market, 'outcomes')).map((outcome: JsonObject) => normalizeOutcome(outcome, market)))
    : normalizeMarketMap(marketsValue, descriptions, homeName, awayName);
  const mainOdds = odds.filter((odd: NormalizedOdds) => /winner|match|moneyline|1x2/i.test(odd.marketName)).slice(0, 3);
  const sports = asRecordMap(getField(event, '_sports'));
  const categories = asRecordMap(getField(event, '_categories'));
  const tournaments = asRecordMap(getField(event, '_tournaments'));
  const sportId = getField(event, 'sport_id') || getField(event, 'sportId') || getField(desc, 'sport');
  const categoryId = getField(desc, 'category') || getField(event, 'category');
  const tournamentId = getField(desc, 'tournament') || getField(event, 'tournament');
  const sport = getField(event, 'sport') || sports[String(sportId || '')];
  const category = categories[String(categoryId || '')];
  const tournament = tournaments[String(tournamentId || '')];
  const scoreValue = getField(event, 'score') || getField(event, 'match_score');
  const currentScore = getCurrentPeriodScore(
    getField(event, 'current_score')
      || getField(event, 'game_score')
      || getField(event, 'map_score')
      || getField(event, 'period_score')
      || scoreValue,
  );
  const seriesScore = Number(sportId) === 1 ? '' : getScorePair(scoreValue);

  return {
    id: String(getField(event, 'id') || getField(desc, 'id') || getField(event, 'event_id') || crypto.randomUUID()),
    title: getString(getField(desc, 'name'), getString(getField(event, 'name'), `${homeName} vs ${awayName}`)),
    sportId: sportId || (isRecord(sport) ? getField(sport, 'id') : undefined),
    sport: getString(getField(event, 'sport_name'), getString(getField(event, 'sportName'), isRecord(sport) ? getString(getField(sport, 'name'), 'Sport') : 'Sport')),
    tournament: getString(getField(event, 'tournament_name'), getString(getField(event, 'leagueName'), isRecord(tournament) ? getString(getField(tournament, 'name'), getString(isRecord(category) ? getField(category, 'name') : undefined, 'Tournament')) : getString(getField(event, 'category_name'), 'Tournament'))),
    scheduledAt: getField(desc, 'scheduled') || getField(event, 'scheduled') || getField(event, 'start_time') || getField(event, 'startDate') || getField(event, 'start_date'),
    score: currentScore || normalizeScore(scoreValue),
    seriesScore,
    period: getField(event, 'period_name') || getField(event, 'periodName') || getField(event, 'status_name') || getField(event, 'status') || (type === 'live' ? 'Live' : 'Upcoming'),
    isLive: type === 'live' || Boolean(getField(event, 'live')),
    odds,
    mainOdds: mainOdds.length ? mainOdds : odds.slice(0, 3),
  };
}

async function getSingleEventWithDescriptions(eventId: string, preferredType?: string): Promise<{
  event: NormalizedEvent;
  type: MatchType;
}> {
  let type: MatchType = preferredType === 'prematch' ? 'prematch' : 'live';
  let eventPayload: JsonObject | null = null;

  try {
    if (preferredType === 'prematch' || preferredType === 'live') {
      eventPayload = await betbyFetch(`/api/v4/${type}/brand/${BRAND_ID}/event/${LANGUAGE}/${eventId}`);
    } else {
      // Auto-detect: try live first
      try {
        eventPayload = await betbyFetch(`/api/v4/live/brand/${BRAND_ID}/event/${LANGUAGE}/${eventId}`);
        type = 'live';
      } catch (_err) {
        eventPayload = await betbyFetch(`/api/v4/prematch/brand/${BRAND_ID}/event/${LANGUAGE}/${eventId}`);
        type = 'prematch';
      }
    }
  } catch (error) {
    throw new Error(`Failed to fetch event ${eventId} details: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!eventPayload) {
    throw new Error(`Event ${eventId} details not found`);
  }

  // Fetch descriptions: general and event-specific
  const [generalDescriptions, eventDescriptionsRaw] = await Promise.all([
    getMarketDescriptions(),
    betbyFetch(`/api/v3/descriptions/brand/${BRAND_ID}/event/${eventId}/${LANGUAGE}`).catch(() => ({})),
  ]);

  // Merge event-specific descriptions into the market descriptions map.
  const eventMarkets = isRecord(eventDescriptionsRaw) ? asRecordMap(getField(eventDescriptionsRaw, 'markets')) : {};
  const mergedDescriptions: MarketDescriptions = {
    ...generalDescriptions,
    ...eventMarkets,
  };

  const rawEvents = collectEvents(eventPayload);
  const matchedEventRaw = rawEvents.find((e: JsonObject) => String(getField(e, 'id') || getField(getField(e, 'desc') as JsonObject || {}, 'id')) === eventId);

  if (!matchedEventRaw) {
    throw new Error(`Event ${eventId} not found in details payload`);
  }

  const normalized = normalizeEvent(matchedEventRaw, type, mergedDescriptions);
  return {
    event: normalized,
    type,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const params = await getRequestParams(req);

    if (params.eventId) {
      const { event, type } = await getSingleEventWithDescriptions(params.eventId, params.type as string);
      return jsonResponse({
        success: true,
        source: 'betby-edge-function',
        type,
        event,
      });
    }

    const type: MatchType = params.type === 'prematch' ? 'prematch' : 'live';
    const category = typeof params.category === 'string' ? params.category : '';
    const sportId = category in CATEGORY_FILTERS ? CATEGORY_FILTERS[category as CategoryKey].sportId : undefined;

    const [{ snapshot, versions, payloads }, marketDescriptions] = await Promise.all([
      getSnapshotWithVersions(type),
      getMarketDescriptions(),
    ]);
    const events = payloads.flatMap(collectEvents)
      .map((event: JsonObject) => normalizeEvent(event, type, marketDescriptions))
      .filter((event: NormalizedEvent) => !sportId || Number(event.sportId) === sportId);

    return jsonResponse({
      success: true,
      source: 'betby-edge-function',
      type,
      category,
      brandId: BRAND_ID,
      version: getField(snapshot, 'version') || null,
      versions,
      count: events.length,
      events,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
