/**
 * Daily summary read from the real (test) database: a known day is written
 * straight into the tables, then the service and GET /api/resumo must tell
 * exactly what happened. No Riot calls.
 */

import { NextRequest } from 'next/server';
import { GET as getResumo } from '@/src/app/api/resumo/route';
import { collectDaySummary } from '@/src/services/dailySummaryService';
import { buildSummaryText } from '@/src/lib/daily-summary';
import { prisma } from '@/src/lib/db';

// A past game day, far from the mock world's matches (which are recent)
const DAY = '2025-03-10';
const date = (d: string) => new Date(`${d}T00:00:00Z`);
// Brasília is UTC-3; a game day runs from 10:00 to 09:59 of the next day
const at = (hhmm: string, day = DAY) => new Date(`${day}T${hhmm}:00-03:00`);

let alfa: string;
let bravo: string;
let echo: string;

async function snapshot(
  playerId: string,
  day: string,
  queueType: string,
  tier: string,
  rank: string,
  leaguePoints: number
) {
  await prisma.pDLSnapshot.create({
    data: {
      playerId,
      queueType,
      tier,
      rank,
      leaguePoints,
      wins: 10,
      losses: 10,
      snapshotDate: date(day),
    },
  });
}

let seq = 0;
async function played(
  playerId: string,
  playedAt: Date,
  win: boolean,
  [kills, deaths, assists]: [number, number, number],
  championName = 'Ahri'
) {
  const matchId = `TEST_${++seq}`;
  await prisma.match.create({
    data: {
      id: matchId,
      queueId: 420,
      gameCreation: playedAt,
      gameDuration: 1800,
      data: {},
    },
  });
  await prisma.playerMatch.create({
    data: {
      playerId,
      matchId,
      playedAt,
      queueId: 420,
      championName,
      position: 'MIDDLE',
      win,
      kills,
      deaths,
      assists,
    },
  });
}

beforeAll(async () => {
  const id = async (gameName: string) =>
    (await prisma.player.findFirstOrThrow({ where: { gameName } })).id;
  [alfa, bravo, echo] = await Promise.all([
    id('Alfa'),
    id('Bravo'),
    id('Echo'),
  ]);

  // Alfa: Gold II → Gold I in Solo/Duo; Bravo: same division, only LP moved
  await snapshot(alfa, '2025-03-08', 'RANKED_SOLO_5x5', 'GOLD', 'II', 80);
  await snapshot(alfa, DAY, 'RANKED_SOLO_5x5', 'GOLD', 'I', 10);
  await snapshot(bravo, '2025-03-09', 'RANKED_SOLO_5x5', 'SILVER', 'I', 20);
  await snapshot(bravo, DAY, 'RANKED_SOLO_5x5', 'SILVER', 'I', 60);
  // Bravo dropped a division in Flex
  await snapshot(bravo, '2025-03-09', 'RANKED_FLEX_SR', 'SILVER', 'III', 0);
  await snapshot(bravo, DAY, 'RANKED_FLEX_SR', 'SILVER', 'IV', 70);

  // Echo: 24 → 26; Alfa (way past 30) levelled up too, not news
  await prisma.levelSnapshot.createMany({
    data: [
      { playerId: echo, snapshotDate: date('2025-03-09'), summonerLevel: 24 },
      { playerId: echo, snapshotDate: date(DAY), summonerLevel: 26 },
      { playerId: alfa, snapshotDate: date('2025-03-09'), summonerLevel: 300 },
      { playerId: alfa, snapshotDate: date(DAY), summonerLevel: 301 },
    ],
  });

  // Games of the game day, plus one just before and one just after
  await played(alfa, at('10:00'), true, [10, 1, 5], 'Katarina');
  await played(alfa, at('11:00'), true, [4, 4, 4]);
  await played(alfa, at('12:00'), true, [6, 2, 6]);
  await played(bravo, at('20:00'), false, [1, 9, 2], 'Yasuo');
  // Late night: 02:00 of the 11th still belongs to the 10th
  await played(bravo, at('02:00', '2025-03-11'), false, [2, 5, 3]);
  await played(bravo, at('09:59'), false, [0, 20, 0]); // still the 9th
  await played(bravo, at('10:00', '2025-03-11'), true, [30, 0, 30]); // the 11th
});

describe('collectDaySummary', () => {
  it('reads one game day of facts (10:00 to 09:59)', async () => {
    const summary = await collectDaySummary(date(DAY));

    expect(summary.rankChanges).toEqual([
      {
        player: 'Alfa',
        queue: 'RANKED_SOLO_5x5',
        from: { tier: 'GOLD', rank: 'II', leaguePoints: 80 },
        to: { tier: 'GOLD', rank: 'I', leaguePoints: 10 },
      },
      {
        player: 'Bravo',
        queue: 'RANKED_FLEX_SR',
        from: { tier: 'SILVER', rank: 'III', leaguePoints: 0 },
        to: { tier: 'SILVER', rank: 'IV', leaguePoints: 70 },
      },
    ]);
    expect(summary.levels).toEqual([{ player: 'Echo', from: 24, to: 26 }]);
    // Only the 5 games of the game day: the 0/20/0 and the 30/0/30 are out
    expect(summary.highlights).toEqual({
      bestKda: {
        player: 'Alfa',
        champion: 'Katarina',
        kda: '10/1/5',
        ratio: 15,
      },
      worstKda: {
        player: 'Bravo',
        champion: 'Yasuo',
        kda: '1/9/2',
        ratio: 0.33,
      },
      winStreak: { player: 'Alfa', games: 3 },
      mostGames: { player: 'Alfa', games: 3 },
    });
  });

  it('a day without data has nothing to tell', async () => {
    const summary = await collectDaySummary(date('2025-01-01'));
    expect(buildSummaryText(summary)).toBeNull();
  });
});

describe('GET /api/resumo', () => {
  const call = (query: string, token?: string) =>
    getResumo(
      new NextRequest(`http://localhost/api/resumo${query}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      })
    );

  it('needs the CRON_SECRET', async () => {
    expect((await call(`?dia=${DAY}`)).status).toBe(401);
    expect((await call(`?dia=${DAY}`, 'errado')).status).toBe(401);
  });

  it("returns the day's message", async () => {
    const res = await call(`?dia=${DAY}`, process.env.CRON_SECRET);
    const { text } = await res.json();

    expect(res.status).toBe(200);
    expect(text).toBe(buildSummaryText(await collectDaySummary(date(DAY))));
    expect(text).toContain('Alfa subiu para Ouro I');
    expect(text).toContain('Echo subiu 2 níveis hoje');
  });

  it('text is null on a quiet day, and a bad date is a 400', async () => {
    const quiet = await call('?dia=2025-01-01', process.env.CRON_SECRET);
    expect(await quiet.json()).toEqual({ text: null });

    expect((await call('?dia=ontem', process.env.CRON_SECRET)).status).toBe(
      400
    );
  });

  it('defaults to the current game day', async () => {
    const res = await call('', process.env.CRON_SECRET);
    expect(res.status).toBe(200);
  });
});
