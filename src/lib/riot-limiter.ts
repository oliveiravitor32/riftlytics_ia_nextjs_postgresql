/**
 * Rate limiter for Riot API calls, with its counters in Redis: every server
 * instance (Vercel functions, the cron, tests) shares one quota, so together
 * they never go over Riot's limits. A 429 from Riot pauses everyone.
 */

import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';
import { RateLimitError } from './errors';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';

type LimiterConfig = { name: string; perSecond: number; perTwoMinutes: number };

/** 90% of Riot's limits: clock drift between us and Riot never causes a 429 */
export const RIOT_LIMITS = {
  perSecond: Math.floor(
    RIOT_API_CONSTANTS.RATE_LIMIT_REQUESTS_PER_SECOND * 0.9
  ),
  perTwoMinutes: Math.floor(
    RIOT_API_CONSTANTS.RATE_LIMIT_REQUESTS_PER_2_MINUTES * 0.9
  ),
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createRiotLimiter({
  name,
  perSecond,
  perTwoMinutes,
}: LimiterConfig) {
  // Not under CACHE_PREFIX: production, the dev server and test runs all use
  // the same Riot key, so they must count against one quota. Only tests that
  // fake Riot errors set RIOT_LIMIT_PREFIX to stay out of it.
  const prefix = `${process.env.RIOT_LIMIT_PREFIX ?? 'riftlytics:'}riot-limit:${name}`;
  const windows = [
    { limit: perSecond, window: '1 s' as const, timeoutMs: 30_000 },
    { limit: perTwoMinutes, window: '120 s' as const, timeoutMs: 125_000 },
  ].map(({ limit, window, timeoutMs }) => ({
    timeoutMs,
    limiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `${prefix}:${window.replace(' ', '')}`,
      ephemeralCache: false,
    }),
  }));
  const pauseKey = `${prefix}:pause`;

  async function acquire(): Promise<void> {
    const paused = await redis.pttl(pauseKey);
    if (paused > 0) await sleep(paused);

    for (const { limiter, timeoutMs } of windows) {
      const { success, reset } = await limiter.blockUntilReady(
        'riot',
        timeoutMs
      );
      if (!success) {
        throw new RateLimitError(Math.ceil((reset - Date.now()) / 1000));
      }
    }
  }

  return {
    acquire,
    async schedule<T>(task: () => Promise<T>): Promise<T> {
      await acquire();
      return task();
    },
    /** Holds every instance for `ms`, e.g. Riot's Retry-After on a 429 */
    async pause(ms: number): Promise<void> {
      await redis.set(pauseKey, 1, { px: ms });
    },
  };
}

export const riotLimiter = createRiotLimiter({ name: 'app', ...RIOT_LIMITS });
