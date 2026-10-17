/**
 * Home page against the real app: player list from Supabase, every card
 * loading its profile from /api/profile (real route → Riot + DB).
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';
import { ProfileCard } from '@/src/components/profile-card-new';
import {
  getActivePlayers,
  type TrackedPlayer,
} from '@/src/services/playerService';
import { formatTier } from '@/src/lib/rank-labels';
import { profileHref } from '@/src/lib/riot-id';
import type { LeagueEntry } from '@/src/lib/validators';
import { renderApp } from '@/jest/render-app';
import { apiCalls } from '@/jest/api-bridge';

type Profile = {
  name: string;
  summonerLevel: number;
  rankInfo: LeagueEntry | null;
  pdlHistory: { capturedAt: string; leaguePoints: number }[];
};

let players: TrackedPlayer[];
const profiles = new Map<string, Profile>();
const riotId = (p: TrackedPlayer) => `${p.gameName}#${p.tagLine}`;

beforeAll(async () => {
  players = await getActivePlayers();
  for (const p of players) {
    const res = await fetch(
      `/api/profile/${encodeURIComponent(riotId(p))}?region=${p.region}`
    );
    profiles.set(riotId(p), await res.json());
  }
});

async function renderHome() {
  const result = renderApp(await Home());
  // Every card finished loading
  await waitFor(
    () => expect(screen.queryByText(/^Carregando /)).not.toBeInTheDocument(),
    { timeout: 30_000 }
  );
  return result;
}

const cardOf = (p: TrackedPlayer) =>
  screen
    .getByRole('link', { name: profiles.get(riotId(p))!.name })
    .closest('article') as HTMLElement;

it('shows how many players are tracked and one card per player', async () => {
  await renderHome();

  expect(
    screen.getByText(`Acompanhando ${players.length} jogadores`)
  ).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(players.length);
});

it('each card shows level, rank, LP and record from the real profile', async () => {
  await renderHome();

  for (const p of players) {
    const profile = profiles.get(riotId(p))!;
    const card = within(cardOf(p));

    expect(
      card.getByText(`Nível ${profile.summonerLevel}`)
    ).toBeInTheDocument();
    expect(card.getByRole('link', { name: profile.name })).toHaveAttribute(
      'href',
      profileHref(p.region, p.gameName, p.tagLine)
    );

    const rank = profile.rankInfo;
    if (!rank) {
      expect(
        card.getByText('Ainda sem ranque no Solo/Duo')
      ).toBeInTheDocument();
      continue;
    }
    expect(
      card.getByText(formatTier(rank.tier, rank.rank))
    ).toBeInTheDocument();
    expect(cardOf(p)).toHaveTextContent(`${rank.leaguePoints} PDL`);
    expect(cardOf(p)).toHaveTextContent(String(rank.wins + rank.losses));
    const winRate = ((rank.wins / (rank.wins + rank.losses)) * 100).toFixed(1);
    expect(cardOf(p)).toHaveTextContent(
      `${winRate}% (${rank.wins}V ${rank.losses}D)`
    );
  }
});

it('PDL history starts closed and opens on demand', async () => {
  const user = userEvent.setup();
  await renderHome();
  const p = players[0];
  const card = cardOf(p);
  const details = card.querySelector('details')!;

  expect(details).not.toHaveAttribute('open');
  expect(within(card).getByText('Mostrar')).toBeVisible();

  await user.click(within(card).getByText('Histórico de PDL'));

  expect(details).toHaveAttribute('open');
  const history = profiles.get(riotId(p))!.pdlHistory;
  if (history.length >= 2) {
    await waitFor(() =>
      expect(card.querySelector('.recharts-line')).toBeInTheDocument()
    );
  } else {
    expect(
      within(card).getByText(/Ainda não há registros de PDL suficientes/)
    ).toBeInTheDocument();
  }
});

it('players without a photo get the fallback icon', async () => {
  await renderHome();

  for (const p of players.filter((p) => !p.avatarUrl)) {
    expect(cardOf(p).querySelector('svg.lucide-user')).toBeInTheDocument();
  }
});

it('a card for a Riot ID that does not exist shows the error', async () => {
  renderApp(
    <ProfileCard
      gameName="zz-nao-existe-555"
      tagLine="0000"
      displayName="Fantasma"
      region="br1"
    />
  );

  expect(screen.getByText('Carregando Fantasma...')).toBeInTheDocument();
  expect(
    await screen.findByText('Falha ao carregar o perfil', undefined, {
      timeout: 15_000,
    })
  ).toBeInTheDocument();
  expect(screen.getByText(/not found/i)).toBeInTheDocument();
});

// Riot's 429 can't be triggered safely: only Riot's HTTP answer is faked
it('a rate-limited card shows the friendly message with the wait time', async () => {
  const realFetch = globalThis.__nodeFetch;
  globalThis.__nodeFetch = async (input, init) =>
    String(input).includes('riotgames.com')
      ? new Response('{}', { status: 429, headers: { 'Retry-After': '1' } })
      : realFetch(input, init);

  try {
    renderApp(
      <ProfileCard
        gameName="Sem Cache"
        tagLine="429"
        displayName="Sem Cache"
        region="br1"
      />
    );
    expect(
      await screen.findByText('Muitas consultas seguidas')
    ).toBeInTheDocument();
    expect(screen.getByText(/Recarregue a página em 1s/)).toBeInTheDocument();
    // 429 is never retried by the client (would only burn more quota)
    expect(apiCalls.filter((u) => u.startsWith('/api/profile/'))).toHaveLength(
      1
    );
  } finally {
    globalThis.__nodeFetch = realFetch;
  }
});

it('credits the Riot API in the footer', async () => {
  renderApp(await Home());

  expect(screen.getByRole('contentinfo')).toHaveTextContent(
    'Dados fornecidos pela API da Riot Games'
  );
});
