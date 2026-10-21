/**
 * The daily WhatsApp summary (09:30 in Brasília, closing the game day): pure functions that turn
 * the day's facts into the message. Reading the facts from the database is
 * src/services/dailySummaryService.ts.
 */

import { formatTier } from './rank-labels';
import { compareRank } from './rank-order';

type Rank = { tier: string; rank: string; leaguePoints: number };

export type RankChange = {
  player: string;
  queue: string;
  from: Rank;
  to: Rank;
};

export type LevelChange = { player: string; from: number; to: number };

export type DayMatch = {
  player: string;
  champion: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  playedAt: Date;
};

type KdaHighlight = {
  player: string;
  champion: string;
  kda: string;
  ratio: number;
};
type CountHighlight = { player: string; games: number };

export type DayHighlights = {
  bestKda?: KdaHighlight;
  worstKda?: KdaHighlight;
  winStreak?: CountHighlight;
  lossStreak?: CountHighlight;
  mostGames?: CountHighlight;
};

export type DaySummary = {
  /** UTC midnight of the game day (10:00 to 09:59 in Brasília) */
  day: Date;
  appUrl: string;
  rankChanges: RankChange[];
  levels: LevelChange[];
  highlights: DayHighlights;
};

/** Level needed to play ranked */
export const RANKED_LEVEL = 30;
// Shorter streaks happen all the time; three in a row is news
const MIN_STREAK = 3;

const QUEUE_LABEL: Record<string, string> = {
  RANKED_SOLO_5x5: 'no Solo/Duo',
  RANKED_FLEX_SR: 'na Flex',
};

const ratioOf = (m: DayMatch) => (m.kills + m.assists) / Math.max(1, m.deaths);

function kdaHighlight(m: DayMatch): KdaHighlight {
  return {
    player: m.player,
    champion: m.champion,
    kda: `${m.kills}/${m.deaths}/${m.assists}`,
    ratio: Math.round(ratioOf(m) * 100) / 100,
  };
}

function longestStreak(games: DayMatch[], win: boolean): number {
  let best = 0;
  let current = 0;
  for (const g of games) {
    current = g.win === win ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

/** Best/worst KDA, longest win and loss streaks and who played most */
export function dayHighlights(matches: DayMatch[]): DayHighlights {
  if (matches.length === 0) return {};
  const highlights: DayHighlights = {};

  const byRatio = [...matches].sort((a, b) => ratioOf(b) - ratioOf(a));
  highlights.bestKda = kdaHighlight(byRatio[0]);
  if (byRatio.length > 1) highlights.worstKda = kdaHighlight(byRatio.at(-1)!);

  const byPlayer = new Map<string, DayMatch[]>();
  for (const m of [...matches].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime()
  )) {
    byPlayer.set(m.player, [...(byPlayer.get(m.player) ?? []), m]);
  }

  for (const [key, win] of [
    ['winStreak', true],
    ['lossStreak', false],
  ] as const) {
    let best: CountHighlight | undefined;
    for (const [player, games] of byPlayer) {
      const streak = longestStreak(games, win);
      if (streak >= MIN_STREAK && streak > (best?.games ?? 0)) {
        best = { player, games: streak };
      }
    }
    if (best) highlights[key] = best;
  }

  const most = [...byPlayer].sort((a, b) => b[1].length - a[1].length)[0];
  if (most[1].length > 1) {
    highlights.mostGames = { player: most[0], games: most[1].length };
  }
  return highlights;
}

function rankLines(changes: RankChange[]): string[] {
  return changes.map(({ player, queue, from, to }) => {
    // compareRank sorts higher ranks first: negative = `to` is above `from`
    const up = compareRank(to, from) < 0;
    const where = QUEUE_LABEL[queue] ?? `em ${queue}`;
    return up
      ? `⬆️ ${player} subiu para ${formatTier(to.tier, to.rank)} ${where} (era ${formatTier(from.tier, from.rank)})`
      : `⬇️ ${player} caiu para ${formatTier(to.tier, to.rank)} ${where} (era ${formatTier(from.tier, from.rank)})`;
  });
}

function levelLines(levels: LevelChange[]): string[] {
  return levels.map(({ player, from, to }) => {
    if (to >= RANKED_LEVEL) {
      return `🎉 ${player} finalmente chegou ao nível ${RANKED_LEVEL}! Bora de ranked!`;
    }
    const gained = to - from;
    return `${player} subiu ${gained} ${gained === 1 ? 'nível' : 'níveis'} hoje (${from} → ${to}). Faltam ${RANKED_LEVEL - to} para o ${RANKED_LEVEL}!`;
  });
}

function highlightLines(h: DayHighlights): string[] {
  const lines: string[] = [];
  const kda = (k: KdaHighlight) =>
    `${k.player} de ${k.champion}, ${k.kda} (${k.ratio.toFixed(2)})`;
  if (h.bestKda) lines.push(`🏆 Melhor KDA: ${kda(h.bestKda)}`);
  if (h.worstKda) lines.push(`💀 Pior KDA: ${kda(h.worstKda)}`);
  if (h.winStreak) {
    lines.push(`🔥 ${h.winStreak.player} venceu ${h.winStreak.games} seguidas`);
  }
  if (h.lossStreak) {
    lines.push(
      `🧊 ${h.lossStreak.player} perdeu ${h.lossStreak.games} seguidas`
    );
  }
  if (h.mostGames) {
    lines.push(
      `🎮 Quem mais jogou: ${h.mostGames.player}, ${h.mostGames.games} partidas`
    );
  }
  return lines;
}

/** The WhatsApp message, or null when the day had nothing to tell */
export function buildSummaryText(summary: DaySummary): string | null {
  const sections = [
    ['📈 *Elo*', rankLines(summary.rankChanges)],
    ['⭐ *Destaques*', highlightLines(summary.highlights)],
    [`🎯 *Rumo ao ${RANKED_LEVEL}*`, levelLines(summary.levels)],
  ] as const;
  const filled = sections.filter(([, lines]) => lines.length > 0);
  if (filled.length === 0) return null;

  const date = summary.day.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
  return [
    `🌙 *Resumo do dia ${date}* · Riftlytics`,
    ...filled.map(([title, lines]) => [title, ...lines].join('\n')),
    `🔗 ${summary.appUrl}`,
  ].join('\n\n');
}
