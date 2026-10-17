/**
 * Rank queries for the ranking page (5-minute cache, shared with the server)
 */

import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';
import { getJson, retryUnlessRateLimited } from './api-client';

/** What /api/rank returns */
export type RankResponse = {
  name: string;
  rankInfo: LeagueEntry | null;
  flexRankInfo: LeagueEntry | null;
  fetchedAt: string;
};

export function fetchRank(
  riotId: string,
  region: string,
  refresh = false
): Promise<RankResponse> {
  const params = new URLSearchParams({ region });
  if (refresh) params.set('refresh', '1');
  return getJson(`/api/rank/${encodeURIComponent(riotId)}?${params}`);
}

export function rankQueryOptions(riotId: string, region: string) {
  return {
    queryKey: ['rank', riotId, region],
    queryFn: () => fetchRank(riotId, region),
    staleTime: RIOT_API_CONSTANTS.CACHE_TTL.RANKING,
    gcTime: RIOT_API_CONSTANTS.CACHE_TTL.RANKING * 2,
    retry: retryUnlessRateLimited,
  };
}
