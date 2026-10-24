/**
 * "Mandar pra resenha" on a profile's match cards, for real: the matches
 * come through the real /api/matches (Riot answered by the fake), the
 * comment through /api/posts, and the Resenha shows it with the match card.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileMatches } from '../profile-matches';
import ResenhaPage from '@/src/app/resenha/page';
import { renderApp } from '@/jest/render-app';
import { RIOT_WAIT_MS } from '@/jest/timeouts';
import { prisma } from '@/src/lib/db';
import { encryptField } from '@/src/lib/resenha-crypto';
import {
  SUPABASE_TEST_URL,
  fakeSession,
  fakeUser,
} from '@/jest/supabase-mock/server';

const RIOT_ID = 'Alfa#TST';
const STORAGE_KEY = `sb-${new URL(SUPABASE_TEST_URL).hostname.split('.')[0]}-auth-token`;

function signIn(email: string) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(fakeSession(fakeUser({ email, name: 'Vitor' })))
  );
}

const cards = async () =>
  screen.findAllByRole('article', {}, { timeout: RIOT_WAIT_MS });

beforeEach(async () => {
  localStorage.clear();
  await prisma.resenhaPost.deleteMany();
  await prisma.resenhaAuthor.deleteMany();
  await prisma.postingAllowlist.deleteMany();
});
afterAll(async () => {
  await prisma.resenhaPost.deleteMany();
  await prisma.resenhaAuthor.deleteMany();
  await prisma.postingAllowlist.deleteMany();
});

it('signed out, the cards have no Resenha row', async () => {
  renderApp(<ProfileMatches riotId={RIOT_ID} region="br1" />);

  await cards();
  expect(
    screen.queryByRole('button', { name: 'Mandar pra resenha' })
  ).not.toBeInTheDocument();
});

it('a released account comments a match; the Resenha shows it with the match card', async () => {
  await prisma.postingAllowlist.create({ data: { email: 'vitor@gmail.com' } });
  signIn('vitor@gmail.com');
  const user = userEvent.setup();
  const { unmount } = renderApp(
    <ProfileMatches riotId={RIOT_ID} region="br1" />
  );

  const [first] = await cards();
  const champion = first.getAttribute('aria-label')!.split(' de ')[1];
  await user.click(
    await within(first).findByRole('button', { name: 'Mandar pra resenha' })
  );
  const dialog = screen.getByRole('dialog', { name: 'Mandar pra resenha' });
  expect(dialog).toHaveTextContent(champion);
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Comentário' }),
    'Que jogada!{Enter}'
  );

  expect(
    await within(first).findByRole('link', { name: 'Enviado! Ver na Resenha' })
  ).toHaveAttribute('href', '/resenha');
  const stored = await prisma.resenhaPost.findFirstOrThrow();
  expect(stored.matchId).not.toBeNull();
  unmount();

  renderApp(<ResenhaPage />);
  const chip = await screen.findByRole('link', {
    name: new RegExp(`^Partida de .*: ${champion} `),
  });
  expect(chip.getAttribute('href')).toMatch(/^\/perfil\/br1\/Alfa-TST$/);
  expect(chip.closest('li')).toHaveTextContent('Que jogada!');
});

it('someone not released sees the comment count, but no button', async () => {
  // The earlier tests stored Alfa's matches: comment the newest twice
  const player = await prisma.player.findFirstOrThrow({
    where: { gameName: 'Alfa', tagLine: 'TST' },
  });
  const line = await prisma.playerMatch.findFirstOrThrow({
    where: { playerId: player.id },
    orderBy: { playedAt: 'desc' },
  });
  const author = await prisma.resenhaAuthor.create({
    data: { id: 'autor-contagem', name: encryptField('Amigo') },
  });
  await prisma.resenhaPost.createMany({
    data: [1, 2].map((i) => ({
      authorId: author.id,
      body: encryptField(`comentário ${i}`),
      matchId: line.matchId,
      matchPlayerId: player.id,
    })),
  });
  signIn('leitor@gmail.com');
  renderApp(<ProfileMatches riotId={RIOT_ID} region="br1" />);

  const [first] = await cards();
  expect(
    await within(first).findByRole('link', {
      name: '2 comentários na Resenha',
    })
  ).toHaveAttribute('href', '/resenha');
  expect(
    screen.queryByRole('button', { name: 'Mandar pra resenha' })
  ).not.toBeInTheDocument();
});
