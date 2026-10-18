/**
 * Matches of group players, stored in the DB (server only).
 * A finished match never changes, so it is fetched from Riot once and read
 * from the DB forever after. New matches come in when a profile opens (its
 * newest IDs), on "Atualizar" and in the daily close; profile pages and
 * stats are read from the DB.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { NotFoundError } from '@/src/lib/errors';
import { leagueApiService } from '@/src/services/leagueApiService';
import {
  buildGameResumeMatch,
  championImage,
  roleLabel,
} from '@/src/lib/match-transformers';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { Prisma } from '@/src/generated/prisma/client';
import type { Match } from '@/src/lib/validators';
import type { GameResumeMatch } from '@/src/components/game-resume-card';

// Riot returns at most 100 ids per call; smaller pages stop sooner at a known id
const ID_PAGE = 20;
// Details fetched together; the shared limiter still paces them
const DETAIL_BATCH = 5;

type GroupPlayer = { id: string; puuid: string };

/** Adds a line for every group member who played in the match */
async function linkMembers(match: Match): Promise<void> {
  const members = await prisma.player.findMany({
    where: { puuid: { in: match.metadata.participants } },
    select: { id: true, puuid: true },
  });

  await prisma.playerMatch.createMany({
    skipDuplicates: true,
    data: members.map(({ id, puuid }) => {
      const p = match.info.participants.find((x) => x.puuid === puuid)!;
      return {
        playerId: id,
        matchId: match.metadata.matchId,
        playedAt: new Date(match.info.gameStartTimestamp),
        queueId: match.info.queueId,
        championName: p.championName,
        position: p.teamPosition || p.individualPosition || '',
        win: p.win,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
      };
    }),
  });
}

/** Match by id: DB first, otherwise Riot (then stored, with its members) */
export async function getMatch(matchId: string): Promise<Match> {
  const stored = await prisma.match.findUnique({ where: { id: matchId } });
  if (stored) return stored.data as unknown as Match;

  const match = await leagueApiService.getMatchDetails(matchId);
  await prisma.match.upsert({
    where: { id: matchId },
    update: {},
    create: {
      id: matchId,
      queueId: match.info.queueId,
      gameCreation: new Date(match.info.gameCreation),
      gameDuration: match.info.gameDuration,
      data: match as unknown as Prisma.InputJsonValue,
    },
  });
  await linkMembers(match);
  return match;
}

/**
 * Stores matches oldest first: if a run is cut short, what is missing is
 * always the newest block, which the next sync (newest down) fills in.
 */
async function storeAll(ids: string[]): Promise<void> {
  const oldestFirst = [...ids].reverse();
  for (let i = 0; i < oldestFirst.length; i += DETAIL_BATCH) {
    await Promise.all(
      oldestFirst.slice(i, i + DETAIL_BATCH).map(async (id) => {
        // A match stored through a teammate may still miss this player's line
        await linkMembers(await getMatch(id));
      })
    );
  }
}

async function groupPlayer(where: Prisma.PlayerWhereInput) {
  const player = await prisma.player.findFirst({ where });
  if (!player) throw new NotFoundError('Player', { where });
  if (player.puuid) return { ...player, puuid: player.puuid };

  const puuid = await leagueApiService.getPuuidByRiotId(
    `${player.gameName}#${player.tagLine}`
  );
  await prisma.player.update({ where: { id: player.id }, data: { puuid } });
  return { ...player, puuid };
}

function byRiotId(riotId: string): Prisma.PlayerWhereInput {
  const [gameName, tagLine = ''] = riotId.split('#');
  return {
    gameName: { equals: gameName, mode: 'insensitive' },
    tagLine: { equals: tagLine, mode: 'insensitive' },
  };
}

