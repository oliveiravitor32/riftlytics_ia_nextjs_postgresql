/**
 * How leagueApiService reacts when Riot misbehaves.
 * Riot errors (5xx, timeouts, 429, bad payloads) can't be triggered on demand,
 * so ONLY Riot's HTTP responses are faked here; our service, limiter, error
 * classes and retry logic all run for real.
 */

import type * as ServiceModule from '@/src/services/leagueApiService';
import type * as LimiterModule from '@/src/lib/riot-limiter';
import type * as ErrorsModule from '@/src/lib/errors';

// Faked Riot answers must not spend the real Riot quota that the rest of the
// suite shares: this file loads its own copy with its own limiter namespace
let leagueApiService: typeof ServiceModule.leagueApiService;
let riotLimiter: typeof LimiterModule.riotLimiter;
let NotFoundError: typeof ErrorsModule.NotFoundError;
let RateLimitError: typeof ErrorsModule.RateLimitError;
let RiotApiError: typeof ErrorsModule.RiotApiError;
{
  // Faked 429s pause the limiter: keep this copy off the shared Riot quota
  const shared = process.env.CACHE_PREFIX;
  process.env.CACHE_PREFIX = `${shared}faults:`;
  process.env.RIOT_LIMIT_PREFIX = process.env.CACHE_PREFIX;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    leagueApiService =
      require('@/src/services/leagueApiService').leagueApiService;
    riotLimiter = require('@/src/lib/riot-limiter').riotLimiter;
    ({
      NotFoundError,
      RateLimitError,
      RiotApiError,
    } = require('@/src/lib/errors'));
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  process.env.CACHE_PREFIX = shared;
  delete process.env.RIOT_LIMIT_PREFIX;
}

const realFetch = global.fetch;
let riotCalls = 0;

/** Answers Riot URLs with `respond`; any other URL uses the real network */
function fakeRiot(respond: (url: string, call: number) => Promise<Response>) {
  riotCalls = 0;
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes('riotgames.com')) return realFetch(input, init);
    riotCalls++;
    return respond(url, riotCalls);
  }) as typeof fetch;
}

const json = (body: unknown, status = 200, headers = {}) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    })
  );

// Unique PUUIDs keep the service's permanent caches out of the way
let seq = 0;
const freshPuuid = () => `fault-test-${Date.now()}-${seq++}`;

afterEach(() => {
  global.fetch = realFetch;
});

it('rejects a summoner payload missing required fields', async () => {
  fakeRiot(() => json({ puuid: 'p', profileIconId: 1, revisionDate: 1 }));

  await expect(
    leagueApiService.getSummonerByPuuid(freshPuuid(), 'br1', 'A#B')
  ).rejects.toThrow();
});

it('returns the summoner named after the Riot ID', async () => {
  const puuid = freshPuuid();
  fakeRiot(() =>
    json({ puuid, profileIconId: 7, summonerLevel: 42, revisionDate: 1 })
  );

  await expect(
    leagueApiService.getSummonerByPuuid(puuid, 'br1', 'Nome#BR1')
  ).resolves.toEqual({
    puuid,
    name: 'Nome#BR1',
    profileIconId: 7,
    summonerLevel: 42,
    revisionDate: 1,
  });
});

it('retries a Riot 5xx and succeeds on the next attempt', async () => {
  fakeRiot((_, call) => (call === 1 ? json({}, 503) : json([])));

  await expect(
    leagueApiService.getLeagueEntries(freshPuuid(), 'br1')
  ).resolves.toEqual([]);
  expect(riotCalls).toBe(2);
});

it('gives up after the configured attempts on persistent 5xx', async () => {
  fakeRiot(() => json({}, 500));

  await expect(
    leagueApiService.getLeagueEntries(freshPuuid(), 'br1')
  ).rejects.toThrow(/Server error \(500\)/);
  expect(riotCalls).toBe(3);
});

it('retries a request that timed out', async () => {
  fakeRiot((_, call) =>
    call === 1
      ? Promise.reject(new DOMException('timed out', 'TimeoutError'))
      : json([])
  );

  await expect(
    leagueApiService.getLeagueEntries(freshPuuid(), 'br1')
  ).resolves.toEqual([]);
  expect(riotCalls).toBe(2);
});

it('404 becomes NotFoundError and is not retried', async () => {
  fakeRiot(() => json({}, 404));

  await expect(
    leagueApiService.getPuuidByRiotId(`nao-existe-${seq++}#0000`)
  ).rejects.toBeInstanceOf(NotFoundError);
  expect(riotCalls).toBe(1);
});

it('other 4xx become RiotApiError with the status code', async () => {
  fakeRiot(() => json({}, 403));

  const error = await leagueApiService
    .getLeagueEntries(freshPuuid(), 'br1')
    .catch((e) => e);
  expect(error).toBeInstanceOf(RiotApiError);
  expect(error.statusCode).toBe(403);
  expect(riotCalls).toBe(1);
});

it('429 is not retried and pauses the shared limiter for Retry-After', async () => {
  fakeRiot((_, call) =>
    call === 1 ? json({}, 429, { 'Retry-After': '1' }) : json([])
  );

  const error = await leagueApiService
    .getLeagueEntries(freshPuuid(), 'br1')
    .catch((e) => e);
  expect(error).toBeInstanceOf(RateLimitError);
  expect(error.retryAfter).toBe(1);
  expect(riotCalls).toBe(1);

  // The next request (any caller) waits for the pause to end
  const started = Date.now();
  await riotLimiter.acquire();
  expect(Date.now() - started).toBeGreaterThanOrEqual(900);
});

it('match list and match details errors reach the caller', async () => {
  fakeRiot((url) => json({}, url.includes('/ids?') ? 403 : 404));

  await expect(
    leagueApiService.getMatchList(freshPuuid(), 0, 5)
  ).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    leagueApiService.getMatchDetails(`BR1_FAULT_${seq++}`)
  ).rejects.toBeInstanceOf(NotFoundError);
});

it('fails clearly without calling Riot when RIOT_API_KEY is missing', async () => {
  const previous = process.env.RIOT_API_KEY;
  process.env.RIOT_API_KEY = '';
  let isolated!: typeof leagueApiService;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    isolated = require('@/src/services/leagueApiService').leagueApiService;
  });
  process.env.RIOT_API_KEY = previous;
  fakeRiot(() => json([]));

  await expect(isolated.getLeagueEntries(freshPuuid(), 'br1')).rejects.toThrow(
    'RIOT_API_KEY environment variable is not set'
  );
  expect(riotCalls).toBe(0);
});
