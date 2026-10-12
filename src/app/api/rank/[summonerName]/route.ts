/**
 * API Route: GET /api/rank/[summonerName]
 * Lightweight rank lookup for the ranking page (no match history),
 * cached in memory so tab switches and reloads don't hit the Riot API.
 * `?refresh=1` bypasses the cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { leagueApiService } from '@/src/services/leagueApiService';
import { logger } from '@/src/lib/logger';
import {
  RateLimitError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import {
  getCachedRank,
  setCachedRank,
  type RankResponse,
} from '@/src/lib/rank-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const { summonerName } = await params;
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'na1';
  const refresh = searchParams.get('refresh') === '1';
  const riotId = decodeURIComponent(summonerName);
  const cacheKey = `${region}:${riotId.toLowerCase()}`;

  const cached = refresh ? null : getCachedRank(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const puuid = await leagueApiService.getPuuidByRiotId(riotId);
    const [summoner, entries] = await Promise.all([
      leagueApiService.getSummonerByPuuid(puuid, region, riotId),
      leagueApiService.getLeagueEntries(puuid, region),
    ]);

    const data: RankResponse = {
      name: summoner.name,
      rankInfo:
        entries.find(
          (e) => e.queueType === RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO
        ) ?? null,
      flexRankInfo:
        entries.find(
          (e) => e.queueType === RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR
        ) ?? null,
      fetchedAt: new Date().toISOString(),
    };

    setCachedRank(cacheKey, data);

    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    if (error instanceof RateLimitError) {
      logger.warn('Rank API: rate limited', { riotId, region });
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: error.message,
          retryAfter: error.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(error.retryAfter) },
        }
      );
    }

    const message = getErrorMessage(error);
    logger.error('Rank API: Error', { riotId, region, error: message });
    return NextResponse.json(
      { error: message },
      { status: getErrorStatusCode(error) }
    );
  }
}
