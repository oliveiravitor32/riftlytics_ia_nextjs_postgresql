/**
 * jsdom + Node's web APIs (fetch, Request, Response, streams...).
 * UI tests render real components in a DOM, while their fetch('/api/...')
 * calls run our real route handlers, which need these Node globals.
 */
// Jest loads test environments as CommonJS, untransformed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsdomEnvironment = require('jest-environment-jsdom').default;

const NODE_GLOBALS = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'FormData',
  'Blob',
  'File',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'TextEncoder',
  'TextDecoder',
  'AbortController',
  'AbortSignal',
  'structuredClone',
  'BroadcastChannel',
  'MessageChannel',
  'setImmediate',
  'clearImmediate',
  'performance',
];

class JsdomWithNodeGlobals extends JsdomEnvironment {
  async setup() {
    await super.setup();
    for (const name of NODE_GLOBALS) {
      if (globalThis[name] !== undefined) this.global[name] = globalThis[name];
    }
    // jsdom's crypto (read-only) has no randomUUID; Prisma needs it for transactions
    Object.defineProperty(this.global, 'crypto', {
      value: globalThis.crypto,
      configurable: true,
    });
    // Real network fetch, kept for the API bridge (see jest/api-bridge.ts)
    this.global.__nodeFetch = globalThis.fetch;
  }
}

module.exports = JsdomWithNodeGlobals;
