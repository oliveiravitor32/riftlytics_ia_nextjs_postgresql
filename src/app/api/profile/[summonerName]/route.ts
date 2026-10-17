/**
 * API Route: GET /api/profile/[summonerName]
 * Fetch summoner profile data from Riot API
 */

import { NextRequest, NextResponse } from 'next/server';
import { leagueApiService } from '@/src/services/leagueApiService';
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
  const region = searchParams.get('region') || 'na1';

  try {
    logger.info('Profile API: Fetching profile', { summonerName, region });

    // PUUID first (cached forever), then summoner + rank in parallel.
    // Match history is intentionally not fetched here (home page).
    const riotId = decodeURIComponent(summonerName);
    const puuid = await leagueApiService.getPuuidByRiotId(riotId);
    const [gameName, tagLine = ''] = riotId.split('#');
    const [summoner, leagueEntries, pdlHistory] = await Promise.all([
      leagueApiService.getSummonerByPuuid(puuid, region, riotId),
      leagueApiService.getLeagueEntries(puuid, region),
      // Real daily snapshots from the DB (empty until the cron has run)
      getPdlHistory(gameName, tagLine),
    ]);

    // Riot não garante a ordem das filas; escolhemos cada uma pelo queueType
    const soloEntry =
      leagueEntries.find((e) => e.queueType === 'RANKED_SOLO_5x5') ?? null;
    const flexEntry =
      leagueEntries.find((e) => e.queueType === 'RANKED_FLEX_SR') ?? null;

    const profile = {
      ...summoner,
      rankInfo: soloEntry,
      flexRankInfo: flexEntry,
      pdlHistory,
    };

    logger.info('Profile API: Profile fetched successfully', {
      summonerName,
      region,
    });

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
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
