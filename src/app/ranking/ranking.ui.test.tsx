/**
 * Ranking page (server component) with players from the real database
 */

import { screen } from '@testing-library/react';
import RankingPage, { metadata } from './page';
import { getActivePlayers } from '@/src/services/playerService';
import { getTopChampions } from '@/src/services/topChampionsService';
import { renderApp } from '@/jest/render-app';
import { RIOT_WAIT_MS } from '@/jest/timeouts';

it('renders the title and a ranking with every active player', async () => {
  const players = await getActivePlayers();
  renderApp(await RankingPage());

  expect(
    screen.getByRole('heading', { level: 1, name: 'Ranking' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('tablist', { name: 'Fila ranqueada' })
  ).toBeInTheDocument();
  // Every player ends up either ranked or in the "sem ranque" list
  for (const p of players) {
    expect(
      await screen.findByText(
        p.gameName,
        { exact: false },
        { timeout: RIOT_WAIT_MS }
      )
    ).toBeInTheDocument();
  }
});

it('ranked rows show the 3 most played champions', async () => {
  const top = await getTopChampions();
  renderApp(await RankingPage());

  const lists = await screen.findAllByRole(
    'list',
    { name: 'Mais jogados nas últimas 100 partidas' },
    { timeout: RIOT_WAIT_MS }
  );
  const shown = lists.map((l) =>
    [...l.querySelectorAll('img')].map((img) => img.getAttribute('alt'))
  );
  const expected = Object.values(top).map((t) => t.map((c) => c.champion));
  for (const champions of shown) expect(expected).toContainEqual(champions);
});

it('has a page title for the browser tab', () => {
  expect(metadata.title).toBe('Ranking');
});
