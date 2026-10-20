/**
 * Error paths and input handling of the API routes, against real Riot +
 * Supabase. Only the 429 cases fake Riot's HTTP answer (can't be triggered
 * safely); everything of ours runs for real.
 */

import { NextRequest } from 'next/server';
import { GET as getProfile } from '@/src/app/api/profile/[summonerName]/route';
import { GET as getRank } from '@/src/app/api/rank/[summonerName]/route';
import { GET as getMatches } from '@/src/app/api/matches/[summonerName]/route';
import { GET as runCron } from '@/src/app/api/cron/fechamento/route';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { leagueApiService } from '@/src/services/leagueApiService';
import { redis, cacheKey } from '@/src/lib/redis';

type Route = (
  request: NextRequest,
  context: { params: Promise<{ summonerName: string }> }
) => Promise<Response>;

const REAL = encodeURIComponent('Alfa#TST');
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
  async function page(query: string) {
    const res = await call(getMatches, REAL, 'matches', query);
    expect(res.status).toBe(200);
    return (await res.json()) as { count: number; nextStart: number };
  }

  it('defaults to the most recent matches (start=0, count=10)', async () => {
    expect(await page('')).toMatchObject({ count: 10, nextStart: 10 });
  });

  it('ignores non-numeric start/count instead of sending NaN to Riot', async () => {
    expect(await page('&start=abc&count=xyz')).toMatchObject({
      count: 10,
      nextStart: 10,
    });
  });

  it('clamps count to the page limit and start to >= 0', async () => {
    const max = RIOT_API_CONSTANTS.DEFAULTS.MATCHES_PER_PAGE;
    expect(await page('&start=-5&count=999')).toMatchObject({
      count: max,
      nextStart: max,
    });
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

  it('matches route, past the stored history', async () => {
    riotAnswers429();
    const res = await call(getMatches, REAL, 'matches', '&start=5000');

    expect(res.status).toBe(429);
    expect((await res.json()).context).toMatchObject({ retryAfter: 1 });
  });

  it('matches route still serves the stored history on the first page', async () => {
    const puuid = await leagueApiService.getPuuidByRiotId('Alfa#TST');
    // Forces the first page to ask Riot for new ids
    await redis.del(
      cacheKey(
        `partidas:${puuid}:0:${RIOT_API_CONSTANTS.DEFAULTS.PROFILE_SYNC_MATCHES}`
      )
    );
    riotAnswers429();

    const res = await call(getMatches, REAL, 'matches');

    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(10);
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

describe('GET /api/cron/fechamento when Riot is down', () => {
  it('answers 502 if every player failed', async () => {
    riotAnswers429();
    const res = await runCron(
      new NextRequest('http://localhost/api/cron/fechamento', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(502);
    // Both steps failed for every player
    expect(body.failed).toHaveLength(body.players * 2);
    expect(body.snapshots).toBe(0);
    expect(body.matches).toBe(0);
  });
});
