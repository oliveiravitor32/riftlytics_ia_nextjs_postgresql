/**
 * API Route: GET /api/matches/[summonerName]
 * Fetch paginated match history cards for a profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { leagueApiService } from '@/src/services/leagueApiService';
import { logger } from '@/src/lib/logger';
import {
  isAppError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';

function intParam(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const { summonerName } = await params;
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'na1';
  // Non-numeric values fall back to the defaults (never NaN to Riot)
  const start = Math.max(0, intParam(searchParams.get('start'), 0));
  const requestedCount = Math.max(
    1,
    Math.min(
      RIOT_API_CONSTANTS.DEFAULTS.MATCHES_PER_PAGE,
      intParam(searchParams.get('count'), 10)
    )
  );

  try {
    // Only the PUUID is needed (cached forever), not the full summoner
    const riotId = decodeURIComponent(summonerName);
    const puuid = await leagueApiService.getPuuidByRiotId(riotId);

    const matches = await leagueApiService.getMatchHistoryByPuuid(
      puuid,
      start,
      requestedCount,
      riotId
    );

    const response = {
      matches,
      count: matches.length,
      nextStart: start + matches.length,
      hasMore: matches.length === requestedCount,
    };

    logger.info('Matches API: Match history fetched successfully', {
      summonerName,
      region,
      start,
      count: matches.length,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);

    logger.error('Matches API: Error', {
      summonerName,
      region,
      start,
      error: message,
      statusCode,
    });

    return NextResponse.json(
      {
        error: message,
        ...(isAppError(error) && { context: error.context }),
      },
      { status: statusCode }
    );
  }
}
