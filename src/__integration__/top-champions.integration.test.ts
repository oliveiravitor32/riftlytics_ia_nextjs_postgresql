/**
 * Top 3 champions per player over their last 100 stored matches, read from
 * the real (test) database and cached in Redis. No Riot calls: the matches
 * stored by the earlier files (alphabetical order) are enough.
 */

import { prisma } from '@/src/lib/db';
import { invalidate } from '@/src/lib/cache';
import {
  TOP_CHAMPIONS_CACHE_KEY,
  TOP_CHAMPIONS_WINDOW,
  getTopChampions,
} from '@/src/services/topChampionsService';

/** What the service should say, counted here from the rows themselves */
async function expectedFor(playerId: string) {
  const rows = await prisma.playerMatch.findMany({
    where: { playerId },
    orderBy: { playedAt: 'desc' },
    take: TOP_CHAMPIONS_WINDOW,
    select: { championName: true },
  });
  const games = new Map<string, number>();
  for (const r of rows) {
    games.set(r.championName, (games.get(r.championName) ?? 0) + 1);
  }
  return [...games.values()].sort((a, b) => b - a).slice(0, 3);
}

beforeAll(() => invalidate(TOP_CHAMPIONS_CACHE_KEY));
// The fake match below has no payload: later files (the profile) must not see it
afterAll(async () => {
  await prisma.match.deleteMany({ where: { id: 'TOP_1' } });
  await invalidate(TOP_CHAMPIONS_CACHE_KEY);
});

it('gives each active player their 3 most played of the last 100', async () => {
  const top = await getTopChampions();
  const players = await prisma.player.findMany({ where: { active: true } });

  for (const p of players) {
    const mine = top[p.id] ?? [];
    expect(mine.map((c) => c.games)).toEqual(await expectedFor(p.id));
    for (const c of mine) {
      expect(c.image).toContain(`/champion/${c.champion}.png`);
    }
  }
  // The mock world gives the group plenty of matches
  expect(Object.values(top).some((t) => t.length === 3)).toBe(true);
});

it('is cached: a new match does not change it until the cache expires', async () => {
  const before = await getTopChampions();
  const alfa = await prisma.player.findFirstOrThrow({
    where: { gameName: 'Alfa' },
  });
  await prisma.match.create({
    data: {
      id: 'TOP_1',
      queueId: 420,
      gameCreation: new Date(),
      gameDuration: 1800,
      data: {},
      players: {
        create: {
          playerId: alfa.id,
          playedAt: new Date(),
          queueId: 420,
          championName: 'Campeao Novo',
          position: 'MIDDLE',
          win: true,
          kills: 1,
          deaths: 1,
          assists: 1,
        },
      },
    },
  });

  expect(await getTopChampions()).toEqual(before);

  await invalidate(TOP_CHAMPIONS_CACHE_KEY);
  expect((await getTopChampions())[alfa.id].map((c) => c.games)).toEqual(
    await expectedFor(alfa.id)
  );
});
