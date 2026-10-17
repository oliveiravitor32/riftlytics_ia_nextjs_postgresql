/**
 * Read-through cache and locks on Redis, shared by every server instance
 */

import 'server-only';
import { redis, cacheKey } from './redis';

/**
 * Returns the cached value for `key`, or runs `fetcher` and stores its result
 * for `ttlSeconds`. Failures are never cached.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<{ value: T; hit: boolean }> {
  const stored = await redis.get<T>(cacheKey(key));
  if (stored !== null) return { value: stored, hit: true };

  const value = await fetcher();
  await redis.set(cacheKey(key), value, { ex: ttlSeconds });
  return { value, hit: false };
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys.map(cacheKey));
}

/**
 * Takes a lock for `ttlSeconds` (SET NX EX). If someone already holds it,
 * returns how many seconds are left.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number
): Promise<{ acquired: true } | { acquired: false; retryAfter: number }> {
  const taken = await redis.set(cacheKey(key), Date.now(), {
    nx: true,
    ex: ttlSeconds,
  });
  if (taken === 'OK') return { acquired: true };

  const ttl = await redis.ttl(cacheKey(key));
  return { acquired: false, retryAfter: Math.max(ttl, 1) };
}
