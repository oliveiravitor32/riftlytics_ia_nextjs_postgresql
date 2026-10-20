import {
  buildSummaryText,
  dayHighlights,
  type DaySummary,
  type DayMatch,
} from './daily-summary';
import { formatTier } from './rank-labels';

const DAY = new Date('2026-10-19T00:00:00Z');

const empty: DaySummary = {
  day: DAY,
  appUrl: 'https://riftlytics.test',
  rankChanges: [],
  levels: [],
  highlights: {},
};

const game = (
  player: string,
  win: boolean,
  [kills, deaths, assists]: [number, number, number],
  minute: number,
  champion = 'Katarina'
): DayMatch => ({
  player,
  champion,
  win,
  kills,
  deaths,
  assists,
  playedAt: new Date(DAY.getTime() + minute * 60_000),
});

describe('buildSummaryText', () => {
  it('says nothing on a day with nothing to tell', () => {
    expect(buildSummaryText(empty)).toBeNull();
  });

  it('dates the summary with the Brasília day', () => {
    const text = buildSummaryText({
      ...empty,
      highlights: { mostGames: { player: 'Bravo', games: 3 } },
    })!;
    expect(text).toContain('19/10');
    expect(text).toContain('https://riftlytics.test');
  });

  it('announces who went up and who went down, per queue', () => {
    const text = buildSummaryText({
      ...empty,
      rankChanges: [
        {
          player: 'Alfa',
          queue: 'RANKED_SOLO_5x5',
          from: { tier: 'GOLD', rank: 'II', leaguePoints: 90 },
          to: { tier: 'GOLD', rank: 'I', leaguePoints: 15 },
        },
        {
          player: 'Bravo',
          queue: 'RANKED_FLEX_SR',
          from: { tier: 'SILVER', rank: 'III', leaguePoints: 5 },
          to: { tier: 'SILVER', rank: 'IV', leaguePoints: 75 },
        },
      ],
    })!;

    expect(text).toMatch(
      new RegExp(`⬆️ Alfa subiu para ${formatTier('GOLD', 'I')} no Solo/Duo`)
    );
    expect(text).toContain(`era ${formatTier('GOLD', 'II')}`);
    expect(text).toMatch(
      new RegExp(`⬇️ Bravo caiu para ${formatTier('SILVER', 'IV')} na Flex`)
    );
  });

  it('counts down the levels to 30 and celebrates reaching it', () => {
    const text = buildSummaryText({
      ...empty,
      levels: [
        { player: 'Echo', from: 24, to: 26 },
        { player: 'Delta', from: 29, to: 30 },
      ],
    })!;

    expect(text).toContain(
      'Echo subiu 2 níveis hoje (24 → 26). Faltam 4 para o 30'
    );
    expect(text).toContain('Delta finalmente chegou ao nível 30');
    expect(text).not.toContain('Delta subiu');
  });

  it('a single level is written in the singular', () => {
    const text = buildSummaryText({
      ...empty,
      levels: [{ player: 'Echo', from: 27, to: 28 }],
    })!;
    expect(text).toContain(
      'Echo subiu 1 nível hoje (27 → 28). Faltam 2 para o 30'
    );
  });

  it('lists the highlights it has', () => {
    const text = buildSummaryText({
      ...empty,
      highlights: {
        bestKda: { player: 'Alfa', champion: 'Ahri', kda: '12/1/9', ratio: 21 },
        worstKda: {
          player: 'Bravo',
          champion: 'Yasuo',
          kda: '1/11/2',
          ratio: 0.27,
        },
        winStreak: { player: 'Alfa', games: 4 },
        lossStreak: { player: 'Bravo', games: 3 },
        mostGames: { player: 'Bravo', games: 7 },
      },
    })!;

    expect(text).toContain('Melhor KDA: Alfa de Ahri, 12/1/9 (21.00)');
    expect(text).toContain('Pior KDA: Bravo de Yasuo, 1/11/2 (0.27)');
    expect(text).toContain('Alfa venceu 4 seguidas');
    expect(text).toContain('Bravo perdeu 3 seguidas');
    expect(text).toContain('Quem mais jogou: Bravo, 7 partidas');
  });
});

describe('dayHighlights', () => {
  it('has none without games', () => {
    expect(dayHighlights([])).toEqual({});
  });

  it('best and worst KDA ratio, deaths counted as at least 1', () => {
    const h = dayHighlights([
      game('Alfa', true, [10, 0, 5], 10, 'Ahri'),
      game('Bravo', false, [1, 8, 1], 20, 'Yasuo'),
      game('Alfa', false, [3, 3, 3], 30),
    ]);

    expect(h.bestKda).toEqual({
      player: 'Alfa',
      champion: 'Ahri',
      kda: '10/0/5',
      ratio: 15,
    });
    expect(h.worstKda).toMatchObject({
      player: 'Bravo',
      kda: '1/8/1',
      ratio: 0.25,
    });
  });

  it('a single game is not both the best and the worst', () => {
    const h = dayHighlights([game('Alfa', true, [5, 2, 5], 10)]);
    expect(h.bestKda).toBeDefined();
    expect(h.worstKda).toBeUndefined();
  });

  it('streaks of 3+ in a row, in the order played', () => {
    const h = dayHighlights([
      // Played out of order on purpose: 10, 20, 30, 40 → W W W W
      game('Alfa', true, [1, 1, 1], 30),
      game('Alfa', true, [1, 1, 1], 10),
      game('Alfa', true, [1, 1, 1], 40),
      game('Alfa', true, [1, 1, 1], 20),
      // L L W L → longest loss streak is 2: not a highlight
      game('Bravo', false, [1, 1, 1], 10),
      game('Bravo', false, [1, 1, 1], 20),
      game('Bravo', true, [1, 1, 1], 30),
      game('Bravo', false, [1, 1, 1], 40),
    ]);

    expect(h.winStreak).toEqual({ player: 'Alfa', games: 4 });
    expect(h.lossStreak).toBeUndefined();
  });

  it('most games only when someone played more than once', () => {
    expect(
      dayHighlights([game('Alfa', true, [1, 1, 1], 1)]).mostGames
    ).toBeUndefined();
    expect(
      dayHighlights([
        game('Alfa', true, [1, 1, 1], 1),
        game('Bravo', true, [1, 1, 1], 2),
        game('Bravo', false, [1, 1, 1], 3),
      ]).mostGames
    ).toEqual({ player: 'Bravo', games: 2 });
  });
});
