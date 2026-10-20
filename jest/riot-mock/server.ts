/**
 * Answers *.riotgames.com requests from the fake world (./world.ts), the way
 * Riot does: same paths, query parameters, status codes and JSON shapes.
 * Any other URL goes to the real network. Tests that need a 429/5xx/timeout
 * still replace fetch on their own.
 *
 * RIOT_MODE=live skips this and calls the real Riot API (npm run test:riot).
 */

import {
  account,
  leagueEntries,
  match,
  matchIdsOf,
  playerByPuuid,
  playerByRiotId,
  summoner,
} from './world';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Riot's error body
const notFound = () =>
  json({ status: { message: 'Data not found', status_code: 404 } }, 404);
const badRequest = (message: string) =>
  json(
    { status: { message: `Bad request - ${message}`, status_code: 400 } },
    400
  );

const ROUTES: [RegExp, (m: string[], query: URLSearchParams) => Response][] = [
  [
    /^\/riot\/account\/v1\/accounts\/by-riot-id\/([^/]+)\/([^/]+)$/,
    ([, gameName, tagLine]) => {
      const player = playerByRiotId(gameName, tagLine);
      return player ? json(account(player)) : notFound();
    },
  ],
  [
    /^\/lol\/summoner\/v4\/summoners\/by-puuid\/([^/]+)$/,
    ([, puuid]) => {
      const player = playerByPuuid(puuid);
      return player ? json(summoner(player)) : notFound();
    },
  ],
  [
    /^\/lol\/league\/v4\/entries\/by-puuid\/([^/]+)$/,
    ([, puuid]) => {
      const player = playerByPuuid(puuid);
      return player ? json(leagueEntries(player)) : notFound();
    },
  ],
  [
    /^\/lol\/match\/v5\/matches\/by-puuid\/([^/]+)\/ids$/,
    ([, puuid], query) => {
      const start = Number(query.get('start') ?? 0);
      const count = Number(query.get('count') ?? 20);
      if (count > 100) return badRequest('count must be at most 100');
      const endTime = query.get('endTime');
      const player = playerByPuuid(puuid);
      // Riot answers an empty list for a PUUID without matches
      const ids = (player ? matchIdsOf(player) : [])
        .filter((m) => !endTime || m.startedAt / 1000 <= Number(endTime))
        .slice(start, start + count)
        .map((m) => m.id);
      return json(ids);
    },
  ],
  [
    /^\/lol\/match\/v5\/matches\/([A-Z0-9]+_\d+)$/,
    ([, matchId]) => {
      const found = match(matchId);
      return found ? json(found) : notFound();
    },
  ],
];

export function withRiotMock(realFetch: typeof fetch): typeof fetch {
  if (process.env.RIOT_MODE === 'live') return realFetch;

  return (async (input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input.toString(),
      'http://localhost'
    );
    if (!url.host.endsWith('riotgames.com')) return realFetch(input, init);

    const path = decodeURIComponent(url.pathname);
    for (const [pattern, handler] of ROUTES) {
      const m = path.match(pattern);
      if (m) return handler(m, url.searchParams);
    }
    throw new Error(`Endpoint da Riot sem mock: ${url.pathname}`);
  }) as typeof fetch;
}
