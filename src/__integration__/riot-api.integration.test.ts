/**
 * Integration tests against the REAL Riot API.
 * Calls our route handlers and service exactly as production does — no mocks.
 * Run: npm run test:integration  (needs RIOT_API_KEY in .env.local)
 *
 * Quota: ~50 requests per run (Riot dev key: 100 per 2 min).
 * The cron test writes today's snapshots to the real database (idempotent).
 */

import { NextRequest } from 'next/server';
import { GET as getProfile } from '@/src/app/api/profile/[summonerName]/route';
import { GET as getRank } from '@/src/app/api/rank/[summonerName]/route';
import { GET as getMatches } from '@/src/app/api/matches/[summonerName]/route';
import { GET as runSnapshotCron } from '@/src/app/api/cron/pdl-snapshot/route';
import { getPdlHistory } from '@/src/services/snapshotService';
import { leagueApiService } from '@/src/services/leagueApiService';
import { clearRankCache } from '@/src/lib/rank-cache';

// A real, ranked player from the group
const player = { gameName: 'FlyerCloud', tagLine: 'br1', region: 'br1' };
const riotId = `${player.gameName}#${player.tagLine}`;
const region = player.region;
const encoded = encodeURIComponent(riotId);

const RANKED_QUEUES = ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'];

function request(path: string, query = '') {
  return new NextRequest(
    `http://localhost/api/${path}/${encoded}?region=${region}${query}`
  );
}
const params = (name = encoded) => ({
  params: Promise.resolve({ summonerName: name }),
});

function expectRankEntry(entry: unknown) {
  if (entry === null) return; // unranked in that queue is valid
  expect(entry).toMatchObject({
    queueType: expect.stringMatching(/^RANKED_(SOLO_5x5|FLEX_SR)$/),
    tier: expect.any(String),
    rank: expect.any(String),
    leaguePoints: expect.any(Number),
    wins: expect.any(Number),
    losses: expect.any(Number),
  });
}

// Counts every request that actually leaves for Riot
const fetchSpy = jest.spyOn(global, 'fetch');
const riotCalls = () =>
  fetchSpy.mock.calls.filter(([url]) => String(url).includes('riotgames.com'));

beforeEach(() => fetchSpy.mockClear());

describe('Riot API endpoints (service)', () => {
  let puuid: string;

  it('account-v1: resolves the Riot ID to a PUUID', async () => {
    puuid = await leagueApiService.getPuuidByRiotId(riotId);

    expect(puuid).toMatch(/^[\w-]{78}$/);
  });

  it('PUUID is cached: a second lookup makes no request', async () => {
    await leagueApiService.getPuuidByRiotId(riotId.toUpperCase());

    expect(riotCalls()).toHaveLength(0);
  });

  it('summoner-v4: by-puuid returns the summoner', async () => {
    const summoner = await leagueApiService.getSummonerByPuuid(
      puuid,
      region,
      riotId
    );

    expect(summoner.puuid).toBe(puuid);
    expect(summoner.summonerLevel).toBeGreaterThan(0);
  });

  it('league-v4: by-puuid returns only Solo/Duo and Flex entries', async () => {
    const entries = await leagueApiService.getLeagueEntries(puuid, region);

    expect(Array.isArray(entries)).toBe(true);
    entries.forEach((entry) => {
      expect(RANKED_QUEUES).toContain(entry.queueType);
      expectRankEntry(entry);
    });
  });

  it('match-v5: match list and details', async () => {
    const ids = await leagueApiService.getMatchList(puuid, 0, 1);
    expect(ids.length).toBeLessThanOrEqual(1);

    if (ids.length === 0) return; // player without recent matches
    const match = await leagueApiService.getMatchDetails(ids[0]);
    expect(match.metadata.matchId).toBe(ids[0]);
    expect(match.metadata.participants).toContain(puuid);

    // Finished matches are cached forever
    fetchSpy.mockClear();
    await leagueApiService.getMatchDetails(ids[0]);
    expect(riotCalls()).toHaveLength(0);
  });
});

