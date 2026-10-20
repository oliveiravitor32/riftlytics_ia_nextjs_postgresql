/**
 * Shared cache on the real Upstash Redis. Keys get this run's own prefix
 * (jest.integration.setup.ts) and are deleted afterwards (jest/server.setup.ts).
 */

import { redis, cacheKey } from '@/src/lib/redis';
import { cached, invalidate, acquireLock } from '@/src/lib/cache';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const key = (name: string) => `${name}-${Date.now()}-${seq++}`;

it('keys are namespaced with the configured prefix', () => {
  expect(cacheKey('perfil:x')).toBe(`${process.env.CACHE_PREFIX}perfil:x`);
  expect(process.env.CACHE_PREFIX).toMatch(/^test:/);
});

it('fetches on a miss, then serves the stored value', async () => {
  const k = key('cached');
  const fetcher = jest.fn(async () => ({ name: 'Alfa', level: 300 }));

  const first = await cached(k, 60, fetcher);
  const second = await cached(k, 60, fetcher);

  expect(first).toEqual({
    value: { name: 'Alfa', level: 300 },
    hit: false,
  });
  expect(second).toEqual({
    value: { name: 'Alfa', level: 300 },
    hit: true,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  // Really stored in Redis, under the prefixed key
  expect(await redis.get(cacheKey(k))).toEqual({
    name: 'Alfa',
    level: 300,
  });
});

it('expires after the TTL', async () => {
  const k = key('ttl');
  await cached(k, 1, async () => 'v1');
  await sleep(1500);

  const after = await cached(k, 1, async () => 'v2');

  expect(after).toEqual({ value: 'v2', hit: false });
});

it('a failed fetch is not cached', async () => {
  const k = key('fail');
  await expect(
    cached(k, 60, async () => {
      throw new Error('Riot fora');
    })
  ).rejects.toThrow('Riot fora');

  expect(await redis.get(cacheKey(k))).toBeNull();
});

it('invalidate() deletes the given keys only', async () => {
  const [a, b, keep] = [key('a'), key('b'), key('keep')];
  for (const k of [a, b, keep]) await cached(k, 60, async () => k);

  await invalidate(a, b);

  expect(await redis.get(cacheKey(a))).toBeNull();
  expect(await redis.get(cacheKey(b))).toBeNull();
  expect(await redis.get(cacheKey(keep))).toBe(keep);
});

describe('acquireLock', () => {
  it('grants the first caller and reports the wait to the next ones', async () => {
    const k = key('lock');

    expect(await acquireLock(k, 120)).toEqual({ acquired: true });
    const second = await acquireLock(k, 120);

    expect(second).toEqual({ acquired: false, retryAfter: expect.any(Number) });
    const { retryAfter } = second as { retryAfter: number };
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(120);
  });

  it('frees itself after the TTL', async () => {
    const k = key('lock-ttl');
    await acquireLock(k, 1);
    await sleep(1500);

    expect(await acquireLock(k, 1)).toEqual({ acquired: true });
  });
});
