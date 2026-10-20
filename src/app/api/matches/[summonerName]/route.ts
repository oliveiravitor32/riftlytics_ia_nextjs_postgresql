/**
 * API Route: GET /api/matches/[summonerName]
 * Paginated match history cards of a group player, read from the DB
 * (the first page also brings in new matches from Riot)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProfileMatches } from '@/src/services/matchService';
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
  const region =
    searchParams.get('region') || RIOT_API_CONSTANTS.DEFAULT_REGION;
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
    const riotId = decodeURIComponent(summonerName);
    const { matches, hasMore } = await getProfileMatches(
      riotId,
      start,
      requestedCount
    );

    const response = {
      matches,
      count: matches.length,
      nextStart: start + matches.length,
      hasMore,
    };

    logger.info('Matches API: Match history fetched successfully', {
      summonerName,
      region,
      start,
      count: matches.length,
    });

    return NextResponse.json(response);
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
