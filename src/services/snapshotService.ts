/**
 * Daily PDL snapshots (server only): one row per player/queue/day, where the
 * day is the game day (gameDay: 10:00 to 09:59 in Brasília). Written on every
 * fresh Riot read of a group player (profileService) and finally by the daily
 * close at 09:30.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';

const QUEUES: string[] = [
  RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO,
  RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR,
];

const brasiliaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
});

/**
 * Hour (Brasília) when a new day starts. The group plays past midnight, so a
 * calendar day would split one night of games in two.
 */
export const DAY_START_HOUR = 10;

/** Game day (10:00 to 09:59 in Brasília), as the UTC midnight stored in snapshotDate */
export function gameDay(date = new Date()): Date {
  const shifted = new Date(date.getTime() - DAY_START_HOUR * 3_600_000);
  return new Date(`${brasiliaDay.format(shifted)}T00:00:00Z`);
}

/** Upserts today's row for each ranked queue; returns how many were saved */
export async function saveSnapshot(
  playerId: string,
  entries: (LeagueEntry | null)[]
): Promise<number> {
  const snapshotDate = gameDay();
  const ranked = entries.filter(
    (e): e is LeagueEntry => e !== null && QUEUES.includes(e.queueType)
  );

  for (const entry of ranked) {
    const data = {
      capturedAt: new Date(),
      tier: entry.tier,
      rank: entry.rank,
      leaguePoints: entry.leaguePoints,
      wins: entry.wins,
      losses: entry.losses,
    };
    await prisma.pDLSnapshot.upsert({
      where: {
        playerId_queueType_snapshotDate: {
          playerId,
          queueType: entry.queueType,
          snapshotDate,
        },
      },
      update: data,
      create: { ...data, playerId, queueType: entry.queueType, snapshotDate },
    });
  }
  return ranked.length;
}

/** Today's summoner level (daily summary's countdown to level 30) */
export async function saveLevel(
  playerId: string,
  summonerLevel: number
): Promise<void> {
  const snapshotDate = gameDay();
  await prisma.levelSnapshot.upsert({
    where: { playerId_snapshotDate: { playerId, snapshotDate } },
    update: { summonerLevel, capturedAt: new Date() },
    create: { playerId, snapshotDate, summonerLevel },
  });
}

export type PdlHistoryPoint = { capturedAt: string; leaguePoints: number };

/** Last `days` daily snapshots for a player and queue, oldest first */
export async function getPdlHistory(
  gameName: string,
  tagLine: string,
  queueType: string = RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO,
  days = 30
): Promise<PdlHistoryPoint[]> {
  const since = gameDay(new Date(Date.now() - days * 86_400_000));
  const rows = await prisma.pDLSnapshot.findMany({
    where: {
      queueType,
      snapshotDate: { gte: since },
      player: {
        gameName: { equals: gameName, mode: 'insensitive' },
        tagLine: { equals: tagLine, mode: 'insensitive' },
      },
    },
    orderBy: { snapshotDate: 'asc' },
    select: { capturedAt: true, leaguePoints: true },
  });

  return rows.map((r) => ({
    capturedAt: r.capturedAt.toISOString(),
    leaguePoints: r.leaguePoints,
  }));
}
