import { MAX_EMBEDS, splitLinks, videoEmbeds } from './video-embeds';

const embedOf = (text: string) => videoEmbeds(text)[0]?.embedUrl;

describe('YouTube', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&list=x',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('%s → privacy-enhanced player', (url) => {
    expect(embedOf(url)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });

  it.each([
    ['?t=90', 90],
    ['?t=1m30s', 90],
    ['?t=1h2m3s', 3723],
  ])('keeps the start time (%s)', (t, start) => {
    expect(embedOf(`https://youtu.be/dQw4w9WgXcQ${t}`)).toBe(
      `https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=${start}`
    );
  });

  it('ignores a bad id or a page that is not a video', () => {
    expect(videoEmbeds('https://youtube.com/watch?v=curto')).toEqual([]);
    expect(videoEmbeds('https://youtube.com/@canal')).toEqual([]);
    expect(embedOf('https://youtu.be/dQw4w9WgXcQ?t=abc')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });
});

describe('Medal', () => {
  it.each([
    'https://medal.tv/games/league-of-legends/clips/jQ2m8Zb9pL/d1337abc?invite=x',
    'https://medal.tv/clip/jQ2m8Zb9pL/d1337abc',
  ])('%s → Medal player, without autoplay', (url) => {
    expect(embedOf(url)).toBe(
      'https://medal.tv/clip/jQ2m8Zb9pL/d1337abc?autoplay=0&muted=0&loop=0'
    );
  });

  it('works without the share code, and ignores other Medal pages', () => {
    expect(embedOf('https://medal.tv/clips/123')).toBe(
      'https://medal.tv/clip/123?autoplay=0&muted=0&loop=0'
    );
    expect(videoEmbeds('https://medal.tv/games/league-of-legends')).toEqual([]);
  });
});

describe('Streamable', () => {
  it.each(['https://streamable.com/abc123', 'https://streamable.com/e/abc123'])(
    '%s → Streamable player',
    (url) => {
      expect(embedOf(url)).toBe('https://streamable.com/e/abc123');
    }
  );
});

describe('videoEmbeds', () => {
  it('finds links inside text, without the punctuation after them', () => {
    expect(videoEmbeds('olha isso https://streamable.com/abc123! kkk')).toEqual(
      [
        {
          provider: 'streamable',
          embedUrl: 'https://streamable.com/e/abc123',
          url: 'https://streamable.com/abc123',
        },
      ]
    );
  });

  it(`unknown hosts are not embedded; repeats count once; at most ${MAX_EMBEDS}`, () => {
    expect(videoEmbeds('https://evil.example/watch?v=dQw4w9WgXcQ')).toEqual([]);
    expect(
      videoEmbeds(
        'https://youtu.be/dQw4w9WgXcQ https://youtube.com/watch?v=dQw4w9WgXcQ'
      )
    ).toHaveLength(1);
    expect(
      videoEmbeds(
        'https://streamable.com/a1 https://streamable.com/b2 https://streamable.com/c3'
      )
    ).toHaveLength(MAX_EMBEDS);
  });
});

describe('splitLinks', () => {
  it('splits text and links, keeping everything in order', () => {
    expect(splitLinks('veja https://a.com/x, e https://b.com')).toEqual([
      { text: 'veja ' },
      { text: 'https://a.com/x', href: 'https://a.com/x' },
      { text: ', e ' },
      { text: 'https://b.com', href: 'https://b.com' },
    ]);
    expect(splitLinks('sem link')).toEqual([{ text: 'sem link' }]);
  });
});
