/**
 * RankingBoard scenarios: ordering, rate limit message, cache and refresh
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RankingBoard } from './ranking-board';
import type { TrackedPlayer } from '@/src/services/playerService';

const PLAYERS: TrackedPlayer[] = [
  'FlyerCloud#br1',
  'Neutro7#BR1',
  'SAVYORI#br1',
  'PistolaCanoCurto#BR2',
  'Pistola Torta#br1',
].map((id) => {
  const [gameName, tagLine] = id.split('#');
  return {
    gameName,
    tagLine,
    region: 'br1',
    displayName: gameName,
    avatarUrl: null,
  };
});

function entry(queueType: string, tier: string, leaguePoints: number) {
  return {
    summonerId: 'x',
    summonerName: 'x',
    queueType,
    tier,
    rank: 'I',
    leaguePoints,
    wins: 10,
    losses: 10,
  };
}

function okResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve(body),
  } as Response);
}

function rateLimitedResponse(retryAfter = 30) {
  return Promise.resolve({
    ok: false,
    status: 429,
    headers: new Headers({ 'Retry-After': String(retryAfter) }),
    json: () => Promise.resolve({ error: 'RATE_LIMITED', retryAfter }),
  } as Response);
}

// Each player gets a distinct LP so the expected order is deterministic
function rankFor(url: string) {
  const index = PLAYERS.findIndex((s) =>
    decodeURIComponent(url).includes(`${s.gameName}#${s.tagLine}`)
  );
  return {
    name: PLAYERS[index].gameName,
    rankInfo: entry('RANKED_SOLO_5x5', 'GOLD', index * 10),
    flexRankInfo: index === 0 ? entry('RANKED_FLEX_SR', 'SILVER', 5) : null,
    fetchedAt: new Date().toISOString(),
  };
}

const fetchMock = jest.fn();

function renderBoard() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <RankingBoard players={PLAYERS} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

it('orders players by tier/LP, highest first', async () => {
  fetchMock.mockImplementation((url: string) => okResponse(rankFor(url)));
  renderBoard();

  const items = await screen.findAllByRole('listitem');
  const last = PLAYERS[PLAYERS.length - 1].gameName;
  expect(items[0]).toHaveTextContent(last);
});

it('shows a friendly message and disables refresh when rate limited', async () => {
  fetchMock.mockImplementation(() => rateLimitedResponse(30));
  renderBoard();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    /muitas consultas seguidas/i
  );
  expect(screen.getByRole('button', { name: /atualizar/i })).toBeDisabled();
  // 429 must not be retried by the client
  expect(fetchMock).toHaveBeenCalledTimes(PLAYERS.length);
});

it('switching tabs reuses the cache (no new requests)', async () => {
  fetchMock.mockImplementation((url: string) => okResponse(rankFor(url)));
  renderBoard();
  await screen.findAllByRole('listitem');
  const calls = fetchMock.mock.calls.length;

  fireEvent.click(screen.getByRole('tab', { name: 'Ranqueada Flex' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Solo/Duo' }));

  expect(fetchMock).toHaveBeenCalledTimes(calls);
});

it('refresh button forces a new request with refresh=1', async () => {
  fetchMock.mockImplementation((url: string) => okResponse(rankFor(url)));
  renderBoard();
  await screen.findAllByRole('listitem');

  fireEvent.click(screen.getByRole('button', { name: /atualizar/i }));

  await waitFor(() =>
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes('refresh=1'))
    ).toHaveLength(PLAYERS.length)
  );
});
