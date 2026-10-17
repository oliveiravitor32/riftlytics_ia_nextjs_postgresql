/**
 * Ranked profile (summoner + Solo/Duo and Flex entries), server only.
 * Shared by /api/profile, /api/rank and the profile page, cached 5 minutes
 * per server instance so tab switches and reloads don't hit Riot again.
 */

import 'server-only';
import { leagueApiService } from '@/src/services/leagueApiService';
import { TtlCache } from '@/src/lib/ttl-cache';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';

export type RankedProfile = {
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  rankInfo: LeagueEntry | null;
  flexRankInfo: LeagueEntry | null;
  fetchedAt: string;
};

const cache = new TtlCache<RankedProfile>(RIOT_API_CONSTANTS.CACHE_TTL.RANKING);

export function clearProfileCache(): void {
  cache.clear();
}

export async function getRankedProfile(
  riotId: string,
  region: string,
  { refresh = false } = {}
): Promise<{ profile: RankedProfile; cached: boolean }> {
  const key = `${region}:${riotId.toLowerCase()}`;
  const hit = refresh ? undefined : cache.get(key);
  if (hit) return { profile: hit, cached: true };

  const puuid = await leagueApiService.getPuuidByRiotId(riotId);
  const [summoner, entries] = await Promise.all([
    leagueApiService.getSummonerByPuuid(puuid, region, riotId),
    leagueApiService.getLeagueEntries(puuid, region),
  ]);
  const byQueue = (queue: string) =>
    entries.find((e) => e.queueType === queue) ?? null;

  const profile: RankedProfile = {
    puuid,
    name: summoner.name,
    profileIconId: summoner.profileIconId,
    summonerLevel: summoner.summonerLevel,
    rankInfo: byQueue(RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO),
    flexRankInfo: byQueue(RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR),
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, profile);
  return { profile, cached: false };
}
