/**
 * Error paths and input handling of the API routes, against real Riot +
 * Supabase. Only the 429 cases fake Riot's HTTP answer (can't be triggered
 * safely); everything of ours runs for real.
 */

import { NextRequest } from 'next/server';
import { GET as getProfile } from '@/src/app/api/profile/[summonerName]/route';
import { GET as getRank } from '@/src/app/api/rank/[summonerName]/route';
import { GET as getMatches } from '@/src/app/api/matches/[summonerName]/route';
import { GET as runCron } from '@/src/app/api/cron/pdl-snapshot/route';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { leagueApiService } from '@/src/services/leagueApiService';
import { redis, cacheKey } from '@/src/lib/redis';

type Route = (
  request: NextRequest,
  context: { params: Promise<{ summonerName: string }> }
) => Promise<Response>;

const REAL = encodeURIComponent('FlyerCloud#br1');
const MISSING = encodeURIComponent('zz-nao-existe-987#0000');

function call(route: Route, name: string, path: string, query = '') {
  return route(
    new NextRequest(`http://localhost/api/${path}/${name}?region=br1${query}`),
    { params: Promise.resolve({ summonerName: name }) }
  );
}

const realFetch = global.fetch;
function riotAnswers429(retryAfter = 1) {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).includes('riotgames.com')
      ? new Response('{}', {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        })
      : realFetch(input, init)) as typeof fetch;
}
afterEach(() => {
  global.fetch = realFetch;
});

describe('unknown Riot ID → 404 on every route', () => {
  it.each([
    ['profile', getProfile],
    ['rank', getRank],
    ['matches', getMatches],
  ])('%s', async (path, route) => {
    const res = await call(route as Route, MISSING, path);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
  });
});

describe('region defaults to BR (the group plays there)', () => {
  it.each([
    ['profile', getProfile],
    ['rank', getRank],
    ['matches', getMatches],
  ])('%s without ?region', async (path, route) => {
    const res = await (route as Route)(
      new NextRequest(`http://localhost/api/${path}/${REAL}`),
      { params: Promise.resolve({ summonerName: REAL }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    if (path !== 'matches') expect(body.rankInfo).not.toBeNull();
  });
});

describe('GET /api/matches query parameters', () => {
  // The page of match ids is cached under its (start, count): checking which
  // key exists tells what the route asked for, cache hit or miss
  async function pageKeyExists(start: number, count: number) {
    const puuid = await leagueApiService.getPuuidByRiotId('FlyerCloud#br1');
    return (
      (await redis.exists(cacheKey(`partidas:${puuid}:${start}:${count}`))) ===
      1
    );
  }

  it('defaults to the most recent matches (start=0, count=10)', async () => {
    const res = await call(getMatches, REAL, 'matches');

    expect(res.status).toBe(200);
    expect(await pageKeyExists(0, 10)).toBe(true);
  });

  it('ignores non-numeric start/count instead of sending NaN to Riot', async () => {
    const puuid = await leagueApiService.getPuuidByRiotId('FlyerCloud#br1');
    await redis.del(cacheKey(`partidas:${puuid}:0:10`));

    const res = await call(getMatches, REAL, 'matches', '&start=abc&count=xyz');

    expect(res.status).toBe(200);
    expect(await pageKeyExists(0, 10)).toBe(true);
    expect(await pageKeyExists(NaN, NaN)).toBe(false);
  });

  it('clamps count to the page limit and start to >= 0', async () => {
    await call(getMatches, REAL, 'matches', '&start=-5&count=999');

    expect(
      await pageKeyExists(0, RIOT_API_CONSTANTS.DEFAULTS.MATCHES_PER_PAGE)
    ).toBe(true);
  });
});

describe('Riot rate limit → 429 with retryAfter', () => {
  it('profile route', async () => {
    riotAnswers429();
    const res = await call(
      getProfile,
      encodeURIComponent('Nao Cacheado#429'),
      'profile'
    );

    expect(res.status).toBe(429);
    expect((await res.json()).context).toMatchObject({ retryAfter: 1 });
  });

  it('matches route', async () => {
    riotAnswers429();
    const res = await call(
      getMatches,
      encodeURIComponent('Nao Cacheado#430'),
      'matches'
    );

    expect(res.status).toBe(429);
    expect((await res.json()).context).toMatchObject({ retryAfter: 1 });
  });

  it('rank route (bypassing its cache)', async () => {
    riotAnswers429();
    const res = await call(
      getRank,
      encodeURIComponent('Nao Cacheado#431'),
      'rank'
    );

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('1');
    expect(await res.json()).toMatchObject({
      error: 'RATE_LIMITED',
      retryAfter: 1,
    });
  });
});

describe('GET /api/cron/pdl-snapshot when Riot is down', () => {
  it('answers 502 if every player failed', async () => {
    riotAnswers429();
    const res = await runCron(
      new NextRequest('http://localhost/api/cron/pdl-snapshot', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.failed).toHaveLength(body.players);
    expect(body.snapshots).toBe(0);
  });
});
