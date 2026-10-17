/**
 * API Route: GET /api/profile/[summonerName]
 * Summoner + Solo/Flex rank (10-min shared cache in Redis) and the
 * stored PDL history. Match history is intentionally not fetched (home page).
 */

import { NextRequest, NextResponse } from 'next/server';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { getRankedProfile } from '@/src/services/profileService';
import { logger } from '@/src/lib/logger';
import { getPdlHistory } from '@/src/services/snapshotService';
import {
  isAppError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const { summonerName } = await params;
  const { searchParams } = new URL(request.url);
  const region =
    searchParams.get('region') || RIOT_API_CONSTANTS.DEFAULT_REGION;

  try {
    const riotId = decodeURIComponent(summonerName);
    const [gameName, tagLine = ''] = riotId.split('#');
    const { profile, cached } = await getRankedProfile(riotId, region);
    // Read after the profile: a cache miss has just updated today's snapshot
    const pdlHistory = await getPdlHistory(gameName, tagLine);

    return NextResponse.json(
      { ...profile, pdlHistory },
      {
        headers: {
          'X-Cache': cached ? 'HIT' : 'MISS',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    const message = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);

    logger.error('Profile API: Error', {
      summonerName,
      region,
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
