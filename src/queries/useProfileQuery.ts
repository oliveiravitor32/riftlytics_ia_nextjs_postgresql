/**
 * Profile of a player for the home cards: summoner, Solo/Flex rank and the
 * stored PDL history (from /api/profile)
 */

import { useQuery } from '@tanstack/react-query';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';
import type { PdlHistoryPoint } from '@/src/components/pdl-chart';
import { getJson, retryUnlessRateLimited } from './api-client';

/** What /api/profile returns */
export type ProfileResponse = {
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  rankInfo: LeagueEntry | null;
  flexRankInfo: LeagueEntry | null;
  pdlHistory: PdlHistoryPoint[];
};

export function useProfileQuery(riotId: string, region: string) {
  return useQuery({
    queryKey: ['profile', riotId, region],
    queryFn: () =>
      getJson<ProfileResponse>(
        `/api/profile/${encodeURIComponent(riotId)}?region=${encodeURIComponent(region)}`
      ),
    staleTime: RIOT_API_CONSTANTS.CACHE_TTL.RANKING,
    retry: retryUnlessRateLimited,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
  });
}
