/**
 * Rank queries for the ranking page (10-minute cache, shared with the server)
 */

import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';
import { getJson, postJson, retryUnlessRateLimited } from './api-client';

/** What /api/rank returns */
export type RankResponse = {
  name: string;
  rankInfo: LeagueEntry | null;
  flexRankInfo: LeagueEntry | null;
  fetchedAt: string;
};

export function fetchRank(
  riotId: string,
  region: string
): Promise<RankResponse> {
  return getJson(
    `/api/rank/${encodeURIComponent(riotId)}?region=${encodeURIComponent(region)}`
  );
}

/** Forced reload (server allows one per player every 2 minutes) */
export function refreshRank(riotId: string): Promise<RankResponse> {
  return postJson(`/api/refresh/${encodeURIComponent(riotId)}`);
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
