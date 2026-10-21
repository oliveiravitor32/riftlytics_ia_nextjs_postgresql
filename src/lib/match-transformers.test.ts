import {
  DATA_DRAGON_FALLBACK_VERSION,
  championImage,
  dataDragonVersion,
} from './match-transformers';

describe('dataDragonVersion', () => {
  it('turns the match patch into its Data Dragon version', () => {
    expect(dataDragonVersion('15.20.710.4560')).toBe('15.20.1');
    expect(dataDragonVersion('14.1.555.1234')).toBe('14.1.1');
  });

  it('falls back when the patch is missing or unknown', () => {
    expect(dataDragonVersion(undefined)).toBe(DATA_DRAGON_FALLBACK_VERSION);
    expect(dataDragonVersion('')).toBe(DATA_DRAGON_FALLBACK_VERSION);
    expect(dataDragonVersion('lolpatch_7.20')).toBe(
      DATA_DRAGON_FALLBACK_VERSION
    );
  });
});

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
