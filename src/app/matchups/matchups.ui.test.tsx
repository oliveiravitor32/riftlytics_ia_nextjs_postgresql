/**
 * Matchups page for real: champion list from Data Dragon, the table through
 * the real /api/matchup route and database, Gemini answered by the fake.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchupsPage, { metadata } from './page';
import { renderApp } from '@/jest/render-app';
import { RIOT_WAIT_MS } from '@/jest/timeouts';
import {
  fakeTip,
  geminiFault,
  geminiRateLimited,
} from '@/jest/gemini-mock/server';
import { prisma } from '@/src/lib/db';
import { MATCHUP_ASPECTS } from '@/src/lib/matchup';

beforeEach(async () => {
  await prisma.matchupTip.deleteMany();
  geminiFault.next = null;
});

async function pick(a: string, b: string) {
  const user = userEvent.setup();
  renderApp(await MatchupsPage());
  await user.selectOptions(screen.getByLabelText('Seu campeão'), a);
  await user.selectOptions(screen.getByLabelText('Adversário'), b);
  await user.click(screen.getByRole('button', { name: 'Ver dicas' }));
}

it('shows one row per aspect, with my champion in the first column', async () => {
  await pick('Katarina', 'Akali');

  const table = await screen.findByRole(
    'table',
    { name: 'Katarina contra Akali na fase de rotas' },
    { timeout: RIOT_WAIT_MS }
  );
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(MATCHUP_ASPECTS.length);
  MATCHUP_ASPECTS.forEach((aspect, i) => {
    expect(rows[i]).toHaveTextContent(aspect);
    expect(rows[i]).toHaveTextContent(fakeTip('Katarina', aspect));
    expect(rows[i]).toHaveTextContent(fakeTip('Akali', aspect));
  });
});

it('cannot ask for the same champion twice', async () => {
  const user = userEvent.setup();
  renderApp(await MatchupsPage());
  await user.selectOptions(screen.getByLabelText('Seu campeão'), 'Katarina');
  await user.selectOptions(screen.getByLabelText('Adversário'), 'Katarina');

  expect(screen.getByRole('button', { name: 'Ver dicas' })).toBeDisabled();
});

it('tells how long to wait when the AI quota runs out', async () => {
  geminiFault.next = geminiRateLimited('30s');
  await pick('Katarina', 'Akali');

  expect(
    await screen.findByRole('alert', {}, { timeout: RIOT_WAIT_MS })
  ).toHaveTextContent('Tente de novo em 30s');
  geminiFault.next = null;
});

it('has a page title for the browser tab', () => {
  expect(metadata.title).toBe('Matchups');
});
