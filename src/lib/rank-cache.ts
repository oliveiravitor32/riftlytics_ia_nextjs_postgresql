/**
 * In-memory server cache for /api/rank (per server instance)
 */

import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';

export type RankResponse = {
  name: string;
  rankInfo: LeagueEntry | null;
  flexRankInfo: LeagueEntry | null;
  fetchedAt: string;
};

const cache = new Map<string, { data: RankResponse; expiresAt: number }>();

export function getCachedRank(key: string): RankResponse | null {
  const hit = cache.get(key);
  return hit && hit.expiresAt > Date.now() ? hit.data : null;
}

export function setCachedRank(key: string, data: RankResponse) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + RIOT_API_CONSTANTS.CACHE_TTL.RANKING,
  });
}

export function clearRankCache() {
  cache.clear();
}
