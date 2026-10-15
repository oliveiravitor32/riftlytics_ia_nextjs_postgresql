/**
 * Tracked players, read from the database (server only)
 */

import 'server-only';
import { prisma } from '@/src/lib/db';

export type TrackedPlayer = {
  gameName: string;
  tagLine: string;
  region: string;
  displayName: string;
  avatarUrl: string | null;
};

export async function getActivePlayers(): Promise<TrackedPlayer[]> {
  return prisma.player.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
    select: {
      gameName: true,
      tagLine: true,
      region: true,
      displayName: true,
      avatarUrl: true,
    },
  });
}

/** Tracked player by Riot ID (case-insensitive), or null if not in the group */
export async function findTrackedPlayer(
  gameName: string,
  tagLine: string
): Promise<TrackedPlayer | null> {
  return prisma.player.findFirst({
    where: {
      gameName: { equals: gameName, mode: 'insensitive' },
      tagLine: { equals: tagLine, mode: 'insensitive' },
    },
    select: {
      gameName: true,
      tagLine: true,
      region: true,
      displayName: true,
      avatarUrl: true,
    },
  });
}
