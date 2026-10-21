/**
 * A fake, deterministic Riot "world" for the tests: invented players and
 * matches built on the documented response shapes (src/types/riot-api.ts).
 * Only the structure mirrors Riot; names and numbers are made up.
 *
 * Players cover the cases the app handles: ranked in both queues, Solo/Duo
 * only, unranked, and an account below level 30. Some matches have two group
 * members (duo), on the same team.
 */

import { createHash } from 'node:crypto';
import type {
  AccountDto,
  LeagueEntryDto,
  MatchDto,
  ParticipantDto,
  SummonerDto,
  TeamDto,
} from '@/src/types/riot-api';

export type MockPlayer = {
  gameName: string;
  tagLine: string;
  level: number;
  solo?: Pick<
    LeagueEntryDto,
    'tier' | 'rank' | 'leaguePoints' | 'wins' | 'losses'
  >;
  flex?: Pick<
    LeagueEntryDto,
    'tier' | 'rank' | 'leaguePoints' | 'wins' | 'losses'
  >;
  /** Plays match number k (0 = newest) of the world */
  plays: (k: number) => boolean;
  /** Exists on Riot but isn't one of the group's tracked players */
  outsider?: boolean;
};

export const MOCK_PLAYERS: MockPlayer[] = [
  {
    gameName: 'Alfa',
    tagLine: 'TST',
    level: 312,
    solo: {
      tier: 'EMERALD',
      rank: 'II',
      leaguePoints: 58,
      wins: 143,
      losses: 133,
    },
    flex: {
      tier: 'PLATINUM',
      rank: 'I',
      leaguePoints: 12,
      wins: 51,
      losses: 43,
    },
    plays: (k) => k < 130,
  },
  {
    gameName: 'Bravo',
    tagLine: 'TST',
    level: 187,
    solo: { tier: 'GOLD', rank: 'III', leaguePoints: 75, wins: 60, losses: 64 },
    plays: (k) => k % 2 === 0,
  },
  {
    gameName: 'Charlie Delta',
    tagLine: 'TST2',
    level: 96,
    plays: (k) => k % 5 === 0,
  },
  {
    gameName: 'Echo',
    tagLine: 'TST',
    level: 24,
    plays: (k) => k % 3 === 1 && k < 90,
  },
  {
    gameName: 'Forasteiro',
    tagLine: 'FORA',
    level: 150,
    solo: { tier: 'SILVER', rank: 'I', leaguePoints: 30, wins: 20, losses: 25 },
    plays: (k) => k % 7 === 3,
    outsider: true,
  },
];

/** The group's tracked players (seeded into the test database) */
export const GROUP = MOCK_PLAYERS.filter((p) => !p.outsider);

/** "gameName#tagLine" of a mock player */
export const riotIdOf = (p: MockPlayer) => `${p.gameName}#${p.tagLine}`;

/** Matches in the world (k = 0 is the newest) */
export const MATCH_COUNT = 260;

/** Patch of every fake match, and Data Dragon's version list (newest first) */
export const MATCH_GAME_VERSION = '15.20.710.4560';
export const DDRAGON_VERSIONS = [
  '15.21.1',
  '15.20.1',
  '15.19.1',
  'lolpatch_7.20',
];
const FIRST_MATCH_ID = 3_100_000_000;
const HOUR = 3_600_000;
// Newest game ended an hour ago (rounded so a run sees one fixed history)
const NEWEST_START = Math.floor(Date.now() / HOUR) * HOUR - 2 * HOUR;

const CHAMPIONS: [number, string][] = [
  [55, 'Katarina'],
  [157, 'Yasuo'],
  [222, 'Jinx'],
  [64, 'LeeSin'],
  [412, 'Thresh'],
  [86, 'Garen'],
  [62, 'MonkeyKing'],
  [103, 'Ahri'],
];
const POSITIONS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
const QUEUES = [420, 420, 440, 400, 450];

/** Riot PUUIDs are opaque 78-character strings */
export function puuidOf(gameName: string, tagLine: string): string {
  const hash = createHash('sha256')
    .update(`${gameName}#${tagLine}`.toLowerCase())
    .digest('base64url');
  return (hash + hash + hash).slice(0, 78);
}

export const matchIdOf = (k: number) => `BR1_${FIRST_MATCH_ID - k}`;

export function playerByRiotId(gameName: string, tagLine: string) {
  return MOCK_PLAYERS.find(
    (p) =>
      p.gameName.toLowerCase() === gameName.toLowerCase() &&
      p.tagLine.toLowerCase() === tagLine.toLowerCase()
  );
}

export function playerByPuuid(puuid: string) {
  return MOCK_PLAYERS.find((p) => puuidOf(p.gameName, p.tagLine) === puuid);
}

export function account(player: MockPlayer): AccountDto {
  return {
    puuid: puuidOf(player.gameName, player.tagLine),
    gameName: player.gameName,
    tagLine: player.tagLine,
  };
}

export function summoner(player: MockPlayer): SummonerDto {
  return {
    puuid: puuidOf(player.gameName, player.tagLine),
    profileIconId: 4000 + player.level,
    revisionDate: NEWEST_START,
    summonerLevel: player.level,
  };
}

export function leagueEntries(player: MockPlayer): LeagueEntryDto[] {
  const puuid = puuidOf(player.gameName, player.tagLine);
  const entry = (
    queueType: LeagueEntryDto['queueType'],
    data: NonNullable<MockPlayer['solo']>
  ): LeagueEntryDto => ({
    puuid,
    queueType,
    ...data,
    hotStreak: false,
    veteran: false,
    freshBlood: false,
    inactive: false,
  });
  return [
    ...(player.solo ? [entry('RANKED_SOLO_5x5', player.solo)] : []),
    ...(player.flex ? [entry('RANKED_FLEX_SR', player.flex)] : []),
  ];
}

