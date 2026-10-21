/**
 * Facts of one game day (10:00 to 09:59 in Brasília) for the WhatsApp summary (server only): rank
 * changes, the countdown to level 30 and the day's highlights, read from the
 * snapshots and stored matches. The message itself is src/lib/daily-summary.ts.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { DAY_START_HOUR } from '@/src/services/snapshotService';
import {
  RANKED_LEVEL,
  dayHighlights,
  type DaySummary,
  type LevelChange,
  type RankChange,
} from '@/src/lib/daily-summary';

const HOUR = 3_600_000;
// Brazil has no daylight saving time since 2019: midnight there is 03:00 UTC
const BRASILIA_OFFSET = 3 * HOUR;

function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : 'http://localhost:3000';
}

/** `day`: the game day as its UTC midnight (gameDay) */
export async function collectDaySummary(day: Date): Promise<DaySummary> {
  const snapshotDate = day;
  // 10:00 in Brasília of that date, until 09:59 of the next
  const start = new Date(
    day.getTime() + BRASILIA_OFFSET + DAY_START_HOUR * HOUR
  );
  const end = new Date(start.getTime() + 24 * HOUR);

  const players = await prisma.player.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      displayName: true,
      pdlSnapshots: {
        where: { snapshotDate: { lte: snapshotDate } },
        orderBy: { snapshotDate: 'desc' },
      },
      levelSnapshots: {
        where: { snapshotDate: { lte: snapshotDate } },
        orderBy: { snapshotDate: 'desc' },
        take: 2,
      },
      matches: {
        where: { playedAt: { gte: start, lt: end } },
        orderBy: { playedAt: 'asc' },
      },
    },
  });

  const rankChanges: RankChange[] = [];
  const levels: LevelChange[] = [];
  for (const p of players) {
    for (const queue of ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR']) {
      const [today, before] = p.pdlSnapshots.filter(
        (s) => s.queueType === queue
      );
      if (
        today?.snapshotDate.getTime() === snapshotDate.getTime() &&
        before &&
        (today.tier !== before.tier || today.rank !== before.rank)
      ) {
        const rank = (s: typeof today) => ({
          tier: s.tier,
          rank: s.rank,
          leaguePoints: s.leaguePoints,
        });
        rankChanges.push({
          player: p.displayName,
          queue,
          from: rank(before),
          to: rank(today),
        });
      }
    }

    const [today, before] = p.levelSnapshots;
    if (
      today?.snapshotDate.getTime() === snapshotDate.getTime() &&
      before &&
      before.summonerLevel < RANKED_LEVEL &&
      today.summonerLevel > before.summonerLevel
    ) {
      levels.push({
        player: p.displayName,
        from: before.summonerLevel,
        to: today.summonerLevel,
      });
    }
  }

  return {
    day: snapshotDate,
    appUrl: appUrl(),
    rankChanges,
    levels,
    highlights: dayHighlights(
      players.flatMap((p) =>
        p.matches.map((m) => ({
          player: p.displayName,
          champion: m.championName,
          win: m.win,
          kills: m.kills,
          deaths: m.deaths,
          assists: m.assists,
          playedAt: m.playedAt,
        }))
      )
    ),
  };
}
