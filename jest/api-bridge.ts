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
import { POST as refreshRoute } from '@/src/app/api/refresh/[summonerName]/route';
import { GET as matchupRoute } from '@/src/app/api/matchup/route';
import { GET as meRoute } from '@/src/app/api/me/route';
import * as postsRoute from '@/src/app/api/posts/route';
import * as postRoute from '@/src/app/api/posts/[id]/route';

type Handler = (
  request: NextRequest,
  context: { params: Promise<{ summonerName: string; id: string }> }
) => Promise<Response>;

/** A route file's handlers by method (GET-only routes are a bare handler) */
type Route = Handler | Partial<Record<string, Handler>>;

const ROUTES: [RegExp, Route][] = [
  [/^\/api\/profile\/([^/?]+)/, profileRoute],
  [/^\/api\/rank\/([^/?]+)/, rankRoute],
  [/^\/api\/matches\/([^/?]+)/, matchesRoute],
  [/^\/api\/refresh\/([^/?]+)/, refreshRoute],
  [/^\/api\/matchup(\?|$)()/, matchupRoute],
  [/^\/api\/me$()/, meRoute],
  [/^\/api\/posts\/([^/?]+)/, postRoute],
  [/^\/api\/posts(\?|$)()/, postsRoute],
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
    for (const [pattern, route] of ROUTES) {
      const match = url.match(pattern);
      const method = init?.method ?? 'GET';
      const handler = typeof route === 'function' ? route : route[method];
      if (match && handler) {
        const request = new NextRequest(`http://localhost${url}`, {
          ...init,
          signal: init?.signal ?? undefined,
        });
        return handler(request, {
          params: Promise.resolve({
            summonerName: match[1],
            id: match[1],
          }),
        });
      }
    }
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
    });
  }

  return globalThis.__nodeFetch(input, init);
};
