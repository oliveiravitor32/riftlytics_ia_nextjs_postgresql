/**
 * Preset summoner names for MVP
 * These are hardcoded for the MVP phase
 * In Phase 2, this will be replaced with user account linking
 */

export type PdlHistoryPoint = {
  capturedAt: string;
  leaguePoints: number;
};

export type PresetSummoner = {
  tagLine: string;
  gameName: string;
  region: string;
  /** Player photo; will come from the DB. Falls back to an icon when absent */
  avatarUrl?: string | null;
  pdlHistory: PdlHistoryPoint[];
};

export const PRESET_SUMMONERS: PresetSummoner[] = [
  {
    tagLine: 'br1',
    gameName: 'FlyerCloud',
    region: 'br1',
    pdlHistory: [
      { capturedAt: '2026-05-17T00:00:00.000Z', leaguePoints: 42 },
      { capturedAt: '2026-05-18T00:00:00.000Z', leaguePoints: 47 },
      { capturedAt: '2026-05-19T00:00:00.000Z', leaguePoints: 45 },
      { capturedAt: '2026-05-20T00:00:00.000Z', leaguePoints: 51 },
      { capturedAt: '2026-05-21T00:00:00.000Z', leaguePoints: 56 },
      { capturedAt: '2026-05-22T00:00:00.000Z', leaguePoints: 59 },
      { capturedAt: '2026-05-23T00:00:00.000Z', leaguePoints: 63 },
    ],
  },
  {
    tagLine: 'BR1',
    gameName: 'Neutro7',
    region: 'br1',
    pdlHistory: [
      { capturedAt: '2026-05-17T00:00:00.000Z', leaguePoints: 88 },
      { capturedAt: '2026-05-18T00:00:00.000Z', leaguePoints: 90 },
      { capturedAt: '2026-05-19T00:00:00.000Z', leaguePoints: 93 },
      { capturedAt: '2026-05-20T00:00:00.000Z', leaguePoints: 91 },
      { capturedAt: '2026-05-21T00:00:00.000Z', leaguePoints: 96 },
      { capturedAt: '2026-05-22T00:00:00.000Z', leaguePoints: 101 },
      { capturedAt: '2026-05-23T00:00:00.000Z', leaguePoints: 105 },
    ],
  },
  {
    tagLine: 'br1',
    gameName: 'SAVYORI',
    region: 'br1',
    pdlHistory: [
      { capturedAt: '2026-05-17T00:00:00.000Z', leaguePoints: 21 },
      { capturedAt: '2026-05-18T00:00:00.000Z', leaguePoints: 25 },
      { capturedAt: '2026-05-19T00:00:00.000Z', leaguePoints: 28 },
      { capturedAt: '2026-05-20T00:00:00.000Z', leaguePoints: 24 },
      { capturedAt: '2026-05-21T00:00:00.000Z', leaguePoints: 31 },
      { capturedAt: '2026-05-22T00:00:00.000Z', leaguePoints: 34 },
      { capturedAt: '2026-05-23T00:00:00.000Z', leaguePoints: 38 },
    ],
  },
  {
    tagLine: 'BR2',
    gameName: 'PistolaCanoCurto',
    region: 'br1',
    pdlHistory: [
      { capturedAt: '2026-05-17T00:00:00.000Z', leaguePoints: 12 },
      { capturedAt: '2026-05-18T00:00:00.000Z', leaguePoints: 16 },
      { capturedAt: '2026-05-19T00:00:00.000Z', leaguePoints: 18 },
      { capturedAt: '2026-05-20T00:00:00.000Z', leaguePoints: 17 },
      { capturedAt: '2026-05-21T00:00:00.000Z', leaguePoints: 22 },
      { capturedAt: '2026-05-22T00:00:00.000Z', leaguePoints: 26 },
      { capturedAt: '2026-05-23T00:00:00.000Z', leaguePoints: 29 },
    ],
  },
  {
    tagLine: 'br1',
    gameName: 'Pistola Torta',
    region: 'br1',
    pdlHistory: [
      { capturedAt: '2026-05-17T00:00:00.000Z', leaguePoints: 72 },
      { capturedAt: '2026-05-18T00:00:00.000Z', leaguePoints: 75 },
      { capturedAt: '2026-05-19T00:00:00.000Z', leaguePoints: 74 },
      { capturedAt: '2026-05-20T00:00:00.000Z', leaguePoints: 79 },
      { capturedAt: '2026-05-21T00:00:00.000Z', leaguePoints: 84 },
      { capturedAt: '2026-05-22T00:00:00.000Z', leaguePoints: 86 },
      { capturedAt: '2026-05-23T00:00:00.000Z', leaguePoints: 90 },
    ],
  },
];

/**
 * Get all preset summoners
 */
export function getPresetSummoners(): PresetSummoner[] {
  return [...PRESET_SUMMONERS];
}

/**
 * Get preset summoner by riot ID (gameName#tagLine)
 */
export function getPresetSummonerByRiotId(
  gameName: string,
  tagLine: string
): PresetSummoner | undefined {
  return PRESET_SUMMONERS.find(
    (s) => s.gameName === gameName && s.tagLine === tagLine
  );
}

/**
 * Check if a summoner is a preset
 */
export function isPresetSummoner(gameName: string, tagLine: string): boolean {
  return PRESET_SUMMONERS.some(
    (s) => s.gameName === gameName && s.tagLine === tagLine
  );
}
