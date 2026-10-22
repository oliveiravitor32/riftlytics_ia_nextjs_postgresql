/**
 * Matchup tips against the real (test) database and Redis, with Gemini
 * answered by the fake (jest/gemini-mock): no free-tier quota is spent.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/src/app/api/matchup/route';
import { prisma } from '@/src/lib/db';
import {
  MATCHUP_ASPECTS,
  MATCHUP_TTL_DAYS,
  NEW_MATCHUPS_PER_HOUR,
} from '@/src/lib/matchup';
import { championList } from '@/src/services/dataDragonService';
import { getMatchup } from '@/src/services/matchupService';
import {
  fakeTip,
  geminiCalls,
  geminiFault,
  geminiModels,
  geminiRateLimited,
  geminiUnavailable,
  geminiText,
} from '@/jest/gemini-mock/server';

const call = (query: string, ip = '10.0.0.1') =>
  GET(
    new NextRequest(`http://localhost/api/matchup${query}`, {
      headers: { 'x-forwarded-for': ip },
    })
  );

beforeEach(async () => {
  await prisma.matchupTip.deleteMany();
  geminiCalls.length = 0;
  geminiModels.length = 0;
  geminiFault.next = null;
  geminiFault.once = [];
});
afterAll(() => {
  geminiFault.next = null;
});

it('generates the tips once, then serves them from the database', async () => {
  const first = await getMatchup('Katarina', 'Akali');

  expect(first.cached).toBe(false);
  expect(first.rows.map((r) => r.aspecto)).toEqual([...MATCHUP_ASPECTS]);
  // Columns in the order asked: a = Katarina, b = Akali
  expect(first.rows[0].a).toBe(fakeTip('Katarina', MATCHUP_ASPECTS[0]));
  expect(first.rows[0].b).toBe(fakeTip('Akali', MATCHUP_ASPECTS[0]));

  const again = await getMatchup('Katarina', 'Akali');
  expect(again).toEqual({ ...first, cached: true });
  expect(geminiCalls).toHaveLength(1);
});

it('A×B and B×A share one stored answer, with the columns swapped', async () => {
  const ab = await getMatchup('Akali', 'Katarina');
  const ba = await getMatchup('Katarina', 'Akali');

  expect(geminiCalls).toHaveLength(1);
  expect(ba.cached).toBe(true);
  expect(ba.rows.map((r) => [r.a, r.b])).toEqual(
    ab.rows.map((r) => [r.b, r.a])
  );
  expect(await prisma.matchupTip.count()).toBe(1);
});

it(`keeps a tip for ${MATCHUP_TTL_DAYS} days, then asks the AI again`, async () => {
  await getMatchup('Akali', 'Katarina');
  const stored = await prisma.matchupTip.findFirstOrThrow();
  const days =
    (stored.expiresAt.getTime() - stored.createdAt.getTime()) / 86_400_000;
  expect(days).toBe(MATCHUP_TTL_DAYS);

  await prisma.matchupTip.updateMany({
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const renewed = await getMatchup('Akali', 'Katarina');

  expect(renewed.cached).toBe(false);
  expect(geminiCalls).toHaveLength(2);
  expect(
    (await prisma.matchupTip.findFirstOrThrow()).expiresAt.getTime()
  ).toBeGreaterThan(Date.now());
});

it('an overloaded model (503) is tried again before giving up', async () => {
  geminiFault.once = [geminiUnavailable(), geminiUnavailable()];

  const res = await call('?a=Katarina&b=Akali');

  expect(res.status).toBe(200);
  expect(geminiFault.once).toHaveLength(0);
  // The last attempt went to the lighter, less busy model
  expect(geminiModels.at(-1)).toBe('gemini-flash-lite-latest');
  expect(await prisma.matchupTip.count()).toBe(1);
});

it('a model that stays overloaded is a 503 and nothing is stored', async () => {
  geminiFault.next = geminiUnavailable();

  const res = await call('?a=Katarina&b=Akali');

  expect(res.status).toBe(503);
  expect(await prisma.matchupTip.count()).toBe(0);
});

it('a bad answer from the AI is an error and nothing is stored', async () => {
  geminiFault.next = geminiText('Katarina é fraca contra Akali.');

  const res = await call('?a=Katarina&b=Akali');

  expect(res.status).toBe(503);
  expect(await prisma.matchupTip.count()).toBe(0);
});

it("Gemini's quota running out is a 429 with its retry time", async () => {
  geminiFault.next = geminiRateLimited('42s');

  const res = await call('?a=Katarina&b=Akali');

  expect(res.status).toBe(429);
  expect(res.headers.get('Retry-After')).toBe('42');
  expect(await prisma.matchupTip.count()).toBe(0);
});

describe('GET /api/matchup', () => {
  it('answers the table for a valid pair', async () => {
    const res = await call('?a=Katarina&b=Akali');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rows).toHaveLength(MATCHUP_ASPECTS.length);
    expect(body.cached).toBe(false);
  });

  it.each([
    ['', 'missing champions'],
    ['?a=Katarina', 'only one champion'],
    ['?a=Katarina&b=Katarina', 'the same champion twice'],
    ['?a=Katarina&b=NaoExiste', 'an unknown champion'],
  ])('400 for %s (%s), without calling the AI', async (query) => {
    expect((await call(query)).status).toBe(400);
    expect(geminiCalls).toHaveLength(0);
  });

  it(`limits each person to ${NEW_MATCHUPS_PER_HOUR} new matchups an hour; stored ones are free`, async () => {
    const ids = (await championList()).map((c) => c.id);
    const ip = `10.9.${Date.now() % 250}.1`;
    for (let i = 0; i < NEW_MATCHUPS_PER_HOUR; i++) {
      expect((await call(`?a=${ids[0]}&b=${ids[i + 1]}`, ip)).status).toBe(200);
    }

    const blocked = await call(`?a=${ids[0]}&b=${ids[50]}`, ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    // An already stored pair still answers
    expect((await call(`?a=${ids[1]}&b=${ids[0]}`, ip)).status).toBe(200);
    // Someone else isn't affected
    expect((await call(`?a=${ids[0]}&b=${ids[50]}`, '10.0.0.2')).status).toBe(
      200
    );
  });
});
