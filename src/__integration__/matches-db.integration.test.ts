/**
 * Matches of group players live in the DB: a finished match is fetched from
 * Riot once and read from the DB forever after. The profile list syncs only
 * the newest IDs from Riot; older pages and the stats come from the DB.
 * Real Riot + Supabase + Upstash. Restores the rows it deletes (by re-syncing).
 */

import { NextRequest } from 'next/server';
import { GET as getMatches } from '@/src/app/api/matches/[summonerName]/route';
import {
  fillHistory,
  getMatch,
  getMatchStats,
  getProfileMatches,
  syncNewMatches,
} from '@/src/services/matchService';
import { latestDataDragonVersion } from '@/src/services/dataDragonService';
import { prisma } from '@/src/lib/db';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { leagueApiService } from '@/src/services/leagueApiService';

const PLAYER = { gameName: 'Bravo', tagLine: 'TST' };
const RIOT_ID = `${PLAYER.gameName}#${PLAYER.tagLine}`;

let spy: jest.SpyInstance;
const riotUrls = () =>
  spy.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes('riotgames.com'));
const detailCalls = () =>
  riotUrls().filter((url) =>
    /\/lol\/match\/v5\/matches\/[A-Z0-9]+_\d+$/.test(url)
  );

let playerId: string;

/** The player's complete window (newest first), what profile pages list */
async function storedIds() {
  const { matchesSyncedUntil } = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
  });
  const rows = await prisma.playerMatch.findMany({
    where: { playerId, playedAt: { gte: matchesSyncedUntil ?? new Date() } },
    orderBy: { playedAt: 'desc' },
    select: { matchId: true },
  });
  return rows.map((r) => r.matchId);
}

beforeAll(async () => {
  const player = await prisma.player.findFirstOrThrow({
    where: PLAYER,
    select: { id: true },
  });
  playerId = player.id;
  // Same starting point whatever other files stored: no history, then the 12
  // newest matches (Riot answers are recorded for exactly this sequence)
  await prisma.playerMatch.deleteMany({ where: { playerId } });
  await prisma.player.update({
    where: { id: playerId },
    data: { matchesSyncedUntil: null },
  });
  await syncNewMatches(playerId, 12);
});

beforeEach(() => {
  spy = jest.spyOn(global, 'fetch');
});
afterEach(() => spy.mockRestore());

describe('syncNewMatches', () => {
  it('stores only the newest matches the DB is missing', async () => {
    const before = await storedIds();
    // Forget the 3 newest: the sync must bring back exactly those
    await prisma.playerMatch.deleteMany({
      where: { playerId, matchId: { in: before.slice(0, 3) } },
    });

    spy.mockClear();
    const added = await syncNewMatches(playerId, before.length);

    expect(added).toBe(3);
    expect(await storedIds()).toEqual(before);
  });

  it('a second sync without new games fetches no match details', async () => {
    await syncNewMatches(playerId, 20);
    spy.mockClear();

    expect(await syncNewMatches(playerId, 20)).toBe(0);
    expect(detailCalls()).toHaveLength(0);
  });

  it('links every group member found in the match', async () => {
    const [matchId] = await storedIds();
    const match = await getMatch(matchId);
    const groupPuuids = (
      await prisma.player.findMany({
        where: { puuid: { in: match.metadata.participants } },
        select: { id: true },
      })
    ).map((p) => p.id);

    const linked = await prisma.playerMatch.findMany({
      where: { matchId },
      select: { playerId: true },
    });

    expect(linked.map((l) => l.playerId).sort()).toEqual(groupPuuids.sort());
  });
});

describe('fillHistory', () => {
  it('continues from before the complete window up to the target', async () => {
    const before = await storedIds();

    const added = await fillHistory(playerId, before.length + 2);

    expect(added).toBe(2);
    const after = await storedIds();
    expect(after).toHaveLength(before.length + 2);
    expect(after.slice(0, before.length)).toEqual(before);
  });

  it('does nothing once the target is reached', async () => {
    const stored = (await storedIds()).length;
    spy.mockClear();

    expect(await fillHistory(playerId, stored)).toBe(0);
    expect(riotUrls()).toHaveLength(0);
  });
});

