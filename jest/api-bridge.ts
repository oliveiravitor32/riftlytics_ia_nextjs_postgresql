/**
 * Routes the browser's fetch('/api/...') to the REAL Next.js route handlers,
 * in-process. Components and hooks therefore exercise the whole app:
 * hook -> route -> service -> Riot API / Supabase. Nothing of ours is mocked.
 *
 * Other URLs (Riot, Data Dragon) go to the real network.
 */

import { NextRequest } from 'next/server';
import { GET as profileRoute } from '@/src/app/api/profile/[summonerName]/route';
import { GET as rankRoute } from '@/src/app/api/rank/[summonerName]/route';
import { GET as matchesRoute } from '@/src/app/api/matches/[summonerName]/route';

type Handler = (
  request: NextRequest,
  context: { params: Promise<{ summonerName: string }> }
) => Promise<Response>;

const ROUTES: [RegExp, Handler][] = [
  [/^\/api\/profile\/([^/?]+)/, profileRoute],
  [/^\/api\/rank\/([^/?]+)/, rankRoute],
  [/^\/api\/matches\/([^/?]+)/, matchesRoute],
];

declare global {
  var __nodeFetch: typeof fetch;
}

/** Every /api request the UI made in the current test (for assertions) */
export const apiCalls: string[] = [];

export const bridgedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.toString();

  if (url.startsWith('/api/')) {
    apiCalls.push(url);
    for (const [pattern, handler] of ROUTES) {
      const match = url.match(pattern);
      if (match) {
        const request = new NextRequest(`http://localhost${url}`, {
          ...init,
          signal: init?.signal ?? undefined,
        });
        return handler(request, {
          params: Promise.resolve({ summonerName: match[1] }),
        });
      }
    }
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
    });
  }

  return globalThis.__nodeFetch(input, init);
};
