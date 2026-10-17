/**
 * API Route: GET /api/rank/[summonerName]
 * Rank only, for the ranking page. Shares the 5-minute profile cache with
 * /api/profile and the profile page; `?refresh=1` bypasses it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { getRankedProfile } from '@/src/services/profileService';
import { logger } from '@/src/lib/logger';
import {
  RateLimitError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';
import type { RankResponse } from '@/src/queries/useRankQuery';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const { summonerName } = await params;
  const { searchParams } = new URL(request.url);
  const region =
    searchParams.get('region') || RIOT_API_CONSTANTS.DEFAULT_REGION;
  const refresh = searchParams.get('refresh') === '1';
  const riotId = decodeURIComponent(summonerName);

  try {
    const { profile, cached } = await getRankedProfile(riotId, region, {
      refresh,
    });
    const data: RankResponse = {
      name: profile.name,
      rankInfo: profile.rankInfo,
      flexRankInfo: profile.flexRankInfo,
      fetchedAt: profile.fetchedAt,
    };
    return NextResponse.json(data, {
      headers: { 'X-Cache': cached ? 'HIT' : 'MISS' },
    });
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
