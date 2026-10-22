/**
 * Matchups page for real: champion list from Data Dragon, the table through
 * the real /api/matchup route and database, Gemini answered by the fake.
 */

import { cleanup, screen, within } from '@testing-library/react';
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
  localStorage.clear();
});

type User = ReturnType<typeof userEvent.setup>;

/** Types part of the name in the search box and clicks the champion */
async function choose(user: User, label: string, name: string) {
  const box = screen.getByRole('combobox', { name: label });
  await user.clear(box);
  await user.type(box, name.slice(0, 3));
  await user.click(screen.getByRole('option', { name }));
}

async function pick(a: string, b: string) {
  const user = userEvent.setup();
  renderApp(await MatchupsPage());
  await choose(user, 'Seu campeão', a);
  await choose(user, 'Adversário', b);
  await user.click(screen.getByRole('button', { name: 'Ver dicas' }));
}

describe('champion search', () => {
  it('filters as you type, ignoring accents and case, each option with its picture', async () => {
    const user = userEvent.setup();
    renderApp(await MatchupsPage());
    const box = screen.getByRole('combobox', { name: 'Seu campeão' });

    await user.type(box, 'kata');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Katarina']);
    expect(options[0].querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/champion/Katarina.png')
    );

    await user.clear(box);
    await user.type(box, 'RENATA GL');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Renata Glasc');
  });

  it('an empty box lists every champion, not just the first ones', async () => {
    const user = userEvent.setup();
    const page = await MatchupsPage();
    renderApp(page);

    await user.click(screen.getByRole('combobox', { name: 'Seu campeão' }));

    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names.length).toBeGreaterThan(150);
    expect(names).toContain('Zyra');
  });

  it('picks with the keyboard and shows the chosen picture in the box', async () => {
    const user = userEvent.setup();
    renderApp(await MatchupsPage());
    const box = screen.getByRole('combobox', { name: 'Seu campeão' });

    await user.type(box, 'akal');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(box).toHaveValue('Akali');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('campeao-a-foto').getAttribute('src')).toContain(
      '/champion/Akali.png'
    );
  });

  it('a name that matches nothing says so and chooses nobody', async () => {
    const user = userEvent.setup();
    renderApp(await MatchupsPage());

    await user.type(
      screen.getByRole('combobox', { name: 'Seu campeão' }),
      'xyzw'
    );

    expect(screen.getByText('Nenhum campeão encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver dicas' })).toBeDisabled();
  });
});

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

it('leaving the tab and coming back keeps the chosen matchup and its answer', async () => {
  await pick('Katarina', 'Akali');
  await screen.findByRole(
    'table',
    { name: 'Katarina contra Akali na fase de rotas' },
    { timeout: RIOT_WAIT_MS }
  );
  cleanup(); // went to another page

  renderApp(await MatchupsPage());

  // Restored without clicking anything
  expect(
    await screen.findByRole(
      'table',
      { name: 'Katarina contra Akali na fase de rotas' },
      { timeout: RIOT_WAIT_MS }
    )
  ).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Seu campeão' })).toHaveValue(
    'Katarina'
  );
  expect(screen.getByRole('combobox', { name: 'Adversário' })).toHaveValue(
    'Akali'
  );
});

it('cannot ask for the same champion twice', async () => {
  const user = userEvent.setup();
  renderApp(await MatchupsPage());
  await choose(user, 'Seu campeão', 'Katarina');
  await choose(user, 'Adversário', 'Katarina');

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
