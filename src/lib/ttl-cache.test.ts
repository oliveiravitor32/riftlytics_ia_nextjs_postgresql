import { TtlCache } from './ttl-cache';

function clock() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('TtlCache', () => {
  it('returns a stored value until it expires', () => {
    const c = clock();
    const cache = new TtlCache<string>(1000, c.now);

    cache.set('k', 'v');
    c.advance(999);
    expect(cache.get('k')).toBe('v');

    c.advance(1);
    expect(cache.get('k')).toBeUndefined();
  });

  it('misses unknown keys', () => {
    expect(new TtlCache<number>(1000).get('nope')).toBeUndefined();
  });

  it('overwriting a key restarts its TTL', () => {
    const c = clock();
    const cache = new TtlCache<number>(1000, c.now);

    cache.set('k', 1);
    c.advance(800);
    cache.set('k', 2);
    c.advance(800);

    expect(cache.get('k')).toBe(2);
  });

  it('clear() drops everything', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1);
    cache.set('b', 2);

    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
