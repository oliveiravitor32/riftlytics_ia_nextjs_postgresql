/**
 * Profile data (summoner + Solo/Flex rank) is fetched once and shared for
 * 5 minutes by /api/profile, /api/rank and the profile page. Real Riot + DB.
 */

import { NextRequest } from 'next/server';
import { GET as getProfile } from '@/src/app/api/profile/[summonerName]/route';
import { GET as getRank } from '@/src/app/api/rank/[summonerName]/route';
import { clearProfileCache } from '@/src/services/profileService';

const NAME = encodeURIComponent('Neutro7#BR1');

const request = (path: string, query = '') =>
  new NextRequest(`http://localhost/api/${path}/${NAME}?region=br1${query}`);
const params = { params: Promise.resolve({ summonerName: NAME }) };

let spy: jest.SpyInstance;
const riotCalls = () =>
  spy.mock.calls.filter(([url]) => String(url).includes('riotgames.com'))
    .length;

beforeEach(() => {
  clearProfileCache();
  spy = jest.spyOn(global, 'fetch');
});
afterEach(() => spy.mockRestore());

it('serves a repeated /api/profile from cache without calling Riot', async () => {
  const first = await getProfile(request('profile'), params);
  expect(first.headers.get('X-Cache')).toBe('MISS');

  spy.mockClear();
  const second = await getProfile(request('profile'), params);

  expect(second.headers.get('X-Cache')).toBe('HIT');
  expect(riotCalls()).toBe(0);
  expect(await second.json()).toEqual(await first.json());
});

it('/api/rank reuses what /api/profile already fetched', async () => {
  const profile = await (await getProfile(request('profile'), params)).json();

  spy.mockClear();
  const rank = await getRank(request('rank'), params);
  const body = await rank.json();

  expect(rank.headers.get('X-Cache')).toBe('HIT');
  expect(riotCalls()).toBe(0);
  expect(body.name).toBe(profile.name);
  expect(body.rankInfo).toEqual(profile.rankInfo);
  expect(body.flexRankInfo).toEqual(profile.flexRankInfo);
});

it('?refresh=1 bypasses the cache on both routes', async () => {
  await getProfile(request('profile'), params);

  spy.mockClear();
  const profile = await getProfile(request('profile', '&refresh=1'), params);
  expect(profile.headers.get('X-Cache')).toBe('MISS');
  expect(riotCalls()).toBeGreaterThan(0);

  const rank = await getRank(request('rank', '&refresh=1'), params);
  expect(rank.headers.get('X-Cache')).toBe('MISS');
});
