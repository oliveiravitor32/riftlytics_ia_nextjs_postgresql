/**
 * API Route: GET /api/matchup?a=Katarina&b=Akali
 * Lane-phase tips for a champion pair (ids = Riot's championName). Stored
 * answers are free; a new one calls Gemini and counts toward the caller's
 * limit (free tier: few requests a day).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/src/lib/redis';
import { logger } from '@/src/lib/logger';
import {
  RateLimitError,
  getErrorMessage,
  getErrorStatusCode,
} from '@/src/lib/errors';
import { getMatchup } from '@/src/services/matchupService';
import { NEW_MATCHUPS_PER_HOUR } from '@/src/lib/matchup';

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(NEW_MATCHUPS_PER_HOUR, '1 h'),
  prefix: `${process.env.CACHE_PREFIX ?? 'riftlytics:'}matchup-limit`,
});

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  );
}

export async function GET(request: NextRequest) {
  const a = request.nextUrl.searchParams.get('a') ?? '';
  const b = request.nextUrl.searchParams.get('b') ?? '';
  if (!a || !b) {
    return NextResponse.json(
      { error: 'Informe os dois campeões (a e b)' },
      { status: 400 }
    );
  }

  try {
    const matchup = await getMatchup(a, b, async () => {
      const { success, reset } = await limiter.limit(clientIp(request));
      if (!success) {
        throw new RateLimitError(
          Math.max(1, Math.ceil((reset - Date.now()) / 1000))
        );
      }
    });
    return NextResponse.json(matchup);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', retryAfter: error.retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(error.retryAfter) },
        }
      );
    }
    const status = getErrorStatusCode(error);
    if (status >= 500)
      logger.error('Matchup API: Error', {
        a,
        b,
        error: getErrorMessage(error),
      });
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
