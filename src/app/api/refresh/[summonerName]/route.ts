/**
 * API Route: POST /api/refresh/[summonerName]
 * Forced reload of a group player: drops the cached profile, reads Riot again,
 * refreshes today's PDL snapshot and stores the player's new matches. At most once per player every 2 minutes
 * (for everyone), so the button can't be used to burn the Riot quota.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshProfile } from '@/src/services/profileService';
import { findTrackedPlayer } from '@/src/services/playerService';
import { syncNewMatches } from '@/src/services/matchService';
import { logger } from '@/src/lib/logger';
import { acquireLock } from '@/src/lib/cache';
import {
  RateLimitError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { RankResponse } from '@/src/queries/useRankQuery';

function tooManyRequests(error: string, retryAfter: number) {
  return NextResponse.json(
    { error, retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const riotId = decodeURIComponent((await params).summonerName);
  const [gameName, tagLine = ''] = riotId.split('#');

  const player = await findTrackedPlayer(gameName, tagLine);
  if (!player) {
    return NextResponse.json({ error: 'Player not tracked' }, { status: 404 });
  }

  const lock = await acquireLock(
    `refresh-lock:${riotId.toLowerCase()}`,
    RIOT_API_CONSTANTS.CACHE_SECONDS.REFRESH_LOCK
  );
  if (!lock.acquired) return tooManyRequests('REFRESH_LOCKED', lock.retryAfter);

  try {
    const profile = await refreshProfile(riotId, player.region);
    try {
      await syncNewMatches(
        player.id,
        RIOT_API_CONSTANTS.DEFAULTS.PROFILE_SYNC_MATCHES
      );
    } catch (error) {
      // The rank is already fresh; the matches come in on the next sync
      logger.warn('Refresh: match sync failed', {
        riotId,
        error: getErrorMessage(error),
      });
    }
    const data: RankResponse = {
      name: profile.name,
      rankInfo: profile.rankInfo,
      flexRankInfo: profile.flexRankInfo,
      fetchedAt: profile.fetchedAt,
    };
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return tooManyRequests('RATE_LIMITED', error.retryAfter);
    }
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}
