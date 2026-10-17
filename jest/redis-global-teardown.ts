/**
 * Deletes every Redis key created by this test run (its CACHE_PREFIX)
 */
import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

export default async function teardown() {
  const prefix = process.env.CACHE_PREFIX;
  if (!prefix?.startsWith('test:')) return;
  config({ path: '.env.local', quiet: true });
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  });

  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, {
      match: `${prefix}*`,
      count: 200,
    });
    if (keys.length) await redis.del(...keys);
    cursor = String(next);
  } while (cursor !== '0');
}
