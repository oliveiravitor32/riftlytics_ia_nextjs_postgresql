/**
 * RankingBoard against the real app: players from Supabase, ranks from the
 * Riot API through /api/rank (bridged to the real route handler).
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankingBoard } from './ranking-board';
import {
  QueryProvider,
  createQueryClient,
} from '@/src/providers/query-provider';
import {
  getActivePlayers,
  type TrackedPlayer,
} from '@/src/services/playerService';
import { compareRank } from '@/src/lib/rank-order';
import { profileHref } from '@/src/lib/riot-id';
import { clearProfileCache } from '@/src/services/profileService';
import type { RankResponse } from '@/src/queries/useRankQuery';
import { apiCalls } from '@/jest/api-bridge';

let players: TrackedPlayer[];
// Real rank of each player, read through the real route (warms its cache)
let ranks: Map<string, RankResponse>;

const riotId = (p: TrackedPlayer) => `${p.gameName}#${p.tagLine}`;

beforeAll(async () => {
  players = await getActivePlayers();
  ranks = new Map();
  for (const p of players) {
    const res = await fetch(
      `/api/rank/${encodeURIComponent(riotId(p))}?region=${p.region}`
    );
    ranks.set(riotId(p), await res.json());
  }
});

function renderBoard() {
  return render(
    <QueryProvider client={createQueryClient()}>
      <RankingBoard players={players} />
    </QueryProvider>
  );
}

function expectedOrder(field: 'rankInfo' | 'flexRankInfo') {
  return players
    .filter((p) => ranks.get(riotId(p))?.[field])
    .sort((a, b) =>
      compareRank(ranks.get(riotId(a))![field]!, ranks.get(riotId(b))![field]!)
    )
    .map((p) => ranks.get(riotId(p))!.name);
}

async function renderedOrder() {
  const panel = await screen.findByRole('tabpanel');
  await waitFor(() => expect(panel).not.toHaveAttribute('aria-busy', 'true'));
  const list = panel.querySelector('ol');
  return list
    ? within(list)
        .getAllByRole('link')
        .map((a) => a.textContent)
    : [];
}

it('lists Solo/Duo players highest rank first', async () => {
  renderBoard();
  expect(await renderedOrder()).toEqual(expectedOrder('rankInfo'));
});

it('Flex tab uses the Flex ranks (keyboard navigable tabs)', async () => {
  const user = userEvent.setup();
  renderBoard();
  await renderedOrder();

  screen.getByRole('tab', { name: 'Solo/Duo' }).focus();
  await user.keyboard('{ArrowRight}');

  expect(screen.getByRole('tab', { name: 'Ranqueada Flex' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(await renderedOrder()).toEqual(expectedOrder('flexRankInfo'));
});

it('each player links to its profile page', async () => {
  renderBoard();
  await renderedOrder();

  for (const p of players.filter((p) => ranks.get(riotId(p))?.rankInfo)) {
    expect(
      screen.getByRole('link', { name: ranks.get(riotId(p))!.name })
    ).toHaveAttribute('href', profileHref(p.region, p.gameName, p.tagLine));
  }
});

it('players unranked in a queue appear in the "sem ranque" list', async () => {
  const user = userEvent.setup();
  renderBoard();
  await renderedOrder();
  await user.click(screen.getByRole('tab', { name: 'Ranqueada Flex' }));
  await renderedOrder();

  const unranked = players.filter((p) => !ranks.get(riotId(p))?.flexRankInfo);
  if (unranked.length === 0) return; // whole group is ranked in Flex today
  const aside = screen.getByRole('complementary');
  for (const p of unranked) {
    expect(aside).toHaveTextContent(ranks.get(riotId(p))!.name);
  }
});

it('switching tabs reuses the cache (no new /api requests)', async () => {
  const user = userEvent.setup();
  renderBoard();
  await renderedOrder();
  const callsAfterLoad = apiCalls.length;

  await user.click(screen.getByRole('tab', { name: 'Ranqueada Flex' }));
  await user.click(screen.getByRole('tab', { name: 'Solo/Duo' }));

  expect(apiCalls).toHaveLength(callsAfterLoad);
});

it('"Atualizar" refetches every player bypassing the server cache', async () => {
  const user = userEvent.setup();
  renderBoard();
  await renderedOrder();
  apiCalls.length = 0;

  await user.click(screen.getByRole('button', { name: /atualizar/i }));

  await waitFor(() =>
    expect(apiCalls.filter((u) => u.includes('refresh=1'))).toHaveLength(
      players.length
    )
  );
  expect(await screen.findByText(/Atualizado às/)).toBeInTheDocument();
});

// Last: Riot answering 429 can't be triggered safely, so only Riot's HTTP
// response is faked here; everything of ours runs for real.
it('shows the friendly rate-limit alert and disables refresh on 429', async () => {
  const realFetch = globalThis.__nodeFetch;
  globalThis.__nodeFetch = async (input, init) =>
    String(input).includes('riotgames.com')
      ? new Response('{}', { status: 429, headers: { 'Retry-After': '1' } })
      : realFetch(input, init);
  clearProfileCache();

  try {
    renderBoard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /muitas consultas seguidas/i
    );
    expect(screen.getByRole('button', { name: /atualizar/i })).toBeDisabled();
    // One request per player: 429 is never retried by the client
    expect(apiCalls.filter((u) => u.startsWith('/api/rank/'))).toHaveLength(
      players.length
    );
  } finally {
    globalThis.__nodeFetch = realFetch;
  }
});
