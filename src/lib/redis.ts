/**
 * Upstash Redis client (server only). Every key goes through cacheKey() so
 * production ("riftlytics:") and test runs ("test:<id>:") never collide.
 */

import 'server-only';
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

export function cacheKey(key: string): string {
  return `${process.env.CACHE_PREFIX ?? 'riftlytics:'}${key}`;
}
