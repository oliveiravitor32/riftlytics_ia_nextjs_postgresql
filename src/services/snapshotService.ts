/**
 * Daily PDL snapshots (server only)
 * captureDailySnapshots() stores today's Solo/Duo and Flex rank for every
 * active player; getPdlHistory() reads them back for the charts.
 * One row per player/queue/day: re-running on the same day updates it.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { leagueApiService } from '@/src/services/leagueApiService';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { logger } from '@/src/lib/logger';

const QUEUES: string[] = [
  RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO,
  RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR,
];

/** Start of the UTC day: snapshots are keyed by day, not by exact time */
export function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export type SnapshotResult = {
  players: number;
  snapshots: number;
  failed: { player: string; error: string }[];
};

export async function captureDailySnapshots(): Promise<SnapshotResult> {
  const players = await prisma.player.findMany({ where: { active: true } });
  const capturedAt = startOfUtcDay();
  const result: SnapshotResult = {
    players: players.length,
    snapshots: 0,
    failed: [],
  };

  // Players run in parallel; the shared token bucket keeps Riot limits
  await Promise.all(
    players.map(async (player) => {
      const riotId = `${player.gameName}#${player.tagLine}`;
      try {
        const puuid =
          player.puuid ?? (await leagueApiService.getPuuidByRiotId(riotId));
        if (!player.puuid) {
          await prisma.player.update({
            where: { id: player.id },
            data: { puuid },
          });
        }

        const entries = await leagueApiService.getLeagueEntries(
          puuid,
          player.region
        );

        for (const entry of entries.filter((e) =>
          QUEUES.includes(e.queueType)
        )) {
          const data = {
            tier: entry.tier,
            rank: entry.rank,
            leaguePoints: entry.leaguePoints,
            wins: entry.wins,
            losses: entry.losses,
          };
          await prisma.pDLSnapshot.upsert({
            where: {
              playerId_queueType_capturedAt: {
                playerId: player.id,
                queueType: entry.queueType,
                capturedAt,
              },
            },
            update: data,
            create: {
              ...data,
              playerId: player.id,
              queueType: entry.queueType,
              capturedAt,
            },
          });
          result.snapshots++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Snapshot failed', { riotId, error: message });
        result.failed.push({ player: riotId, error: message });
      }
    })
  );

  logger.info('Daily snapshots captured', { ...result });
  return result;
}

export type PdlHistoryPoint = { capturedAt: string; leaguePoints: number };

/** Last `days` daily snapshots for a player and queue, oldest first */
export async function getPdlHistory(
  gameName: string,
  tagLine: string,
  queueType: string = RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO,
  days = 30
): Promise<PdlHistoryPoint[]> {
  const since = startOfUtcDay(new Date(Date.now() - days * 86_400_000));
  const rows = await prisma.pDLSnapshot.findMany({
    where: {
      queueType,
      capturedAt: { gte: since },
      player: {
        gameName: { equals: gameName, mode: 'insensitive' },
        tagLine: { equals: tagLine, mode: 'insensitive' },
      },
    },
    orderBy: { capturedAt: 'asc' },
    select: { capturedAt: true, leaguePoints: true },
  });

  return rows.map((r) => ({
    capturedAt: r.capturedAt.toISOString(),
    leaguePoints: r.leaguePoints,
  }));
}
