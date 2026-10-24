import '@testing-library/jest-dom';
import { randomBytes, randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { configureRiotForTests } from './riot-env';
import { withGeminiMock } from './gemini-mock/server';
import { withRiotMock } from './riot-mock/server';
import { SUPABASE_TEST_URL, withSupabaseMock } from './supabase-mock/server';

// Same real credentials as the integration suite (.env.local, local only)
config({ path: '.env.local', quiet: true });
if (!process.env.DATABASE_URL || !process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error(
    'DATABASE_URL e UPSTASH_REDIS_REST_URL são necessários em .env.local para os testes de UI.'
  );
}
process.env.LOG_LEVEL = 'error';

// Namespace set once per run by jest/global-setup.ts; this fallback
// only applies if a file is run some other way (never the production prefix)
process.env.CACHE_PREFIX ??= `test:${randomUUID().slice(0, 8)}:`;
configureRiotForTests();
// Never the real key: a test can't spend the free Gemini quota
process.env.GEMINI_API_KEY = 'mock';
// Server code's network calls (bridge fallback): Riot answers are mocked
// Sign-in goes to a fake Supabase Auth (jest/supabase-mock), never the real one
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_TEST_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock';
// Its own Resenha key: tests never read posts encrypted with the real one
process.env.RESENHA_KEY = randomBytes(32).toString('base64');
globalThis.__nodeFetch = withSupabaseMock(
  withGeminiMock(withRiotMock(globalThis.__nodeFetch))
);

// Browser APIs jsdom lacks (environment gaps, not app behavior):
// recharts' ResponsiveContainer measures itself with ResizeObserver
class ResizeObserverStub {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 600, height: 200 } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

// Radix Select uses pointer capture and scrollIntoView
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// next-themes reads the system color scheme
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// Imported after the env is loaded: the routes read it at module load
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bridgedFetch, apiCalls } = require('./api-bridge');

// Set at load time too, so beforeAll hooks in tests already use it
globalThis.fetch = bridgedFetch;

beforeEach(() => {
  apiCalls.length = 0;
  globalThis.fetch = bridgedFetch;
});
