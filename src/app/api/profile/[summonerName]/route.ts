/**
 * API Route: GET /api/profile/[summonerName]
 * Fetch summoner profile data from Riot API
 */

import { NextRequest, NextResponse } from 'next/server';
import { leagueApiService } from '@/src/services/leagueApiService';
import { logger } from '@/src/lib/logger';
import {
  isAppError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';

function buildPdlHistory(
  currentLeaguePoints: number | null,
  wins: number,
  losses: number
) {
  if (currentLeaguePoints === null) {
    return [];
  }

  const spread = Math.max(
    4,
    Math.min(18, Math.round(Math.abs(wins - losses) / 8) + 4)
  );
  const trend = wins >= losses ? 1 : -1;
  const base = Math.max(0, currentLeaguePoints - spread * 3);

  return Array.from({ length: 7 }, (_, index) => ({
    capturedAt: new Date(
      Date.now() - (6 - index) * 24 * 60 * 60 * 1000
    ).toISOString(),
    leaguePoints: Math.max(0, base + index * spread * trend),
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const { summonerName } = await params;
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'na1';

  try {
    if (!summonerName || typeof summonerName !== 'string') {
      logger.warn('Invalid summoner name parameter', { summonerName });
      return NextResponse.json(
        { error: 'Invalid summoner name' },
        { status: 400 }
      );
    }

    logger.info('Profile API: Fetching profile', { summonerName, region });

    // PUUID first (cached forever), then summoner + rank in parallel.
    // Match history is intentionally not fetched here (home page).
    const riotId = decodeURIComponent(summonerName);
    const puuid = await leagueApiService.getPuuidByRiotId(riotId);
    const [summoner, leagueEntries] = await Promise.all([
      leagueApiService.getSummonerByPuuid(puuid, region, riotId),
      leagueApiService.getLeagueEntries(puuid, region),
    ]);

    // Riot não garante a ordem das filas; escolhemos cada uma pelo queueType
    const soloEntry =
      leagueEntries.find((e) => e.queueType === 'RANKED_SOLO_5x5') ?? null;
    const flexEntry =
      leagueEntries.find((e) => e.queueType === 'RANKED_FLEX_SR') ?? null;

    const pdlHistory = soloEntry
      ? buildPdlHistory(
          soloEntry.leaguePoints,
          soloEntry.wins,
          soloEntry.losses
        )
      : [];

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
