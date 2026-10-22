import { RANK_EMBLEM_BASE, formatTier, rankEmblem } from './rank-labels';

describe('formatTier', () => {
  it('translates the tier and keeps the division', () => {
    expect(formatTier('EMERALD', 'II')).toBe('Esmeralda II');
    expect(formatTier('IRON', 'IV')).toBe('Ferro IV');
  });

  it('apex tiers have no division', () => {
    expect(formatTier('MASTER', 'I')).toBe('Mestre');
    expect(formatTier('GRANDMASTER', 'I')).toBe('Grão-Mestre');
    expect(formatTier('CHALLENGER', 'I')).toBe('Desafiante');
  });

  it('falls back to the raw tier for unknown values', () => {
    expect(formatTier('NOVO_TIER', 'I')).toBe('NOVO_TIER I');
  });
});

describe('rankEmblem', () => {
  it('points every tier to its crest on Community Dragon, at a pinned game version', () => {
    for (const tier of ['IRON', 'GOLD', 'EMERALD', 'CHALLENGER']) {
      expect(rankEmblem(tier).src).toBe(
        `${RANK_EMBLEM_BASE}/ranked-emblem/emblem-${tier.toLowerCase()}.png`
      );
      expect(rankEmblem(tier).cropped).toBe(true);
    }
    expect(RANK_EMBLEM_BASE).not.toContain('/latest/');
  });

  it('no rank (or an unknown tier) gets the small "unranked" crest', () => {
    for (const tier of [null, 'UNRANKED', 'WOOD']) {
      expect(rankEmblem(tier)).toEqual({
        src: `${RANK_EMBLEM_BASE}/ranked-mini-crests/unranked.svg`,
        cropped: false,
      });
    }
  });
});
