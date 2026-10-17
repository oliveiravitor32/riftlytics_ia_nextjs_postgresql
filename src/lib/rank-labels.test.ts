import { formatTier } from './rank-labels';

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
