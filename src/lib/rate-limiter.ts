/**
 * Token bucket rate limiter
 * Each bucket holds `capacity` tokens. Spending a token lends it out for
 * exactly `intervalMs`, after which it returns to the bucket. Unlike a
 * continuously refilling bucket (which allows up to 2x capacity inside one
 * window), this never lets more than `capacity` requests into ANY window of
 * `intervalMs` — the guarantee Riot's limits (20/1s, 100/2min) require.
 *
 * A request needs one token from EVERY bucket. Requests run concurrently;
 * only the token handout is ordered (FIFO).
 */

export type BucketConfig = { capacity: number; intervalMs: number };

type Bucket = BucketConfig & { lentAt: number[] };

export class TokenBucketLimiter {
  private readonly buckets: Bucket[];
  private queue: Promise<void> = Promise.resolve();
  private pausedUntil = 0;

  constructor(
    configs: BucketConfig[],
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms))
  ) {
    this.buckets = configs.map((c) => ({ ...c, lentAt: [] }));
  }

  /** Resolves once a token is taken from every bucket */
  acquire(): Promise<void> {
    const turn = this.queue.then(() => this.take());
    // Keep the chain alive even if a waiter throws
    this.queue = turn.catch(() => undefined);
    return turn;
  }

  /** Runs `task` after acquiring a token */
  async schedule<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    return task();
  }

  /** Holds every new request for `ms`, e.g. Riot's Retry-After on a 429 */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.now() + ms);
  }

  private async take(): Promise<void> {
    for (;;) {
      const now = this.now();
      for (const b of this.buckets) {
        // Tokens lent at least intervalMs ago are back in the bucket
        b.lentAt = b.lentAt.filter((t) => now - t < b.intervalMs);
      }

      // Longest wait until every bucket has a token available
      const waitMs = Math.max(
        this.pausedUntil - now,
        ...this.buckets.map((b) =>
          b.lentAt.length < b.capacity
            ? 0
            : b.lentAt[b.lentAt.length - b.capacity] + b.intervalMs - now
        )
      );

      if (waitMs <= 0) {
        for (const b of this.buckets) b.lentAt.push(now);
        return;
      }
      await this.sleep(waitMs);
    }
  }
}
