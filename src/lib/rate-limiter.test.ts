/**
 * @jest-environment node
 */

import { TokenBucketLimiter } from './rate-limiter';

// Fake clock: sleep advances time instantly so tests run fast
function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    get time() {
      return t;
    },
  };
}

it('lets a burst up to capacity through immediately', async () => {
  const clock = fakeClock();
  const limiter = new TokenBucketLimiter(
    [{ capacity: 20, intervalMs: 1000 }],
    clock.now,
    clock.sleep
  );

  await Promise.all(Array.from({ length: 20 }, () => limiter.acquire()));

  expect(clock.time).toBe(0);
});

it('never exceeds any bucket limit', async () => {
  const clock = fakeClock();
  const limiter = new TokenBucketLimiter(
    [
      { capacity: 20, intervalMs: 1000 },
      { capacity: 100, intervalMs: 120_000 },
    ],
    clock.now,
    clock.sleep
  );
  const grantedAt: number[] = [];

  await Promise.all(
    Array.from({ length: 150 }, () =>
      limiter.acquire().then(() => grantedAt.push(clock.time))
    )
  );

  // Sliding-window check: no 1s window > 20 and no 2min window > 100
  const countIn = (start: number, ms: number) =>
    grantedAt.filter((t) => t >= start && t < start + ms).length;
  for (const start of grantedAt) {
    expect(countIn(start, 1000)).toBeLessThanOrEqual(20);
    expect(countIn(start, 120_000)).toBeLessThanOrEqual(100);
  }
  // Requests 101-150 must wait for the 2min window to roll over
  expect(clock.time).toBeGreaterThanOrEqual(120_000);
});

it('pause holds new requests for the given time (Retry-After)', async () => {
  const clock = fakeClock();
  const limiter = new TokenBucketLimiter(
    [{ capacity: 10, intervalMs: 1000 }],
    clock.now,
    clock.sleep
  );

  limiter.pause(30_000);
  await limiter.acquire();

  expect(clock.time).toBe(30_000);
});

it('runs scheduled tasks concurrently', async () => {
  const limiter = new TokenBucketLimiter([{ capacity: 5, intervalMs: 1000 }]);
  let running = 0;
  let maxRunning = 0;

  await Promise.all(
    Array.from({ length: 5 }, () =>
      limiter.schedule(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 20));
        running--;
      })
    )
  );

  expect(maxRunning).toBe(5);
});
