/**
 * Latest Data Dragon version, cached in the real Redis. Data Dragon is
 * external, so its answer comes from the fake world (jest/riot-mock).
 */

import { DDRAGON_VERSIONS } from '@/jest/riot-mock/world';
import { invalidate } from '@/src/lib/cache';
import { DATA_DRAGON_FALLBACK_VERSION } from '@/src/lib/match-transformers';
import {
  DDRAGON_VERSION_KEY,
  latestDataDragonVersion,
} from '@/src/services/dataDragonService';

const realFetch = globalThis.fetch;

beforeEach(() => invalidate(DDRAGON_VERSION_KEY));
afterEach(() => {
  globalThis.fetch = realFetch;
});

it('returns the newest version from Data Dragon', async () => {
  expect(await latestDataDragonVersion()).toBe(DDRAGON_VERSIONS[0]);
});

it('serves the cached version without asking again', async () => {
  await latestDataDragonVersion();
  const spy = jest.fn(realFetch);
  globalThis.fetch = spy;

  expect(await latestDataDragonVersion()).toBe(DDRAGON_VERSIONS[0]);
  // Redis also goes through fetch; only Data Dragon must not be asked
  const urls = spy.mock.calls.map(([input]) => String(input));
  expect(urls.some((u) => u.includes('ddragon'))).toBe(false);
});

it('falls back when Data Dragon fails', async () => {
  globalThis.fetch = (async () =>
    new Response('down', { status: 503 })) as typeof fetch;

  expect(await latestDataDragonVersion()).toBe(DATA_DRAGON_FALLBACK_VERSION);
});

it('falls back when Data Dragon sends something unexpected', async () => {
  globalThis.fetch = (async () => Response.json({ nope: 1 })) as typeof fetch;

  expect(await latestDataDragonVersion()).toBe(DATA_DRAGON_FALLBACK_VERSION);
});