describe('getMatch', () => {
  it('reads a stored match from the DB without calling Riot', async () => {
    const [matchId] = await storedIds();
    spy.mockClear();

    const match = await getMatch(matchId);

    expect(match.metadata.matchId).toBe(matchId);
    expect(riotUrls()).toHaveLength(0);
  });

  it('fetches an unknown match from Riot once and stores it', async () => {
    const [matchId] = await storedIds();
    await prisma.match.delete({ where: { id: matchId } });

    spy.mockClear();
    const fresh = await getMatch(matchId);
    expect(detailCalls()).toHaveLength(1);

    spy.mockClear();
    expect(await getMatch(matchId)).toEqual(fresh);
    expect(riotUrls()).toHaveLength(0);
    // The player's line came back with it
    expect(await storedIds()).toContain(matchId);
  });
});

describe('getProfileMatches', () => {
  it('first page = newest stored matches, in order', async () => {
    const ids = await storedIds();

    const page = await getProfileMatches(RIOT_ID, 0, 5);

    expect(page.matches.map((m) => m.matchId)).toEqual(ids.slice(0, 5));
    expect(page.hasMore).toBe(true);
  });

  it('shows match images from the latest Data Dragon version', async () => {
    const page = await getProfileMatches(RIOT_ID, 0, 1);

    expect(page.matches[0].championImage).toContain(
      `/cdn/${await latestDataDragonVersion()}/`
    );
  });

  it('"load more" reads stored matches from the DB only', async () => {
    const ids = await storedIds();
    spy.mockClear();

    const page = await getProfileMatches(RIOT_ID, 5, 5);

    expect(page.matches.map((m) => m.matchId)).toEqual(ids.slice(5, 10));
    expect(riotUrls()).toHaveLength(0);
  });

  it('past the stored history it continues from Riot and stores it', async () => {
    const ids = await storedIds();

    const page = await getProfileMatches(RIOT_ID, ids.length, 1);

    const after = await storedIds();
    expect(after.slice(0, ids.length)).toEqual(ids);
    // The next older match, plus one more read to know there is another page
    expect(after).toHaveLength(ids.length + 2);
    expect(page.matches.map((m) => m.matchId)).toEqual([after[ids.length]]);
    expect(page.hasMore).toBe(true);
  });

  it('only group players have a stored history', async () => {
    await expect(
      getProfileMatches('Forasteiro#FORA', 0, 5)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getMatchStats', () => {
  it('summarizes every stored match, not just a page', async () => {
    const rows = await prisma.playerMatch.findMany({ where: { playerId } });

    const stats = await getMatchStats(RIOT_ID);

    expect(stats.total).toBe(rows.length);
    const top = stats.champions[0];
    expect(top.games).toBe(
      rows.filter((r) => r.championName === top.champion).length
    );
    expect(stats.champions.length).toBeLessThanOrEqual(5);
    expect(stats.roles.reduce((sum, r) => sum + r.games, 0)).toBe(rows.length);
  });

  it('shows champion images from the latest Data Dragon version', async () => {
    const stats = await getMatchStats(RIOT_ID);

    expect(stats.champions[0].image).toContain(
      `/cdn/${await latestDataDragonVersion()}/`
    );
  });
});

describe('GET /api/matches', () => {
  it('serves pages from the DB through the route', async () => {
    const ids = await storedIds();
    const res = await getMatches(
      new NextRequest(
        `http://localhost/api/matches/${encodeURIComponent(RIOT_ID)}?start=0&count=3`
      ),
      { params: Promise.resolve({ summonerName: encodeURIComponent(RIOT_ID) }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches.map((m: { matchId: string }) => m.matchId)).toEqual(
      ids.slice(0, 3)
    );
    expect(body).toMatchObject({ count: 3, nextStart: 3, hasMore: true });
  });
});

it('the Riot service no longer keeps matches in memory', async () => {
  const [matchId] = await storedIds();
  await leagueApiService.getMatchDetails(matchId);
  spy.mockClear();

  await leagueApiService.getMatchDetails(matchId);

  expect(detailCalls()).toHaveLength(1);
});

it('asks Riot for at most 100 ids even when told to sync more', async () => {
  spy.mockClear();

  await syncNewMatches(playerId, RIOT_API_CONSTANTS.DEFAULTS.MAX_MATCHES + 50);

  const idCalls = riotUrls().filter((url) => url.includes('/ids?'));
  expect(idCalls.length).toBeGreaterThan(0);
  for (const url of idCalls) {
    expect(Number(new URL(url).searchParams.get('count'))).toBeLessThanOrEqual(
      RIOT_API_CONSTANTS.DEFAULTS.MAX_MATCHES
    );
  }
});
