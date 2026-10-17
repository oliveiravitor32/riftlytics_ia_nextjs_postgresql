import { compareRank } from './rank-order';

const entry = (tier: string, rank: string, leaguePoints: number) => ({
  tier,
  rank,
  leaguePoints,
});

describe('compareRank (higher rank first)', () => {
  it('orders by tier, then division, then LP', () => {
    const sorted = [
      entry('GOLD', 'I', 99),
      entry('PLATINUM', 'IV', 0),
      entry('GOLD', 'II', 100),
      entry('GOLD', 'I', 10),
      entry('IRON', 'IV', 50),
    ].sort(compareRank);

    expect(sorted).toEqual([
      entry('PLATINUM', 'IV', 0),
      entry('GOLD', 'I', 99),
      entry('GOLD', 'I', 10),
      entry('GOLD', 'II', 100),
      entry('IRON', 'IV', 50),
    ]);
  });

  it('apex tiers (no real division) are ordered by LP only', () => {
    const sorted = [
      entry('MASTER', 'I', 300),
      entry('CHALLENGER', 'I', 900),
      entry('GRANDMASTER', 'I', 600),
      entry('MASTER', 'I', 450),
    ].sort(compareRank);

    expect(sorted.map((e) => `${e.tier}:${e.leaguePoints}`)).toEqual([
      'CHALLENGER:900',
      'GRANDMASTER:600',
      'MASTER:450',
      'MASTER:300',
    ]);
  });

  it('a lower tier never beats a higher one, whatever the LP', () => {
    expect(
      compareRank(entry('SILVER', 'I', 100), entry('GOLD', 'IV', 0))
    ).toBeGreaterThan(0);
  });

  it('equal ranks compare as 0', () => {
    expect(compareRank(entry('GOLD', 'II', 50), entry('GOLD', 'II', 50))).toBe(
      0
    );
  });
});
