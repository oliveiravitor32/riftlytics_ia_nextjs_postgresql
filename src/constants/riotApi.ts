/**
 * Riot API Constants
 * Endpoints, URLs, and configuration for League of Legends API
 */

export const RIOT_API_CONSTANTS = {
  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_SECOND: 20,
  RATE_LIMIT_REQUESTS_PER_2_MINUTES: 100,
  RATE_LIMIT_RESET_MS: 2000,

  // API Endpoints (Regional)
  ENDPOINTS: {
    // Regional endpoints (americas, europe, asia, etc.)
    SUMMONER_BY_NAME: '/lol/summoner/v4/summoners/by-name',
    SUMMONER_BY_PUUID: '/lol/summoner/v4/summoners/by-puuid',
    LEAGUE_ENTRIES: '/lol/league/v4/entries/by-puuid',
    MATCH_LIST: '/lol/match/v5/matches/by-puuid',
    MATCH_DETAILS: '/lol/match/v5/matches',
  } as const,

  // Regions
  REGIONS: {
    NA: 'na1',
    EUW: 'euw1',
    EUNE: 'eun1',
    BR: 'br1',
    LAS: 'la2',
    LAN: 'la1',
    KR: 'kr',
    RU: 'ru',
    TR: 'tr1',
    JP: 'jp1',
    OC: 'oc1',
    PH: 'ph2',
    SG: 'sg2',
    TH: 'th2',
    TW: 'tw2',
    VN: 'vn2',
  } as const,

  // Region used when a request doesn't say (the group plays in BR)
  DEFAULT_REGION: 'br1',

  // Routing Values (for regional endpoints)
  ROUTING_VALUES: {
    AMERICAS: 'americas',
    EUROPE: 'europe',
    ASIA: 'asia',
    SEA: 'sea',
  } as const,

  // Rank Tiers
  RANK_TIERS: {
    IRON: 'IRON',
    BRONZE: 'BRONZE',
    SILVER: 'SILVER',
    GOLD: 'GOLD',
    PLATINUM: 'PLATINUM',
    EMERALD: 'EMERALD',
    DIAMOND: 'DIAMOND',
    MASTER: 'MASTER',
    GRANDMASTER: 'GRANDMASTER',
    CHALLENGER: 'CHALLENGER',
  } as const,

  // Rank Divisions
  RANK_DIVISIONS: {
    I: 'I',
    II: 'II',
    III: 'III',
    IV: 'IV',
  } as const,

  // Queue Types
  QUEUE_TYPES: {
    SOLO_DUO: 'RANKED_SOLO_5x5',
    FLEX_SR: 'RANKED_FLEX_SR',
    FLEX_TT: 'RANKED_FLEX_TT',
  } as const,

  // Roles
  ROLES: {
    TOP: 'TOP',
    JUNGLE: 'JUNGLE',
    MIDDLE: 'MIDDLE',
    BOTTOM: 'BOTTOM',
    UTILITY: 'UTILITY',
  } as const,

  // Browser cache (react-query), in milliseconds
  CACHE_TTL: {
    RANKING: 1000 * 60 * 10, // 10 minutes, same as the server cache
    MATCH_DETAILS: 1000 * 60 * 60 * 24, // 24 hours (matches don't change)
  } as const,

  // Server cache in Redis, in seconds
  CACHE_SECONDS: {
    PROFILE: 60 * 10, // summoner + rank
    MATCH_IDS: 60 * 10, // a page of match ids
    PUUID: 60 * 60 * 24 * 30, // never changes
    REFRESH_LOCK: 60 * 2, // one forced reload per player
  } as const,

  // API Response Defaults
  DEFAULTS: {
    MATCHES_PER_PAGE: 20,
    MAX_MATCHES: 100,
    PDL_SNAPSHOT_TIME: '00:00:00', // UTC time for daily snapshots
  } as const,

  // Error Codes
  ERROR_CODES: {
    SUMMONER_NOT_FOUND: 404,
    RATE_LIMIT: 429,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  } as const,

  // Request Timeout (ms)
  REQUEST_TIMEOUT_MS: 10000,

  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  } as const,
} as const;

export type RankTier =
  (typeof RIOT_API_CONSTANTS.RANK_TIERS)[keyof typeof RIOT_API_CONSTANTS.RANK_TIERS];
export type RankDivision =
  (typeof RIOT_API_CONSTANTS.RANK_DIVISIONS)[keyof typeof RIOT_API_CONSTANTS.RANK_DIVISIONS];
export type QueueType =
  (typeof RIOT_API_CONSTANTS.QUEUE_TYPES)[keyof typeof RIOT_API_CONSTANTS.QUEUE_TYPES];
export type Role =
  (typeof RIOT_API_CONSTANTS.ROLES)[keyof typeof RIOT_API_CONSTANTS.ROLES];
export type Region =
  (typeof RIOT_API_CONSTANTS.REGIONS)[keyof typeof RIOT_API_CONSTANTS.REGIONS];