/** Ids of the player's matches, newest first */
export function matchIdsOf(
  player: MockPlayer
): { id: string; startedAt: number }[] {
  const ids = [];
  for (let k = 0; k < MATCH_COUNT; k++) {
    if (player.plays(k)) ids.push({ id: matchIdOf(k), startedAt: startOf(k) });
  }
  return ids;
}

const startOf = (k: number) => NEWEST_START - k * 5 * HOUR;

function participant(
  k: number,
  slot: number,
  identity: { puuid: string; gameName: string; tagLine: string; level: number }
): ParticipantDto {
  const teamId = slot < 5 ? 100 : 200;
  const [championId, championName] = CHAMPIONS[(k + slot) % CHAMPIONS.length];
  const position = POSITIONS[slot % 5];
  // Blue side wins two games out of three
  const win = (teamId === 100) === (k % 3 !== 2);
  return {
    puuid: identity.puuid,
    riotIdGameName: identity.gameName,
    riotIdTagline: identity.tagLine,
    summonerName: '',
    summonerLevel: identity.level,
    profileIcon: 4000 + slot,
    participantId: slot + 1,
    teamId,
    win,
    championId,
    championName,
    champLevel: 14 + (slot % 5),
    teamPosition: position,
    individualPosition: position,
    lane: position,
    role: 'SOLO',
    kills: (k + slot * 3) % 12,
    deaths: ((k * 7 + slot) % 9) + (slot === 4 ? 0 : 1),
    assists: (k + slot * 5) % 15,
    totalMinionsKilled: 120 + ((k + slot) % 80),
    neutralMinionsKilled: slot === 1 ? 140 : 8,
    goldEarned: 9000 + slot * 350,
    totalDamageDealtToChampions: 12000 + ((k * 13 + slot * 1700) % 20000),
    visionScore: 10 + slot * 4,
    summoner1Id: 4,
    summoner2Id: slot === 1 ? 11 : 14,
    item0: 3031,
    item1: 3006,
    item2: 3046,
    item3: 0,
    item4: 1055,
    item5: 0,
    item6: 3340,
    perks: {
      statPerks: { defense: 5001, flex: 5008, offense: 5005 },
      styles: [
        {
          description: 'primaryStyle',
          selections: [{ perk: 8010, var1: 0, var2: 0, var3: 0 }],
          style: 8000,
        },
        {
          description: 'subStyle',
          selections: [{ perk: 8304, var1: 0, var2: 0, var3: 0 }],
          style: 8300,
        },
      ],
    },
    gameEndedInSurrender: false,
    gameEndedInEarlySurrender: false,
  };
}

function team(teamId: number, win: boolean): TeamDto {
  const objective = (kills: number) => ({ first: win, kills });
  return {
    bans: [{ championId: 266, pickTurn: teamId === 100 ? 1 : 6 }],
    objectives: {
      baron: objective(win ? 1 : 0),
      champion: objective(win ? 30 : 18),
      dragon: objective(win ? 3 : 1),
      horde: objective(3),
      inhibitor: objective(win ? 2 : 0),
      riftHerald: objective(1),
      tower: objective(win ? 9 : 3),
    },
    teamId,
    win,
  };
}

/** Full match k, or undefined if no such match */
export function match(matchId: string): MatchDto | undefined {
  const k = FIRST_MATCH_ID - Number(matchId.replace(/^BR1_/, ''));
  if (!Number.isInteger(k) || k < 0 || k >= MATCH_COUNT) return undefined;

  // Group members first (same team), strangers fill the rest
  const members = MOCK_PLAYERS.filter((p) => p.plays(k)).map((p) => ({
    puuid: puuidOf(p.gameName, p.tagLine),
    gameName: p.gameName,
    tagLine: p.tagLine,
    level: p.level,
  }));
  const strangers = Array.from({ length: 10 - members.length }, (_, i) => {
    const gameName = `Rival ${k}-${i + 1}`;
    return {
      puuid: puuidOf(gameName, 'RVL'),
      gameName,
      tagLine: 'RVL',
      level: 100 + i,
    };
  });
  const participants = [...members, ...strangers].map((who, slot) =>
    participant(k, slot, who)
  );
  const start = startOf(k);
  const duration = 1500 + (k % 7) * 120;
  const blueWins = participants[0].win;

  return {
    metadata: {
      dataVersion: '2',
      matchId,
      participants: participants.map((p) => p.puuid),
    },
    info: {
      endOfGameResult: 'GameComplete',
      gameCreation: start - 60_000,
      gameDuration: duration,
      gameEndTimestamp: start + duration * 1000,
      gameId: FIRST_MATCH_ID - k,
      gameMode: QUEUES[k % QUEUES.length] === 450 ? 'ARAM' : 'CLASSIC',
      gameName: `teambuilder-match-${FIRST_MATCH_ID - k}`,
      gameStartTimestamp: start,
      gameType: 'MATCHED_GAME',
      gameVersion: MATCH_GAME_VERSION,
      mapId: QUEUES[k % QUEUES.length] === 450 ? 12 : 11,
      participants,
      platformId: 'BR1',
      queueId: QUEUES[k % QUEUES.length],
      teams: [team(100, blueWins), team(200, !blueWins)],
      tournamentCode: '',
    },
  };
}
