/**
 * Profile data (summoner + Solo/Flex rank) lives 10 minutes in the shared
 * Redis cache. A cache miss for a group player also refreshes today's PDL
 * snapshot in the DB; "Atualizar" forces a refetch, at most once per 2 min.
 * Real Riot + Supabase + Upstash.
 */

import { NextRequest } from 'next/server';
import { GET as getProfile } from '@/src/app/api/profile/[summonerName]/route';
import { GET as getRank } from '@/src/app/api/rank/[summonerName]/route';
import { POST as refresh } from '@/src/app/api/refresh/[summonerName]/route';
import { invalidateProfile } from '@/src/services/profileService';
import { gameDay } from '@/src/services/snapshotService';
import { prisma } from '@/src/lib/db';
import { redis, cacheKey } from '@/src/lib/redis';

const PLAYER = { gameName: 'Bravo', tagLine: 'TST', region: 'br1' };
const RIOT_ID = `${PLAYER.gameName}#${PLAYER.tagLine}`;
const NAME = encodeURIComponent(RIOT_ID);

const get = (path: string) =>
  new NextRequest(`http://localhost/api/${path}/${NAME}?region=br1`);
const params = (name = NAME) => ({
  params: Promise.resolve({ summonerName: name }),
});
const post = (name = NAME) =>
  refresh(
    new NextRequest(`http://localhost/api/refresh/${name}`, { method: 'POST' }),
    params(name)
  );

let spy: jest.SpyInstance;
const riotCalls = () =>
  spy.mock.calls.filter(([url]) => String(url).includes('riotgames.com'))
    .length;

async function todaysSnapshot() {
  return prisma.pDLSnapshot.findFirst({
    where: {
      queueType: 'RANKED_SOLO_5x5',
      snapshotDate: gameDay(),
      player: { gameName: PLAYER.gameName, tagLine: PLAYER.tagLine },
    },
  });
}

beforeEach(async () => {
  await invalidateProfile(RIOT_ID, PLAYER.region);
  await redis.del(cacheKey(`refresh-lock:${RIOT_ID.toLowerCase()}`));
  spy = jest.spyOn(global, 'fetch');
});
afterEach(() => spy.mockRestore());

describe('shared 10-minute cache', () => {
  it('serves a repeated /api/profile from Redis without calling Riot', async () => {
    const first = await getProfile(get('profile'), params());
    expect(first.headers.get('X-Cache')).toBe('MISS');

    spy.mockClear();
    const second = await getProfile(get('profile'), params());

    expect(second.headers.get('X-Cache')).toBe('HIT');
    expect(riotCalls()).toBe(0);
    expect(await second.json()).toEqual(await first.json());
  });

  it('expires after 10 minutes', async () => {
    await getProfile(get('profile'), params());
    const ttl = await redis.ttl(
      cacheKey(`perfil:br1:${RIOT_ID.toLowerCase()}`)
    );

    expect(ttl).toBeGreaterThan(590);
    expect(ttl).toBeLessThanOrEqual(600);
  });

  it('is shared between server instances (not in process memory)', async () => {
    await getProfile(get('profile'), params());

    let otherInstance!: typeof getRank;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      otherInstance = require('@/src/app/api/rank/[summonerName]/route').GET;
    });
    spy.mockClear();
    const res = await otherInstance(get('rank'), params());

    expect(res.headers.get('X-Cache')).toBe('HIT');
    expect(riotCalls()).toBe(0);
  });

  it('/api/rank and /api/profile read the same entry', async () => {
    const profile = await (await getProfile(get('profile'), params())).json();
    const rank = await (await getRank(get('rank'), params())).json();

    expect(rank.rankInfo).toEqual(profile.rankInfo);
    expect(rank.flexRankInfo).toEqual(profile.flexRankInfo);
  });
});

describe("today's PDL snapshot follows cache misses", () => {
  it('a miss upserts today (Brasília date) with the fresh rank', async () => {
    const body = await (await getProfile(get('profile'), params())).json();
    const snapshot = await todaysSnapshot();

    expect(snapshot).toMatchObject({
      tier: body.rankInfo.tier,
      rank: body.rankInfo.rank,
      leaguePoints: body.rankInfo.leaguePoints,
    });
    expect(Date.now() - snapshot!.capturedAt.getTime()).toBeLessThan(60_000);
  });

  it("a miss also saves today's summoner level (summary's countdown to 30)", async () => {
    const body = await (await getProfile(get('profile'), params())).json();
    const level = await prisma.levelSnapshot.findFirst({
      where: {
        snapshotDate: gameDay(),
        player: { gameName: PLAYER.gameName, tagLine: PLAYER.tagLine },
      },
    });

    expect(level?.summonerLevel).toBe(body.summonerLevel);
  });

  it('a cache hit does not touch the DB', async () => {
    await getProfile(get('profile'), params());
    const before = (await todaysSnapshot())!.capturedAt;

    await getProfile(get('profile'), params());

    expect((await todaysSnapshot())!.capturedAt).toEqual(before);
  });
});

describe('POST /api/refresh (forced reload)', () => {
  it("refetches from Riot, renews the cache and today's snapshot", async () => {
    await getProfile(get('profile'), params());
    const before = (await todaysSnapshot())!.capturedAt;

    spy.mockClear();
    const res = await post();

    expect(res.status).toBe(200);
    expect(riotCalls()).toBeGreaterThan(0);
    expect((await todaysSnapshot())!.capturedAt.getTime()).toBeGreaterThan(
      before.getTime()
    );
    const after = await getProfile(get('profile'), params());
    expect(after.headers.get('X-Cache')).toBe('HIT');
  });

  it('allows one refresh per player every 2 minutes', async () => {
    expect((await post()).status).toBe(200);

    spy.mockClear();
    const second = await post();

    expect(second.status).toBe(429);
    const wait = Number(second.headers.get('Retry-After'));
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(120);
    expect(await second.json()).toMatchObject({
      error: 'REFRESH_LOCKED',
      retryAfter: wait,
    });
    expect(riotCalls()).toBe(0);
  });

  it('only group players can be refreshed', async () => {
    const res = await post(encodeURIComponent('Forasteiro#FORA'));

    expect(res.status).toBe(404);
  });
});

describe('gameDay', () => {
  it('a day runs from 10:00 to 09:59 in Brasília, as a UTC midnight', () => {
    const day = (iso: string) => gameDay(new Date(iso)).toISOString();
    // 02:00 of the 17th in Brasília (late-night games) still counts as the 16th
    expect(day('2026-10-17T05:00:00Z')).toBe('2026-10-16T00:00:00.000Z');
    // 09:59 of the 17th: last minute of the 16th
    expect(day('2026-10-17T12:59:00Z')).toBe('2026-10-16T00:00:00.000Z');
    // 10:00 of the 17th: the 17th starts
    expect(day('2026-10-17T13:00:00Z')).toBe('2026-10-17T00:00:00.000Z');
  });
});
