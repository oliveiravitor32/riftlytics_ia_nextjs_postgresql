/**
 * Shared by the suites that run real server code (integration, ui)
 */
import { prisma } from '@/src/lib/db';
import { redis } from '@/src/lib/redis';

// Real network calls + the token bucket can take a while
jest.setTimeout(60_000);

// Close the Postgres pool so Jest can exit without --forceExit
afterAll(() => prisma.$disconnect());

// Drop every Redis key this test file created (its own CACHE_PREFIX)
afterAll(async () => {
  const prefix = process.env.CACHE_PREFIX;
  if (!prefix?.startsWith('test:')) return;
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, {
      match: `${prefix}*`,
      count: 200,
    });
    if (keys.length) await redis.del(...keys);
    cursor = String(next);
  } while (cursor !== '0');
});
