/**
 * Paginated match history (from /api/matches), most recent first
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { GameResumeMatch } from '@/src/components/game-resume-card';
import { getJson, retryUnlessRateLimited } from './api-client';

export interface MatchHistoryPage {
  matches: GameResumeMatch[];
  count: number;
  nextStart: number;
  hasMore: boolean;
}

export function useMatchHistoryQuery(
  riotId: string,
  region: string,
  pageSize = 10
) {
  return useInfiniteQuery({
    queryKey: ['match-history', riotId, region, pageSize],
    initialPageParam: 0,
    // Finished matches never change
    staleTime: RIOT_API_CONSTANTS.CACHE_TTL.MATCH_DETAILS,
    retry: retryUnlessRateLimited,
    queryFn: ({ pageParam }) =>
      getJson<MatchHistoryPage>(
        `/api/matches/${encodeURIComponent(riotId)}?region=${encodeURIComponent(region)}&start=${pageParam}&count=${pageSize}`
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextStart : undefined,
  });
}
