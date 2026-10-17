import '@testing-library/jest-dom';
import { config } from 'dotenv';

// Same real credentials as the integration suite (.env.local, local only)
config({ path: '.env.local', quiet: true });
if (!process.env.RIOT_API_KEY || !process.env.DATABASE_URL) {
  throw new Error(
    'RIOT_API_KEY e DATABASE_URL são necessários em .env.local para os testes de UI.'
  );
}
process.env.LOG_LEVEL = 'error';

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
