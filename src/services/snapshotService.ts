/**
 * Daily PDL snapshots (server only): one row per player/queue/day, where the
 * day is the calendar day in Brasília. Written on every fresh Riot read of a
 * group player (profileService) and finally by the 23:55 cron.
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

/** Calendar day in Brasília, as the UTC midnight stored in snapshotDate */
export function brasiliaDate(date = new Date()): Date {
  return new Date(`${brasiliaDay.format(date)}T00:00:00Z`);
}

/** Upserts today's row for each ranked queue; returns how many were saved */
export async function saveSnapshot(
  playerId: string,
  entries: (LeagueEntry | null)[]
): Promise<number> {
  const snapshotDate = brasiliaDate();
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

export type PdlHistoryPoint = { capturedAt: string; leaguePoints: number };

/** Last `days` daily snapshots for a player and queue, oldest first */
export async function getPdlHistory(
  gameName: string,
  tagLine: string,
  queueType: string = RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO,
  days = 30
): Promise<PdlHistoryPoint[]> {
  const since = brasiliaDate(new Date(Date.now() - days * 86_400_000));
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
