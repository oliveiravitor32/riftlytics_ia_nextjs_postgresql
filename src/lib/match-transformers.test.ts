import {
  DATA_DRAGON_FALLBACK_VERSION,
  championImage,
} from './match-transformers';

describe('championImage', () => {
  it('uses the given Data Dragon version', () => {
    expect(championImage('Locke', '15.20.1')).toBe(
      'https://ddragon.leagueoflegends.com/cdn/15.20.1/img/champion/Locke.png'
    );
  });

  it('uses the fallback version by default', () => {
    expect(championImage('Ahri')).toContain(
      `/cdn/${DATA_DRAGON_FALLBACK_VERSION}/`
    );
  });
});
