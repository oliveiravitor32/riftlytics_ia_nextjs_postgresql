/**
 * Daily close (server only): the day's final PDL snapshot and the new matches
 * of every group player. Run by /api/cron/fechamento at the end of the day.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { logger } from '@/src/lib/logger';
import { captureDailySnapshots } from '@/src/services/profileService';
import { fillHistory, syncNewMatches } from '@/src/services/matchService';

export type DailyCloseResult = {
  players: number;
  snapshots: number;
  matches: number;
  failed: { player: string; step: 'pdl' | 'partidas'; error: string }[];
};

export async function closeDay(): Promise<DailyCloseResult> {
  const pdl = await captureDailySnapshots();
  const result: DailyCloseResult = {
    players: pdl.players,
    snapshots: pdl.snapshots,
    matches: 0,
    failed: pdl.failed.map((f) => ({ ...f, step: 'pdl' })),
  };

  const players = await prisma.player.findMany({ where: { active: true } });
  // One player at a time: in parallel they all wait on the same Riot quota
  // and the later ones would give up before their turn
  for (const player of players) {
    const riotId = `${player.gameName}#${player.tagLine}`;
    try {
      result.matches += await syncNewMatches(player.id);
      result.matches += await fillHistory(player.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Match sync failed', { riotId, error: message });
      result.failed.push({ player: riotId, step: 'partidas', error: message });
    }
  }

  logger.info('Day closed', { ...result });
  return result;
}

/** Players for whom nothing worked (PDL and matches both failed) */
export function playersFullyFailed(result: DailyCloseResult): number {
  const byPlayer = new Map<string, number>();
  for (const f of result.failed) {
    byPlayer.set(f.player, (byPlayer.get(f.player) ?? 0) + 1);
  }
  return [...byPlayer.values()].filter((steps) => steps === 2).length;
}
