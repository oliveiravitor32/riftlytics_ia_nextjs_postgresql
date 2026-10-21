/**
 * Each player's 3 most played champions over their last 100 stored matches
 * (server only), for the home cards and the ranking. Not the season: the
 * stored history doesn't go back that far for everyone, while the last 100
 * measures every player the same way. Cached for a day; no Riot calls.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { cached } from '@/src/lib/cache';
import { championImage } from '@/src/lib/match-transformers';
import { latestDataDragonVersion } from '@/src/services/dataDragonService';

export type TopChampion = { champion: string; image: string; games: number };

export const TOP_CHAMPIONS_WINDOW = 100;
export const TOP_CHAMPIONS_CACHE_KEY = 'top-champions';
const CACHE_SECONDS = 60 * 60 * 24;

/** Top 3 by player id */
export async function getTopChampions(): Promise<
  Record<string, TopChampion[]>
> {
  const { value } = await cached(
    TOP_CHAMPIONS_CACHE_KEY,
    CACHE_SECONDS,
    async () => {
      const [players, version] = await Promise.all([
        prisma.player.findMany({
          where: { active: true },
          select: {
            id: true,
            matches: {
              orderBy: { playedAt: 'desc' },
              take: TOP_CHAMPIONS_WINDOW,
              select: { championName: true },
            },
          },
        }),
        latestDataDragonVersion(),
      ]);

      const top: Record<string, TopChampion[]> = {};
      for (const p of players) {
        const games = new Map<string, number>();
        for (const m of p.matches) {
          games.set(m.championName, (games.get(m.championName) ?? 0) + 1);
        }
        top[p.id] = [...games]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([champion, n]) => ({
            champion,
            image: championImage(champion, version),
            games: n,
          }));
      }
      return top;
    }
  );
  return value;
}
