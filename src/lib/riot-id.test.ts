import { parseRiotId, parseRiotSlug, profileHref, toRiotSlug } from './riot-id';

describe('riot-id', () => {
  it('round-trips names with spaces and dashes', () => {
    for (const [gameName, tagLine] of [
      ['Pistola Torta', 'br1'],
      ['Some-Dashed-Name', 'BR1'],
      ['Ação', 'ÇÃO'],
    ]) {
      expect(parseRiotSlug(toRiotSlug(gameName, tagLine))).toEqual({
        gameName,
        tagLine,
      });
    }
  });

  it('rejects slugs without a name or tag', () => {
    expect(parseRiotSlug('SemTag')).toBeNull();
    expect(parseRiotSlug('-br1')).toBeNull();
    expect(parseRiotSlug('Nome-')).toBeNull();
  });

  it('builds the profile URL', () => {
    expect(profileHref('br1', 'Pistola Torta', 'br1')).toBe(
      '/perfil/br1/Pistola%20Torta-br1'
    );
  });
});

describe('parseRiotId', () => {
  it('splits "Name#TAG" at the last #', () => {
    expect(parseRiotId('Pistola Torta#br1')).toEqual({
      gameName: 'Pistola Torta',
      tagLine: 'br1',
    });
  });

  it.each(['semtag', '#br1', 'Nome#'])('null for %p', (value) => {
    expect(parseRiotId(value)).toBeNull();
  });
});
