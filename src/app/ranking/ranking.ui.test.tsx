/**
 * Ranking page (server component) with players from the real database
 */

import { screen } from '@testing-library/react';
import RankingPage, { metadata } from './page';
import { getActivePlayers } from '@/src/services/playerService';
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

it('has a page title for the browser tab', () => {
  expect(metadata.title).toBe('Ranking');
});