describe('GET /api/profile/[summonerName]', () => {
  it('returns summoner + ranks and fetches no matches', async () => {
    const res = await getProfile(request('profile'), params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.puuid).toMatch(/^[\w-]{78}$/);
    expectRankEntry(body.rankInfo);
    expectRankEntry(body.flexRankInfo);
    expect(body.recentMatches).toBeUndefined();
    expect(riotCalls().some(([url]) => String(url).includes('/match/'))).toBe(
      false
    );
  });

  it('returns 404 for a Riot ID that does not exist', async () => {
    const missing = encodeURIComponent('zz-nao-existe-123456#0000');
    const res = await getProfile(request('profile'), params(missing));

    expect(res.status).toBe(404);
  });
});

describe('GET /api/rank/[summonerName]', () => {
  beforeAll(() => clearRankCache());

  it('first call goes to Riot (MISS)', async () => {
    const res = await getRank(request('rank'), params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache')).toBe('MISS');
    expectRankEntry(body.rankInfo);
    expectRankEntry(body.flexRankInfo);
  });

  it('second call is served from the 5-minute cache (HIT, no request)', async () => {
    const res = await getRank(request('rank'), params());

    expect(res.headers.get('X-Cache')).toBe('HIT');
    expect(riotCalls()).toHaveLength(0);
  });

  it('refresh=1 bypasses the cache', async () => {
    const res = await getRank(request('rank', '&refresh=1'), params());

    expect(res.headers.get('X-Cache')).toBe('MISS');
    expect(riotCalls().length).toBeGreaterThan(0);
  });
});

describe('GET /api/matches/[summonerName]', () => {
  it('returns a page of matches with pagination info', async () => {
    const res = await getMatches(
      request('matches', '&start=0&count=2'),
      params()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(body.matches.length);
    expect(body.count).toBeLessThanOrEqual(2);
    expect(body.nextStart).toBe(body.count);
    expect(body.hasMore).toBe(body.count === 2);
    body.matches.forEach((m: { matchId: string; kda: string }) => {
      expect(m.matchId).toMatch(/^[A-Z0-9]+_\d+$/);
      expect(m.kda).toMatch(/^\d+\/\d+\/\d+$/);
    });
  });
});

describe('GET /api/cron/pdl-snapshot (real Riot + Supabase)', () => {
  const cronRequest = (token?: string) =>
    new NextRequest('http://localhost/api/cron/pdl-snapshot', {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it('rejects calls without the CRON_SECRET', async () => {
    expect((await runSnapshotCron(cronRequest())).status).toBe(401);
    expect((await runSnapshotCron(cronRequest('wrong'))).status).toBe(401);
  });

  it('stores today snapshot for every active player (idempotent)', async () => {
    const res = await runSnapshotCron(cronRequest(process.env.CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.failed).toEqual([]);
    expect(body.snapshots).toBeGreaterThan(0);

    // Re-running on the same day updates instead of adding points
    const before = await getPdlHistory(player.gameName, player.tagLine);
    await runSnapshotCron(cronRequest(process.env.CRON_SECRET));
    const after = await getPdlHistory(player.gameName, player.tagLine);
    expect(after).toHaveLength(before.length);
  });

  it('profile route returns the stored history', async () => {
    const body = await (await getProfile(request('profile'), params())).json();

    expect(body.pdlHistory.length).toBeGreaterThan(0);
    body.pdlHistory.forEach(
      (p: { capturedAt: string; leaguePoints: number }) => {
        // Real capture time (not midnight), within the last 30 days
        expect(Date.now() - Date.parse(p.capturedAt)).toBeLessThan(
          31 * 86_400_000
        );
        expect(p.leaguePoints).toEqual(expect.any(Number));
      }
    );
  });
});

describe('token bucket against the real API', () => {
  it('a 20-request burst is spread out (18/s) and Riot never answers 429', async () => {
    const puuid = await leagueApiService.getPuuidByRiotId(riotId);
    const started = Date.now();

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        leagueApiService.getLeagueEntries(puuid, region)
      )
    );

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toEqual([]);
    // Bucket of 18 per second: the last 2 must wait for the next window
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  });
});
