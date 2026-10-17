/**
 * The Riot limiter keeps its counters in Redis, so every server instance (and
 * every test file) shares one quota. Real Upstash; no Riot calls here.
 */

import type * as LimiterModule from '@/src/lib/riot-limiter';

/** A fresh copy of the module = another server instance */
function newInstance(): typeof LimiterModule {
  let mod!: typeof LimiterModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/src/lib/riot-limiter');
  });
  return mod;
}

// Each test uses its own small quota so they don't interfere
let seq = 0;
const limits = (perSecond: number) => ({
  name: `test-${Date.now()}-${seq++}`,
  perSecond,
  perTwoMinutes: 1000,
});

it('two instances share the same per-second quota', async () => {
  const config = limits(4);
  const a = newInstance().createRiotLimiter(config);
  const b = newInstance().createRiotLimiter(config);
  const started = Date.now();

  // 4 slots per second shared by both: the 7th request must wait a window
  await Promise.all([
    ...Array.from({ length: 4 }, () => a.acquire()),
    ...Array.from({ length: 3 }, () => b.acquire()),
  ]);

  expect(Date.now() - started).toBeGreaterThanOrEqual(900);
});

it('a burst within the quota goes through without waiting', async () => {
  const limiter = newInstance().createRiotLimiter(limits(10));
  const started = Date.now();

  await Promise.all(Array.from({ length: 5 }, () => limiter.acquire()));

  expect(Date.now() - started).toBeLessThan(900);
});

it('pause() on one instance holds requests on the others', async () => {
  const config = limits(50);
  const a = newInstance().createRiotLimiter(config);
  const b = newInstance().createRiotLimiter(config);

  await a.pause(1200);
  const started = Date.now();
  await b.acquire();

  expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
});

it('schedule() runs the task after a slot is granted', async () => {
  const limiter = newInstance().createRiotLimiter(limits(10));

  await expect(limiter.schedule(async () => 'ok')).resolves.toBe('ok');
});

it('the app limiter uses 90% of Riot limits', () => {
  expect(newInstance().RIOT_LIMITS).toEqual({
    perSecond: 18,
    perTwoMinutes: 90,
  });
});
