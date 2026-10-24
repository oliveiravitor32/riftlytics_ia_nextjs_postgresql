/**
 * The Resenha page for real: the browser's Supabase client reads the stored
 * session, /api/posts and /api/me run through the real routes and database,
 * Supabase Auth answered by the fake (jest/supabase-mock).
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResenhaPage, { metadata } from './page';
import { renderApp } from '@/jest/render-app';
import { prisma } from '@/src/lib/db';
import { encryptField } from '@/src/lib/resenha-crypto';
import { POSTS_PAGE_SIZE } from '@/src/lib/resenha';
import {
  SUPABASE_TEST_URL,
  fakeSession,
  fakeUser,
} from '@/jest/supabase-mock/server';

const STORAGE_KEY = `sb-${new URL(SUPABASE_TEST_URL).hostname.split('.')[0]}-auth-token`;

function signIn(email: string, name: string) {
  const session = fakeSession(fakeUser({ email, name }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session.user;
}

/** A message already in the database, by someone else */
async function seed(text: string, name = 'Amigo', minutesAgo = 1) {
  const author = await prisma.resenhaAuthor.upsert({
    where: { id: `autor-${name}` },
    create: { id: `autor-${name}`, name: encryptField(name) },
    update: {},
  });
  return prisma.resenhaPost.create({
    data: {
      authorId: author.id,
      body: encryptField(text),
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    },
  });
}

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

const messages = () => screen.findByRole('list', { name: 'Mensagens' });

it('signed out, it asks to sign in and shows no message', async () => {
  await seed('segredo do grupo');
  renderApp(<ResenhaPage />);

  expect(
    await screen.findByRole('button', { name: 'Entrar com Google' })
  ).toBeInTheDocument();
  expect(screen.queryByText('segredo do grupo')).not.toBeInTheDocument();
});

it('shows the messages oldest first, the same author grouped like Discord', async () => {
  await seed('primeira', 'Amigo', 10);
  await seed('segunda', 'Amigo', 9);
  await seed('do outro', 'Outro', 8);
  signIn('leitor@gmail.com', 'Leitor');
  renderApp(<ResenhaPage />);

  const items = within(await messages()).getAllByRole('listitem');
  expect(
    items.map((li) => li.querySelector('p:last-child')!.textContent)
  ).toEqual(['primeira', 'segunda', 'do outro']);
  // Name only on the first message of each group
  expect(within(items[0]).getByText('Amigo')).toBeInTheDocument();
  expect(within(items[1]).queryByText('Amigo')).not.toBeInTheDocument();
  expect(within(items[2]).getByText('Outro')).toBeInTheDocument();
});

it('someone not released reads, but has no box to write', async () => {
  await seed('oi');
  signIn('leitor@gmail.com', 'Leitor');
  renderApp(<ResenhaPage />);

  await messages();
  expect(
    await screen.findByText(/Para postar, peça para liberarem seu e-mail/)
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('textbox', { name: 'Mensagem' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Apagar mensagem' })
  ).not.toBeInTheDocument();
});

it('a released account sends with Enter; Shift+Enter breaks the line', async () => {
  await prisma.postingAllowlist.create({ data: { email: 'vitor@gmail.com' } });
  signIn('vitor@gmail.com', 'Vitor');
  const user = userEvent.setup();
  renderApp(<ResenhaPage />);

  const box = await screen.findByRole('textbox', { name: 'Mensagem' });
  await user.type(box, 'Que Yasuo{Shift>}{Enter}{/Shift}criminoso! XD{Enter}');

  const sent = await screen.findByText(/Que Yasuo\s+criminoso! XD/);
  expect(sent.textContent).toBe('Que Yasuo\ncriminoso! XD');
  expect(box).toHaveValue('');
  expect(within(await messages()).getByText('Vitor')).toBeInTheDocument();
});

it('deletes your own message after confirming', async () => {
  await prisma.postingAllowlist.create({ data: { email: 'vitor@gmail.com' } });
  signIn('vitor@gmail.com', 'Vitor');
  const user = userEvent.setup();
  renderApp(<ResenhaPage />);

  await user.type(
    await screen.findByRole('textbox', { name: 'Mensagem' }),
    'apaga isso{Enter}'
  );
  await user.click(
    await screen.findByRole('button', { name: 'Apagar mensagem' })
  );
  const dialog = screen.getByRole('dialog', { name: 'Apagar mensagem?' });
  await user.click(within(dialog).getByRole('button', { name: 'Apagar' }));

  await waitFor(async () => expect(await prisma.resenhaPost.count()).toBe(0));
  await waitFor(() =>
    expect(screen.queryByText('apaga isso')).not.toBeInTheDocument()
  );
});

it('loads older messages on request', async () => {
  for (let i = 0; i <= POSTS_PAGE_SIZE; i++) {
    await seed(`msg ${i}`, 'Amigo', 100 - i);
  }
  signIn('leitor@gmail.com', 'Leitor');
  const user = userEvent.setup();
  renderApp(<ResenhaPage />);

  await messages();
  expect(screen.queryByText('msg 0')).not.toBeInTheDocument();
  await user.click(
    screen.getByRole('button', { name: 'Carregar mensagens anteriores' })
  );

  expect(await screen.findByText('msg 0')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Carregar mensagens anteriores' })
  ).not.toBeInTheDocument();
});

it('has a page title for the browser tab', () => {
  expect(metadata.title).toBe('Resenha');
});