async function newMatchIds(player: GroupPlayer, max: number, fresh: boolean) {
  const unknown: string[] = [];
  for (let start = 0; start < max; start += ID_PAGE) {
    const count = Math.min(ID_PAGE, max - start);
    const ids = await leagueApiService.getMatchList(
      player.puuid,
      start,
      count,
      { fresh }
    );
    const known = new Set(
      (
        await prisma.playerMatch.findMany({
          where: { playerId: player.id, matchId: { in: ids } },
          select: { matchId: true },
        })
      ).map((r) => r.matchId)
    );
    const firstKnown = ids.findIndex((id) => known.has(id));
    unknown.push(...(firstKnown === -1 ? ids : ids.slice(0, firstKnown)));
    if (firstKnown !== -1 || ids.length < count) break;
  }
  return unknown;
}

/**
 * Stores the player's matches newer than the last stored one (up to `max`
 * ids back), reading Riot's id list fresh. Used by the daily close and
 * "Atualizar". Returns how many were added.
 */
export async function syncNewMatches(
  playerId: string,
  max: number = RIOT_API_CONSTANTS.DEFAULTS.MAX_MATCHES
): Promise<number> {
  const player = await groupPlayer({ id: playerId });
  const ids = await newMatchIds(player, max, true);
  await storeAll(ids);
  return ids.length;
}

/**
 * When a profile opens: the newest ids (10-min cache), storing the missing
 * ones, so its page and stats include recent games.
 */
export async function syncRecentMatches(riotId: string): Promise<void> {
  const player = await groupPlayer(byRiotId(riotId));
  await storeAll(
    await newMatchIds(
      player,
      RIOT_API_CONSTANTS.DEFAULTS.PROFILE_SYNC_MATCHES,
      false
    )
  );
}

function readPage(playerId: string, start: number, take: number) {
  return prisma.playerMatch.findMany({
    where: { playerId },
    orderBy: { playedAt: 'desc' },
    skip: start,
    take,
    select: { match: { select: { data: true } } },
  });
}

export type ProfileMatchesPage = {
  matches: GameResumeMatch[];
  hasMore: boolean;
};

/**
 * A page of a group player's history. The first page brings in new matches
 * from Riot; later pages come from the DB, and only past the stored history
 * does it continue from Riot (storing what it reads).
 */
export async function getProfileMatches(
  riotId: string,
  start: number,
  count: number
): Promise<ProfileMatchesPage> {
  if (start === 0) await syncRecentMatches(riotId);
  const player = await groupPlayer(byRiotId(riotId));

  // One extra row tells whether there is a next page
  let rows = await readPage(player.id, start, count + 1);
  if (rows.length <= count) {
    // The DB holds the newest matches without gaps, so its positions match Riot's
    await storeAll(
      await leagueApiService.getMatchList(player.puuid, start, count + 1)
    );
    rows = await readPage(player.id, start, count + 1);
  }

  return {
    matches: rows
      .slice(0, count)
      .map((r) =>
        buildGameResumeMatch(
          r.match.data as unknown as Match,
          player.puuid,
          riotId
        )
      ),
    hasMore: rows.length > count,
  };
}

export type ChampionStats = {
  champion: string;
  image: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
};

export type MatchStats = {
  total: number;
  champions: ChampionStats[];
  roles: { role: string; games: number }[];
};

/** Top champions and role split over every stored match of the player */
export async function getMatchStats(riotId: string): Promise<MatchStats> {
  const rows = await prisma.playerMatch.findMany({
    where: { player: byRiotId(riotId) },
    select: {
      championName: true,
      position: true,
      win: true,
      kills: true,
      deaths: true,
      assists: true,
    },
  });

  const champions = new Map<string, ChampionStats>();
  const roles = new Map<string, number>();
  for (const r of rows) {
    const c = champions.get(r.championName) ?? {
      champion: r.championName,
      image: championImage(r.championName),
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    c.games++;
    c.wins += r.win ? 1 : 0;
    c.kills += r.kills;
    c.deaths += r.deaths;
    c.assists += r.assists;
    champions.set(r.championName, c);
    const role = roleLabel(r.position);
    roles.set(role, (roles.get(role) ?? 0) + 1);
  }

  return {
    total: rows.length,
    champions: [...champions.values()]
      .sort((a, b) => b.games - a.games)
      .slice(0, 5),
    roles: [...roles.entries()]
      .map(([role, games]) => ({ role, games }))
      .sort((a, b) => b.games - a.games),
  };
}
