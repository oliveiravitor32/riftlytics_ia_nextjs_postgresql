/**
 * Matchups page for real: champion list from Data Dragon, the table through
 * the real /api/matchup route and database, Gemini answered by the fake.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchupsPage, { metadata } from './page';
import { renderApp } from '@/jest/render-app';
import { RIOT_WAIT_MS } from '@/jest/timeouts';
import { geminiFault, geminiRateLimited } from '@/jest/gemini-mock/server';
import { prisma } from '@/src/lib/db';
import { MATCHUP_ROWS } from '@/src/lib/matchup';

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

it('shows the summary tags and one short action per row for each champion', async () => {
  await pick('Katarina', 'Akali');

  const table = await screen.findByRole(
    'table',
    { name: 'Katarina contra Akali na fase de rotas' },
    { timeout: RIOT_WAIT_MS }
  );
  // The fake makes Akali (first alphabetically) win the lane and short trades
  const summary = screen.getByRole('list', { name: 'Resumo do matchup' });
  const tag = (label: string) =>
    within(summary).getByText(label).parentElement as HTMLElement;
  expect(tag('Vantagem')).toHaveTextContent('Akali');
  expect(tag('Trocas curtas')).toHaveTextContent('Akali');
  expect(tag('Trocas longas')).toHaveTextContent('Katarina');
  expect(tag('Roaming')).toHaveTextContent('Equilibrado');
  expect(tag('Dificuldade')).toHaveTextContent(
    'Katarina Difícil · Akali Fácil'
  );

  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(MATCHUP_ROWS.length);
  MATCHUP_ROWS.forEach((aspect, i) => {
    expect(rows[i]).toHaveTextContent(aspect);
    // The **marked** word is bold, without the asterisks
    expect(rows[i]).not.toHaveTextContent('**');
    expect(
      within(rows[i]).getAllByText('Katarina', { selector: 'strong' })
    ).toHaveLength(1);
    expect(
      within(rows[i]).getAllByText('Akali', { selector: 'strong' })
    ).toHaveLength(1);
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
