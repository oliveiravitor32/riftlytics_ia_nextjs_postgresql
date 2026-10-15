import {
  parseRiotIdInput,
  parseRiotSlug,
  profileHref,
  toRiotSlug,
} from './riot-id';

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

  it('parses the search input "Name#TAG", trimming spaces', () => {
    expect(parseRiotIdInput('  Neutro7 # BR1 ')).toEqual({
      gameName: 'Neutro7',
      tagLine: 'BR1',
    });
    expect(parseRiotIdInput('SemTag')).toBeNull();
    expect(parseRiotIdInput('#BR1')).toBeNull();
  });

  it('builds the profile URL', () => {
    expect(profileHref('br1', 'Pistola Torta', 'br1')).toBe(
      '/perfil/br1/Pistola%20Torta-br1'
    );
  });
});
